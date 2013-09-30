/*global define*/
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");
    var project = require("./project");
    var settings = require("./settings");
    var state = {};

    eventbus.declare("stateloaded");
    
    function isHygienic() {
        return settings.get("hygienicMode") || (settings.get("hygienicModeRemote") && options.get("url").indexOf("http") === 0);
    }

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
            if(isHygienic()) {
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
            if(!isHygienic()) {
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
