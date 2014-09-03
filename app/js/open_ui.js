define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "history", "token_store"];
    plugin.provides = ["open_ui"];
    return plugin;

    function plugin(opts, imports, register) {
        var eventbus = imports.eventbus;
        var history = imports.history;
        var tokenStore = imports.token_store;

        var options = require("./lib/options");
        var icons = require("./lib/icons");
        var filterList = require("./lib/filter_list");
        var dropbox = require("./lib/dropbox");
        var githubUi = require("./open/github");

        eventbus.declare("urlchanged");

        var builtinProjects;

        if (window.isNodeWebkit) {
            builtinProjects = [{
                name: "Open Local Folder",
                url: "node:"
            }, {
                name: "Open Zedrem Folder",
                url: "zedrem:"
            }, {
                name: "Open Github Repository",
                url: "gh:"
            }, {
                name: "Configuration",
                url: "nwconfig:"
            }, {
                name: "Manual",
                url: "manual:"
            }];
        } else {
            builtinProjects = [{
                name: "Open Local Folder",
                url: "local:"
            }, {
                name: "Open Zedrem Folder",
                url: "zedrem:"
            }, {
                name: "Open Github Repository",
                url: "gh:"
            }, {
                name: "Open Dropbox Folder",
                url: "dropbox:"
            }, {
                name: "Notes",
                url: "syncfs:",
            }, {
                name: "Configuration",
                url: "config:"
            }, {
                name: "Manual",
                url: "manual:"
            }];
        }

        var headerEl, phraseEl, listEl;

        var api = {
            init: function() {
                var el = $("<div class='modal-view'><img src='/img/zed-small.png' class='logo'><h1></h1><input type='text' id='phrase' placeholder='Filter list'><div id='item-list'></div></div>");
                $("body").append(el);
                headerEl = el.find("h1");
                phraseEl = el.find("#phrase");
                listEl = el.find("#item-list");
                api.projectList();
            },
            projectList: function() {
                headerEl.text("Projects");
                history.getProjects().then(function(projects) {
                    if (projects.length > 0) {
                        projects.splice(0, 0, {
                            section: "Recent"
                        });
                    }
                    projects = builtinProjects.concat(projects);

                    var items = projects.map(function(project) {
                        if (project.section) {
                            return project;
                        }
                        return {
                            name: project.url,
                            title: project.name,
                            html: "<img src='" + icons.protocolIcon(project.url) + "'/>" + project.name
                        };
                    });

                    phraseEl.val("");
                    phraseEl.focus();
                    filterList({
                        inputEl: phraseEl,
                        resultsEl: listEl,
                        list: items,
                        onSelect: function(b) {
                            console.log("Pick", b);
                            if (b.name === "gh:") {
                                api.github().then(function(repo) {
                                    if (repo) {
                                        open(repo.repo + " [" + repo.branch + "]", "gh:" + repo.repo + ":" + repo.branch);
                                    } else {
                                        api.projectList();
                                    }
                                });
                            } else if (b.name === "dropbox:") {
                                api.dropbox().then(function(url) {
                                    if (url) {
                                        open(url.slice("dropbox:".length), url);
                                    } else {
                                        api.projectList();
                                    }
                                });
                            } else if (b.name === "local:") {
                                api.localChrome().then(function(data) {
                                    if (data) {
                                        open(data.title, data.url);
                                    } else {
                                        api.projectList();
                                    }
                                });
                            } else {
                                open(b.title, b.name);
                            }

                            function open(title, url) {
                                options.set("title", title);
                                options.set("url", url);
                                eventbus.emit("urlchanged");
                            }
                        },
                        onCancel: function() {
                            window.close();
                        },
                        onDelete: function(b) {
                            items.splice(items.indexOf(b), 1);
                            history.removeProject(b.name);
                        }
                    });
                }).
                catch (function(err) {
                    console.error("Error", err);
                });
            },
            githubAuth: function(githubToken) {
                return new Promise(function(resolve, reject) {
                    var el = $("<div class='modal-view'></div>");
                    $("body").append(el);
                    $.get("/open/github_token.html", function(html) {
                        el.html(html);
                        $("#token-form").submit(function(event) {
                            event.preventDefault();
                            verifyToken($("#token").val());
                        });
                        $("#cancel").click(function() {
                            close();
                            reject();
                        });

                        $("#token").val(githubToken);

                        function close() {
                            el.remove();
                        }

                        function verifyToken(token) {
                            $.ajax({
                                type: "GET",
                                url: "https://api.github.com/user?access_token=" + token,
                                dataType: "json",
                                processData: false,
                                success: function() {
                                    tokenStore.set("githubToken", $("#token").val());
                                    resolve($("#token").val());
                                    close();
                                },
                                error: function() {
                                    $("#hint").text("Invalid token");
                                }
                            });
                        }
                    });

                });
            },
            github: function() {
                return tokenStore.get("githubToken").then(function(githubToken) {
                    if (!githubToken) {
                        return api.githubAuth().then(function(githubToken) {
                            if (githubToken) {
                                return pick(githubToken);
                            } else {
                                api.projectList();
                                return;
                            }
                        });
                    } else {
                        return pick(githubToken);
                    }
                });

                function pick(githubToken) {
                    return githubUi(githubToken)(headerEl, phraseEl, listEl);
                }
            },
            dropbox: function() {
                return new Promise(function(resolve) {
                    var el = $("<div class='modal-view'><img src='/img/zed-small.png' class='logo'><h1>Pick a Dropbox Folder</h1><div id='dropbox-tree'>Authenticating... <img src='../img/loader.gif'/></div><button id='logout'>Logout</button></div>");
                    $("body").append(el);

                    dropbox.authenticate(function(err, dropbox) {
                        if (err) {
                            close();
                            return api.projectList();
                        }

                        var treeEl = $("#dropbox-tree");
                        treeEl.focus();
                        $("#logout").click(function() {
                            dropbox.signOut(close);
                        });

                        function open(path) {
                            resolve("dropbox:" + path);
                        }

                        function readDir(path, callback) {
                            dropbox.readdir(path, function(err, resultStrings, dirState, entries) {
                                if (err) {
                                    return callback(err);
                                }
                                var dirs = [];
                                entries.forEach(function(entry) {
                                    if (entry.isFolder) {
                                        dirs.push({
                                            title: entry.name,
                                            key: entry.path,
                                            isFolder: true,
                                            isLazy: true
                                        });
                                    }
                                });
                                callback(null, dirs);
                            });
                        }

                        function renderInitialTree(err, children) {
                            treeEl.dynatree({
                                onActivate: function(node) {
                                    open(node.data.key);
                                    close();
                                },
                                onLazyRead: function(node) {
                                    readDir(node.data.key, function(err, dirs) {
                                        if (err) {
                                            return console.error(err);
                                        }
                                        dirs.forEach(function(dir) {
                                            node.addChild(dir);
                                        });
                                        node.setLazyNodeStatus(DTNodeStatus_Ok);
                                    });
                                },
                                onKeydown: function(node, event) {
                                    if (event.keyCode === 27) {
                                        close();
                                    }
                                },
                                keyboard: true,
                                autoFocus: true,
                                debugLevel: 0,
                                children: children
                            });
                        }

                        readDir("/", renderInitialTree);
                    });

                    function close() {
                        el.remove();
                    }
                });
            },
            localChrome: function() {
                return new Promise(function(resolve) {
                    chrome.fileSystem.chooseEntry({
                        type: "openDirectory"
                    }, function(dir) {
                        if (!dir) {
                            return resolve();
                        }
                        var id = chrome.fileSystem.retainEntry(dir);
                        var title = dir.fullPath.slice(1);
                        resolve({
                            title: title,
                            url: "local:" + id
                        });
                    });
                });
            },
        };

        register(null, {
            open_ui: api
        });
    }
});
