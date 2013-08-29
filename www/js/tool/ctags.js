/*global define*/
define(function(require, exports, module) {
    var eventbus = require("../lib/eventbus");
    var tools = require("../tools");
    var ctags = require("../ctags");
    var command = require("../command");
    var async = require("../lib/async");

    var defaultTimeout = 2500;
    var minTimeout = 1000;
    var timeOuts = {};

    function index(session, callback) {
        var path = session.filename;
        if (!path) {
            return;
        }
        var before = Date.now();
        tools.run(session, "ctags", {}, session.getValue(), function(err, tags) {
            if (err) {
                return callback && callback(err);
            }
            timeOuts[path] = Math.max(minTimeout, (Date.now() - before) * 3);
            if (typeof tags === "string") {
                try {
                    tags = JSON.parse(tags);
                } catch (e) {
                    return callback && callback(e);
                }
            }
            tags.forEach(function(tag) {
                tag.path = path;
            });
            ctags.updateCTags(path, tags);
            callback && callback();
        });
    }

    exports.hook = function() {
        var changeTimer = null;
        eventbus.on("sessionchanged", function(session) {
            if (changeTimer) clearTimeout(changeTimer);
            changeTimer = setTimeout(function() {
                index(session);
            }, timeOuts[session.filename] || defaultTimeout);
        });
        eventbus.on("modeset", function(session) {
            index(session);
        });
    };

    command.define("Tool:Reindex CTags", {
        exec: function(edit) {
            // Used purely for notification
            var session = edit.getSession();

            require(["../goto", "../modes", "../project", "../tools"], function(goto, modes, project, tools) {
                var allFiles = goto.getFileCache();
                var filesToIndex = allFiles.filter(function(path) {
                    var mode = modes.getModeForPath(path);
                    return tools.hasTool(mode, "ctags");
                });
                var num = 0;
                async.forEach(filesToIndex, function(path, next) {
                    num++;
                    eventbus.emit("sessionactivitystarted", session, "Indexing " + num + " of " + filesToIndex.length);
                    var mode = modes.getModeForPath(path);
                    project.readFile(path, function(err, text) {
                        if (err) {
                            console.log("Could not load", path, err);
                            return next();
                        }
                        index({ // Emulating a session here
                            filename: path,
                            mode: mode,
                            getValue: function() {
                                return text;
                            }
                        }, next);
                    });
                }, function done() {
                    eventbus.emit("sessionactivitystarted", session, "Indexing complete");
                    setTimeout(function() {
                        eventbus.emit("sessionactivitycompleted", session);
                    }, 2000);
                });
            });
        }
    });
});