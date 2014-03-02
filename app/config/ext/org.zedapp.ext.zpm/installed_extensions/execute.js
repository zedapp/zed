define(function(require, exports, module) {
    var session = require("zed/session");
    var zpm = require("configfs!./../zpm.js");
    var ui = require("zed/ui");
    var listExtensions = require("configfs!./../installed_extensions.js");
    var install = require("configfs!./../install.js");
    var project = require("zed/project");

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
                
                function reloadFileList() {
                    project.isConfig(function(err, isConfig) {
                        if (isConfig) {
                            project.reloadFileList();
                        }
                    });
                }
                
                var line = lines[pos.row];
                if (pos.row === 3 && line === "Commands: [Install New]      [Update All]") {
                    if (pos.column >= 10 && pos.column <= 23) {
                        install(function(err) {
                            if (!err) {
                                listExtensions();
                            }
                        });
                    } else if (pos.column >= 29) {
                        zpm.updateAll(false, function(err) {
                            if (!err) {
                                reloadFileList();
                            }
                            giveFeedback(err, "Extensions updated!");
                        });
                    }
                } else if (line === "Commands: [Uninstall]      [Update]      [Turn Off Automatic Updates]" || line === "Commands: [Uninstall]      [Update]      [Turn On Automatic Updates]") {
                    var idLine = lines[pos.row - 4];
                    var id = idLine.substr(4);
                    if (pos.column >= 10 && pos.column <= 21) {
                        zpm.uninstall(id, function(err) {
                            if (!err) {
                                reloadFileList();
                            }
                            giveFeedback(err, "Extension uninstalled!");
                        });
                    } else if (pos.column >= 27 && pos.column <= 35) {
                        zpm.update(id, function(err) {
                            if (!err) {
                                reloadFileList();
                            }
                            giveFeedback(err, "Extension updated!");
                        });
                    } else if (pos.column >= 41) {
                        zpm.toggleAutoUpdate(id, giveFeedback);
                    }
                }
                callback();
            });
        });
    };
});