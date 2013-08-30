/*global define */
define(function(require, exports, module) {
    "use strict";
    var settingsfs = require("./fs/settings");
    var eventbus = require("./lib/eventbus");
    
    eventbus.declare("settingschanged");
    
    var defaultSettings = JSON.parse(require("text!../settings/settings.default.json"));
    var userSettings = {};
    
    exports.init = function() {
        settingsfs.watchFile("/settings.user.json", loadSettings);
        loadSettings();
    };
    
    exports.get = function(key) {
        // Prefer user settings over default settings
        if(userSettings[key] !== undefined) {
            return userSettings[key];
        } else {
            return defaultSettings[key];
        }
    };
    
    exports.set = function(key, value) {
        userSettings[key] = value;
        settingsfs.writeFile("/settings.user.json", JSON.stringify(userSettings, null, 4), function(err) {
            console.log("Settings written:", err);
        });
    };
    
    function loadSettings() {
        console.log("Loading settings");
        settingsfs.readFile("/settings.user.json", function(err, settings) {
            try {
                userSettings = JSON.parse(settings);
                eventbus.emit("settingschanged", exports);
            } catch(e) {}
        });
    }
});