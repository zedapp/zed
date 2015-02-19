define(function(require, exports, module) {
    plugin.consumes = ["fs", "command", "ui", "eventbus"]
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;
        var fs = imports.fs;
        var ui = imports.ui;
        var eventbus = imports.eventbus;

        if (fs.getCapabilities().scm) {
            // Enable version control commands
            var preCommitSession; // to jump back to after commit buffer is discarded

            command.define("Version Control:Commit", {
                exec: function(edit, session) {
                    preCommitSession = session;
                    return fs.getLocalChanges().then(function(changes) {
                        if (changes.added.length === 0 && changes.modified.length === 0 && changes.deleted.length === 0) {
                            return ui.prompt({
                                message: "No changes to commit"
                            });
                        }
                        return zed.getService("session_manager").go("zed::vc::commit.commit|write", edit, session).then(function(session) {
                            var text = "\n# Please enter the commit message for your changes above.\n";
                            text += "# Lines starting with '#' will be ignored.\n#\n";
                            text += "# Press Ctrl-Shift-C to finalize the commit or Esc to cancel.\n";
                            text += "#\n";
                            text += "# Changes to be committed:\n#\n";

                            var change = false;

                            changes.added.forEach(function(path) {
                                text += "# new file:   " + path + "\n";
                                change = true;
                            });
                            changes.modified.forEach(function(path) {
                                text += "# modified:   " + path + "\n";
                                change = true;
                            });
                            changes.deleted.forEach(function(path) {
                                text += "# deleted:    " + path + "\n";
                                change = true;
                            });
                            if (!change) {
                                text += "No changes to commit";
                            }
                            session.setValue(text);
                        }).
                        catch (function(err) {
                            console.error("Error", err);
                        });
                    });
                },
                readOnly: true
            });

            console.log("Finalize commit");
            command.define("Version Control:Finalize Commit", {
                exec: function(edit, session) {
                    var commitMessage = session.getValue();
                    var lines = commitMessage.trim().split("\n");
                    console.log("Full message", lines);
                    var newLines = [];
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.length > 0 && line[0] !== "#") {
                            newLines.push(line);
                        }
                    }
                    commitMessage = newLines.join("\n").trim();
                    eventbus.emit("sessionactivitystarted", session, "Comitting...");
                    return fs.commit(commitMessage).then(function() {
                        eventbus.emit("sessionactivitycompleted", session);
                    }, function(err) {
                        eventbus.emit("sessionactivityfailed", session, "Failed to commit");
                        console.error("Failed to commit", err);
                    }).then(function() {
                        zed.getService("session_manager").go(preCommitSession.filename, edit, session);
                        var sessions = zed.getService("session_manager").getSessions();
                        delete sessions["zed::vc::commit.commit"];
                        zed.getService("eventbus").emit("filedeleted", "zed::vc::commit.commit");
                    });
                },
                readOnly: false,
                internal: true
            });

            command.define("Version Control:Cancel Commit", {
                exec: function(edit, session) {
                    zed.getService("session_manager").go(preCommitSession.filename, edit, session);
                    var sessions = zed.getService("session_manager").getSessions();
                    delete sessions["zed::vc::commit.commit"];
                    zed.getService("eventbus").emit("filedeleted", "zed::vc::commit.commit");
                },
                readOnly: false,
                internal: true
            });

            command.define("Version Control:Reset", {
                exec: function() {
                    ui.prompt({
                        message: "This will undo all local changes in this project, are you sure?",
                    }).then(function(yes) {
                        if (!yes) {
                            return;
                        }
                        return fs.reset().then(function() {
                            return zed.getService("goto").fetchFileList();
                        });
                    });
                },
                readOnly: true
            });

            command.define("Version Control:Create Branch", {
                exec: function() {
                    ui.prompt({
                        message: "Branch name:",
                        input: ""
                    }).then(function(name) {
                        if (!name) {
                            return;
                        }
                        return fs.createBranch(name).then(function(info) {
                            window.opener.openProject(info.repo + " [" + name + "]", info.id);
                        });
                    });
                },
                readOnly: true
            });
        }

        register();
    }
});
