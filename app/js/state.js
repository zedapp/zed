/*global define*/
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");
    var project = require("./project");
    var state = {};

    eventbus.declare("stateloaded");
    
    var hygienicMode = options.get("hygienic");

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
            if(hygienicMode) {
                state = {};
                eventbus.emit("stateloaded", module.exports);
                return callback && callback({});
            }
            project.readFile("/.zedstate", function(err, json) {
                if(err) {
                    // No worries, empty state!
                    json = "{}";
                }
                try {
                    state = JSON.parse(json);
                } catch(e) {
                    console.error("Could not parse state: ", e, json);
                    state = {};
                }
                eventbus.emit("stateloaded", module.exports);
                callback && callback(state);
            });
        },
        save: function(callback) {
            if(!hygienicMode) {
                project.writeFile("/.zedstate", this.toJSON(), callback || function() {});
            }
        },
        toJSON: function() {
            return JSON.stringify(state);
        },
        reset: function() {
            state = {};
            module.exports.save();
        }
    };
    
});
