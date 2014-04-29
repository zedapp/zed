/*global _, define */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = [];
    plugin.provides = ["symboldb"];
    return plugin;

    function plugin(options, imports, register) {
        var zedb = require("zedb");
        var opts = require("./lib/options");

        var db;
        var dbName = opts.get("url").replace(/[^\w]+/g, "_");

        var api = {
            updateSymbols: function(path, symbolInfos) {
                return db.readStore("symbols").index("path").query("=", path).then(function(currentSymbols) {
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
                        var sym = {
                            id: symbolInfo.symbol + "~" + path + "~" + symbolInfo.locator,
                            path: path,
                            symbol: symbolInfo.symbol,
                            locator: symbolInfo.locator
                        };
                        putPromises.push(writeStore.put(sym));
                    });
                    return Promise.all(putPromises);
                });
            },
            getSymbols: function(opts) {
                opts = opts || {};
                if (opts.path && !opts.prefix) {
                    return db.readStore("symbols").index("path").query("=", opts.path);
                } else if (opts.prefix && !opts.path) {
                    return db.readStore("symbols").query(">=", opts.prefix, "<=", opts.prefix + "~");
                } else if (opts.prefix && opts.path) {
                    return db.readStore("symbols").index("path_sym").query(">=", [opts.path, opts.prefix], "<=", [opts.path, opts.prefix + "~"]);
                } else {
                    return db.readStore("symbols").getAll();
                }
            },
            reset: function() {
                return zedb.getDatabases().then(function(databases) {
                    return Promise.all(_.map(databases, function(db) {
                        console.log("Deleting database", db);
                        return zedb.delete(db);
                    }));
                });
            }
        };

        function init() {
            return zedb.open(dbName, 1, function(db) {
                var symbolStore = db.createObjectStore("symbols", {
                    keyPath: "id"
                });

                symbolStore.createIndex("predIdn", "predIdn", {
                    unique: false
                });
                symbolStore.createIndex("path", "path", {
                    unique: false
                });
                symbolStore.createIndex("path_sym", ["path", "symbol"], {
                    unique: false
                });
            }).then(function(db_) {
                db = db_;
            });
        }

        init().then(function() {
            register(null, {
                symboldb: api
            });
        }, function(err) {
            console.error("Could not initialize the SymbolDB:", err);
        });
    }
});
