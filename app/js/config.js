/*global define, _, chrome */
define(function(require, exports, module) {
    "use strict";
    var configfs = null;
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");
    var bgPage = require("./lib/background_page");
    var path = require("./lib/path");

    eventbus.declare("configchanged");
    eventbus.declare("configavailable");
    eventbus.declare("configneedsreloading");

    var minimumConfiguration = {
        imports: [
            "/default.json"],
        preferences: {},
        modes: {},
        keys: {},
        commands: {},
        handlers: {},
        themes: {},
        packages: []
    };

    var config = _.extend({}, minimumConfiguration);
    var userConfig = _.extend({}, minimumConfiguration); // Cache of user.json file

    var expandedConfiguration = _.extend({}, config);

    exports.hook = function() {
        eventbus.on("loadedfilelist", loadConfiguration);
        eventbus.on("configneedsreloading", loadConfiguration);

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
            if (source) {
                for (var p in source) {
                    if (source.hasOwnProperty(p)) {
                        if (dest[p] === undefined) {
                            dest[p] = source[p];
                        } else {
                            dest[p] = superExtend(dest[p], source[p]);
                        }
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
    function expandConfiguration(setts, importedPackages, callback) {
        setts = _.extend({}, setts);
        var imports = setts.imports;
        delete setts.imports;
        expandedConfiguration = superExtend(expandedConfiguration, setts);

        if (setts.packages && setts.packages.length > 0) {
            _.each(setts.packages, function(uri) {
                if (!importedPackages[uri]) {
                    imports.push("/packages/" + uri.replace(/:/g, '/') + "/config.json");
                    importedPackages[uri] = true;
                }
            });
        }

        if (imports) {
            async.forEach(imports, function(imp, next) {
                function handleFile(err, text) {
                    if (err) {
                        console.warn("Error loading", imp, err);
                        return next();
                    }
                    var json;
                    try {
                        json = JSON.parse(text);
                    } catch (e) {
                        console.error("In file", imp, e);
                        next();
                        return;
                    }
                    resolveRelativePaths(json, imp);
                    expandConfiguration(json, importedPackages, next);
                }

                configfs.readFile(imp, handleFile);
            }, function() {
                callback();
            });
        } else {
            callback();
        }
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
            userConfig.preferences[key] = value;
            configfs.writeFile("/user.json", JSON.stringify(userConfig, null, 4), function(err) {
                if (err) {
                    console.error("Error during writing config:", err);
                }
            });
        });
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

    exports.getHandlers = function() {
        return expandedConfiguration.handlers;
    };

    exports.getTheme = function(name) {
        return expandedConfiguration.themes[name];
    };
    exports.getThemes = function() {
        return expandedConfiguration.themes;
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
        // Expand with extension configs
        var extensionConfigs = bgPage.getBackgroundPage().getAllConfigs();
        _.each(extensionConfigs, function(cfg) {
            config = superExtend(config, cfg);
        });
        // Continue
        clearWatchers();
        watchFile(configfs, rootFile, loadConfiguration);
        configfs.readFile(rootFile, function(err, config_) {
            try {
                var json = JSON.parse(config_);
                resolveRelativePaths(json, rootFile);
                userConfig = json;
                config = superExtend(config, json);
                expandConfiguration(config, {}, function() {
                    eventbus.emit("configchanged", exports);
                    _.isFunction(callback) && callback(null, exports);
                });
            } catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * This function finds all relative script and import paths
     * (scriptUrl keys and for imports) and replaces them with
     * absolute ones
     */
    function resolveRelativePaths(configJson, jsonPath) {
        var dir = path.dirname(jsonPath);
        if (configJson.imports) {
            configJson.imports = _.map(configJson.imports, function(imp) {
                if (imp[0] === '.' && imp[1] === '/') {
                    return dir + imp.substring(1);
                } else {
                    return imp;
                }
            });
        }
        if (configJson.commands) {
            _.each(configJson.commands, function(cmd, name) {
                if (cmd.scriptUrl && cmd.scriptUrl[0] === '.' && cmd.scriptUrl[1] === '/') {
                    configJson.commands[name].scriptUrl = dir + cmd.scriptUrl.substring(1);
                }
            });
        }
        if (configJson.modes) {
            _.each(configJson.modes, function(mode) {
                resolveRelativePaths(mode, jsonPath);
            });
        }
        return configJson;
    }

    exports.getFs = function() {
        return configfs;
    };

    require(["./command", "./session_manager"], function(command, session_manager) {
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
                    }, function(err, yes) {
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

        command.define("Configuration:Show Full", {
            exec: function(edit, session) {
                session_manager.go("zed::config", edit, session, function(err, session) {
                    session.setMode("ace/mode/json");
                    session.setValue(JSON.stringify(expandedConfiguration, null, 4));
                });
            },
            readOnly: true
        })
    });
});