define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var project = require("./project");
    var state = {};

    eventbus.declare("stateloaded");

    module.exports = {
        hook: function() {
            eventbus.on("ioavailable", function() {
                console.log("IO available!");
                module.exports.load();
            });
        },
        set: function(key, value) {
            state[key] = value;
        },
        get: function(key) {
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
