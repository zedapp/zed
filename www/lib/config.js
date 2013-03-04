define(function(require, exports, module) {
    var io = require("io");
    var config = {};
    var eventbus = require("eventbus");

    eventbus.declare("configloaded");

    // TODO add listeners

    module.exports = {
        hook: function() {
            eventbus.on("pathchange", function() {
                module.exports.load();
            });
        },
        set: function(key, value) {
            config[key] = value;
        },
        get: function(key, value) {
            return config[key];
        },
        load: function(callback) {
            io.readFile("/.zedsession", function(err, json) {
                config = JSON.parse(json);
                eventbus.emit("configloaded", module.exports);
                callback && callback(config);
            });
        },
        save: function(callback) {
            io.writeFile("/.zedsession", this.toJSON(), callback || function() {});
        },
        toJSON: function() {
            return JSON.stringify(config, null, 2);
        }
    };
    
});
