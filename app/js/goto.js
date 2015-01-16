define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "symbol", "ui", "editor", "session_manager", "fs", "command"];
    plugin.provides = ["goto"];
    return plugin;

    function plugin(options, imports, register) {
        var fuzzyfind = require("./lib/fuzzyfind");
        var locator = require("./lib/locator");

        var eventbus = imports.eventbus;
        var symbol = imports.symbol;
        var ui = imports.ui;
        var editor = imports.editor;
        var session_manager = imports.session_manager;
        var fs = imports.fs;
        var command = imports.command;

        var fileCache = [];
        var filteredFileCache = [];
        var globalLastEditPoint;

        eventbus.declare("loadedfilelist");
        eventbus.declare("goto");

        var api = {
            hook: function() {
                eventbus.on("newfilecreated", function(path) {
                    if (fileCache.indexOf(path) === -1) {
                        fileCache.push(path);
                        updateFilteredFileCache();
                    }
                });
                eventbus.on("filedeleted", function(path) {
                    var index = fileCache.indexOf(path);
                    if (index !== -1) {
                        fileCache.splice(index, 1);
                        updateFilteredFileCache();
                    }
                });
                eventbus.on("configchanged", function() {
                    updateFilteredFileCache();
                });
                eventbus.on("sessionchanged", function(session) {
                    // set timeout so that the edit has been appplied already
                    setTimeout(function() {
                        globalLastEditPoint = {
                            session: session,
                            cursor: session.selection.getCursor()
                        };
                    });
                });
            },
            init: function() {
                fetchFileList();
            },
            fetchFileList: fetchFileList,
            getFileCache: function() {
                return filteredFileCache;
            },
            getFileListKnownTypes: function() {
                var modes = zed.getService("modes");
                return filteredFileCache.filter(function(path) {
                    return modes.getModeForPath(path);
                });
            }
        };

        function hint(phrase, results) {
            if (phrase[0] === ':') {
                if (phrase === ":") {
                    return "Type line number and press <tt>Enter</tt> to jump.";
                } else if (phrase == ":/") {
                    return "Type search phrase and press <tt>Enter</tt> to jump to first match.";
                } else if (phrase == ":|") {
                    return "Type search phrase(case insensitive) and press <tt>Enter</tt> to jump to first match.";
                } else if (phrase[1] === '/') {
                    return "<tt>Enter</tt> jumps to first match for '" + _.escape(phrase.substring(2)) + "'";
                } else if (phrase == ":@") {
                    return "Type symbol name and press <tt>Enter</tt> to jump to it.";
                } else if (phrase[1] === '@') {
                    return "<tt>Enter</tt> jumps to first definition of '" + _.escape(phrase.substring(2)) + "'";
                } else {
                    return "<tt>Enter</tt> jumps to line " + phrase.substring(1);
                }
            } else if (phrase[0] === "@") {
                if (phrase === "@") {
                    return "Type symbol name to jump to within this project.";
                } else {
                    return "<tt>Enter</tt> jumps to the first symbol matching your query.";
                }
            } else if(phrase[0] === "#") {
                if(phrase === "#") {
                    return "Type a phrase to search the project for";
                } else {
                    return "<tt>Enter</tt> will start a project search.";
                }
            } else if (phrase && (results.length === 0 || phrase[0] === "/")) {
                return "<tt>Return</tt> creates and/or opens this file.";
            } else {
                return "<tt>Return</tt> opens the selected file.";
            }
        }

        function fetchFileList() {
            console.log("Fetching file list...");
            return fs.listFiles().then(function(files) {
                fileCache = files;
                Object.keys(session_manager.specialDocs).forEach(function(path) {
                    fileCache.push(path);
                });
                updateFilteredFileCache();
                eventbus.emit("loadedfilelist");
            }, function(err) {
                console.error("Error listing files", err);
                return Promise.reject(err);
            });
        }

        function escapeRegExp(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        function wildcardToRegexp(str) {
            str = escapeRegExp(str);
            str = str.replace(/\\\*/g, ".*");
            return "^" + str + "$";
        }

        function updateFilteredFileCache() {
            var excludes = zed.getService("config").getPreference("gotoExclude");
            if (!excludes || excludes.length === 0) {
                filteredFileCache = fileCache;
                return;
            }
            var regex = new RegExp(excludes.map(wildcardToRegexp).join("|"));
            filteredFileCache = fileCache.filter(function(path) {
                return !regex.exec(path);
            });
        }

        command.define("Navigate:Goto", {
            doc: "Prompts for the name of a file to edit, opening and creating it if necessary.",
            exec: function(edit, session, text) {
                if (typeof text !== "string") {
                    text = undefined;
                }
                var currentPos = edit.getCursorPosition();
                var selectionRange = edit.getSelectionRange();

                function filterSymbols(phrase, path) {
                    return symbol.getSymbols({
                        prefix: phrase.substring(1),
                        path: path,
                        limit: 250
                    }).then(function(symbols) {
                        var symbolList = symbols.map(function(t) {
                            var parts = t.path.split("/");
                            return {
                                name: t.symbol,
                                path: t.path + ":" + t.locator,
                                meta: parts[parts.length - 1],
                                icon: t.type,
                                score: 1
                            };
                        });
                        return symbolList;
                    });
                }

                function filter(phrase) {
                    var sessions = session_manager.getSessions();
                    var resultsPromise;
                    var phraseParts = locator.parse(phrase);
                    phrase = phraseParts[0];
                    var loc = phraseParts[1];

                    if (!phrase && loc !== undefined) {
                        if (loc[0] === "@") {
                            resultsPromise = filterSymbols(loc, session.filename);
                        } else {
                            resultsPromise = Promise.resolve([]);
                        }
                    } else if (phrase[0] === "@") {
                        resultsPromise = filterSymbols(phrase);
                    } else if (phrase[0] === "#") {
                        resultsPromise = Promise.resolve([]);
                    } else if (phrase[0] === '/') {
                        var results = {};
                        phrase = phrase.toLowerCase();
                        filteredFileCache.forEach(function(file) {
                            var fileNorm = file.toLowerCase();
                            var score = 1;

                            if (sessions[file]) {
                                score = sessions[file].lastUse;
                            }

                            if (fileNorm.substring(0, phrase.length) === phrase) {
                                results[file] = score;
                            }
                        });
                        var resultList = [];
                        if (fileCache.indexOf(phrase) === -1 && ":@#".indexOf(phrase[0]) === -1) {
                            resultList.push({
                                path: phrase,
                                name: "Create file '" + phrase + "'",
                                score: Infinity,
                                icon: "action"
                            });
                        }
                        Object.keys(results).forEach(function(path) {
                            resultList.push({
                                path: path,
                                name: path,
                                score: results[path],
                                icon: "file"
                            });
                        });
                        resultsPromise = Promise.resolve(resultList);
                    } else {
                        // Regular file path goto
                        var filterPromise = new Promise(function(resolve, reject) {
                            var resultList = fuzzyfind(filteredFileCache, phrase);
                            resultList.forEach(function(result) {
                                result.name = result.path;
                                if (sessions[result.path]) {
                                    result.score += sessions[result.path].lastUse / 100000000;
                                }
                                result.icon = "file";
                            });
                            resolve(resultList);
                        });
                        resultsPromise = Promise.all([filterSymbols("@" + phrase), filterPromise]).then(function(matchLists) {
                            return matchLists[1].concat(matchLists[0]);
                        });
                    }

                    return resultsPromise.then(function(resultList) {
                        var editors = editor.getEditors();

                        // Filter out paths currently open in an editor
                        resultList.forEach(function(result) {
                            for (var i = 0; i < editors.length; i++) {
                                if (editors[i].getSession().filename === result.path) {
                                    result.score = 0;
                                }
                            }
                        });

                        resultList.sort(function(r1, r2) {
                            if (r1.score === r2.score) {
                                if(r1.icon === "file") {
                                    // In case of files shorter is better
                                    return r1.path.length - r2.path.length;
                                } else {
                                    // In case of the rest, just sort by path
                                    return r1.path < r2.path ? -1 : 1;
                                }
                            } else {
                                return r2.score - r1.score;
                            }
                        });

                        if (resultList.length === 0 && loc === undefined && ":@#".indexOf(phrase[0]) === -1) {
                            resultList = [{
                                path: phrase,
                                name: "Create file '" + phrase + "'",
                                icon: "action"
                            }];
                        } else if (phrase[0] === "#") {
                            resultList = [{
                                path: phrase,
                                name: "Project search: " + phrase.substring(1),
                                icon: "action"
                            }];
                        }
                        return resultList;
                    });
                }

                // TODO: Clean this up, has gotten messy over time
                ui.filterBox({
                    placeholder: "Path",
                    filter: filter,
                    text: text,
                    currentPath: session.filename,
                    onChange: function(phrase, selectedItem) {
                        var phraseParts = locator.parse(phrase);
                        var loc = phraseParts[1];
                        if (loc && (!phraseParts[0] || phraseParts[0] === session.filename)) {
                            locator.jump(loc, selectionRange, selectedItem);
                        }
                    },
                    hint: hint,
                    onSelect: function(file, phrase) {
                        var currentPath = session.filename;
                        var fileOnly, loc, phraseParts;
                        phraseParts = locator.parse(phrase);
                        if (file !== phrase) {
                            loc = phraseParts[1];
                            fileOnly = file || currentPath;
                        } else {
                            fileOnly = phraseParts[0] || currentPath;
                            loc = phraseParts[1];
                        }

                        if(phrase[0] === "#") {
                            session.$cmdInfo = {
                                phrase: phrase.substring(1)
                            };
                            command.exec("Find:Find In Project Internal", edit, session);
                            return;
                        }
                        // Actual jumping only needs to happen if it's non-local
                        // i.e. if we're not already there (as is the case with local locators)
                        if ((phraseParts[0] || !loc) && ":@#".indexOf(fileOnly[0]) === -1) {
                            file = fileOnly + (loc ? ':' + loc : '');
                            session_manager.go(file, edit, session);
                        }
                        eventbus.emit("goto", phrase);
                    },
                    onCancel: function() {
                        // do not cancel if user have clicked on the editor
                        if (edit.isFocused() && edit.$mouseHandler.isMousePressed)
                            return;
                        editor.switchSession(session, edit);
                        edit.moveCursorToPosition(currentPos);
                        edit.clearSelection();
                    }
                });
            },
            readOnly: true
        });

        command.define("Navigate:Reload Filelist", {
            doc: "Scan the project tree for any new files that were created outside of Zed.",
            exec: fetchFileList,
            readOnly: true
        });

        command.define("Navigate:Last Edit Point", {
            exec: function(edit, session) {
                if(globalLastEditPoint) {
                    session_manager.go(globalLastEditPoint.session.filename, edit, session).then(function(session) {
                        session.selection.moveCursorTo(globalLastEditPoint.cursor.row, globalLastEditPoint.cursor.column);
                        session.selection.clearSelection();
                    });
                }
            },
            readOnly: true
        });

        command.define("Find:Find In Project", {
            doc: "Search the project.",
            exec: function(edit, session) {
                command.exec("Navigate:Goto", edit, session, "#");
            },
            readOnly: true
        });

        command.define("Navigate:Path Under Cursor", {
            doc: "Open the filename indicated by the cursor.",
            exec: function(edit, session) {
                var path = editor.getPathUnderCursor();
                command.exec("Navigate:Goto", edit, session, path);
            },
            readOnly: true
        });

        command.define("Navigate:Lookup Symbol", {
            doc: "Prompts you for a symbol to search for in this project.",
            exec: function(edit, session) {
                command.exec("Navigate:Goto", edit, session, "@");
            },
            readOnly: true
        });

        command.define("Navigate:Lookup Symbol In File", {
            doc: "Prompts you for a symbol to search for just within the current file.",
            exec: function(edit, session) {
                command.exec("Navigate:Goto", edit, session, ":@");
            },
            readOnly: true
        });

        command.define("Navigate:Lookup Symbol Under Cursor", {
            doc: "Searches for the word at your cursor within this project.",
            exec: function(edit, session) {
                var ident = editor.getIdentifierUnderCursor();
                command.exec("Navigate:Goto", edit, session, "@" + ident);
            },
            readOnly: true
        });

        register(null, {
            goto: api
        });
    }
});
