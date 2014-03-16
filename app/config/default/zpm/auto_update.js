var zpm = require("./zpm.js");
var project = require("zed/project");
var config = require("zed/config");

module.exports = function(info, callback) {
    console.log("ZPM: Checking for updates...");
    zpm.updateAll(true, function(err, anyUpdates) {
        if(err) {
            return console.error("ZPM update error", err);
        }
        if (anyUpdates) {
            project.isConfig(function(err, isConfig) {
                if (isConfig) {
                    project.reloadFileList();
                }
            });
            config.reload();
        }
    });
};