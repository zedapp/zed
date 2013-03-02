define(function(require, exports, module) {
    require("jquery.caret.min");
    
    var editor = require("editor");
    var session_manager = require("session_manager");
    var eventbus = require("eventbus");
    var keys = require("keys");
    var io = require("io");

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
        var results = {};

        var sessions = session_manager.getSessions();
        var currentPath = editor.getActiveSession().filename || "";
        phrase = phrase.toLowerCase();
        for(var i = 0; i < fileCache.length; i++) {
            var file = fileCache[i];
            var fileNorm = file.toLowerCase();
            var score = 1;

            if(sessions[file]) {
                score = sessions[file].lastUse;
            }
            
            if(editor.getActiveSession().filename === file)
                continue;

            // If starts with /, then prefix matching
            if(phrase[0] === '/') {
                if(fileNorm.substring(0, phrase.length) === phrase)
                    results[file] = score;
            }
            // Super trivial matching
            else if(fileNorm.indexOf(phrase) !== -1) {
                results[file] = score;
            }
        }
        var resultList = [];
        for(var path in results) {
            if(results.hasOwnProperty(path))
                resultList.push(new Result(path, results[path]));
        }
        resultList.sort(function(r1, r2) {
            if(r1.score === r2.score) {
                // var lengthDiff1 = Math.abs(r1.path.length - currentPath.length);
                // var lengthDiff2 = Math.abs(r2.path.length - currentPath.length);
                var pathMatch1 = pathMatch(currentPath, r1.path);
                var pathMatch2 = pathMatch(currentPath, r2.path);
                return pathMatch1 - pathMatch2;
            }
            else
                return r2.score - r1.score;
        });
        return resultList;
    }

    var visible = false;

    function show() {
        if(visible)
            return;
        $("body").append("<div id='goto'><input type='text' id='gotoinput' placeholder='file'/><ul id='results'>");
        visible = true;

        var box = $("#goto");
        var input = $("#gotoinput");
        var resultsEl = $("#results");
        var selectionIdx = -1;
        var lastPhrase = null;
        var results = [];

        function unselect() {
            resultsEl.find("li").removeClass("selected");
        }

        function select() {
            if(selectionIdx >= 0) {
                var li = resultsEl.find("li").eq(selectionIdx);
                li.addClass("selected");
                input.val(li.text());
            } else if(input.val()[0] !== '/') {
                resultsEl.find("li").eq(0).addClass("selected");
            }
        }

        function close() {
            box.remove();
            editor.getActiveEditor().focus();
            visible = false;
        }
        
        function down() {
            unselect();
            selectionIdx = Math.min(results.length - 1, selectionIdx + 1);
            select();
        }
        
        function up() {
            unselect();
            selectionIdx = Math.max(0, selectionIdx - 1);
            select();
        }

        input.keyup(function(event) {
            //console.log(event);
            switch(event.keyCode) {
                case 27: // esc
                    close();
                    break;
                case 38: // up
                    up();
                    break;
                case 40: // down
                    down();
                    break;
                case 13: // enter
                    var filename = input.val();
                    if(filename) {
                        if(filename[0] !== '/')
                            filename = resultsEl.find("li").eq(0).text();
                        session_manager.go(filename);
                    } else {
                        // By default pick the item at the top of the list
                        filename = resultsEl.find("li").eq(0).text();
                        if(filename)
                            session_manager.go(filename);
                    }
                    close();
                    break;
                case 9: // tab
                    break;
                case 191: // slash
                    var firstMatch = results[0].path;
                    var phrase = input.val();
                    if(phrase !== "/") {
                        var idx = firstMatch.indexOf(phrase.substring(0, phrase.length-1));
                        var idxSlash = firstMatch.indexOf('/', idx + phrase.length) + 1;
                        var slice = firstMatch.substring(0, idxSlash);
                        console.log(firstMatch, idx, idxSlash, slice);
                        input.val(slice);
                    }
                    // explicit non-break
                default:
                    // TODO only update on textual characters
                    console.log(event);
                    if(lastPhrase != input.val()) {
                        selectionIdx = -1;
                        results = filter(input.val()).slice(0, 100);
                        resultsEl.empty();
                        results.forEach(function(r, idx) {
                            resultsEl.append('<li>' + r.path + '</li>');
                        });
                        select();
                        lastPhrase = input.val();
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
                        up();
                    else
                        down();
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });
        input.focus();
    }

    eventbus.on("pathchange", function() {
        console.log("Fetching file list...");
        io.find(function(err, files) {
            fileCache = files;
        });
    });
    
    eventbus.on("newfilesession", function(path) {
        fileCache.push(path);
    });

    keys.bind("Command-e", function() {
        show();
    });
    
    exports.getFileCache = function() {
        return fileCache;
    };
});
