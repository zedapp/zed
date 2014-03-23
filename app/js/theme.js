/* global $, _*/
define(function(require, exports, module) {
    var config = require("./config");
    var useragent = require("ace/lib/useragent");
    var command = require("./command");
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");
    var path = require("./lib/path");
    var defaultTheme = 'zed_dark';

     // Setting file watchers (reload theme when any of them change)
    var watchers = [];

    function clearWatchers() {
        watchers.forEach(function(watcher) {
            config.getFs().unwatchFile(watcher.path, watcher.callback);
        });
        watchers = [];
    }

    function watchFile(path, callback) {
        config.getFs().watchFile(path, callback);
        watchers.push({
            path: path,
            callback: callback
        });
    }

    exports.hook = function() {
        eventbus.on("configchanged", function(config) {
            var themeName = config.getPreference("theme");
            exports.setTheme(themeName);
            loadUserCss();
        });
        eventbus.on("configcommandsreset", function(config) {
            var allThemes = config.getThemes();
            _.each(allThemes, function(theme, name) {
                command.defineConfig("Configuration:Theme:" + (theme.dark ? "Dark" : "Light") + ":" + theme.name, {
                    exec: function() {
                        config.setPreference("theme", name);
                        exports.setTheme(name);
                    },
                    readOnly: true
                });
            });
        });
        config.whenConfigurationAvailable(function(configfs) {
            configfs.watchFile("/user.css", loadUserCss);
        });
    };

    exports.setTheme = function(name) {
        clearWatchers();
        var theme = config.getTheme(name) || config.getTheme(defaultTheme);
        loadCss(theme.css, true, function() {
            $("body").attr("class", theme.cssClass + (theme.dark ? " dark ace_dark" : " ") + (!useragent.isMac ? " non_mac" : " mac"));
        });
    };
    
    function reloadTheme() {
        var theme = config.getTheme(config.getPreference("theme"));
        loadCss(theme.css);
    }

    function loadCss(cssFiles, watch, callback) {
        if (!_.isArray(cssFiles)) {
            cssFiles = [cssFiles];
        }
        
        var cssCode = "";
        var configfs = config.getFs();
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
        config.getFs().readFile("/user.css", function(err, cssCode) {
            if (err) {
                return console.error("Error loading user css", err);
            }
            $("#user-css").html(cssCode);
        });
    }
});