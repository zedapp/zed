/**
 * The state module keeps track of the editor state, saved to the /.zedstate file
 * state that is typically being tracked includes open files, which file is open in
 * which split, the split config itself, cursor positions, selections, part of the
 * undo stack etc.
 */
/*global define, chrome, zed*/
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["eventbus", "fs", "config", "window"];
    plugin.provides = ["state"];
    return plugin;

    function plugin(options, imports, register) {
        var opts = require("./lib/options");

        var eventbus = imports.eventbus;
        var fs = imports.fs;
        var config = imports.config;
        var win = imports.window;
        var state = {};

        eventbus.declare("stateloaded");

        function isHygienic() {
            return config.getPreference("hygienicMode") || (config.getPreference("hygienicModeRemote") && opts.get("url").indexOf("http") === 0);
        }

        var api = {
            hook: function() {
                eventbus.once("stateloaded", function() {
                    var bounds = api.get('window');
                    if (bounds) {
                        // In bug #169 it was reported that these values can
                        // get negative value when a window is minimized.
                        // so let's reset those values in these cases.
                        bounds.left = Math.max(20, bounds.left);
                        bounds.top = Math.max(20, bounds.top);
                        bounds.width = Math.max(100, bounds.width);
                        bounds.height = Math.max(100, bounds.height);
                        win.setBounds(bounds);
                    }
                    win.addResizeListener(function() {
                        api.set("window", win.getBounds());
                    });
                });
            },
            init: function() {
                // Delaying loading a bit for other plug-ins to run their inits
                setTimeout(function() {
                    api.load();
                });
            },
            set: function(key, value) {
                state[key] = value;
            },
            get: function(key) {
                return state[key];
            },
            load: function(callback) {
                if (isHygienic()) {
                    state = {};
                    eventbus.emit("stateloaded", api);
                    return callback && callback({});
                }
                fs.readFile("/.zedstate", function(err, json) {
                    if (err) {
                        // No worries, empty state!
                        json = "{}";
                    }
                    try {
                        state = JSON.parse(json);
                    } catch (e) {
                        console.error("Could not parse state: ", e, json);
                        state = {};
                    }
                    eventbus.emit("stateloaded", api);
                    callback && callback(state);
                });
            },
            save: function(callback) {
                if (!isHygienic()) {
                    fs.writeFile("/.zedstate", this.toJSON(), callback || function() {});
                }
            },
            toJSON: function() {
                return JSON.stringify(state);
            },
            reset: function() {
                state = {};
                api.save();
            }
        };

        register(null, {
            state: api
        });
    }


});
