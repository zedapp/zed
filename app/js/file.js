/**
 * This module implements miscelaneous file operations (delete, rename)
 */
define(function(require, exports, module) {
    var ui = require("./lib/ui");
    var eventbus = require("./lib/eventbus");
    var command = require("./command");
    var project = require("./project");
    var session_manager = require("./session_manager");
    
    function confirmDelete(edit) {
        var path = edit.getSession().filename;
        ui.prompt({
            message: "Are you sure you want to delete " + path + "?"
        }, function(yes) {
            if (yes) {
                eventbus.emit("sessionactivitystarted", edit.getSession(), "Deleting");
                
                project.deleteFile(path, function(err) {
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
        }, function(newPath) {
            if (newPath) {
                eventbus.emit("sessionactivitystarted", edit.getSession(), "Renaming");
                project.writeFile(newPath, session.getValue(), function(err) {
                    if(err) {
                        return eventbus.emit("sessionactivityfailed", edit.getSession(), "Could not write to file: " + err);
                    }
                    // TODO: Copy session state
                    session_manager.go(newPath, edit);
                    eventbus.emit("newfilecreated", newPath);
                    project.deleteFile(path, function(err) {
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

    command.define("File:Delete", {
        exec: function(edit) {
            setTimeout(function() {
                confirmDelete(edit);
            }, 0);
        }
    });
    
    command.define("File:Rename", {
        exec: function(edit) {
            setTimeout(function() {
                renameFile(edit);
            }, 0);
        }
    });
});
