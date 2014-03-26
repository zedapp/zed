var zpm = require("./zpm.js");
var project = require("zed/project");
var config = require("zed/config");
var configFs = require("zed/config_fs");

var DAY = 24 * 60 * 60 * 1000; // number of ms in a day

module.exports = function(info) {
    return configFs.readFile("/packages/last.update").then(check, function() {
        return check("0");
    });

    function check(data) {
        var date = parseInt(data, 10);
        if(Date.now() - date > DAY) {
            console.log("ZPM: Checking for updates...");
            return zpm.updateAll(true).then(function(anyUpdates) {
                if (anyUpdates) {
                    project.isConfig().then(function(isConfig) {
                        if (isConfig) {
                            return project.reloadFileList();
                        }
                    });
                    config.reload();
                }
                configFs.writeFile("/packages/last.update", ""+Date.now());
            });
        }
    }
};
