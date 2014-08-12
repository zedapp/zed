/*global define, _, nodeRequire */
define(function(require, exports, module) {
    plugin.consumes = ["history", "token_store"]
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var tokenStore = imports.token_store;
        var history = imports.history;

        var zedb = require("zedb");
        var pathUtil = require("../lib/path");
        var poll_watcher = require("./poll_watcher");

        var repo = options.repo;
        var branch = options.branch;

        var dbName = "github_" + repo.replace(/\//g, "__") + "__" + branch;

        var treeCache, lastCommit;
        var githubToken;


        tokenStore.get("githubToken").then(function(token) {
            githubToken = token;
        });

        function githubCall(method, url, args, bodyJson) {
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
                    error: function(err) {
                        reject(err);
                    }
                });
            });
        }


        function recursivelyUpdateTreeAux(allFiles) {
            var treeObj = {
                fullPath: ""
            };
            for (var i = 0; i < allFiles.length; i++) {
                var file = allFiles[i];
                var pathParts = file.id.slice(1).split("/");
                var root = treeObj;
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
            return recursiveUpdateTree(treeCache.files, treeObj);
        }

        function recursiveUpdateTree(treeObj, root) {
            var recurPromises = [];
            var toRemove = {}, toUpdate = {}; // fileObjs
            _.each(root, function(val) {
                if (!val.file && val.fullPath) { // It's a dir
                    recurPromises.push(recursiveUpdateTree(treeObj, val));
                }
            });
            var madeChanges = false;
            var fullPath = "/" + root.fullPath;
            return Promise.all(recurPromises).then(function(recurResults) {
                recurResults.forEach(function(r) {
                    if (r.madeChanges) {
                        madeChanges = true;
                    }
                });
                // At this time all sub-trees have been updated in treeObj
                // so let's now rebuild based on locally changed files
                if (treeObj[fullPath]) {
                    var baseTree = treeObj[fullPath].sha;
                    _.each(root, function(val, name) {
                        if (val.file) { // It's a file
                            if (val.file.status === "deleted") { // to delete
                                toRemove[pathUtil.filename(val.file.id)] = val.file;
                            } else {
                                toUpdate[pathUtil.filename(val.file.id)] = val.file;
                            }
                        }
                    });
                    // Let's first fetch the base tree for this dir
                    return githubCall("GET", "/repos/" + repo + "/git/trees/" + baseTree, {});
                } else { // New directory
                    _.each(root, function(val, name) {
                        if (val.file) { // It's a file
                            toUpdate[pathUtil.filename(val.file.id)] = val.file;
                        }
                    });
                    return {
                        tree: []
                    };
                }
            }).then(function(treeInfo) {
                var tree = treeInfo.tree;
                var seenPaths = {};
                for (var i = 0; i < tree.length; i++) {
                    var treeItem = tree[i];
                    var fullTreeItemPath = "/" + (root.fullPath ? root.fullPath + "/" : "") + treeItem.path;
                    seenPaths[fullTreeItemPath] = true;
                    if (toRemove[treeItem.path]) {
                        tree.splice(i, 1);
                        i--;
                        madeChanges = true;
                    } else if (toUpdate[treeItem.path]) {
                        var obj = toUpdate[treeItem.path];
                        delete treeItem.sha;
                        treeItem.content = atob(obj.content);
                        // Delete from object to know which ones were updates and which were new blobs
                        delete toUpdate[treeItem.path];
                        madeChanges = true;
                    } else if (treeItem.type === "tree" && treeObj[fullTreeItemPath].sha !== treeItem.sha) {
                        console.log("Subdir updated", fullTreeItemPath);
                        madeChanges = true;
                        if (treeObj[fullTreeItemPath].sha === null) { // delete tree
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
                // done

                _.each(toUpdate, function(obj) {
                    madeChanges = true;
                    tree.push({
                        path: pathUtil.filename(obj.id),
                        mode: "100644",
                        type: "blob",
                        content: atob(obj.content)
                    });
                });
                if (tree.length === 0) {
                    // tree.push({
                    //     "path": ".emtpydir",
                    //     "mode": "100644",
                    //     "type": "blob",
                    //     "content": ""
                    // });
                    return null;
                }
                if (madeChanges) {
                    console.log("Making a new tree:", fullPath);
                    return githubCall("POST", "/repos/" + repo + "/git/trees", {}, {
                        tree: tree
                    });
                } else {
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
            return githubCall("GET", "/repos/" + repo + "/git/refs/heads/" + branch, {}).then(function(refInfo) {
                lastCommit = refInfo.object.sha;
                return githubCall("GET", "/repos/" + repo + "/git/commits/" + refInfo.object.sha, {});
            }).then(function(commitInfo) {
                return githubCall("GET", "/repos/" + repo + "/git/trees/" + commitInfo.tree.sha, {
                    recursive: 1
                });
            }).then(function(treeInfo) {
                treeCache = cleanupTree(treeInfo);
            });
        }

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

        initDatabase();

        var api = {
            listFiles: function() {
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
                        return atob(obj.content);
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
                                return atob(obj.content);
                            } else {
                                // Let's fetch the blob from github
                                return githubCall("GET", "/repos/" + repo + "/git/blobs/" + entry.sha, {}).then(function(blobInfo) {
                                    var content;
                                    if (blobInfo.encoding === "utf-8") {
                                        content = blobInfo.content;
                                    } else { // base64
                                        content = atob(blobInfo.content);
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
                return db.writeStore("files").put({
                    id: path,
                    status: 'deleted'
                });
            },
            getCacheTag: function(path) {
                return db.readStore("files").get(path).then(function(file) {
                    if (file) {
                        if (file.status === "deleted") {
                            return Promise.reject(404);
                        }
                        return file.date;
                    }
                    if(treeCache.files[path]) {
                        return treeCache.files[path].sha;
                    } else {
                        return Promise.reject(404);
                    }
                }).catch(function(err) {
                    console.error("Cachtag error", path, err);
                    throw err;
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
                    allFiles = allFiles_.filter(function(obj) {
                        return obj.id !== "/.zedstate";
                    });
                    console.log("All files", allFiles);
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
                    var currentTree = cleanupTree(updatedTree);
                    // Now we have to update trees where files were removed
                    allFiles.forEach(function(obj) {
                        if (obj.status !== "deleted") {
                            return;
                        }
                        var parentTree = currentTree.files[pathUtil.dirname(obj.id)];
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
                    console.log("All files locally deleted");
                }).
                catch (function(err) {
                    if (err.message === "no-changes") {
                        return;
                    }
                    console.error("Error", err);
                    throw err;
                });
            },
            reset: function() {
                // Flush all locally changed files etc.
                db.readStore("files").getAll().then(function(allObjects) {
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
            }
        };

        var watcher = poll_watcher(api, 2000);

        history.pushProject(repo + " [" + branch + "]", "gh:" + repo + ":" + branch);

        register(null, {
            fs: api
        });
    }
});
