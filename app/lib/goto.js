define(function(require, exports, module) {
    var editor = require("./editor");
    var session_manager = require("./session_manager");
    var eventbus = require("./eventbus");
    var keys = require("./keys");
    var project = require("./project");
    var fuzzyfind = require("./fuzzyfind");
    var command = require("./command");
    var ui = require("./ui");
    var locator = require("./locator");

    var fileCache = [];
    
    eventbus.declare("loadedfilelist");

    function Result(path, score) {
        this.path = path;
        this.score = score;
    }
    
    function pathMatch(currentPath, path) {
        var partsMatch = 0;
        for(var i = 0; i < currentPath.length && i < path.length && currentPath[i] === path[i]; i++) {
            if(currentPath[i] === '/')
                partsMatch++;
            //partsMatch += .001;
        }
        for(var j = i; j < path.length; j++) {
            if(path[j] === '/')
                partsMatch--;
            
            // Slightly favor shorter paths
            partsMatch -= .1;
        }
        return partsMatch;
    }

    function filter(phrase) {
        var sessions = session_manager.getSessions();
        var resultList;
        var currentPath = editor.getActiveSession().filename || "";
        var phraseParts = phrase.split(':');
        phrase = phraseParts[0];
        var loc = phraseParts[1];
        
        if(!phrase && loc) {
            resultList = [];
        } else if(phrase[0] !== '/') {
            resultList = fuzzyfind(fileCache, phrase);
            resultList.forEach(function(result) {
                if(sessions[result.path]) {
                    result.score = sessions[result.path].lastUse;
                }
            });
        } else {
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
            for(var path in results) {
                if(results.hasOwnProperty(path))
                    resultList.push(new Result(path, results[path]));
            }
        }
        var editors = editor.getEditors();
        resultList = resultList.filter(function(result) {
            for(var i = 0; i < editors.length; i++) {
                if(editors[i].getSession().filename === result.path)
                    return false;
            }
            return true;
        });
        
        resultList.sort(function(r1, r2) {
            if(r1.score === r2.score) {
                return r1.path < r2.path ? -1 : 1;
                // var lengthDiff1 = Math.abs(r1.path.length - currentPath.length);
                // var lengthDiff2 = Math.abs(r2.path.length - currentPath.length);
                var pathMatch1 = pathMatch(currentPath, r1.path);
                var pathMatch2 = pathMatch(currentPath, r2.path);
                return pathMatch1 - pathMatch2;
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
            return "<tt>Return</tt> opens the selected file."
        }
    }
    
    function fetchFileList() {
        console.log("Fetching file list...");
        project.filelist(function(err, files) {
            fileCache = files;
            eventbus.emit("loadedfilelist")
        });
    }

    exports.hook = function() {
        eventbus.on("ioavailable", fetchFileList);
        
        eventbus.on("newfilesession", function(path) {
            fileCache.push(path.filename);
        });
    };
    
    command.define("File:Goto", {
        exec: function(edit, text) {
            var currentPos = edit.getCursorPosition();
            var selectionRange = edit.getSelectionRange();
            ui.filterBox({
                placeholder: "file path",
                filter: filter,
                text: text,
                onChange: function(phrase) {
                    var phraseParts = phrase.split(':');
                    var loc = phraseParts[1];
                    if(loc) {
                        locator.jump(loc, selectionRange);
                    }
                },
                hint: hint,
                onSelect: function(file, phrase) {
                    var fileOnly, locator, phraseParts;
                    console.log("File", file, "phrase", phrase);
                    if(file !== phrase) {
                        phraseParts = phrase.split(':');
                        fileOnly = file;
                        locator = phraseParts[1];
                        file = fileOnly + ':' + locator;
                    } else {
                        phraseParts = file.split(':');
                        fileOnly = phraseParts[0];
                        locator = phraseParts[1];
                    }
                    if(!fileOnly && locator) {
                        // Nothing to do, already there
                    } else {
                        session_manager.go(file);
                    }
                },
                onCancel: function() {
                    editor.getActiveEditor().moveCursorToPosition(currentPos);
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
            
        },
        readOnly: true
    });

    exports.init = function() { };

    exports.getFileCache = function() {
        return fileCache;
    };
});
