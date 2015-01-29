/*global _, define */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["eventbus"];
    plugin.provides = ["db"];
    return plugin;

    function plugin(options, imports, register) {
        var zedb = require("zedb");
        var opts = require("./lib/options");

        var eventbus = imports.eventbus;

        eventbus.declare("dbavailable");

        var dbName = opts.get("url").replace(/[^\w]+/g, "_");
        var db;

        var api = {
            get: get,
            hook: function() {
                eventbus.on("configchanged", function(config) {
                    var databases = config.getDatabases();
                    if (Object.keys(databases).length > 0) {
                        if(!db) {
                            init(databases);
                        } else {
                            checkSchemaChange(databases)(db);
                        }
                    }
                });
            }
        };

        function checkSchemaChange(schema) {
            return function(db) {
                // Let's see if the schema changed since last time we opened it
                if (db.getObjectStoreNames().contains("_meta")) {
                    return db.readStore("_meta").get("meta").then(function(meta) {
                        meta.lastUse = Date.now();
                        db.writeStore("_meta").put(meta);
                        if (JSON.stringify(meta.schema) !== JSON.stringify(schema)) {
                            console.info("Schemas differ, destroying old database and recreating.");
                            db.close();
                            return recreate();
                        } else {
                            return db;
                        }
                    });
                } else {
                    return recreate();
                }

                function recreate() {
                    return zedb.delete(dbName).then(function() {
                        setTimeout(function() {
                            return init(schema);
                        }, 1000);
                    });
                }
            };
        }

        function init(schema) {
            if (db) {
                db.close();
            }
            return zedb.open(dbName, 1, function(db) {
                // Let's create a fresh database
                for (var objectStoreName in schema) {
                    var storeMeta = schema[objectStoreName];
                    var store = db.createObjectStore(objectStoreName, {
                        keyPath: storeMeta.keyPath,
                        autoIncrement: storeMeta.autoIncrement
                    });
                    if (storeMeta.indexes) {
                        for (var indexName in storeMeta.indexes) {
                            var indexMeta = storeMeta.indexes[indexName];
                            store.createIndex(indexName, indexMeta.keyPath, {
                                unique: indexMeta.unique,
                                multiEntry: indexMeta.multiEntry
                            });
                        }
                    }
                    if (objectStoreName === "_meta") {
                        store.add({
                            key: "meta",
                            schema: schema
                        });
                    }
                }
            }).then(checkSchemaChange(schema)).then(function(db_) {
                if(!db_) {
                    console.error("Got empty db variable");
                }
                db = db_;
                eventbus.emit("dbavailable", db);
                return db;
            }, function(err) {
                console.error("Could not create databases", err);
            });

        }

        function get() {
            return db;
        }

        register(null, {
            db: api
        });
    }
});
