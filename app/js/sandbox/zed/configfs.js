/* global define */
define(function(require, exports, module) {
    var config = require("../../config");
    
    return {
        readFile: function(path, callback) {
            config.whenConfigurationAvailable(function(configfs) {
                configfs.readFile(path, callback);
            });
        }
    };
});