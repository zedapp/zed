define(function(require, exports, module) {
    var project = require("./project");
    var editor = require("./editor");
    var eventbus = require("./eventbus");
    var goto = require("./goto");
    var state = require("./state");
    var command = require("./command");
    var locator = require("./locator");
    var async = require("./async");

    eventbus.declare("switchsession");
    eventbus.declare("newfilecreated");
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
                console.log("Saving...");
                project.writeFile(path, session.getValue(), function(err, res) {
                    console.log("Result:", res);
                    eventbus.emit("sessionsaved", session);
                });
            }, 1000);
        });
        sessions[path] = session;
    }

    function updateState() {
        state.set("session.current", editor.getEditors().map(function(e) {
            return e.getSession().filename;
        }));
        var openDocumentList = [];
        for (var path in sessions) {
            if (sessions.hasOwnProperty(path)) {
                openDocumentList.push(path);
            }
        }

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
            options = options || {};
            if(err)
                return callback(err);
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
                    var session = editor.createSession(path, "");
                    setupSave(session)
                    show(session);
                    eventbus.emit("newfilecreated", path);
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
            
            if(loc) {
                setTimeout(function() {
                    locator.jump(loc);
                });
            }
            
            // File watching
            session.watcherFn = function(path, kind) {
                if(kind === "changed") {
                    handleChangedFile(path);
                } else if(kind === "deleted") {
                    // TODO How to handle this case?
                    console.error("File deleted", path);
                }
            };
            project.watchFile(session.filename, session.watcherFn);
        }
    }
    
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
            show(session);
        });

        function show(session) {
            editor.switchSession(session, edit);
            if(loc) {
                setTimeout(function() {
                    locator.jump(loc);
                });
            }
            callback(null, session);
        }
    }

    exports.hook = function() {
        sessions = {};

        async.waitForEvents(eventbus, ["stateloaded", "modesloaded"], function() {
            go("zed:start");

            function done() {
                console.log("All sessions loaded.");
                var editors = editor.getEditors();
                if(state.get("session.current")) {
                    state.get("session.current").forEach(function(path, idx) {
                        go(path, editors[idx]);
                    });
                }
                eventbus.emit("allsessionsloaded");
            }
            var sessions = state.get("session.open") || {};
            var count = Object.keys(sessions).length;
            Object.keys(sessions).forEach(function(path) {
                var sessionState = sessions[path];
                loadFile(path, function(err, session) {
                    if(!err) {
                        editor.setSessionState(session, sessionState);
                    }
                    count--;
                    if (count === 0) done();
                });
            });
            if (count === 0) done();
        });
    };

    command.define("File:Reload", {
        exec: function(edit) {
            var session = edit.getSession();
            project.readFile(session.filename, function(err, text) {
                session.setValue(text);
            });
        },
        readOnly: true
    });

    exports.init = function() {
        setInterval(updateState, 2500);
    };

    exports.go = go;
    exports.handleChangedFile = handleChangedFile;
    exports.getSessions = function() {
        return sessions;
    };
});