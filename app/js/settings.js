/*global define, _, chrome */
define(function(require, exports, module) {
    "use strict";
    var settingsfs = require("./fs/settings");
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");

    eventbus.declare("settingschanged");
    eventbus.declare("projectsettingschanged");

    var minimumSettings = {
        imports: [
            "settings:/preferences.default.json",
            "settings:/modes.default.json",
            "settings:/keys.default.json"],
        preferences: {},
        modes: {},
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

            command.define("Settings:Reset", {
                exec: function() {
                    require(["./lib/ui"], function(ui) {
                        ui.prompt({
                            message: "Are you sure you reset all settings?"
                        }, function(yes) {
                            if (yes) {
                                chrome.storage.sync.clear(function() {
                                    loadSettings();
                                });
                            }
                        });
                    });
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
                    if (dest[p] === undefined) {
                        dest[p] = source[p];
                    } else {
                        dest[p] = superExtend(dest[p], source[p]);
                    }
                }
            }
            return dest;
        } else {
            return dest !== undefined ? dest : source;
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
        fs.watchFile(path, callback);
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

    exports.getPreference = function(key, session) {
        if (session && session.mode) {
            var mode = session.mode;
            if (mode.preferences[key] !== undefined) {
                return mode.preferences[key];
            }
        }
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
    

    function loadSettings(callback) {
        console.log("Loading settings");
        require(["./goto", "./project"], function(goto, project) {
            if (goto.getFileCache().indexOf("/zedsettings.json") !== -1) {
                project.readFile("/zedsettings.json", function(err, text) {
                    var base = {};
                    try {
                        base = JSON.parse(text);
                    } catch (e) {
                        console.error(e);
                    }
                    loadUserSettings(base, callback);
                });
            } else {
                loadUserSettings({}, callback);
            }
        });
    }
    
    exports.loadSettings = loadSettings;

    function loadUserSettings(base, callback) {
        var rootFile = "/settings.user.json";
        settings = superExtend(base, minimumSettings);
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
                    _.isFunction(callback) && callback(null, exports);
                });
            } catch (e) {
                console.error(e);
            }
        });
    }
});