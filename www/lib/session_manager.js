define(function(require, exports, module) {
    var io = require("io");
    var editor = require("editor");
    var eventbus = require("eventbus");
    var goto = require("goto");
    var config = require("config");

    var sessions = {};

    exports.specialDocs = {}; // {content: ..., mode: ..., readonly: true}
    
    function setupSave(session) {
        var saveTimer = null;
        var path = session.filename;
        session.on('change', function() {
            if(saveTimer)
                clearTimeout(saveTimer);
            saveTimer = setTimeout(function() {
                console.log("Saving...");
                io.writeFile(path, session.getValue(), function(err, res) {
                    console.log("Result:", res);
                });
            }, 1000);
        });
        sessions[path] = session;
    }
    
    var oldConfigJSON = null;
    
    function updateConfig() {
        config.set("session.current", editor.getEditors().map(function(e) { return e.getSession().filename; }));
        var openDocuments = {};
        for(var path in sessions) {
            openDocuments[path] = editor.getSessionState(sessions[path]);
        }
        config.set("session.open", openDocuments);
        
        var configJSON = config.toJSON();
        if(configJSON !== oldConfigJSON) {
            console.log("Saving config.");
            config.save();
        }
        
        oldConfigJSON = configJSON;
    }
    
    setInterval(updateConfig, 2500);
    
    function loadFile(path, callback) {
        io.readFile(path, function(err, text) {
            var session = editor.createSession(path, text);
            setupSave(session);
            callback(null, session);
        });
    }

    function go(path, edit) {
        edit = edit || editor.getActiveEditor();
        if(exports.specialDocs[path]) {
            var doc = exports.specialDocs[path];
            var session = editor.createSession(path, doc.content);
            session.setMode(doc.mode);
            editor.switchSession(session, edit);
            return;
        }
        if(!path) {
            // Ignore
        } else if(sessions[path]) {
            show(sessions[path]);
        } else {
            if(goto.getFileCache().indexOf(path) === -1) {
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
            document.title = io.filename(session.filename) + ' - ZEdit';
        }
    }

    eventbus.on("pathchange", function() {
        sessions = {};
        go("zedit:start");

    });
    
    eventbus.on("configloaded", function() {
        function done() {
            console.log("All sessions loaded.");
            var editors = editor.getEditors();
            config.get("session.current").forEach(function(path, idx) {
                go(path, editors[idx]);
            });
        }
        var sessions = config.get("session.open");
        var count = Object.keys(sessions).length;
        for(var path in sessions) {
            (function() {
                var sessionState = sessions[path];
                loadFile(path, function(err, session) {
                    editor.setSessionState(session, sessionState);
                    count--;
                    if(count === 0)
                        done();
                });
            })();
        }
    });

    exports.go = go;
    exports.getSessions = function() {
        return sessions;
    };
});