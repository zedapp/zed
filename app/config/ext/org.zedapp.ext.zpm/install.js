define(function(require, exports, module) {
    var ui = require("zed/ui");
    var zpm = require("configfs!./zpm.js");
    var project = require("zed/project");

    return function(info, callback) {
       ui.prompt("URL to install extension from:", "", 400, 150, function(err, url) {
            if (url) {
                zpm.install(url, function(err) {
                    if (err) {
                        ui.prompt(err, undefined, 300, 150, function() {});
                        callback(err);
                    } else {
                        project.isConfig(function(err, isConfig) {
                            if (isConfig) {
                                project.reloadFileList();
                            }
                        });
                        ui.prompt("Extension installed!", undefined, 300, 150, callback);
                    }
                });
            }
       });
    };
});