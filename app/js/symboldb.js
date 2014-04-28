/*global _, define */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = [];
    plugin.provides = ["symboldb"];
    return plugin;

    function plugin(options, imports, register) {
        var zedb = require("zedb");

        var db;

        var api = {
            updateSymbols: function(path, symbolInfos) {
                return db.readStore("symbols").index("path").query("=", path).then(function(currentSymbols) {
                    var writeStore = db.writeStore("symbols");
                    var deletePromises = [];
                    for(var i = 0; i < currentSymbols.length; i++) {
                        var sym = currentSymbols[i];
                        deletePromises.push(writeStore.delete(sym.id));
                    }
                    return Promise.all(deletePromises);
                }).then(function() {
                    var writeStore = db.writeStore("symbols");
                    var putPromises = [];
                    symbolInfos.forEach(function(symbolInfo) {
                        var sym = {
                            id: symbolInfo.name + "~" + path + "~" + symbolInfo.sel,
                            path: path,
                            name: symbolInfo.name,
                            sel: symbolInfo.sel
                        };
                        putPromises.push(writeStore.put(sym));
                    });
                    return Promise.all(putPromises);
                });
            },
            getSymbols: function(path) {
                return db.readStore("symbols").index("path").query("=", path);
            },
            reset: function() {
                return zedb.delete("symbols").then(init);
            }
        };

        function init() {
            return zedb.open("symbols", 1, function(db) {
                var symbolStore = db.createObjectStore("symbols", {
                    keyPath: "id"
                });

                symbolStore.createIndex("predIdn", "predIdn", {
                    unique: false
                });
                symbolStore.createIndex("path", "path", {
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
