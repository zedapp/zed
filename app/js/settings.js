/*global define */
define(function(require, exports, module) {
    "use strict";
    var settingsfs = require("./fs/settings");
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");

    eventbus.declare("settingschanged");
    eventbus.declare("projectsettingschanged");

    var settings = {};
    var expandedSettings = {};

    exports.init = function() {
        settingsfs.watchFile("/settings.user.json", loadSettings);
        loadSettings();
    };

    exports.hook = function() {
        return;
        /// TODO: Re-enable
        eventbus.on("sessionsaved", function(session) {
            if (session.filename === "/zedsettings.json") {
                loadProjectSettings(session.getValue());
            }
        });

        eventbus.once("ioavailable", function(io) {
            io.readFile("/zedsettings.json", function(err, text) {
                if (!err) {
                    loadProjectSettings(text);
                }
            });
        });
    };

    function expandSettings(setts, callback) {
        var imports = setts.imports;
        delete setts.imports;
        _.extend(settings, setts);
        if (imports) {
            async.forEach(imports, function(imp, next) {
                if (imp.indexOf("settings:") === 0) {
                    settingsfs.readFile(imp, function(err, text) {
                        try {
                            var json = JSON.parse(text);
                            expandSettings(json, next);
                        } catch (e) {
                            console.error(e);
                            next();
                        }
                    });
                }
            }, function() {

            });
        }
    }

    exports.get = function(key) {
        return expandedSettings.settings[key];
    };

    exports.set = function(key, value) {
        settings.settings[key] = value;
        settingsfs.writeFile("/settings.user.json", JSON.stringify(settings, null, 4), function(err) {
            console.log("Settings written:", err);
        });
    };

    exports.fs = settingsfs;

    function loadSettings() {
        console.log("Loading settings");
        settingsfs.readFile("/settings.user.json", function(err, settings_) {
            try {
                settings = JSON.parse(settings_);
                eventbus.emit("settingschanged", exports);
            } catch (e) {}
        });

    }
});