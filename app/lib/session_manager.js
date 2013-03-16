define(function(require, exports, module) {
    var project = require("./project");
    var editor = require("./editor");
    var eventbus = require("./eventbus");
    var goto = require("./goto");
    var state = require("./state");
    var command = require("./command");

    eventbus.declare("switchsession");
    eventbus.declare("newfilesession");
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
        var openDocuments = {};
        for (var path in sessions) {
            openDocuments[path] = editor.getSessionState(sessions[path]);
        }
        state.set("session.open", openDocuments);

        var stateJSON = state.toJSON();
        if (stateJSON !== oldstateJSON) {
            console.log("Saving state.");
            state.save();
        }

        oldstateJSON = stateJSON;
    }


    function loadFile(path, callback) {
        project.readFile(path, function(err, text) {
            var session = editor.createSession(path, text);
            setupSave(session);
            callback(null, session);
        });
    }

    function go(path, edit) {
        edit = edit || editor.getActiveEditor();
        if (!path) {
            return;
        }
        if (exports.specialDocs[path]) {
            var doc = exports.specialDocs[path];
            var session = editor.createSession(path, doc.content);
            session.setMode(doc.mode);
            editor.switchSession(session, edit);
            return;
        }
        if (path[0] !== '/') {
            // Normalize
            path = '/' + path;
        }
        if (sessions[path]) {
            show(sessions[path]);
        } else {
            if (goto.getFileCache().indexOf(path) === -1) {
                // File does not exist (not in cache)
                console.log("Creating new, empty file", path);
                var session = editor.createSession(path, "");
                setupSave(session)
                show(session);
                eventbus.emit("newfilesession", session);
                return;
            }
            console.log("Going to load", path);
            loadFile(path, function(err, session) {
                eventbus.emit("newsession", session);
                show(session);
            });
        }

        function show(session) {
            session.lastUse = Date.now();
            editor.switchSession(session, edit);
        }
    }

    exports.hook = function() {
        sessions = {};

        eventbus.on("stateloaded", function() {
            go("zed:start");

            function done() {
                console.log("All sessions loaded.");
                var editors = editor.getEditors();
                state.get("session.current").forEach(function(path, idx) {
                    go(path, editors[idx]);
                });
                eventbus.emit("allsessionsloaded");
            }
            var sessions = state.get("session.open") || [];
            var count = Object.keys(sessions).length;
            for (var path in sessions) {
                (function() {
                    var sessionState = sessions[path];
                    loadFile(path, function(err, session) {
                        editor.setSessionState(session, sessionState);
                        count--;
                        if (count === 0) done();
                    });
                })();
            }
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
    exports.getSessions = function() {
        return sessions;
    };
});