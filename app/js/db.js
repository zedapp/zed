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
                    if(Object.keys(databases).length > 0) {
                        console.log("Creating databases", databases);
                        init(databases);
                    }
                });
            }
        };

        function init(schema) {
            return zedb.openWithSchema(dbName, schema).then(function(db_) {
                db = db_;
                eventbus.emit("dbavailable", db);
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
