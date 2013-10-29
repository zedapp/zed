/* global define */
define(function(require, exports, module) {
    var settings = require("../../../settings");
    
    return {
        readFile: function(path, callback) {
            settings.whenSettingsAvailable(function(settingsfs) {
                settingsfs.readFile(path, callback);
            });
        }
    };
});