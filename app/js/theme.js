/* global $, _*/
define(function(require, exports, module) {
    plugin.consumes = ["config", "command", "eventbus", "configfs"];
    plugin.provides = ["theme"];
    return plugin;

    function plugin(options, imports, register) {
        var useragent = require("ace/lib/useragent");

        var config = imports.config;
        var command = imports.command;
        var eventbus = imports.eventbus;
        var configfs = imports.configfs;

        var defaultAceTheme = 'zed_dark';
        var defaultWindowTheme = 'zed_dark';

        // Setting file watchers (reload theme when any of them change)
        var aceWatchers = [];
        var windowWatchers = [];

        var api = {
            hook: function() {
                eventbus.on("configchanged", function(config) {
                    var aceTheme = config.getPreference("aceTheme");
                    var windowTheme = config.getPreference("windowTheme");
                    Promise.all([
                        setAceTheme(aceTheme),
                        setWindowTheme(windowTheme),
                        loadUserCss()
                    ]).then(function() {
                        refreshScrollBars();
                    });
                });

                eventbus.on("configcommandsreset", function(config) {
                    var allAceThemes = config.getAceThemes();
                    _.each(allAceThemes, function(theme, name) {
                        command.defineConfig("Configuration:Ace Theme:" + theme.name, {
                            doc: "Activate this ace theme. Change will take effect " +
                            "immediately, and also persist in Zed's configuration file.",
                            exec: function() {
                                config.setPreference("aceTheme", name);
                                setAceTheme(name).then(function() {
                                    refreshScrollBars();
                                });
                            },
                            readOnly: true
                        });
                    });
                    
                    var allWindowThemes = config.getWindowThemes();
                    _.each(allWindowThemes, function(theme, name) {
                        command.defineConfig("Configuration:Window Theme:" + theme.name, {
                            doc: "Activate this window theme. Change will take effect " +
                            "immediately, and also persist in Zed's configuration file.",
                            exec: function() {
                                config.setPreference("windowTheme", name);
                                setWindowTheme(name).then(function() {
                                    refreshScrollBars();
                                });
                            },
                            readOnly: true
                        });
                    });
                });
            }
        };

        function setAceTheme(name) {
            var theme = config.getAceTheme(name) || config.getAceTheme(defaultAceTheme);
            var nativeScrollBars = config.getPreference("nativeScrollBars");
            var customScroll = '';
            if (!nativeScrollBars) {
                customScroll = ' custom-scroll';
            }

            return loadAceCss(theme.css, true).then(function() {
                $("body").attr("class", theme.cssClass + (!useragent.isMac ? " non_mac" : " mac") + customScroll);
            });
        }
        
        function reloadAceTheme() {
            var theme = config.getTheme(config.getPreference("aceTheme"));
            loadAceCss(theme.css).then(function() {
                refreshScrollBars();
            });
        }
        
        function loadAceCss(cssFiles, watch) {
            var cssCode = "";
            return Promise.all(cssFiles.map(function(file) {
                if (watch) {
                    watchFile(aceWatchers, file, reloadAceTheme);
                }
                return configfs.readFile(file).then(function(cssCode_) {
                    cssCode += cssCode_ + "\n";
                });
            })).then(function() {
                $('#ace-theme-css').html(cssCode);
            });
        }
        
        function setWindowTheme(name) {
            clearWatchers(windowWatchers);
            var theme = config.getWindowTheme(name) || config.getWindowTheme(defaultWindowTheme);

            return loadWindowCss(theme.css, true);
        }
        
        function reloadWindowTheme() {
            var theme = config.getTheme(config.getPreference("windowTheme"));
            loadWindowCss(theme.css).then(function() {
                refreshScrollBars();
            });
        }

        function loadWindowCss(cssFiles, watch) {
            var cssCode = "";
            return Promise.all(cssFiles.map(function(file) {
                if (watch) {
                    watchFile(windowWatchers, file, reloadWindowTheme);
                }
                return configfs.readFile(file).then(function(cssCode_) {
                    cssCode += cssCode_ + "\n";
                });
            })).then(function() {
                $('#window-theme-css').html(cssCode);
            });
        }
        
        function refreshScrollBars() {
            // hack to force scrollbars to refresh
            // found here: http://stackoverflow.com/a/15603340
            $('.ace_scrollbar-v').css('overflow-y', 'hidden').height();
            $('.ace_scrollbar-v').css('overflow-y', 'scroll');
            $('.ace_scrollbar-h').css('overflow-x', 'hidden').height();
            $('.ace_scrollbar-h').css('overflow-x', 'scroll');
        }

        function clearWatchers(watchers) {
            watchers.forEach(function(watcher) {
                configfs.unwatchFile(watcher.path, watcher.callback);
            });
            watchers = [];
        }

        function watchFile(watchers, path, callback) {
            configfs.watchFile(path, callback);
            watchers.push({
                path: path,
                callback: callback
            });
        }

        configfs.watchFile("/user.css", reloadUserCss);
        
        function reloadUserCss() {
            loadUserCss().then(function() {
                refreshScrollBars();
            });
        }

        function loadUserCss() {
            return configfs.readFile("/user.css").then(function(cssCode) {
                $("#user-css").html(cssCode);
            }, function(err) {
                console.error("Error loading user css", err);
            });
        }

        command.define("Configuration:Preferences:Pick Ace Theme", {
            exec: function(edit, session) {
                return command.exec("Command:Enter Command", edit, session, "Configuration:Ace Theme:");
            },
            readOnly: true
        });
        
        command.define("Configuration:Preferences:Pick Window Theme", {
            exec: function(edit, session) {
                return command.exec("Command:Enter Command", edit, session, "Configuration:Window Theme:");
            },
            readOnly: true
        });

        register(null, {
            theme: api
        });
    }
});
