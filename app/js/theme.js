/* global $, _*/
define(function(require, exports, module) {
    var config = require("./config");
    var dom = require("ace/lib/dom");
    var useragent = require("ace/lib/useragent");
    var command = require("./command");
    var eventbus = require("./lib/eventbus");
    var defaultTheme = 'zed_dark';

    var cssFileLoaded = {};

    exports.hook = function() {
        eventbus.on("configchanged", function(config) {
            var themeName = config.getPreference("theme");
            exports.setTheme(themeName);
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
    };

    exports.setTheme = function(name) {
        var theme = config.getTheme(name) || config.getTheme(defaultTheme);
        loadCss(theme.css, function() {
            $("body").attr("class", theme.cssClass + (theme.dark ? " dark ace_dark" : " ") + (!useragent.isMac ? " non_mac" : " mac"));
        });
    };

    function loadCss(cssFile, callback) {
        // Don't have to load the CSS twice
        if(cssFileLoaded[cssFile]) {
            return callback();
        }
        config.getFs().readFile(cssFile, function(err, cssCode) {
            if (err) {
                return console.error("Error setting theme", err);
            }
            dom.importCssString(cssCode);
            cssFileLoaded[cssFile] = true;
            callback();
        });
    }
});