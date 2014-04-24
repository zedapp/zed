/**
 * This module handles all open editor sessions (i.e. all open files, opening them etc.)
 */
/*global define, ace, _ */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["config", "eventbus", "editor", "state", "ui", "command", "fs", "window"];
    plugin.provides = ["session_manager"];
    return plugin;

    function plugin(options, imports, register) {
        var Range = require("ace/range").Range;
        var async = require("./lib/async");
        var locator = require("./lib/locator");
        var opts = require("./lib/options");

        var config = imports.config;
        var eventbus = imports.eventbus;
        var fs = imports.fs;
        var editor = imports.editor;
        var state = imports.state;
        var ui = imports.ui;
        var command = imports.command;
        var win = imports.window;

        eventbus.declare("switchsession");
        eventbus.declare("newfilecreated");
        eventbus.declare("filedeleted");
        eventbus.declare("newsession");
        eventbus.declare("sessionbeforesave");
        eventbus.declare("sessionsaved");
        eventbus.declare("sessionchanged");
        eventbus.declare("allsessionsloaded");
        eventbus.declare("inited");

        var sessions = {};

        // Used to detect changes in editor state
        var oldstateJSON = null;

        var api = {
            specialDocs: {}, // {content: ..., mode: ..., readonly: true}
            hook: function() {
                async.waitForEvents(eventbus, ["loadedfilelist", "stateloaded", "configchanged"], function() {
                    eventbus.emit("inited");
                    ui.unblockUI();
                });

                // Modes have been loaded, let's iterate over all to setup the right one
                eventbus.on("modesloaded", function(modes) {
                    _.each(sessions, function(session) {
                        modes.setSessionMode(session, modes.getModeForSession(session));
                    });
                });

                eventbus.on("switchsession", function(edit, newSession, prevSession) {
                    saveSession(prevSession);
                });

                win.setCloseHandler(function() {
                    saveSession(editor.getActiveSession(), function() {
                        win.close(true);
                    });
                });

            },
            saveSession: saveSession,
            go: go,
            handleChangedFile: handleChangedFile,
            getSession: function(path) {
                return sessions[path] || api.specialDocs[path];
            },
            getSessions: function() {
                return sessions;
            },
        };

        function setupSave(session) {
            var saveTimer = null;
            var path = session.filename;
            session.on('change', function(delta) {
                if (session.ignoreChange) {
                    return;
                }
                eventbus.emit("sessionchanged", session, delta);
                if (saveTimer) {
                    clearTimeout(saveTimer);
                }
                session.dirty = true;
                var saveTimeout = config.getPreference("saveTimeout");
                if(saveTimeout > 0) {
                    saveTimer = setTimeout(function() {
                        saveSession(session);
                    }, saveTimeout);
                }
            });
            sessions[path] = session;
        }

        function saveSession(session, callback) {
            var path = session.filename;
            if (!path || !session.dirty) {
                callback && callback();
                return;
            }
            // If this is a new file, this is the moment that it's going to
            // be saved for the first time and ought to appear in the file list,
            // so let's emit the 'newfilecreated' event.
            if (session.newFile) {
                session.newFile = false;
                eventbus.emit("newfilecreated", path, session);
            }
            eventbus.emit("sessionactivitystarted", session, "Saving");
            eventbus.emit("sessionbeforesave", session);
            fs.writeFile(path, session.getValue(), function(err) {
                if (err) {
                    eventbus.emit("sessionactivityfailed", session, "Failed to save");
                } else {
                    eventbus.emit("sessionactivitycompleted", session);
                    eventbus.emit("sessionsaved", session);
                    session.dirty = false;
                }
                callback && callback();
            });
        }

        // TODO: Move this to state.js?
        function updateState() {
            state.set("session.current", editor.getEditors().map(function(e) {
                if (e.getSession().dontPersist) {
                    return "zed::start";
                } else {
                    return e.getSession().filename;
                }
            }));

            var openDocumentList = Object.keys(sessions);

            openDocumentList.sort(function(a, b) {
                var sessionA = sessions[a];
                var sessionB = sessions[b];
                return sessionB.lastUse - sessionA.lastUse;
            });

            var openDocuments = {};
            openDocumentList.slice(0, 25).forEach(function(path) {
                var session = sessions[path];
                if (!session.dontPersist) {
                    openDocuments[path] = editor.getSessionState(session);
                }
            });
            state.set("session.open", openDocuments);

            var stateJSON = state.toJSON();
            if (stateJSON !== oldstateJSON) {
                state.save();
            }

            oldstateJSON = stateJSON;
        }

        function loadFile(path, callback) {
            fs.readFile(path, function(err, text, options) {
                if (err) {
                    return callback(err);
                }
                options = options || {};
                var session = editor.createSession(path, text);
                session.readOnly = !! options.readOnly;
                setupSave(session);
                callback(null, session);
            });
        }

        /**
         * Reloads a file when it has been changed on disk (observed by a file watcher)
         */
        function handleChangedFile(path) {
            var session = sessions[path];
            if (!session) {
                return;
            }
            // Don't do the asking for a reload dance when this is the config project,
            // or if the preference to automatically revert is set.
            if ((opts.get("url").indexOf("config:") === 0) || (config.getPreference("globalAutoRevert"))) {
                return reloadFile();
            }
            ui.prompt({
                message: "File '" + path + "' changed on disk, reload (Ok) or keep original (Cancel)?"
            }, function(err, yes) {
                if (yes) {
                    reloadFile();
                } else {
                    // Create backup of changed file on disk
                    fs.readFile(path, function(err, text) {
                        if (err) {
                            return console.error("Could not load file:", path);
                        }
                        fs.writeFile(path + ".bak", text, function(err) {
                            if (err) {
                                return console.error("Could not write backup file", path + ".bak");
                            }
                            fs.writeFile(path, session.getValue(), function(err) {
                                if (err) {
                                    return console.error("Could not write local copy to", path);
                                }
                                console.log("Did not reload file, saved backup of disk-version in", path + ".bak");
                            });
                        });
                    });
                }

            });

            function reloadFile() {
                fs.readFile(path, function(err, text) {
                    if (err) {
                        return console.error("Could not load file:", path);
                    }
                    session.ignoreChange = true;

                    // Save scroll/cursor state
                    var scrollTop = session.getScrollTop();
                    var scrollLeft = session.getScrollLeft();
                    var cursorPos = session.selection.getCursor();

                    var lineCount = session.getLength();
                    var range = new Range(0, 0, lineCount, session.getLine(lineCount - 1).length);

                    session.replace(range, text);

                    // Restore
                    session.selection.clearSelection();
                    session.selection.moveCursorToPosition(cursorPos);
                    session.setScrollTop(scrollTop);
                    session.setScrollLeft(scrollLeft);

                    session.ignoreChange = false;
                });
            }
        }

        /**
         * Navigates to a file, openeing it if hasn't been opened yet, switching to
         * it if it's already loaded in memory
         */
        function go(path, edit, previousSession, callback) {
            edit = edit || editor.getActiveEditor();
            if (!path) {
                callback && callback("No path");
                return;
            }

            if (api.specialDocs[path]) {
                var session = api.specialDocs[path];
                show(session);
                return;
            }
            var pathParts = path.split(':');
            if (pathParts[0] !== "zed") {
                path = pathParts[0];
                var loc = pathParts[1];
                if (path[0] !== '/') {
                    // Normalize
                    path = '/' + path;
                }
            }

            // Check if somebody is not trying to create a file ending with '/'
            if (path[path.length - 1] === '/') {
                eventbus.emit("sessionactivityfailed", previousSession, "Cannot create files ending with /");
                callback && callback("Cannot create files ending with /");
                return;
            }

            if (sessions[path]) {
                show(sessions[path]);
            } else if (path.indexOf("zed::") === 0) {
                var session = editor.createSession(path, "");
                session.readOnly = true;
                session.dontPersist = true;
                show(session);
                sessions[path] = session;
                eventbus.emit("newfilecreated", path, session);
            } else {
                eventbus.emit("sessionactivitystarted", previousSession, "Loading...");
                loadFile(path, function(err, session) {
                    eventbus.emit("sessionactivitycompleted", previousSession);
                    if (err) {
                        console.log("Creating new, empty file", path);
                        session = editor.createSession(path, "");
                        setupSave(session);
                        show(session);
                        session.newFile = true;
                    } else {
                        eventbus.emit("newsession", session);
                        show(session);
                    }
                });
            }

            function show(session) {
                session.lastUse = Date.now();
                previousSession = previousSession || edit.getSession();
                if (previousSession.watcherFn) {
                    fs.unwatchFile(previousSession.filename, previousSession.watcherFn);
                }
                editor.switchSession(session, edit);

                if (loc) {
                    setTimeout(function() {
                        locator.jump(loc);
                    });
                }

                // File watching
                if (!session.readOnly) {
                    session.watcherFn = function(path, kind) {
                        ui.unblockUI();
                        if (kind === "changed") {
                            handleChangedFile(path);
                        } else if (kind === "deleted") {
                            var session = sessions[path];
                            if (!session.newFile) {
                                console.log("File deleted", path);
                                delete sessions[path];
                                eventbus.emit("filedeleted", path);
                            }
                        } else {
                            console.log("Other kind", kind);
                            ui.blockUI("Disconnected, hang on... If this message doesn't disappear within a few seconds: close this window and restart your Zed client.");
                        }
                    };
                    fs.watchFile(session.filename, session.watcherFn);
                }

                callback && callback(null, session);
            }
        }

        async.waitForEvents(eventbus, ["stateloaded", "modesloaded"], function() {
            var sessionStates = state.get("session.open") || {};

            go("zed::start");

            async.parForEach(Object.keys(sessionStates), function(path, next) {
                var sessionState = sessionStates[path];
                loadFile(path, function(err, session) {
                    if (err) {
                        delete sessionStates[path];
                    } else {
                        editor.setSessionState(session, sessionState);
                    }
                    next();
                });
            }, function done() {
                console.log("All sessions loaded.");
                var editors = editor.getEditors();
                if (state.get("session.current")) {
                    state.get("session.current").forEach(function(path, idx) {
                        go(path, editors[idx]);
                    });
                }
                eventbus.emit("allsessionsloaded");
            });

            setInterval(updateState, 2500);
        });

        ui.blockUI("Loading project and file list. One moment please...");

        command.define("File:Reload", {
            doc: "Re-read this file from disk, reverting any unsaved changes.",
            exec: function(edit, session) {
                handleChangedFile(session.filename);
            },
            readOnly: true
        });

        command.define("File:Save", {
            doc: "Explicitly saves a file, for those who don't trust auto-save",
            exec: function(edit, session) {
                saveSession(session);
            },
            readOnly: true
        });

        register(null, {
            session_manager: api
        });
    }
});
