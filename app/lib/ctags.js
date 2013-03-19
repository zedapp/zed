define(function(require, exports, module) {
    "use strict";
    var project = require("./project");
    var eventbus = require("./eventbus")
    var ctagsCache = [];
    
    exports.getCTags = function() {
        return ctagsCache;
    }
    
    function fetchCTags() {
        console.log("Fetching CTags...");
        project.readFile("/tags", function(err, text) {
            ctagsCache = [];
            if(err) {
                return;
            }
            var lines = text.split("\n");
            lines.forEach(function(line) {
                // Ignore lines that start with !
                if(line[0] == "!")
                    return;
                if(!line)
                    return;
                    
                var parts = line.split("\t");
                var symbol = parts[0];
                var path = parts[1];
                var locator = parts[2].substring(0, 50);
                
                // Normalize
                if(path[0] !== "/")
                    path = "/" + path;
                
                if(locator[0] === "/" && locator[1] === "^") {
                    // Ditch the ^
                    locator = "/" + locator.substring(2);
                } else if(locator[0] >= '0' && locator[0] <= '9') {
                    // Number, let's add one (our line numbering is different than vim's)
                    locator = parseInt(locator, 10);
                    locator++;
                }
                ctagsCache.push({
                    symbol: symbol,
                    path: path,
                    locator: locator
                });
            });
        });
    }
    
    eventbus.once("ioavailable", function() {
        fetchCTags();
        project.watchFile("/tags", function(path, change) {
            if(change === "changed") {
                fetchCTags();
            }
        });
    });
});