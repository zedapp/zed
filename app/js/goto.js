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
    var settings = require("./settings");

    var fileCache = [];
    
    eventbus.declare("loadedfilelist");

    function hint(phrase, results) {
        if(phrase[0] === ':') {
            if(phrase === ":") {
                return "Type line number and press <tt>Enter</tt> to jump.";
            } else if(phrase == ":/") {
                return "Type search phrase and press <tt>Enter</tt> to jump to first match.";
            } else if(phrase[1] === '/') {
                return "<tt>Enter</tt> jumps to first match for '" + _.escape(phrase.substring(2)) + "'";
            } else if(phrase == ":@") {
                return "Type symbol name and press <tt>Enter</tt> to jump to it.";
            } else if(phrase[1] === '@') {
                return "<tt>Enter</tt> jumps to first definition of '" + _.escape(phrase.substring(2)) + "'";
            } else {
                return "<tt>Enter</tt> jumps to line " + phrase.substring(1);
            }
        } else if(phrase && results.length === 0) {
            return "<tt>Return</tt> creates and opens this file.";
        } else {
            return "<tt>Return</tt> opens the selected file.";
        }
    }
    
    function fetchFileList() {
        console.log("Fetching file list...");
        project.listFiles(function(err, files) {
            fileCache = files;
            eventbus.emit("loadedfilelist");
        });
    }

    exports.hook = function() {
        eventbus.on("ioavailable", fetchFileList);
        
        eventbus.on("newfilecreated", function(path) {
            fileCache.push(path);
        });
    };
    
    command.define("Navigate:Goto", {
        exec: function(edit, text) {
            var currentPos = edit.getCursorPosition();
            var selectionRange = edit.getSelectionRange();
            var beforeGotoSession = edit.getSession();
            var jumpTimer = null;
            var previewSession = null;
            
            function filterSymbols(phrase, path) {
                var tags = ctags.getCTags(path);
                var symbols = tags.map(function(t) { return t.path + ":" + t.locator + "/" + t.symbol; });
                var resultList = fuzzyfind(symbols, phrase.substring(1));
                resultList.forEach(function(result) {
                    var parts = result.path.split('/');
                    result.name = parts[parts.length-1];
                    result.path = parts.slice(0, -1).join("/");
                    parts = result.path.split(":")[0].split("/");
                    result.meta = parts[parts.length-1];
                });
                return resultList;
            }
        
            function filter(phrase) {
                var sessions = session_manager.getSessions();
                var resultList;
                var phraseParts = phrase.split(':');
                phrase = phraseParts[0];
                var loc = phraseParts[1];
                
                if(!phrase && loc !== undefined) {
                    if(loc[0] === "@") {
                        resultList = filterSymbols(loc, beforeGotoSession.filename);
                    } else {
                        resultList = [];
                    }
                } else if(phrase[0] === "@") {
                    resultList = filterSymbols(phrase);
                } else if(phrase[0] === '/') {
                    var results = {};
                    phrase = phrase.toLowerCase();
                    fileCache.forEach(function(file) {
                        var fileNorm = file.toLowerCase();
                        var score = 1;
            
                        if(sessions[file]) {
                            score = sessions[file].lastUse;
                        }
            
                        if(fileNorm.substring(0, phrase.length) === phrase)
                            results[file] = score;
                    });
                    resultList = [];
                    Object.keys(results).forEach(function(path) {
                        resultList.push({
                            path: path,
                            name: path,
                            score: results[path]
                        });
                    });
                } else {
                    resultList = fuzzyfind(fileCache, phrase);
                    resultList.forEach(function(result) {
                        result.name = result.path;
                        if(sessions[result.path]) {
                            result.score = sessions[result.path].lastUse;
                        }
                    });
                }
                
                var editors = editor.getEditors();
                var activeEditor = editor.getActiveEditor();
                
                // Filter out paths currently open in an editor
                resultList = resultList.filter(function(result) {
                    for(var i = 0; i < editors.length; i++) {
                        if(editors[i] === activeEditor && beforeGotoSession) {
                            if(beforeGotoSession.filename === result.path) {
                                return false;
                            }
                        } else {
                            if(editors[i].getSession().filename === result.path) {
                                return false;
                            }
                        }
                    }
                    return true;
                });
                
                resultList.sort(function(r1, r2) {
                    if(r1.score === r2.score) {
                        return r1.path < r2.path ? -1 : 1;
                    } else {
                        return r2.score - r1.score;
                    }
                });
                return resultList;
            }

            session_manager.flushPreviewCache();
            ui.filterBox({
                placeholder: "Path",
                filter: filter,
                text: text,
                currentPath: beforeGotoSession.filename,
                onChange: function(phrase, selectedItem) {
                    var phraseParts = phrase.split(':');
                    var loc = phraseParts[1];
                    if(!phraseParts[0] && loc) {
                        if(!selectedItem && (!previewSession || previewSession.filename !== beforeGotoSession.filename)) {
                            session_manager.previewGo(beforeGotoSession.filename, edit, function(err, session) {
                                previewSession = session;
                                locator.jump(loc, selectionRange);
                            });
                            return;
                        } else if(!selectedItem) {
                            locator.jump(loc, selectionRange);
                            return;
                        }
                    }
                    if(selectedItem) {
                        // Let's delay this a little bit
                        if (jumpTimer) {
                            clearTimeout(jumpTimer);
                        }
                        jumpTimer = setTimeout(function() {
                            session_manager.previewGo(selectedItem, edit, function(err, session) {
                                previewSession = session;
                            });
                        }, settings.get("previewDelay"));
                    }
                },
                hint: hint,
                onSelect: function(file, phrase) {
                    if(jumpTimer) {
                        clearTimeout(jumpTimer);
                    }
                    
                    var currentPath = beforeGotoSession.filename;
                    var fileOnly, locator, phraseParts;
                    if(file !== phrase) {
                        phraseParts = phrase.split(':');
                        fileOnly = file || currentPath;
                        locator = phraseParts[1];
                    } else {
                        phraseParts = file.split(':');
                        fileOnly = phraseParts[0] || currentPath;
                        locator = phraseParts[1];
                    }
                    file = fileOnly + (locator ? ':' + locator : '');
                    session_manager.go(file, edit, beforeGotoSession, previewSession);
                },
                onCancel: function() {
                    if (jumpTimer) {
                        clearTimeout(jumpTimer);
                    }
                    edit.moveCursorToPosition(currentPos);
                    edit.clearSelection();
                    editor.switchSession(beforeGotoSession, edit);
                }
            });
        },
        readOnly: true
    });
    
    command.define("File:Reload Filelist", {
        exec: fetchFileList,
        readOnly: true
    });
    
    command.define("Navigate:Path Under Cursor", {
        exec: function(edit) {
            var path = editor.getPathUnderCursor();
            command.exec("Navigate:Goto", edit, path);
        },
        readOnly: true
    });
    
    command.define("Navigate:Lookup Symbol", {
        exec: function(edit) {
            command.exec("Navigate:Goto", edit, "@");
        }
    });

    command.define("Navigate:Lookup Symbol In File", {
        exec: function(edit) {
            command.exec("Navigate:Goto", edit, ":@");
        }
    });

    command.define("Navigate:Lookup Symbol Under Cursor", {
        exec: function(edit) {
            var ident = editor.getIdentifierUnderCursor();
            command.exec("Navigate:Goto", edit, "@" + ident);
        }
    });

    exports.getFileCache = function() {
        return fileCache;
    };
});
