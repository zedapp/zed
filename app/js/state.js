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
                        bounds.width = Math.min(Math.max(300, bounds.width), window.screen.availWidth);
                        bounds.height = Math.min(Math.max(300, bounds.height), window.screen.availHeight);
                        bounds.left = Math.max(window.screen.availLeft, Math.min(bounds.left, window.screen.availWidth - bounds.width));
                        bounds.top = Math.max(window.screen.availTop, Math.min(bounds.top, window.screen.availHeight - bounds.height));
                        win.setBounds(bounds);
                    }
                    win.addResizeListener(function() {
                        var bounds = win.getBounds();
                        // on windows minimized window reports left=-32000
                        if (bounds.left != -32000) {
                            api.set("window", bounds);
                        }
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
            load: function() {
                if (isHygienic()) {
                    state = {};
                    eventbus.emit("stateloaded", api);
                    return Promise.resolve({});
                }
                return fs.readFile("/.zedstate").then(function(json) {
                    state = JSON.parse(json);
                    eventbus.emit("stateloaded", api);
                    return state;
                }).catch(function(err) {
                    state = {};
                    eventbus.emit("stateloaded", api);
                    return state;
                });
            },
            save: function() {
                if (!isHygienic()) {
                    return fs.writeFile("/.zedstate", api.toJSON());
                } else {
                    return Promise.resolve();
                }
            },
            toJSON: function() {
                return JSON.stringify(state);
            },
            reset: function() {
                state = {};
                return api.save();
            }
        };

        register(null, {
            state: api
        });
    }


});
