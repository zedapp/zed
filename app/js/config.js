/*global define, _, chrome */
define(function(require, exports, module) {
    "use strict";
    var configfs = null;
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");
    var http_cache = require("./lib/http_cache");

    eventbus.declare("configchanged");
    eventbus.declare("configavailable");

    var minimumConfiguration = {
        imports: [
            "/default.json"],
        preferences: {},
        modes: {},
        keys: {},
        commands: {}
    };

    var config = _.extend({}, minimumConfiguration);

    var expandedConfiguration = _.extend({}, config);

    exports.hook = function() {
        eventbus.on("loadedfilelist", loadConfiguration);

        eventbus.on("sessionsaved", function(session) {
            if (session.filename === "/zedconfig.json") {
                loadConfiguration();
            }
        });

        require("./fs/config")(false, function(err, configfs_) {
            configfs = configfs_;
            eventbus.emit("configavailable", configfs);
        });
    };

    function whenConfigurationAvailable(fn) {
        if (configfs) {
            fn(configfs);
        } else {
            eventbus.once("configavailable", fn);
        }
    }

    exports.whenConfigurationAvailable = whenConfigurationAvailable;

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

    // Setting file watchers (reload config when any of them change)
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
     * Recursively import "imports" into the `expandedConfiguration` variable
     */
    function expandConfiguration(setts, callback) {
        setts = _.extend({}, setts);
        var imports = setts.imports;
        delete setts.imports;
        expandedConfiguration = superExtend(expandedConfiguration, setts);

        if (imports) {
            async.forEach(imports, function(imp, next) {
                function handleFile(err, text) {
                    if (err) {
                        console.warn("Error loading", imp, err);
                        return next();
                    }
                    try {
                        var json = JSON.parse(text);
                        expandConfiguration(json, next);
                    } catch (e) {
                        console.error(e);
                        next();
                    }
                }

                configfs.readFile(imp, handleFile);
            }, function() {
                callback();
            });
        } else {
            callback();
        }
    }

    function saveConfiguration() {

    }

    exports.getPreference = function(key, session) {
        if (session && session.mode) {
            var mode = session.mode;
            if (mode.preferences[key] !== undefined) {
                return mode.preferences[key];
            }
        }
        return expandedConfiguration.preferences[key];
    };

    exports.setPreference = function(key, value) {
        config.preferences[key] = value;
        whenConfigurationAvailable(function() {
            // Load user.json just in case
            configfs.readFile("/user.json", function(err, text) {
                try {
                    var config = JSON.parse(text);
                    config.preferences = config.preferences || {};
                    config.preferences[key] = value;
                    configfs.writeFile("/user.json", JSON.stringify(config, null, 4), function(err) {
                        if(err) {
                            console.error("Error during writing config:", err);
                        }
                    });
                } catch (e) {
                    console.error("Error during writing config:", e);
                }
            });
        });
        saveConfiguration();
    };

    exports.getModes = function() {
        return expandedConfiguration.modes;
    };

    exports.getKeys = function() {
        return expandedConfiguration.keys;
    };

    exports.getCommands = function() {
        return expandedConfiguration.commands;
    };

    exports.getPreferences = function() {
        return expandedConfiguration.preferences;
    };

    exports.getConfiguration = function() {
        return expandedConfiguration;
    };

    /**
     * Loads config, deciding which config file to use as root:
     * - if a /zedconfig.json file exists in the project, use it
     * - otherwise use the /user.json file in the config project
     */
    function loadConfiguration(callback) {
        whenConfigurationAvailable(function() {
            console.log("Loading config");
            require(["./goto", "./project"], function(goto, project) {
                if (goto.getFileCache().indexOf("/zedconfig.json") !== -1) {
                    project.readFile("/zedconfig.json", function(err, text) {
                        var base = {};
                        try {
                            base = JSON.parse(text);
                        } catch (e) {
                            console.error(e);
                        }
                        loadUserConfiguration(base, callback);
                    });
                } else {
                    loadUserConfiguration({}, callback);
                }
            });
        });
    }

    exports.loadConfiguration = loadConfiguration;

    /**
     * Extend the project config (or the empty object, if not present)
     * with config from /user.json from the config project
     */
    function loadUserConfiguration(base, callback) {
        var rootFile = "/user.json";
        config = superExtend(base, minimumConfiguration);
        expandedConfiguration = _.extend({}, config);
        clearWatchers();
        watchFile(configfs, rootFile, loadConfiguration);
        configfs.readFile(rootFile, function(err, config_) {
            try {
                var json = JSON.parse(config_);
                config = superExtend(config, json);
                expandConfiguration(config, function() {
                    eventbus.emit("configchanged", exports);
                    _.isFunction(callback) && callback(null, exports);
                });
            } catch (e) {
                console.error(e);
            }
        });
    }

    require(["./command"], function(command) {
        command.define("Configuration:Reload", {
            exec: function() {
                loadConfiguration();
            },
            readOnly: true
        });

        command.define("Configuration:Reset", {
            exec: function() {
                require(["./lib/ui"], function(ui) {
                    ui.prompt({
                        message: "Are you sure you reset all config?"
                    }, function(yes) {
                        if (yes) {
                            configfs.listFiles(function(err, files) {
                                async.parForEach(files, function(path, next) {
                                    configfs.deleteFile(path, next);
                                }, function() {
                                    console.log("All files removed!");
                                    loadConfiguration();
                                });
                            });
                        }
                    });
                });
            },
            readOnly: true
        });
    });

    exports.getC = function() {
        return config;
    };

});