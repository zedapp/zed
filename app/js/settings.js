/*global define, _ */
define(function(require, exports, module) {
    "use strict";
    var settingsfs = require("./fs/settings");
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");

    eventbus.declare("settingschanged");
    eventbus.declare("projectsettingschanged");

    var minimumSettings = {
        imports: [
            "/zedsettings.json",
            "settings:/preferences.default.json",
            "settings:/modes.default.json",
            "settings:/keys.default.json"],
        preferences: {},
        modes: {
        },
        keys: {},
        commands: {}
    };

    var settings = _.extend({}, minimumSettings);

    var expandedSettings = _.extend({}, settings);

    exports.hook = function() {
        eventbus.on("ioavailable", loadSettings);
        eventbus.on("sessionsaved", function(session) {
            if (session.filename === "/zedsettings.json") {
                loadSettings();
            }
        });
        require(["./command"], function(command) {
            command.define("Settings:Reload", {
                exec: function() {
                    loadSettings();
                },
                readOnly: true
            });
        });
    };

    function superExtend(dest, source) {
        if (_.isArray(dest)) {
            if (!source) {
                return dest;
            }
            var newArray = dest.slice();
            for (var i = 0; i < source.length; i++) {
                var el = source[i];
                if (newArray.indexOf(el) === -1) {
                    newArray.push(el);
                }
            }
            return newArray;
        } else if (_.isObject(dest)) {
            dest = _.extend({}, dest); // shallow clone
            for (var p in source) {
                if (source.hasOwnProperty(p)) {
                    if (!dest[p]) {
                        dest[p] = source[p];
                    } else {
                        dest[p] = superExtend(dest[p], source[p]);
                    }
                }
            }
            return dest;
        } else {
            return dest ? dest : source;
        }
    }

    var watchers = [];

    function clearWatchers() {
        watchers.forEach(function(watcher) {
            watcher.fs.unwatchFile(watcher.path, watcher.callback);
        });
        watchers = [];
    }

    function watchFile(fs, path, callback) {
        setTimeout(function() {
            fs.watchFile(path, callback);
        }, 500);
        watchers.push({
            fs: fs,
            path: path,
            callback: callback
        });
    }

    function expandSettings(setts, callback) {
        setts = _.extend({}, setts);
        var imports = setts.imports;
        delete setts.imports;
        expandedSettings = superExtend(expandedSettings, setts);

        if (imports) {
            async.forEach(imports, function(imp, next) {
                function handleFile(err, text) {
                    if (err) {
                        console.warn("Error loading", imp, err);
                        return next();
                    }
                    try {
                        var json = JSON.parse(text);
                        expandSettings(json, next);
                    } catch (e) {
                        console.error(e);
                        next();
                    }
                }

                if (imp.indexOf("settings:") === 0) {
                    var path = imp.substring("settings:".length);
                    settingsfs.readFile(path, handleFile);
                    watchFile(settingsfs, path, loadSettings);
                } else if (imp[0] === '/') {
                    require(["./project"], function(project) {
                        project.readFile(imp, handleFile);
                        //watchFile(project, imp, loadSettings);
                    });
                } else {
                    console.warn("Could not import", imp);
                    next();
                }
            }, function() {
                callback();
            });
        } else {
            callback();
        }
    }

    function saveSettings() {
        settingsfs.writeFile("/settings.user.json", JSON.stringify(settings, null, 4), function(err) {
            console.log("Settings written:", err);
        });
    }

    exports.getPreference = function(key) {
        return expandedSettings.preferences[key];
    };

    exports.setPreference = function(key, value) {
        settings.preferences[key] = value;
        saveSettings();
    };

    exports.getModes = function() {
        return expandedSettings.modes;
    };

    exports.getKeys = function() {
        return expandedSettings.keys;
    };

    exports.getCommands = function() {
        return expandedSettings.commands;
    };

    exports.getPreferences = function() {
        return expandedSettings.preferences;
    };

    exports.getSettings = function() {
        return expandedSettings;
    };

    exports.fs = settingsfs;

    function loadSettings() {
        console.log("Loading settings");
        var rootFile = "/settings.user.json";
        settings = _.extend({}, minimumSettings);
        expandedSettings = _.extend({}, settings);
        clearWatchers();
        watchFile(settingsfs, rootFile, loadSettings);
        settingsfs.readFile(rootFile, function(err, settings_) {
            try {
                var json = JSON.parse(settings_);
                if (!json.preferences) {
                    json = {};
                    setTimeout(saveSettings);
                }
                settings = superExtend(settings, json);
                expandSettings(settings, function() {
                    eventbus.emit("settingschanged", exports);
                });
            } catch (e) {
                console.error(e);
            }
        });
    }
});