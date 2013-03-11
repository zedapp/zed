define(function(require, exports, module) {
    var editor = require("./editor");
    var session_manager = require("./session_manager");
    var eventbus = require("./eventbus");
    var keys = require("./keys");
    var project = require("./project");
    var fuzzyfind = require("./fuzzyfind");
    var command = require("./command");
    var ui = require("./ui");

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

    exports.hook = function() {
        eventbus.on("ioavailable", function() {
            console.log("Fetching file list...");
            project.filelist(function(err, files) {
                fileCache = files;
            });
        });
        
        eventbus.on("newfilesession", function(path) {
            fileCache.push(path.filename);
        });
    };
    
    command.define("Goto:Goto Anything", {
        exec: function() {
            ui.filterBox("file path", filter, session_manager.go.bind(session_manager));
        },
        readOnly: true
    });

    exports.init = function() { };

    exports.getFileCache = function() {
        return fileCache;
    };
});
