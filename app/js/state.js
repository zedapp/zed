/**
 * The state module keeps track of the editor state, saved to the /.zedstate file
 * state that is typically being tracked includes open files, which file is open in
 * which split, the split config itself, cursor positions, selections, part of the
 * undo stack etc.
 */
/*global define, chrome*/
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");
    var project = require("./project");
    var config = require("./config");
    var state = {};

    eventbus.declare("stateloaded");

    function isHygienic() {
        return config.getPreference("hygienicMode") || (config.getPreference("hygienicModeRemote") && options.get("url").indexOf("http") === 0);
    }

    module.exports = {
        hook: function() {
            var state = module.exports;
            eventbus.on("ioavailable", function() {
                console.log("IO available!");
                module.exports.load();
            });
            eventbus.once("stateloaded", function() {
                var win = chrome.app.window.current();
                var bounds = state.get('window');
                if (bounds) {
                    win.setBounds(bounds);
                }
                win.onBoundsChanged.addListener(function() {
                    state.set("window", win.getBounds());
                    require(["./editor"], function(editor) {
                        editor.getEditors().forEach(function(edit) {
                            edit.resize();
                        });
                    });
                });
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
                eventbus.emit("stateloaded", module.exports);
                return callback && callback({});
            }
            project.readFile("/.zedstate", function(err, json) {
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
                eventbus.emit("stateloaded", module.exports);
                callback && callback(state);
            });
        },
        save: function(callback) {
            if (!isHygienic()) {
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