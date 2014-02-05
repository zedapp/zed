/**
 * This module handles all open editor sessions (i.e. all open files, opening them etc.)
 */
/*global define, ace, _ */
define(function(require, exports, module) {
    "use strict";
    var Range = require("ace/range").Range;
    var async = require("./lib/async");
    var eventbus = require("./lib/eventbus");
    var project = require("./project");
    var editor = require("./editor");
    var state = require("./state");
    var locator = require("./lib/locator");
    var ui = require("./lib/ui");
    var command = require("./command");

    eventbus.declare("switchsession");
    eventbus.declare("newfilecreated");
    eventbus.declare("filedeleted");
    eventbus.declare("newsession");
    eventbus.declare("sessionbeforesave");
    eventbus.declare("sessionsaved");
    eventbus.declare("sessionchanged");
    eventbus.declare("allsessionsloaded");

    var sessions = {};

    // Used to detect changes in editor state
    var oldstateJSON = null;

    // Currently only used for zed:start
    exports.specialDocs = {}; // {content: ..., mode: ..., readonly: true}

    function setupSave(session) {
        var saveTimer = null;
        var path = session.filename;
        session.on('change', function(delta) {
            if(session.ignoreChange) {
                return;
            }
            eventbus.emit("sessionchanged", session, delta);
            if (saveTimer) {
                clearTimeout(saveTimer);
            }
            saveTimer = setTimeout(function() {
                // If this is a new file, this is the moment that it's going to
                // be saved for the first time and ought to appear in the file list,
                // so let's emit the 'newfilecreated' event.
                if(session.newFile) {
                    session.newFile = false;
                    eventbus.emit("newfilecreated", path);
                }
                eventbus.emit("sessionactivitystarted", session, "Saving");
                eventbus.emit("sessionbeforesave", session);
                project.writeFile(path, session.getValue(), function(err) {
                    if(err) {
                        eventbus.emit("sessionactivityfailed", session, "Failed to save");
                    } else {
                        eventbus.emit("sessionactivitycompleted", session);
                        eventbus.emit("sessionsaved", session);
                    }
                });
            }, 1000);
        });
        sessions[path] = session;
    }

    // TODO: Move this to state.js?
    function updateState() {
        state.set("session.current", editor.getEditors().map(function(e) {
            if(e.getSession().dontPersist) {
                return "zed:start";
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
            if(!session.dontPersist) {
                openDocuments[path] = editor.getSessionState(session);
            }
        });
        state.set("session.open", openDocuments);

        var stateJSON = state.toJSON();
        if (stateJSON !== oldstateJSON) {
            console.log("Saving state.");
            state.save();
        }

        oldstateJSON = stateJSON;
    }


    function loadFile(path, callback) {
        project.readFile(path, function(err, text, options) {
            if(err) {
                return callback(err);
            }
            options = options || {};
            var session = editor.createSession(path, text);
            session.readOnly = !!options.readOnly;
            setupSave(session);
            callback(null, session);
        });
    }

    /**
     * Reloads a file when it has been changed on disk (observed by a file watcher)
     */
    function handleChangedFile(path) {
        var session = sessions[path];
        if(!session) {
            return;
        }
        project.readFile(path, function(err, text) {
            if(err) {
                return console.error("Could not load file:", path);
            }
            session.ignoreChange = true;

            // Save scroll/cursor state
            var scrollTop = session.getScrollTop();
            var scrollLeft  = session.getScrollLeft();
            var cursorPos = session.selection.getCursor();

            var lineCount = session.getLength();
            var range = new Range(0, 0, lineCount, session.getLine(lineCount-1).length);

            session.replace(range, text);

            // Restore
            session.selection.clearSelection();
            session.selection.moveCursorToPosition(cursorPos);
            session.setScrollTop(scrollTop);
            session.setScrollLeft(scrollLeft);

            session.ignoreChange = false;
        });
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

        if (exports.specialDocs[path]) {
            var doc = exports.specialDocs[path];
            var session = editor.createSession(path, doc.content);
            session.readOnly = true;
            session.setMode(doc.mode);
            editor.switchSession(session, edit);
            callback && callback(null, session);
            return;
        }
        var pathParts = path.split(':');
        if(pathParts[0] !== "zed") {
            path = pathParts[0];
            var loc = pathParts[1];
            if (path[0] !== '/') {
                // Normalize
                path = '/' + path;
            }
        }

        // Check if somebody is not trying to create a file ending with '/'
        if(path[path.length-1] === '/') {
            eventbus.emit("sessionactivityfailed", previousSession, "Cannot create files ending with /");
            callback && callback("Cannot create files ending with /");
            return;
        }

        if (sessions[path]) {
            show(sessions[path]);
        } else if(path.indexOf("zed:") === 0) {
            var session = editor.createSession(path, "");
            session.readOnly = true;
            session.dontPersist = true;
            show(session);
            sessions[path] = session;
            eventbus.emit("newfilecreated", path);
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
            if(previousSession.watcherFn) {
                project.unwatchFile(previousSession.filename, previousSession.watcherFn);
            }
            editor.switchSession(session, edit);

            if(loc) {
                setTimeout(function() {
                    locator.jump(loc);
                });
            }

            // File watching
            if(!session.readOnly) {
                session.watcherFn = function(path, kind) {
                    ui.unblockUI();
                    if(kind === "changed") {
                        handleChangedFile(path);
                    } else if(kind === "deleted") {
                        var session = sessions[path];
                        if(!session.newFile) {
                            console.log("File deleted", path);
                            delete sessions[path];
                            eventbus.emit("filedeleted", path);
                        }
                    } else {
                        console.log("Other kind", kind);
                        ui.blockUI("Disconnected, hang on... If this message doesn't disappear within a few seconds: close this window and restart your Zed client.");
                    }
                };
                project.watchFile(session.filename, session.watcherFn);
            }

            callback && callback(null, session);
        }
    }

    exports.hook = function() {
        async.waitForEvents(eventbus, ["stateloaded", "modesloaded"], function() {
            var sessionStates = state.get("session.open") || {};

            go("zed:start");

            async.parForEach(Object.keys(sessionStates), function(path, next) {
                var sessionState = sessionStates[path];
                loadFile(path, function(err, session) {
                    if(err) {
                        delete sessionStates[path];
                    } else {
                        editor.setSessionState(session, sessionState);
                    }
                    next();
                });
            }, function done() {
                console.log("All sessions loaded.");
                var editors = editor.getEditors();
                if(state.get("session.current")) {
                    state.get("session.current").forEach(function(path, idx) {
                        go(path, editors[idx]);
                    });
                }
                eventbus.emit("allsessionsloaded");
            });

            setInterval(updateState, 2500);
        });

        ui.blockUI("Loading project and file list. One moment please...");

        async.waitForEvents(eventbus, ["loadedfilelist", "stateloaded"], function() {
            ui.unblockUI();
        });

        // Modes have been loaded, let's iterate over all to setup the right one
        eventbus.on("modesloaded", function(modes) {
            _.each(sessions, function(session) {
                modes.setSessionMode(session, modes.getModeForPath(session.filename));
            });
        });
    };
    
    command.define("File:Reload", {
        exec: function(edit, session) {
            handleChangedFile(session.filename);
        },
        readOnly: true
    });

    exports.go = go;
    exports.handleChangedFile = handleChangedFile;

    exports.getSessions = function() {
        return sessions;
    };
});
