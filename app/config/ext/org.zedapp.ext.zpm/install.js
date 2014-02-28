define(function(require, exports, module) {
    var ui = require("zed/ui");
    var zpm = require("configfs!./zpm.js");

    return function(info, callback) {
       ui.prompt("URL to install extension from:", "", 400, 150, function(err, url) {
            if (url) {
                zpm.install(url, function(err) {
                    if (err) {
                        ui.prompt(err, undefined, 300, 150, function() {});
                    } else {
                        ui.prompt("Extension installed!", undefined, 300, 150, function() {});
                    }
                });
            }
       });
    };
});