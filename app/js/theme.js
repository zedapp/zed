/* global $, _*/
define(function(require, exports, module) {
    plugin.consumes = ["config", "command", "eventbus", "configfs", "window"];
    plugin.provides = ["theme"];
    return plugin;

    function plugin(options, imports, register) {
        var useragent = require("ace/lib/useragent");

        var config = imports.config;
        var command = imports.command;
        var eventbus = imports.eventbus;
        var configfs = imports.configfs;
        var win = imports.window;

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
                            doc: "Activate this theme. Change will take effect " +
                            "immediately, and also persist in Zed's configuration file.",
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
            var nativeScrollBars = config.getPreference("nativeScrollBars");
            var customScroll = '';
            if (!nativeScrollBars) {
                customScroll = ' custom-scroll';
            }

            loadCss(theme.css, true).then(function() {
                $("body").attr("class", theme.cssClass + (theme.dark ? " dark ace_dark" : " ") + (win.useNativeFrame() ? " native-chrome" : " ") + (!useragent.isMac ? " non_mac" : " mac") + customScroll);
                // hack to force scrollbars to refresh
                // found here: http://stackoverflow.com/a/15603340
                $('.ace_scrollbar-v').css('overflow-y', 'hidden').height();
                $('.ace_scrollbar-v').css('overflow-y', 'scroll');
                $('.ace_scrollbar-h').css('overflow-x', 'hidden').height();
                $('.ace_scrollbar-h').css('overflow-x', 'scroll');
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

        function loadCss(cssFiles, watch) {
            var cssCode = "";
            return Promise.all(cssFiles.map(function(file) {
                if (watch) {
                    watchFile(file, reloadTheme);
                }
                return configfs.readFile(file).then(function(cssCode_) {
                    cssCode += cssCode_ + "\n";
                });
            })).then(function() {
                $('#theme-css').html(cssCode);
            });
        }

        function loadUserCss() {
            return configfs.readFile("/user.css").then(function(cssCode) {
                $("#user-css").html(cssCode);
            }, function(err) {
                console.error("Error loading user css", err);
            });
        }

        command.define("Configuration:Preferences:Pick Theme", {
            exec: function(edit, session) {
                return command.exec("Command:Enter Command", edit, session, "Configuration:Theme:");
            },
            readOnly: true
        });

        register(null, {
            theme: api
        });
    }
});
