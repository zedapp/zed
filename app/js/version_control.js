define(function(require, exports, module) {
    plugin.consumes = ["fs", "command", "ui", "eventbus"]
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;
        var fs = imports.fs;
        var ui = imports.ui;
        var eventbus = imports.eventbus;

        if(fs.commit) {
            // Enable version control commands

            command.define("Version Control:Commit", {
                exec: function(edit, session) {
                    ui.prompt({
                        message: "Commit message",
                        input: "No comment"
                    }).then(function(message) {
                        if(!message) {
                            return;
                        }
                        eventbus.emit("sessionactivitystarted", session, "Comitting...");
                        return fs.commit(message).then(function() {
                            eventbus.emit("sessionactivitycompleted", session);
                        }, function(err) {
                            eventbus.emit("sessionactivityfailed", session, "Failed to commit");
                            console.error("Failed to commit", err);
                        });
                    });
                },
                readOnly: true
            });

            command.define("Version Control:Reset", {
                exec: function() {
                    ui.prompt({
                        message: "This will undo all local changes in this project, are you sure?",
                    }).then(function(yes) {
                        if(!yes) {
                            return;
                        }
                        return fs.reset().then(function() {
                            return zed.getService("goto").fetchFileList();
                        });
                    });
                },
                readOnly: true
            });

            command.define("Version Control:Show Locally Changed Files", {
                exec: function(edit, session) {
                    return fs.getLocalChanges().then(function(changes) {
                        return zed.getService("session_manager").go("zed::vc::changes.md", edit, session).then(function(session) {
                            console.log("Session", session);
                            var text = "Local changes since last commit\n===============================\nRun the `Version Control:Commit` command to commit the changes below, or `Version Control:Reset` to reset everything.\n\n";

                            var change = false;

                            changes.added.forEach(function(path) {
                                text += "A " + path + "\n";
                                change = true;
                            });
                            changes.modified.forEach(function(path) {
                                text += "M " + path + "\n";
                                change = true;
                            });
                            changes.deleted.forEach(function(path) {
                                text += "D " + path + "\n";
                                change = true;
                            });
                            if(!change) {
                                text += "No changes";
                            }
                            session.setValue(text);
                        }).catch(function(err) {
                            console.error("Error", err);
                        });
                    });
                },
                readOnly: true
            });
        }

        register();
    }
});
