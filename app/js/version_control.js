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
                        return fs.reset();
                    });
                },
                readOnly: true
            });
        }

        register();
    }
});
