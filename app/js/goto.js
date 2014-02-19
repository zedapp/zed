/*global define _*/
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var ctags = require("./ctags");
    var fuzzyfind = require("./lib/fuzzyfind");
    var ui = require("./lib/ui");

    var editor = require("./editor");
    var session_manager = require("./session_manager");
    var project = require("./project");
    var command = require("./command");
    var locator = require("./lib/locator");

    var fileCache = [];
    var filteredFileCache = [];

    eventbus.declare("loadedfilelist");

    function hint(phrase, results) {
        if (phrase[0] === ':') {
            if (phrase === ":") {
                return "Type line number and press <tt>Enter</tt> to jump.";
            } else if (phrase == ":/") {
                return "Type search phrase and press <tt>Enter</tt> to jump to first match.";
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
        } else if (phrase && (results.length === 0 || phrase[0] === "/")) {
            return "<tt>Return</tt> creates and/or opens this file.";
        } else {
            return "<tt>Return</tt> opens the selected file.";
        }
    }

    function fetchFileList() {
        console.log("Fetching file list...");
        project.listFiles(function(err, files) {
            fileCache = files;
            require(["./session_manager"], function(session_manager) {
                Object.keys(session_manager.specialDocs).forEach(function(path) {
                    fileCache.push(path);
                });
                updateFilteredFileCache();
                eventbus.emit("loadedfilelist");
            })
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
        require(["./config"], function(config) {
            var excludes = config.getPreference("gotoExclude");
            if (!excludes || excludes.length === 0) {
                filteredFileCache = fileCache;
                return;
            }
            var regex = new RegExp(excludes.map(wildcardToRegexp).join("|"));
            filteredFileCache = fileCache.filter(function(path) {
                return !regex.exec(path);
            });
        });
    }

    exports.fetchFileList = fetchFileList;

    exports.hook = function() {
        eventbus.on("ioavailable", fetchFileList);

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
        eventbus.on("configchanged", function(config) {
            updateFilteredFileCache();
        });
    };

    command.define("Navigate:Goto", {
        exec: function(edit, session, text) {
            if (typeof text !== "string") {
                text = undefined;
            }
            var currentPos = edit.getCursorPosition();
            var selectionRange = edit.getSelectionRange();

            function filterSymbols(phrase, path) {
                var tags = ctags.getCTags(path);
                var symbols = tags.map(function(t) {
                    return t.path + ":" + t.locator + "/" + t.symbol;
                });
                var resultList = fuzzyfind(symbols, phrase.substring(1));
                resultList.forEach(function(result) {
                    var parts = result.path.split('/');
                    result.name = parts[parts.length - 1];
                    result.path = parts.slice(0, -1).join("/");
                    parts = result.path.split(":")[0].split("/");
                    result.meta = parts[parts.length - 1];
                });
                return resultList;
            }

            function filter(phrase) {
                var sessions = session_manager.getSessions();
                var resultList;
                var phraseParts = locator.parse(phrase);
                phrase = phraseParts[0];
                var loc = phraseParts[1];

                if (!phrase && loc !== undefined) {
                    if (loc[0] === "@") {
                        resultList = filterSymbols(loc, session.filename);
                    } else {
                        resultList = [];
                    }
                } else if (phrase[0] === "@") {
                    resultList = filterSymbols(phrase);
                } else if (phrase[0] === '/') {
                    var results = {};
                    phrase = phrase.toLowerCase();
                    filteredFileCache.forEach(function(file) {
                        var fileNorm = file.toLowerCase();
                        var score = 1;

                        if (sessions[file]) {
                            score = sessions[file].lastUse;
                        }

                        if (fileNorm.substring(0, phrase.length) === phrase) results[file] = score;
                    });
                    resultList = [];
                    if (fileCache.indexOf(phrase) === -1) {
                        resultList.push({
                            path: phrase,
                            name: "Create file '" + phrase + "'",
                            meta: "action",
                            score: Infinity
                        });
                    }
                    Object.keys(results).forEach(function(path) {
                        resultList.push({
                            path: path,
                            name: path,
                            score: results[path]
                        });
                    });
                } else {
                    resultList = fuzzyfind(filteredFileCache, phrase);
                    resultList.forEach(function(result) {
                        result.name = result.path;
                        if (sessions[result.path]) {
                            result.score = sessions[result.path].lastUse;
                        }
                    });
                }

                var editors = editor.getEditors();

                // Filter out paths currently open in an editor
                resultList = resultList.filter(function(result) {
                    // Filter out files starting with . (TODO: do this properly)
                    if (result.path[1] === ".") {
                        return false;
                    }
                    for (var i = 0; i < editors.length; i++) {
                        if (editors[i].getSession().filename === result.path) {
                            return false;
                        }
                    }
                    return true;
                });

                resultList.sort(function(r1, r2) {
                    if (r1.score === r2.score) {
                        return r1.path < r2.path ? -1 : 1;
                    } else {
                        return r2.score - r1.score;
                    }
                });

                if (resultList.length === 0 && loc === undefined) {
                    resultList = [{
                        path: phrase,
                        name: "Create file '" + phrase + "'",
                        meta: "action"
                    }];
                }
                return resultList;
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
                        fileOnly = file || currentPath;
                        loc = phraseParts[1];
                    } else {
                        fileOnly = phraseParts[0] || currentPath;
                        loc = phraseParts[1];
                    }
                    // Actual jumping only needs to happen if it's non-local
                    // i.e. if we're not already there (as is the case with local locators)
                    if (phraseParts[0] || !loc) {
                        file = fileOnly + (loc ? ':' + loc : '');
                        session_manager.go(file, edit, session);
                    }
                },
                onCancel: function() {
                    edit.moveCursorToPosition(currentPos);
                    edit.clearSelection();
                    editor.switchSession(session, edit);
                }
            });
        },
        readOnly: true
    });

    command.define("Navigate:Reload Filelist", {
        exec: fetchFileList,
        readOnly: true
    });

    command.define("Navigate:Path Under Cursor", {
        exec: function(edit, session) {
            var path = editor.getPathUnderCursor();
            command.exec("Navigate:Goto", edit, session, path);
        },
        readOnly: true
    });

    command.define("Navigate:Lookup Symbol", {
        exec: function(edit, session) {
            command.exec("Navigate:Goto", edit, session, "@");
        },
        readOnly: true
    });

    command.define("Navigate:Lookup Symbol In File", {
        exec: function(edit, session) {
            command.exec("Navigate:Goto", edit, session, ":@");
        },
        readOnly: true
    });

    command.define("Navigate:Lookup Symbol Under Cursor", {
        exec: function(edit, session) {
            var ident = editor.getIdentifierUnderCursor();
            command.exec("Navigate:Goto", edit, session, "@" + ident);
        },
        readOnly: true
    });

    exports.getFileCache = function() {
        return filteredFileCache;
    };
});