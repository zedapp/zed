/*global _, define */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["fs", "config"];
    plugin.provides = ["ctags"];
    return plugin;

    function plugin(options, imports, register) {
        var opts = require("./lib/options");

        var fs = imports.fs;
        var config = imports.config;

        /**
         * symbol:
         * path:
         * locator:
         */
        var ctagsCache = [];

        var api = {
            getCTags: function(path) {
                if (!path) {
                    return ctagsCache;
                } else {
                    return _.where(ctagsCache, {
                        path: path
                    });
                }
            },
            updateCTags: function(path, ctags) {
                ctagsCache = ctagsCache.filter(function(ctag) {
                    return ctag.path !== path;
                }).concat(ctags);
                api.writeCTags();
            },
            // Writes CTags to a file, but at most once every 5 seconds (that's the debounce part)
            writeCTags: _.debounce(function() {
                if (config.getPreference("hygienicMode") || (config.getPreference("hygienicModeRemote") && opts.get("url").indexOf("http") === 0)) {
                    return;
                }
                var tabbedCTags = ctagsCache.map(function(ctag) {
                    if (!ctag.path) {
                        console.log("Err", ctag);
                    }
                    return ctag.symbol + "\t" + ctag.path.substring(1) + "\t" + ctag.locator;
                });
                fs.writeFile("/tags", tabbedCTags.join("\n"), function(err) {
                    if (err) {
                        console.error("Could not write /tags", err);
                    }
                });
            }, 5000)
        };


        function fetchCTags() {
            console.log("Fetching CTags...");
            fs.readFile("/tags", function(err, text) {
                ctagsCache = [];
                if (err) {
                    return;
                }
                var lines = text.split("\n");
                lines.forEach(function(line) {
                    // Ignore lines that start with !
                    if (line[0] == "!") return;
                    if (!line) return;

                    var parts = line.split("\t");
                    var symbol = parts[0];
                    var path = parts[1];
                    var locator = parts[2].substring(0, 50);

                    // Normalize
                    if (path[0] !== "/") path = "/" + path;

                    if (locator[0] === "/" && locator[1] === "^") {
                        // Ditch the ^
                        locator = "/" + locator.substring(2);
                    } else if (locator[0] >= '0' && locator[0] <= '9') {
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

        fetchCTags();

        register(null, {
            ctags: api
        });
    }
});
