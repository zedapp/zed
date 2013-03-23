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
    
    eventbus.declare("loadedfilelist");

    // TODO: Solve this in a cleaner way
    var beforeGotoSession = null;

    function filter(phrase) {
        var sessions = session_manager.getSessions();
        var resultList;
        var phraseParts = phrase.split(':');
        phrase = phraseParts[0];
        var loc = phraseParts[1];
        
        if(!phrase && loc !== undefined) {
            resultList = [];
        } else if(phrase[0] === "@") {
            var tags = ctags.getCTags();
            var symbols = tags.map(function(t) { return t.path + ":" + t.locator + "/" + t.symbol; });
            resultList = fuzzyfind(symbols, phrase.substring(1));
            resultList.forEach(function(result) {
                var parts = result.path.split('/');
                result.name = parts[parts.length-1];
                result.path = parts.slice(0, -1).join("/");
                parts = result.path.split(":")[0].split("/");
                result.meta = parts[parts.length-1];
            });
        } else if(phrase[0] === '/') {
            var results = {};
            phrase = phrase.toLowerCase();
            for(var i = 0; i < fileCache.length; i++) {
                var file = fileCache[i];
                var fileNorm = file.toLowerCase();
                var score = 1;
    
                if(sessions[file]) {
                    score = sessions[file].lastUse;
                }
    
                if(fileNorm.substring(0, phrase.length) === phrase)
                    results[file] = score;
            }
            var resultList = [];
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
    
    function esc(s) {
        return s.replace(/</g, "&lt;");
    }
    
    function hint(phrase, results) {
        if(phrase[0] === ':') {
            if(phrase === ":") {
                return "Type line number and press <tt>Enter</tt> to jump.";
            } else if(phrase == ":/") {
                return "Type search phrase and press <tt>Enter</tt> to jump to first match.";
            } else if(phrase[1] === '/') {
                return "<tt>Enter</tt> jumps to first match for '" + esc(phrase.substring(2)) + "'";
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
    
    command.define("File:Goto", {
        exec: function(edit, text) {
            var currentPos = edit.getCursorPosition();
            var selectionRange = edit.getSelectionRange();
            beforeGotoSession = edit.getSession();
            var jumpTimer = null;
            var previewSession = null;

            ui.filterBox({
                placeholder: "file path",
                filter: filter,
                text: text,
                onChange: function(phrase, selection) {
                    var phraseParts = phrase.split(':');
                    var loc = phraseParts[1];
                    if(!phraseParts[0] && loc) {
                        locator.jump(loc, selectionRange);
                    }
                    if(selection) {
                        // Let's delay this a little bit
                        if (jumpTimer) {
                            clearTimeout(jumpTimer);
                        }
                        jumpTimer = setTimeout(function() {
                            session_manager.previewGo(selection, edit, function(err, session) {
                                previewSession = session;
                            });
                        }, 500);
                    }
                },
                hint: hint,
                onSelect: function(file, phrase) {
                    var fileOnly, locator, phraseParts;
                    if(jumpTimer) {
                        clearTimeout(jumpTimer);
                    }
                    if(file !== phrase) {
                        phraseParts = phrase.split(':');
                        fileOnly = file;
                        locator = phraseParts[1];
                        file = fileOnly + (locator ? ':' + locator : '');
                    } else {
                        phraseParts = file.split(':');
                        fileOnly = phraseParts[0];
                        locator = phraseParts[1];
                    }
                    if(!fileOnly && locator) {
                        // Nothing to do, already there
                    } else {
                        session_manager.go(file, edit, beforeGotoSession, previewSession);
                    }
                    beforeGotoSession = null;
                },
                onCancel: function() {
                    var edit = editor.getActiveEditor();
                    edit.moveCursorToPosition(currentPos);
                    edit.clearSelection();
                    edit.centerSelection();
                    editor.switchSession(beforeGotoSession, edit);
                    beforeGotoSession = null;
                }
            });
        },
        readOnly: true
    });
    
    command.define("File:Reload Filelist", {
        exec: fetchFileList,
        readOnly: true
    });
    
    command.define("File:Goto File Under Cursor", {
        exec: function(edit) {
            var path = editor.getPathUnderCursor();
            command.exec("File:Goto", edit, path);
        },
        readOnly: true
    });
    
    command.define("File:Goto Symbol", {
        exec: function(edit) {
            command.exec("File:Goto", edit, "@");
        }
    });
    
    command.define("File:Goto Symbol Under Cursor", {
        exec: function(edit) {
            var ident = editor.getIdentifierUnderCursor();
            command.exec("File:Goto", edit, "@" + ident);
        }
    });

    exports.getFileCache = function() {
        return fileCache;
    };
});
