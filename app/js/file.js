/**
 * This module implements miscelaneous file operations (delete, rename)
 */
/* global define, _*/
define(function(require, exports, module) {
    plugin.consumes = ["ui", "eventbus", "command", "fs", "session_manager", "goto"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("async");

        var ui = imports.ui;
        var eventbus = imports.eventbus;
        var command = imports.command;
        var fs = imports.fs;
        var session_manager = imports.session_manager;
        var goto = imports.goto;

        function confirmDelete(edit) {
            var path = edit.getSession().filename;
            ui.prompt({
                message: "Are you sure you want to delete " + path + "?"
            }, function(err, yes) {
                if (yes) {
                    eventbus.emit("sessionactivitystarted", edit.getSession(), "Deleting");

                    fs.deleteFile(path, function(err) {
                        if (err) {
                            return eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not delete file: " + err);
                        }
                    });
                }
            });
        }

        function renameFile(edit) {
            var session = edit.getSession();
            var path = session.filename;
            console.log("Filename", path);
            ui.prompt({
                message: "New name:",
                input: path
            }, function(err, newPath) {
                if (newPath) {
                    eventbus.emit("sessionactivitystarted", edit.getSession(), "Renaming");
                    fs.writeFile(newPath, session.getValue(), function(err) {
                        if (err) {
                            return eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not write to file: " + err);
                        }
                        // TODO: Copy session state
                        session_manager.go(newPath, edit);
                        eventbus.emit("newfilecreated", newPath);
                        fs.deleteFile(path, function(err) {
                            if (err) {
                                return eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not delete file: " + err);
                            }
                            eventbus.emit("filedeleted", path);
                            eventbus.emit("sessionactivitycompleted", edit.getSession());
                        });
                    });
                }
            });
        }

        function copyFile(edit) {
            var session = edit.getSession();
            var path = session.filename;
            console.log("Filename", path);
            ui.prompt({
                message: "Copy to path:",
                input: path
            }, function(err, newPath) {
                if (newPath) {
                    eventbus.emit("sessionactivitystarted", edit.getSession(), "Copying");
                    fs.writeFile(newPath, session.getValue(), function(err) {
                        if (err) {
                            return eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not write to file: " + err);
                        }
                        // TODO: Copy session state
                        session_manager.go(newPath, edit);
                        eventbus.emit("newfilecreated", newPath);
                        eventbus.emit("sessionactivitycompleted", edit.getSession());
                    });
                }
            });
        }

        command.define("File:Delete", {
            exec: function(edit) {
                confirmDelete(edit);
            }
        });

        command.define("File:Rename", {
            exec: function(edit) {
                renameFile(edit);
            }
        });

        command.define("File:Copy", {
            exec: function(edit) {
                copyFile(edit);
            }
        });

        command.define("File:Delete Tree", {
            exec: function() {
                ui.prompt({
                    message: "Prefix of tree to delete:",
                    input: ""
                }, function(err, prefix) {
                    if (prefix) {
                        ui.prompt({
                            message: "Are you sure you want to delete all files under " + prefix + "?"
                        }, function(err, yes) {
                            if (!yes) {
                                return;
                            }
                            fs.listFiles(function(err, files) {
                                files = _.filter(files, function(path) {
                                    return path.indexOf(prefix) === 0;
                                });
                                async.each(files, function(path, next) {
                                    fs.deleteFile(path, next);
                                }, function() {
                                    goto.fetchFileList();
                                    console.log("All files under", prefix, "removed!");
                                });
                            });
                        });
                    }
                });
            },
            readOnly: true
        });

        register();
    }
});
