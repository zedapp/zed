define(function(require, exports, module) {
    var settingsfs = require("./fs/settings")();
    var eventbus = require("./eventbus");
    
    eventbus.declare("settingschanged");
    
    var settings = null;
    var ignore = false;
    
    exports.init = function() {
        settingsfs.watchFile("/settings.json", loadSettings);
        loadSettings();
    };
    
    exports.get = function(key) {
        if(!settings)
            throw Error("Settings not loaded yet");
        
        return settings[key];
    };
    
    exports.set = function(key, value) {
        if(!settings)
            throw Error("Settings not loaded yet");
        settings[key] = value;
        ignore = true;
        settings.writeFile("/settings.json", JSON.stringify(settings, null, 4), function(err) {
            ignore = false;
            console.log("Settings writter:", err);
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