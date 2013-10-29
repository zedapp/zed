/*global define, _, chrome */
define(function(require, exports, module) {
    "use strict";
    var settingsfs = null;
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");
    var http_cache = require("./lib/http_cache");

    eventbus.declare("settingschanged");
    eventbus.declare("settingsavailable");

    var minimumSettings = {
        imports: [
            "/default/preferences.json",
            "/default/modes.json",
            "/default/keys.json"
        ],
        preferences: {},
        modes: {},
        keys: {},
        commands: {}
    };

    var settings = _.extend({}, minimumSettings);

    var expandedSettings = _.extend({}, settings);

    exports.hook = function() {
        eventbus.on("loadedfilelist", loadSettings);

        eventbus.on("sessionsaved", function(session) {
            if (session.filename === "/zedsettings.json") {
                loadSettings();
            }
        });

        require("./fs/settings")(false, function(err, settingsfs_) {
            settingsfs = settingsfs_;
            eventbus.emit("settingsavailable", settingsfs);
        });
    };

    function whenSettingsAvailable(fn) {
        if(settingsfs) {
            fn(settingsfs);
        } else {
            eventbus.once("settingsavailable", fn);
        }
    }
    
    exports.whenSettingsAvailable = whenSettingsAvailable;

    /**
     * This is a super-charged version of _.extend, it recursively merges
     * objects and concatenates arrays (but does not add duplicates).
     * This function does not modify either dest or source, it creates a new
     * object
     */
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

    // Setting file watchers (reload settings when any of them change)
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

    /**
     * Recursively import "imports" into the `expandedSettings` variable
     */
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

                settingsfs.readFile(imp, handleFile);
            }, function() {
                callback();
            });
        } else {
            callback();
        }
    }

    function saveSettings() {
        whenSettingsAvailable(function() {
            settingsfs.writeFile("/user/settings.json", JSON.stringify(settings, null, 4), function(err) {
                console.log("Settings written:", err);
            });
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

    /**
     * Loads settings, deciding which settings file to use as root:
     * - if a /zedsettings.json file exists in the project, use it
     * - otherwise use the /user/settings.json file in the settings project
     */
    function loadSettings(callback) {
        whenSettingsAvailable(function() {
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
        });
    }

    exports.loadSettings = loadSettings;

    /**
     * Extend the project settings (or the empty object, if not present)
     * with settings from /user/settings.json from the settings project
     */
    function loadUserSettings(base, callback) {
        var rootFile = "/user/settings.json";
        settings = superExtend(base, minimumSettings);
        expandedSettings = _.extend({}, settings);
        clearWatchers();
        watchFile(settingsfs, rootFile, loadSettings);
        settingsfs.readFile(rootFile, function(err, settings_) {
            try {
                var json = JSON.parse(settings_);
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
                            settingsfs.listFiles(function(err, files) {
                                async.parForEach(files, function(path, next) {
                                    settingsfs.deleteFile(path, next);
                                }, function() {
                                    console.log("All files removed!");
                                    loadSettings();
                                });
                            });
                        }
                    });
                });
            },
            readOnly: true
        });
    });

});