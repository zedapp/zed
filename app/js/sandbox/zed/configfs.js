/* global define */
define(function(require, exports, module) {
    var config = require("../../config");

    return {
        listFiles: function(callback) {
            config.whenConfigurationAvailable(function(configfs) {
                configfs.listFiles(callback);
            });
        },
        readFile: function(path, callback) {
            config.whenConfigurationAvailable(function(configfs) {
                configfs.readFile(path, callback);
            });
        },
        writeFile: function(path, content, callback) {
            config.whenConfigurationAvailable(function(configfs) {
                configfs.writeFile(path, content, callback);
            });
        },
        deleteFile: function(path, callback) {
            config.whenConfigurationAvailable(function(configfs) {
                configfs.deleteFile(path, callback);
            });
        }
    };
});
