/*global _, define */
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");
    var project = require("./project");
    var settings = require("./settings");

    /**
     * symbol:
     * path:
     * locator:
     */
    var ctagsCache = [];

    exports.getCTags = function(path) {
        if(!path) {
            return ctagsCache;
        } else {
            return _.where(ctagsCache, {path: path});
        }
    };

    exports.updateCTags = function(path, ctags) {
        ctagsCache = ctagsCache.filter(function(ctag) {
            return ctag.path !== path;
        }).concat(ctags);
        exports.writeCTags();
    };

    exports.writeCTags = _.debounce(function() {
        if(settings.getPreference("hygienicMode") ||
           (settings.getPreference("hygienicModeRemote") && options.get("url").indexOf("http") === 0)) {
            return;
        }
        var tabbedCTags = ctagsCache.map(function(ctag) {
            if(!ctag.path) {
                console.log("Err", ctag);
            }
            return ctag.symbol + "\t" + ctag.path.substring(1) + "\t" + ctag.locator;
        });
        project.writeFile("/tags", tabbedCTags.join("\n"), function(err) {
            if(err) {
                console.error("Could not write /tags", err);
            }
        });
    }, 5000);

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
