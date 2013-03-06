define(function(require, exports, module) {
    var editor = require("editor");
    var session_manager = require("session_manager");
    var eventbus = require("eventbus");
    var keys = require("keys");
    var io = require("io");
    var fuzzyfind = require("fuzzyfind");

    var fileCache = [];

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
        
        if(phrase[0] !== '/') {
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

    var visible = false;

    function show() {
        if(visible)
            return;
        var edit = editor.getActiveEditor();
        //$(edit.container).parent().append("<div id='goto'><input type='text' id='gotoinput' placeholder='file'/><ul id='results'>");
        $("body").append("<div id='goto'><input type='text' id='gotoinput' placeholder='path pattern'/><ul id='results'>");
        
        var editorEl = $(edit.container);
        var gotoEl = $("#goto");
        
        gotoEl.css("left", (editorEl.offset().left + 40) + "px");
        gotoEl.css("width", (editorEl.width() - 80) + "px");
        gotoEl.css("top", editorEl.offset().top + "px");
        
        visible = true;

        var box = $("#goto");
        var input = $("#gotoinput");
        var resultsEl = $("#results");
        var lastPhrase = null;
        var results = [];
        
        var ignoreFocus = false;
        
        resultsEl.menu({
            select: select,
            focus: function(event, ui) {
                if(ignoreFocus) {
                    ignoreFocus = false;
                    return;
                }

                input.val(ui.item.text());
            }
        });
        
        function select(event) {
            var filename = input.val();
            var selectedPath = resultsEl.find("a.ui-state-focus").text();
            console.log("Selected path",selectedPath);
            if(filename) {
                if(filename[0] !== '/')
                    filename = selectedPath;
                session_manager.go(filename);
            } else {
                // By default pick the item at the top of the list
                if(selectedPath)
                    session_manager.go(selectedPath);
            }
            close();
            event && event.preventDefault();
        }

        function close() {
            resultsEl.menu("destroy");
            box.remove();
            editor.getActiveEditor().focus();
            visible = false;
        }
        
        input.keyup(function(event) {
            //console.log(event);
            switch(event.keyCode) {
                case 27: // esc
                    close();
                    break;
                case 38: // up
                    resultsEl.menu("previous");
                    break;
                case 40: // down
                    resultsEl.menu("next");
                    break;
                case 13: // enter
                    select();
                    break;
                case 9: // tab
                    break;
                    // explicit non-break
                default:
                    // TODO only update on textual characters
                    if(lastPhrase != input.val()) {
                        var phrase = input.val();
                        selectionIdx = -1;
                        results = filter(phrase).slice(0, 100);
                        resultsEl.empty();
                        results.forEach(function(r, idx) {
                            resultsEl.append('<li><a href="#">' + r.path + '</a></li>');
                        });
                        resultsEl.menu("refresh");
                        if(phrase[0] !== '/') {
                            ignoreFocus = true;
                            resultsEl.menu("next");
                        }
                        lastPhrase = phrase;
                    }
            }
        });
        input.keydown(function(event) {
            console.log(event);
            switch(event.keyCode) {
                case 32: // space
                    var phrase = input.val();
                    if(phrase)
                        break;
                    var session = editor.getActiveSession();
                    if(session.filename) {
                        input.val(io.dirname(session.filename) + "/");
                        event.preventDefault();
                    }
                    break;
                case 8: // backspace
                    var val = input.val();
                    var caret = input.caret();
                    if(val === '/') {
                        input.val('');
                    } else if(val[caret.start-1] === '/') {
                        input.val(io.dirname(input.val()) + "/");
                        event.preventDefault();
                    }
                    break;
                case 9: // Tab
                    if(event.shiftKey)
                        resultsEl.menu("previous");
                    else
                        resultsEl.menu("next");
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });
        input.focus();
    }

    exports.hook = function() {
        eventbus.on("pathchange", function() {
            console.log("Fetching file list...");
            io.find(function(err, files) {
                fileCache = files;
            });
        });
        
        eventbus.on("newfilesession", function(path) {
            fileCache.push(path.filename);
        });

        eventbus.once("keysbindable", function() {
            keys.bind("Command-e", function() {
                show();
            });
        });
    };

    exports.init = function() { };

    exports.getFileCache = function() {
        return fileCache;
    };
});
