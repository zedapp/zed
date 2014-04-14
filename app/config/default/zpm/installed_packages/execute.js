var fs = require("zed/fs");
var ui = require("zed/ui");
var config = require("zed/config");

var zpm = require("../zpm.js");
var listExtensions = require("../installed_packages.js");
var install = require("../install.js");

return function(info) {
    var pos = info.inputs.cursor;
    var lines = info.inputs.lines;

    function giveFeedback(message) {
        if (message) {
            ui.prompt(message, undefined, 300, 150);
        }
        listExtensions();
    }

    function giveError(err) {
        ui.prompt(err, undefined, 300, 150);
    }

    function reloadConfig() {
        fs.isConfig(function(err, isConfig) {
            if (isConfig) {
                fs.reloadFileList();
            }
            config.reload();
        });
    }

    var line = lines[pos.row];
    if (pos.row === 3 && line === "Commands: [Install New]      [Update All]") {
        if (pos.column >= 10 && pos.column <= 23) {
            return install().then(listExtensions);
        } else if (pos.column >= 29) {
            return zpm.updateAll(false).then(function() {
                reloadConfig();
                giveFeedback("Extensions updated!");
            }, giveError);
        }
    } else if (line === "Commands: [Uninstall]      [Update]") {
        var idLine = lines[pos.row - 3];
        var id = idLine.substr(5);
        if (pos.column >= 10 && pos.column <= 21) {
            console.log("Unstalling stuff", id);
            return zpm.uninstall(id).then(function() {
                reloadConfig();
                return zpm.removeFromConfig(id).then(function() {
                    giveFeedback("Extension uninstalled!");
                }, giveError);
            });
        } else if (pos.column >= 27 && pos.column <= 35) {
            return zpm.update(id).then(function() {
                reloadConfig();
                giveFeedback("Extension updated!");
            }, giveError);
        }
    }
};
