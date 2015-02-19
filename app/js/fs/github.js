/*global define, _, nodeRequire */
/**
 * This module implements the Github file system.
 * IndexedDB is used for caching blobs and storing the contents of changed files.
 *
 * Here's how it works:
 *
 * - Listing files happens by using Github's API to recursively fetch the tree, this tree is
 *   cached in memory and used for future operations. The file list is ammended to include
 *   local changes, such as new files and locally deleted files.
 * - Reading a file involves first checking if there's a locally changed version
 *   (reading from the DB). If there is, return that. If there isn't, look up the hash in the tree.
 *   When found, first see if there's a cached version in the local DB, if not, fetch from github and cache in DB.
 * - Writing a file writes it to the local DB.
 * - Deleting a file writes a {status: "deleted"} entry to the DB
 * - Commit involves scanning the DB for changed files, building up a new tree, posting changed files as blobs etc.
 */
define(function(require, exports, module) {
    plugin.consumes = ["history", "local_store"];
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var tokenStore = imports.local_store;
        var history = imports.history;

        var zedb = require("zedb");
        var pathUtil = require("../lib/path");
        var poll_watcher = require("./poll_watcher");

        var repo = options.repo;
        var branch = options.branch;

        var dbName = "github_" + repo.replace(/\//g, "__") + "__" + branch;

        var treeCache, lastCommit;
        var githubToken;

        // Same as atob, but strips out newlines first (which Github puts in for some reason)
        function base64Decode(s) {
            return atob(s.replace(/\n/g, ""));
        }

        function decodeUtf8(s) {
          return decodeURIComponent(escape(s));
        }

        function githubCall(method, url, args, bodyJson) {
            args = args || {};
            args.access_token = githubToken;

            return new Promise(function(resolve, reject) {
                var params = [];
                _.each(args, function(val, key) {
                    params.push(key + "=" + encodeURIComponent(val));
                });
                $.ajax({
                    type: method,
                    url: "https://api.github.com" + url + (params.length > 0 ? "?" + params.join("&") : ""),
                    data: bodyJson && JSON.stringify(bodyJson),
                    dataType: "json",
                    processData: false,
                    success: function(resp) {
                        resolve(resp);
                    },
                    error: function(err, type, message) {
                        if (message === "Unauthorized") {
                            var openUi = zed.getService("open_ui");
                            // openUi.showOpenUi();
                            zed.getService("ui").unblockUI();
                            openUi.githubAuth().then(function(token) {
                                if (token) {
                                    // openUi.close();
                                    githubToken = token;
                                    githubCall(method, url, args, bodyJson).then(resolve, reject);
                                } else {
                                    window.close();
                                }
                            });
                        } else {
                            reject(err);
                        }
                    }
                });
            });
        }


        function recursivelyUpdateTreeAux(allFiles) {
            var changeTree = {
                fullPath: ""
            };
            for (var i = 0; i < allFiles.length; i++) {
                var file = allFiles[i];
                var pathParts = file.id.slice(1).split("/");
                var root = changeTree;
                for (var j = 0; j < pathParts.length - 1; j++) {
                    var part = pathParts[j];
                    if (!root[part]) {
                        root[part] = {
                            fullPath: pathParts.slice(0, j + 1).join("/")
                        };
                    }
                    root = root[part];
                }
                root[pathParts[pathParts.length - 1]] = {
                    fullPath: file.id,
                    file: file
                };
            }
            return recursiveUpdateTree(treeCache.files, changeTree);
        }

        /**
         * This function recursively recreates the tree structure bottom-up
         * It's kind of convoluted and probably needs to be cleaned up,
         * it seems to work just fine, though.
         *
         * @param treeObj treeCache.files, that is: a /full/file/path -> info map
         * @param root the current subdirectory to hande in the change tree (as pulled out the db)
         */
        function recursiveUpdateTree(treeObj, root) {
            var recurPromises = [];
            var toRemove = {}, toUpdate = {}, treeInfo;

            // We will first recur into sub-directories of root, then we'll handle
            // files
            _.each(root, function(val) {
                if (!val.file && val.fullPath) { // It's a dir
                    recurPromises.push(recursiveUpdateTree(treeObj, val));
                }
            });
            var madeChanges = false;
            var fullPath = "/" + root.fullPath;
            return Promise.all(recurPromises).then(function(recurResults) {
                // At this point all sub-directories trees have been recreated,
                // let's see if that changed anything
                recurResults.forEach(function(r) {
                    if (r.madeChanges) {
                        madeChanges = true;
                    }
                });
                // Let's now rebuild based on locally changed files
                // Did this directory exist before (last commit)?
                if (treeObj[fullPath]) {
                    // Lookup the sha of the old tree
                    var baseTree = treeObj[fullPath].sha;
                    // Let's iterate over all files in our change set
                    _.each(root, function(val) {
                        if (val.file) { // It's a file
                            if (val.file.status === "deleted") { // to delete
                                toRemove[pathUtil.filename(val.file.id)] = val.file;
                            } else {
                                toUpdate[pathUtil.filename(val.file.id)] = val.file;
                            }
                        }
                    });
                    // Let's first fetch the base tree for this dir
                    return githubCall("GET", "/repos/" + repo + "/git/trees/" + baseTree);
                } else {
                    // New directory, so we can add all files to the toUpdate object
                    _.each(root, function(val) {
                        if (val.file) { // It's a file
                            toUpdate[pathUtil.filename(val.file.id)] = val.file;
                        }
                    });
                    // and the previous version of this tree (which didn't exist) is empty
                    return {
                        tree: []
                    };
                }
            }).then(function(treeInfo_) {
                treeInfo = treeInfo_;

                // Post blobs for all updated files to Github
                var createBlobPromises = [];
                _.each(toUpdate, function(file) {
                    createBlobPromises.push(githubCall("POST", "/repos/" + repo + "/git/blobs", {}, {
                        encoding: "base64",
                        content: file.content
                    }).then(function(blobInfo) {
                        // Let's store the new sha in the file for convenience
                        file.sha = blobInfo.sha;
                    }));
                });
                return Promise.all(createBlobPromises);
            }).then(function() {
                var tree = treeInfo.tree;
                var seenPaths = {};

                // Now we add, change and remove from the old version of the tree (that we fetched from github)
                for (var i = 0; i < tree.length; i++) {
                    var treeItem = tree[i];
                    var fullTreeItemPath = "/" + (root.fullPath ? root.fullPath + "/" : "") + treeItem.path;
                    seenPaths[fullTreeItemPath] = true;
                    if (toRemove[treeItem.path]) {
                        // File got removed, let's remove it from the tree
                        tree.splice(i, 1);
                        i--;
                        madeChanges = true;
                    } else if (toUpdate[treeItem.path]) {
                        // File was changed, let's update its hash to the new blob hash
                        var obj = toUpdate[treeItem.path];
                        treeItem.sha = obj.sha;
                        // Delete from object to know which ones were updates and which were new blobs
                        delete toUpdate[treeItem.path];
                        madeChanges = true;
                    } else if (treeItem.type === "tree" && treeObj[fullTreeItemPath].sha !== treeItem.sha) {
                        // A subtree (sub-directory) was changed, let's update the hash in the tree
                        madeChanges = true;
                        if (treeObj[fullTreeItemPath].sha === null) {
                            // in fact, the tree was removed alltogether, so let's remove it from the tree
                            tree.splice(i, 1);
                            i--;
                        } else {
                            treeItem.sha = treeObj[fullTreeItemPath].sha;
                        }
                    }
                }
                // Let's find newly defined directories
                _.each(root, function(file, relativePath) {
                    if (file.fullPath && !file.file && !seenPaths[file.fullPath] && treeObj["/" + file.fullPath].sha) {
                        tree.push({
                            path: relativePath,
                            mode: "040000", // tree
                            type: "tree",
                            sha: treeObj["/" + file.fullPath].sha
                        });
                    }
                });

                // Finally, let's add all newly defined files to the tree
                // only newly defined files are left, because updated ones were removed earlier
                _.each(toUpdate, function(obj) {
                    madeChanges = true;
                    tree.push({
                        path: pathUtil.filename(obj.id),
                        mode: "100644",
                        type: "blob",
                        sha: obj.sha
                    });
                });

                if (tree.length === 0) {
                    return null;
                }
                if (madeChanges) {
                    // Something changed so let's actually create the new tree
                    console.log("Making a new tree:", fullPath);
                    return githubCall("POST", "/repos/" + repo + "/git/trees", {}, {
                        tree: tree
                    });
                } else {
                    // No changes made, let's use the old tree
                    return treeInfo;
                }
            }).then(function(newTreeInfo) {
                if (!newTreeInfo) {
                    // Tree was deleted
                    treeObj[fullPath].sha = null;
                    return {
                        madeChanges: true
                    };
                } else {
                    // Updating our cache
                    if (treeObj[fullPath]) {
                        treeObj[fullPath].sha = newTreeInfo.sha;
                    } else { // New directory
                        treeObj[fullPath] = {
                            sha: newTreeInfo.sha
                        };
                    }
                    return {
                        madeChanges: madeChanges,
                        sha: newTreeInfo.sha
                    };
                }
            }).
            catch (function(err) {
                if (err.message !== "exit") {
                    throw err;
                }
            });
        }


        function cacheFileTree() {
            return githubCall("GET", "/repos/" + repo + "/git/refs/heads/" + branch).then(function(refInfo) {
                lastCommit = refInfo.object.sha;
                return githubCall("GET", "/repos/" + repo + "/git/commits/" + refInfo.object.sha);
            }).then(function(commitInfo) {
                return githubCall("GET", "/repos/" + repo + "/git/trees/" + commitInfo.tree.sha, {
                    recursive: 1
                });
            }).then(function(treeInfo) {
                treeCache = cleanupTree(treeInfo);
            });
        }

        /**
         * Turns Github's tree format into a map for path -> treeEntry lookup
         */
        function cleanupTree(treeInfo) {
            var files = {};
            treeInfo.tree.forEach(function(entry) {
                files["/" + entry.path] = entry;
            });
            files["/"] = {
                sha: treeInfo.sha
            };
            return {
                sha: treeInfo.sha,
                files: files,
                tree: treeInfo.tree
            };
        }

        var db;

        function initDatabase() {
            return zedb.open(dbName, 1, function(db) {
                db.createObjectStore("files", {
                    keyPath: "id"
                });
            }).then(function(db_) {
                db = db_;
            });
        }

        var api = {
            listFiles: function() {
                // Query all DB entries starting with / (to exclude blob IDs)
                return Promise.all([cacheFileTree(), db.readStore("files").query(">=", "/", "<=", "/~")]).then(function(results) {
                    var localFiles = results[1];
                    var filenames = [];
                    _.each(treeCache.files, function(entry) {
                        var localDeletedFile = _.findWhere(localFiles, {
                            id: "/" + entry.path,
                            status: "deleted"
                        });
                        if (!localDeletedFile && entry.type === 'blob') {
                            filenames.push('/' + entry.path);
                        }
                    });
                    _.each(localFiles, function(file) {
                        if (file.status !== "deleted") {
                            filenames.push(file.id);
                        }
                    });
                    return filenames;
                });
            },
            readFile: function(path) {
                // First see if we have a changed version locally
                return db.readStore("files").get(path).then(function(obj) {
                    if (obj) {
                        watcher.setCacheTag(path, obj.date);
                        return base64Decode(obj.content);
                    } else {
                        var entry;
                        // If not, let's look up the sha hash of the fle
                        return (treeCache ? Promise.resolve() : cacheFileTree()).then(function() {
                            entry = treeCache.files[path];
                            if (!entry) {
                                // File doesn't exist
                                return Promise.reject(404);
                            }
                            // Has this hash been cached in the local DB?
                            return db.readStore("files").get(entry.sha);
                        }).then(function(obj) {
                            if (obj) {
                                watcher.setCacheTag(path, obj.id);
                                return base64Decode(obj.content);
                            } else {
                                // Let's fetch the blob from github
                                return githubCall("GET", "/repos/" + repo + "/git/blobs/" + entry.sha).then(function(blobInfo) {
                                    var content;
                                    if (blobInfo.encoding === "utf-8") {
                                        content = blobInfo.content;
                                    } else { // base64
                                        content = decodeUtf8(base64Decode(blobInfo.content));
                                    }
                                    // Cache the blob with sha as key to the local db asynchronously
                                    watcher.setCacheTag(path, blobInfo.sha);
                                    db.writeStore("files").put({
                                        id: blobInfo.sha,
                                        content: btoa(content)
                                    });
                                    return content;
                                });
                            }
                        });
                    }
                });
            },
            writeFile: function(path, content) {
                var contentB64 = btoa(content);
                var now = "" + Date.now();
                watcher.setCacheTag(path, now);
                return db.writeStore("files").put({
                    id: path,
                    content: contentB64,
                    date: now
                });
            },
            deleteFile: function(path) {
                if (!treeCache.files[path]) { // Never commited, just remove
                    return db.writeStore("files").delete(path);
                } else { // explicitly mark as deleted
                    return db.writeStore("files").put({
                        id: path,
                        status: 'deleted'
                    });
                }
            },
            getCacheTag: function(path) {
                return db.readStore("files").get(path).then(function(file) {
                    if (file) {
                        if (file.status === "deleted") {
                            return Promise.reject(404);
                        }
                        return file.date;
                    }
                    if (treeCache.files[path]) {
                        return treeCache.files[path].sha;
                    } else {
                        return Promise.reject(404);
                    }
                });
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            commit: function(message, committer) {
                var newTree, allFiles;
                // First fetch all locally changed files
                return db.readStore("files").query(">=", "/", "<=", "/~").then(function(allFiles_) {
                    // We're never going to commit .zedstate
                    allFiles = allFiles_.filter(function(obj) {
                        return obj.id !== "/.zedstate";
                    });
                    if (allFiles.length === 0) {
                        console.log("No changes, not committing anything");
                        throw new Error("no-changes");
                    }

                    return recursivelyUpdateTreeAux(allFiles);
                }).then(function(updateResult) {
                    return githubCall("GET", "/repos/" + repo + "/git/trees/" + updateResult.sha, {
                        recursive: 1
                    });
                }).then(function(updatedTree) {
                    // Now we have to update trees where files were removed
                    allFiles.forEach(function(obj) {
                        if (obj.status !== "deleted") {
                            return;
                        }
                    });
                    newTree = updatedTree;
                    // Next, create a commit from the new tree
                    return githubCall("POST", "/repos/" + repo + "/git/commits", {}, {
                        message: message,
                        tree: newTree.sha,
                        parents: [lastCommit],
                        author: committer
                    });
                }).then(function(commitInfo) {
                    console.log("Commit info", commitInfo);
                    lastCommit = commitInfo.sha;
                    // And finally update the branch reference head
                    return githubCall("PATCH", "/repos/" + repo + "/git/refs/heads/" + branch, {}, {
                        sha: commitInfo.sha,
                        force: false
                    });
                }).then(function(updateHeadInfo) {
                    console.log("Update ref", updateHeadInfo);
                    // Cache the tree locally
                    treeCache = cleanupTree(newTree);

                    // And all locally changed files from local database
                    var writeStore = db.writeStore("files");
                    return Promise.all(allFiles.map(function(file) {
                        return writeStore.delete(file.id);
                    }));
                }).then(function() {
                    console.log("Done.");
                }).
                catch (function(err) {
                    if (err.message === "no-changes") {
                        return;
                    }
                    console.error("Error while committing", err);
                    throw err;
                });
            },
            reset: function() {
                // Flush all locally changed files and cached blobs
                return db.readStore("files").getAll().then(function(allObjects) {
                    var writeStore = db.writeStore("files");
                    return Promise.all(allObjects.map(function(obj) {
                        return writeStore.delete(obj.id);
                    }));
                }).then(function() {
                    // Reload file list
                    watcher.clearTagCache();
                    return api.listFiles();
                }).then(function() {
                    return;
                });
            },
            getLocalChanges: function() {
                return db.readStore("files").query(">=", "/", "<=", "/~").then(function(allChangedFiles) {
                    var added = [];
                    var modified = [];
                    var deleted = [];
                    allChangedFiles.forEach(function(file) {
                        if (file.id === "/.zedstate") {
                            return;
                        }
                        if (file.status === "deleted") {
                            deleted.push(file.id);
                        } else if (treeCache.files[file.id]) {
                            modified.push(file.id);
                        } else {
                            added.push(file.id);
                        }
                    });
                    return {
                        added: added,
                        modified: modified,
                        deleted: deleted
                    };
                });
            },
            createBranch: function(name) {
                return githubCall("POST", "/repos/" + repo + "/git/refs", {}, {
                    ref: "refs/heads/" + name,
                    sha: lastCommit
                }).then(function() {
                    return {
                        id: "gh:" + repo + ":" + name,
                        repo: repo,
                        branch: name
                    };
                });
            },
            getCapabilities: function() {
                return {
                    scm: true
                };
            }
        };

        var watcher = poll_watcher(api, 2000);

        history.pushProject(repo + " [" + branch + "]", "gh:" + repo + ":" + branch);

        initDatabase().then(function() {
            tokenStore.get("githubToken").then(function(token) {
                githubToken = token;
                register(null, {
                    fs: api
                });
            });
        });

    }
});
