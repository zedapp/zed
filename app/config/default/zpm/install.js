define(function(require, exports, module) {
    var ui = require("zed/ui");
    var zpm = require("zed/zpm");

    return function(info, callback) {
       ui.prompt("URL to install extension from:", "", 400, 150, function(err, url) {
          zpm.install(url, function(err) {
              if (err) {
                  ui.prompt(err);
              } else {
                  ui.prompt("Extension installed!");
              }
          });
       });
    };
});