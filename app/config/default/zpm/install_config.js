var zpm = require("./zpm.js");
var fs = require("zed/fs");
var config = require("zed/config");

module.exports = function(info) {
    console.log("Installing packages");
    return zpm.installAll().then(function(anyUpdates) {
        if (anyUpdates) {
            fs.isConfig().then(function(isConfig) {
                if (isConfig) {
                    return fs.reloadFileList();
                }
            });
            config.reload();
        }
    });
};
