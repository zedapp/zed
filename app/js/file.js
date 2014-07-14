/**
 * This module implements miscelaneous file operations (delete, rename)
 */
/* global define, _*/
define(function(require, exports, module) {
    plugin.consumes = ["ui", "eventbus", "command", "fs", "session_manager", "goto"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("async");
        var useragent = require("ace/lib/useragent");
        var path = require("./lib/path");

        var ui = imports.ui;
        var eventbus = imports.eventbus;
        var command = imports.command;
        var fs = imports.fs;
        var session_manager = imports.session_manager;
        var goto = imports.goto;

        function confirmDelete(edit) {
            var path = edit.getSession().filename;
            return ui.prompt({
                message: "Are you sure you want to delete " + path + "?"
            }).then(function(yes) {
                if (yes) {
                    eventbus.emit("sessionactivitystarted", edit.getSession(), "Deleting");
                    return fs.deleteFile(path).then(function() {
                        session_manager.deleteSession(path);
                    }, function(err) {
                        return eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not delete file: " + err);
                    });
                }
            });
        }

        function renameFile(edit) {
            var session = edit.getSession();
            var path = session.filename;
            console.log("Filename", path);
            return ui.prompt({
                message: "New name:",
                input: path
            }).then(function(newPath) {
                var comparePath = path;
                var compareNewPath = newPath;
                if (useragent.isMac) {
                    comparePath = path.toLowerCase();
                    compareNewPath = newPath.toLowerCase();
                }
                if (newPath && comparePath !== compareNewPath) {
                    eventbus.emit("sessionactivitystarted", edit.getSession(), "Renaming");
                    fs.readFile(newPath).then(function() {
                        ui.prompt({
                            message: "Are you sure you want to delete the current file at " + newPath + "?"
                        }).then(function(yes) {
                            if (yes) {
                                return actuallyRenameFile(edit, session, path, newPath);
                            } else {
                                eventbus.emit("sessionactivitycompleted", edit.getSession());
                            }
                        });
                    }, function(err) {
                        actuallyRenameFile(edit, session, path, newPath);
                    });
                }
            });
        }

        function actuallyRenameFile(edit, session, path, newPath) {
            return fs.writeFile(newPath, session.getValue()).then(function() {
                // TODO: Copy session state
                session_manager.handleChangedFile(newPath);
                session_manager.go(newPath, edit);
                eventbus.emit("newfilecreated", newPath, session);
                return fs.deleteFile(path).then(function() {
                    session_manager.deleteSession(path);
                    eventbus.emit("filedeleted", path);
                    eventbus.emit("sessionactivitycompleted", edit.getSession());
                });
            }).
            catch (function(err) {
                eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not write to file: " + err);
            });
        }

        function copyFile(edit) {
            var session = edit.getSession();
            var path = session.filename;
            console.log("Filename", path);
            ui.prompt({
                message: "Copy to path:",
                input: path
            }).then(function(newPath) {
                if (newPath) {
                    eventbus.emit("sessionactivitystarted", edit.getSession(), "Copying");
                    return fs.writeFile(newPath, session.getValue()).then(function() {
                        // TODO: Copy session state
                        session_manager.go(newPath, edit);
                        eventbus.emit("newfilecreated", newPath, session);
                        eventbus.emit("sessionactivitycompleted", edit.getSession());
                    }, function(err) {
                        eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not write to file: " + err);
                    });
                }
            });
        }

        command.define("File:New", {
            doc: "Create a new file",
            exec: function(edit, session) {
                var currentPath = session.filename;
                var dir = path.dirname(currentPath);
                command.exec("Navigate:Goto", edit, session, dir + "/");
            },
            readOnly: true
        });

        command.define("File:Delete", {
            doc: "Remove the current file from disk.",
            exec: function(edit) {
                confirmDelete(edit);
            }
        });

        command.define("File:Rename", {
            doc: "Rename the current file on disk.",
            exec: function(edit) {
                renameFile(edit);
            }
        });

        command.define("File:Copy", {
            doc: "Copy the current file to a new path on disk.",
            exec: function(edit) {
                copyFile(edit);
            }
        });

        command.define("File:Delete Tree", {
            doc: "Recursively delete a directory, and all subdirectories and files contained within.",
            exec: function() {
                ui.prompt({
                    message: "Prefix of tree to delete:",
                    input: ""
                }).then(function(prefix) {
                    if (prefix) {
                        ui.prompt({
                            message: "Are you sure you want to delete all files under " + prefix + "?"
                        }).then(function(yes) {
                            if (!yes) {
                                return;
                            }
                            return fs.listFiles().then(function(files) {
                                files = _.filter(files, function(path) {
                                    return path.indexOf(prefix) === 0;
                                });
                                return Promise.all(files.map(function(file) {
                                    return fs.deleteFile(file);
                                })).then(function() {
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
