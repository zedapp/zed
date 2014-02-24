define(function(require, exports, module) {
    var session = require("zed/session");
    var zpm = require("zed/zpm");
    var ui = require("zed/ui");
    var listExtensions = require("configfs!/default/zpm/installed_extensions.js");

    return function(info, callback) {
        var path = info.path;

        session.getCursorPosition(path, function(err, pos) {
            session.getAllLines(path, function(err, lines) {
                function giveFeedback(err, message) {
                    if (err) {
                        ui.prompt(err, undefined, 300, 150, function() {});
                    } else {
                        if (message) {
                            ui.prompt(message, undefined, 300, 150, function() {});
                        }
                        listExtensions();
                    }
                }
                
                var line = lines[pos.row];
                if (pos.row === 3 && line === "Command: Update All") {
                    zpm.updateAll(function(err) {
                        giveFeedback(err, "Extensions updated!");
                    });
                } else if (line === "Commands: Uninstall      Update      Turn Off Automatic Updates" || line === "Commands: Uninstall      Update      Turn On Automatic Updates") {
                    var idLine = lines[pos.row - 4];
                    var id = idLine.substr(4);
                    if (pos.column >= 10 && pos.column <= 19) {
                        zpm.uninstall(id, function(err) {
                            giveFeedback(err, "Extension uninstalled!");
                        });
                    } else if (pos.column >= 25 && pos.column <= 31) {
                        zpm.update(id, function(err) {
                            giveFeedback(err, "Extension updated!");
                        });
                    } else if (pos.column >= 37) {
                        zpm.toggleAutoUpdate(id, giveFeedback);
                    }
                }
                callback();
            });
        });
    };
});