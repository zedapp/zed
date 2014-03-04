var zpm = require("./zpm.js");
var project = require("zed/project");
var config = require("zed/config");

module.exports = function(info, callback) {
    console.log("Installing packages");
    zpm.installAll(function(err, anyUpdates) {
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