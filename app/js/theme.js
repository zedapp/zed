/* global $, _*/
define(function(require, exports, module) {
    var config = require("./config");
    var useragent = require("ace/lib/useragent");
    var command = require("./command");
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");
    var defaultTheme = 'zed_dark';

    var cssFileLoaded = "";

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
        var theme = config.getTheme(name) || config.getTheme(defaultTheme);
        loadCss(theme.css, function() {
            $("body").attr("class", theme.cssClass + (theme.dark ? " dark ace_dark" : " ") + (!useragent.isMac ? " non_mac" : " mac"));
        });
    };

    function loadCss(cssFile, callback) {
        var allFiles = cssFile;
        if (_.isArray(cssFile)) {
            allFiles = cssFile[0];
            for (var i = 1; i < cssFile.length; i++) {
                allFiles += cssFile[i];
            }
        } else {
            cssFile = [cssFile];
        }
        // Don't have to load the CSS twice
        if (cssFileLoaded === allFiles) {
            return callback();
        }
        
        var cssCode = "";
        var configfs = config.getFs();
        async.forEach(cssFile, function(file, next) {
            configfs.readFile(file, function(err, cssCode_) {
                if (err) {
                    return console.error("Error setting theme", err);
                }
                cssCode += cssCode_ + "\n";
                next();
            });
        }, function() {
            $('#theme-css').html(cssCode);
            cssFileLoaded = allFiles;
            callback();
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