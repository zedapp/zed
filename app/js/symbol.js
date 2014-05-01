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
                        symbolInfo.id = symbolInfo.symbol + "~" + path + "~" + symbolInfo.locator;
                        putPromises.push(writeStore.put(symbolInfo));
                    });
                    return Promise.all(putPromises);
                });
            }),
            getSymbols: async.queueUntilEvent(eventbus, "dbavailable", function(opts) {
                opts = opts || {};
                var db = dbP.get();
                if (opts.path && !opts.prefix) {
                    return db.readStore("symbols").index("path_sym").query(">=", [opts.path, ""], "<=", [opts.path, "~"]);
                } else if (opts.prefix && !opts.path) {
                    return db.readStore("symbols").query(">=", opts.prefix, "<=", opts.prefix + "~");
                } else if (opts.prefix && opts.path) {
                    return db.readStore("symbols").index("path_sym").query(">=", [opts.path, opts.prefix], "<=", [opts.path, opts.prefix + "~"]);
                } else {
                    return db.readStore("symbols").getAll();
                }
            })
        };

        register(null, {
            symbol: api
        });
    }
});
