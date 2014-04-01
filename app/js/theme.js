/* global $, _*/
define(function(require, exports, module) {
    plugin.consumes = ["config", "command", "eventbus", "configfs"];
    plugin.provides = ["theme"];
    return plugin;

    function plugin(options, imports, register) {
        var useragent = require("ace/lib/useragent");
        var async = require("./lib/async");

        var config = imports.config;
        var command = imports.command;
        var eventbus = imports.eventbus;
        var configfs = imports.configfs;

        var defaultTheme = 'zed_dark';

        // Setting file watchers (reload theme when any of them change)
        var watchers = [];

        var api = {
            hook: function() {
                eventbus.on("configchanged", function(config) {
                    var themeName = config.getPreference("theme");
                    setTheme(themeName);
                    loadUserCss();
                });

                eventbus.on("configcommandsreset", function(config) {
                    var allThemes = config.getThemes();
                    _.each(allThemes, function(theme, name) {
                        command.defineConfig("Configuration:Theme:" + (theme.dark ? "Dark" : "Light") + ":" + theme.name, {
                            exec: function() {
                                config.setPreference("theme", name);
                                setTheme(name);
                            },
                            readOnly: true
                        });
                    });
                });
            }
        };

        function setTheme(name) {
            clearWatchers();
            var theme = config.getTheme(name) || config.getTheme(defaultTheme);
            loadCss(theme.css, true, function() {
                $("body").attr("class", theme.cssClass + (theme.dark ? " dark ace_dark" : " ") + (!useragent.isMac ? " non_mac" : " mac"));
            });
        }

        function clearWatchers() {
            watchers.forEach(function(watcher) {
                configfs.unwatchFile(watcher.path, watcher.callback);
            });
            watchers = [];
        }

        function watchFile(path, callback) {
            configfs.watchFile(path, callback);
            watchers.push({
                path: path,
                callback: callback
            });
        }

        configfs.watchFile("/user.css", loadUserCss);

        function reloadTheme() {
            var theme = config.getTheme(config.getPreference("theme"));
            loadCss(theme.css);
        }

        function loadCss(cssFiles, watch, callback) {
            var cssCode = "";
            async.forEach(cssFiles, function(file, next) {
                if (watch) {
                    watchFile(file, reloadTheme);
                }
                configfs.readFile(file, function(err, cssCode_) {
                    if (err) {
                        return console.error("Error setting theme", err);
                    }
                    cssCode += cssCode_ + "\n";
                    next();
                });
            }, function() {
                $('#theme-css').html(cssCode);
                callback && callback();
            });
        }

        function loadUserCss() {
            configfs.readFile("/user.css", function(err, cssCode) {
                if (err) {
                    return console.error("Error loading user css", err);
                }
                $("#user-css").html(cssCode);
            });
        }

        register(null, {
            theme: api
        });
    }
});
