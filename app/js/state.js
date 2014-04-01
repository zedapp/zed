/**
 * The state module keeps track of the editor state, saved to the /.zedstate file
 * state that is typically being tracked includes open files, which file is open in
 * which split, the split config itself, cursor positions, selections, part of the
 * undo stack etc.
 */
/*global define, chrome, zed*/
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["eventbus", "fs", "config"];
    plugin.provides = ["state"];
    return plugin;

    function plugin(options, imports, register) {
        var opts = require("./lib/options");

        var eventbus = imports.eventbus;
        var fs = imports.fs;
        var config = imports.config;
        var state = {};

        eventbus.declare("stateloaded");

        function isHygienic() {
            return config.getPreference("hygienicMode") || (config.getPreference("hygienicModeRemote") && opts.get("url").indexOf("http") === 0);
        }

        var api = {
            hook: function() {
                eventbus.once("stateloaded", function() {
                    // var win = chrome.app.window.current();
                    // var bounds = api.get('window');
                    // if (bounds) {
                    //     win.setBounds(bounds);
                    // }
                    // win.onBoundsChanged.addListener(function() {
                    //     api.set("window", win.getBounds());
                    //     zed.getService("editor").getEditors().forEach(function(edit) {
                    //         edit.resize();
                    //     });
                    // });
                });
            },
            init: function() {
                api.load();
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
