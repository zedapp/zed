define(function(require, exports, module) {
    var settingsfs = require("./fs/settings")();
    var eventbus = require("./eventbus");
    
    eventbus.declare("settingschanged");
    
    var settings = require("text!../settings/settings.json");
    var ignore = false;
    
    exports.init = function() {
        settingsfs.watchFile("/settings.json", loadSettings);
        loadSettings();
    };
    
    exports.get = function(key) {
        return settings[key];
    };
    
    exports.set = function(key, value) {
        settings[key] = value;
        settingsfs.writeFile("/settings.json", JSON.stringify(settings, null, 4), function(err) {
            console.log("Settings written:", err);
        });
    };
    
    function loadSettings() {
        console.log("Loading settings");
        if(ignore)
            return;
        settingsfs.readFile("/settings.json", function(err, settings_) {
            try {
                settings = JSON.parse(settings_);
                eventbus.emit("settingschanged", exports);
            } catch(e) {}
        });
    }
});