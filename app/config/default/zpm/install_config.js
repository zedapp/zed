var zpm = require("./zpm.js");
var project = require("zed/project");
var config = require("zed/config");

module.exports = function(info) {
    console.log("Installing packages");
    return zpm.installAll().then(function(anyUpdates) {
        if (anyUpdates) {
            project.isConfig().then(function(isConfig) {
                if (isConfig) {
                    return project.reloadFileList();
                }
            });
            config.reload();
        }
    });
};
