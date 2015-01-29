/*global _, define */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["db", "eventbus"];
    plugin.provides = ["symbol"];
    return plugin;

    function plugin(options, imports, register) {
        var dbP = imports.db;

        var eventbus = imports.eventbus;

        var async = require("./lib/async");

        var LAST_CHAR = String.fromCharCode(255);

        var api = {
            updateSymbols: async.queueUntilEvent(eventbus, "dbavailable", function(path, symbolInfos) {
                var db = dbP.get();
                return db.readStore("symbols").index("path_sym").query(">=", [path, ""], "<=", [path, "~"]).then(function(currentSymbols) {
                    var writeStore = db.writeStore("symbols");
                    var deletePromises = [];
                    for (var i = 0; i < currentSymbols.length; i++) {
                        var sym = currentSymbols[i];
                        deletePromises.push(writeStore.delete(sym.id));
                    }
                    return Promise.all(deletePromises);
                }).then(function() {
                    var writeStore = db.writeStore("symbols");
                    var putPromises = [];
                    symbolInfos.forEach(function(symbolInfo) {
                        var lcSymbol = symbolInfo.symbol.toLowerCase();
                        symbolInfo.id = lcSymbol + "~" + path + "~" + symbolInfo.locator;
                        symbolInfo.symbol_lc = lcSymbol;
                        putPromises.push(writeStore.put(symbolInfo));
                    });
                    return Promise.all(putPromises);
                });
            }),
            getSymbols: async.queueUntilEvent(eventbus, "dbavailable", function(opts) {
                opts = opts || {};
                if(opts.prefix) {
                    opts.prefix = opts.prefix.toLowerCase();
                }
                var db = dbP.get();
                if (opts.path && !opts.prefix) {
                    return db.readStore("symbols").index("path_sym").query(">=", [opts.path, ""], "<=", [opts.path, LAST_CHAR], {
                        limit: opts.limit
                    });
                } else if (opts.prefix && !opts.path) {
                    return db.readStore("symbols").query(">=", opts.prefix, "<=", opts.prefix + LAST_CHAR, {
                        limit: opts.limit
                    });
                } else if (opts.prefix && opts.path) {
                    return db.readStore("symbols").index("path_sym").query(">=", [opts.path, opts.prefix], "<=", [opts.path, opts.prefix + LAST_CHAR], {
                        limit: opts.limit
                    });
                } else {
                    return db.readStore("symbols").getAll(null, {
                        limit: opts.limit
                    });
                }
            })
        };

        register(null, {
            symbol: api
        });
    }
});
