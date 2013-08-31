/*global define*/
define(function(require, exports, module) {
    "use strict";
    var async = require("./lib/async");
    var eventbus = require("./lib/eventbus");
    var project = require("./project");
    var editor = require("./editor");
    var state = require("./state");
    var locator = require("./lib/locator");

    eventbus.declare("switchsession");
    eventbus.declare("newfilecreated");
    eventbus.declare("filedeleted");
    eventbus.declare("newsession");
    eventbus.declare("sessionsaved");
    eventbus.declare("sessionchanged");
    eventbus.declare("allsessionsloaded");

    var sessions = {};
    var oldstateJSON = null;

    exports.specialDocs = {}; // {content: ..., mode: ..., readonly: true}

    function setupSave(session) {
        var saveTimer = null;
        var path = session.filename;
        session.on('change', function(delta) {
            if(session.ignoreChange)
                return;
            eventbus.emit("sessionchanged", session, delta);
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(function() {
                eventbus.emit("sessionactivitystarted", session, "Saving");
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

    function updateState() {
        state.set("session.current", editor.getEditors().map(function(e) {
            return e.getSession().filename;
        }));
        
        var openDocumentList = Object.keys(sessions);

        openDocumentList.sort(function(a, b) {
            var sessionA = sessions[a];
            var sessionB = sessions[b];
            return sessionB.lastUse - sessionA.lastUse;
        });

        var openDocuments = {};
        openDocumentList.slice(0, 25).forEach(function(path) {
            openDocuments[path] = editor.getSessionState(sessions[path]);
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
    
    function handleChangedFile(path) {
        var session = sessions[path];
        if(!session) {
            return;
        }
        project.readFile(path, function(err, text) {
            if(err) {
                return console.error("Could not load file:", path);
            }
            var cursor = session.selection.getCursor();
            session.ignoreChange = true;
            session.setValue(text);
            session.selection.moveCursorToPosition(cursor);
            session.ignoreChange = false;
        });
    }

    function go(path, edit, previousSession, previewSession) {
        edit = edit || editor.getActiveEditor();
        if (!path) {
            return;
        }
        
        if (exports.specialDocs[path]) {
            var doc = exports.specialDocs[path];
            var session = editor.createSession(path, doc.content);
            session.readOnly = true;
            session.setMode(doc.mode);
            editor.switchSession(session, edit);
            return;
        }
        var pathParts = path.split(':');
        path = pathParts[0];
        var loc = pathParts[1];
        if (path[0] !== '/') {
            // Normalize
            path = '/' + path;
        }
        if (sessions[path]) {
            show(sessions[path]);
        } else {
            loadFile(path, function(err, session) {
                if (err) {
                    console.log("Creating new, empty file", path);
                    session = editor.createSession(path, "");
                    setupSave(session);
                    show(session);
                    eventbus.emit("newfilecreated", path);
                    project.writeFile(path, "", function() {});
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
            if(previewSession) {
                // Copy scroll position and selection from previewSession
                session.setScrollTop(previewSession.getScrollTop());
                session.setScrollLeft(previewSession.getScrollLeft());
                session.selection.setRange(previewSession.selection.getRange());
            }
            editor.switchSession(session, edit);
            
            if(loc && !previewSession) {
                setTimeout(function() {
                    locator.jump(loc);
                });
            }
            
            // File watching
            session.watcherFn = function(path, kind) {
                if(kind === "changed") {
                    handleChangedFile(path);
                } else if(kind === "deleted") {
                    console.log("File deleted", path);
                    delete sessions[path];
                    eventbus.emit("filedeleted", path);
                }
            };
            project.watchFile(session.filename, session.watcherFn);
        }
    }
    
    var previewSessionCache = {};
    
    exports.flushPreviewCache = function() {
        previewSessionCache = {};
    };
    
    /**
     * Simpler version of go that is used for previewing a file
     * Does not save anything in a session or reuse existing sessions
     */
    exports.previewGo = function(path, edit, callback) {
        if (!path) {
            return callback();
        }
        
        var pathParts = path.split(':');
        path = pathParts[0];
        var loc = pathParts[1];
        if (path[0] !== '/') {
            // Normalize
            path = '/' + path;
        }
        if(previewSessionCache[path]) {
            show(previewSessionCache[path]);
        } else {
            project.readFile(path, function(err, text) {
                if (err) {
                    return show(editor.createSession(path, ""));
                }
                var session = editor.createSession(path, text);
                if(sessions[path]) {
                    var existingSession = sessions[path];
                    session.setScrollTop(existingSession.getScrollTop());
                    session.setScrollLeft(existingSession.getScrollLeft());
                    session.selection.setRange(existingSession.selection.getRange());
                }
                previewSessionCache[path] = session;
                session.isPreview = true;
                session.on("change", function() {
                    eventbus.emit("sessionactivityfailed", session, "Cannot save preview session");
                });
                show(session);
            });
        }

        function show(session) {
            editor.switchSession(session, edit);
            if(loc) {
                setTimeout(function() {
                    locator.jump(loc);
                });
            }
            callback(null, session);
        }
    };

    exports.hook = function() {
        async.waitForEvents(eventbus, ["stateloaded", "modesloaded"], function() {
            var sessionStates = state.get("session.open") || {};
            
            go("caelum:start");
            
            async.parForEach(Object.keys(sessionStates), function(path, next) {
                var sessionState = sessionStates[path];
                loadFile(path, function(err, session) {
                    if(!err) {
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
        });
    };

    exports.go = go;
    exports.handleChangedFile = handleChangedFile;
    
    exports.init = function() {
        setInterval(updateState, 2500);
    };
    
    exports.getSessions = function() {
        return sessions;
    };
});
