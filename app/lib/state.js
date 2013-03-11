define(function(require, exports, module) {
    var project = require("./project");
    var state = {};
    var eventbus = require("./eventbus");

    eventbus.declare("stateloaded");

    module.exports = {
        hook: function() {
            eventbus.on("ioavailable", function() {
                module.exports.load();
            });
        },
        set: function(key, value) {
            state[key] = value;
        },
        get: function(key, value) {
            return state[key];
        },
        load: function(callback) {
            project.readFile("/.zedstate", function(err, json) {
                if(err) {
                    // No worries, empty state!
                    json = "{}";
                }
                state = JSON.parse(json);
                eventbus.emit("stateloaded", module.exports);
                callback && callback(state);
            });
        },
        save: function(callback) {
            project.writeFile("/.zedstate", this.toJSON(), callback || function() {});
        },
        toJSON: function() {
            return JSON.stringify(state);
        }
    };
    
});
