var zpm = require("./zpm.js");
var project = require("zed/project");
var config = require("zed/config");
var configFs = require("zed/config_fs");

var DAY = 24 * 60 * 60 * 1000; // number of ms in a day

module.exports = function(info, callback) {
    configFs.readFile("/packages/last.update", function(err, data) {
        var date;
        if(err) {
            // File didn't exist, most likely, so let's reset it
            date = 0;
        } else {
            date = parseInt(data, 10);
        }
        if(Date.now() - date > DAY) {
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
                configFs.writeFile("/packages/last.update", ""+Date.now(), callback);
            });
        }
    });
};
