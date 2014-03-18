var session = require("zed/session");
var project = require("zed/project");
var ui = require("zed/ui");
var config = require("zed/config");

var zpm = require("../zpm.js");
var listExtensions = require("../installed_packages.js");
var install = require("../install.js");

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

            function reloadConfig() {
                project.isConfig(function(err, isConfig) {
                    if (isConfig) {
                        project.reloadFileList();
                    }
                    config.reload();
                });
            }

            var line = lines[pos.row];
            if (pos.row === 3 && line === "Commands: [Install New]      [Update All]") {
                if (pos.column >= 10 && pos.column <= 23) {
                    install(null, function(err) {
                        if (!err) {
                            listExtensions();
                        }
                    });
                } else if (pos.column >= 29) {
                    zpm.updateAll(false, function(err) {
                        if (!err) {
                            reloadConfig();
                        }
                        giveFeedback(err, "Extensions updated!");
                    });
                }
            } else if (line === "Commands: [Uninstall]      [Update]") {
                var idLine = lines[pos.row - 3];
                var id = idLine.substr(4);
                if (pos.column >= 10 && pos.column <= 21) {
                    zpm.uninstall(id, function(err) {
                        if (!err) {
                            reloadConfig();
                            zpm.removeFromConfig(id, function(err) {
                                giveFeedback(err, "Extension uninstalled!");
                            });
                        } else {
                            giveFeedback(err);
                        }
                    });
                } else if (pos.column >= 27 && pos.column <= 35) {
                    zpm.update(id, function(err) {
                        if (!err) {
                            reloadConfig();
                        }
                        giveFeedback(err, "Extension updated!");
                    });
                }
            }
            callback();
        });
    });
};
