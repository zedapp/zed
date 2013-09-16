/*global define, chrome, _*/
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");

    var MAX_RECENT_PROJECTS = 5;

    eventbus.declare('ioavailable');

    exports.dirname = function(path) {
        if (path[path.length - 1] === '/') {
            path = path.substring(0, path.length - 1);
        }
        var parts = path.split("/");
        return parts.slice(0, parts.length - 1).join("/");
    };

    exports.filename = function(path) {
        if (path[path.length - 1] === '/') {
            path = path.substring(0, path.length - 1);
        }
        var parts = path.split("/");
        return parts[parts.length - 1];
    };

    function saveRecentLocalProject(name, url) {
        chrome.storage.local.get("recentProjects", function(results) {
            var projects = results.recentProjects || [];
            // sanity check projects array
            if (projects.length > 0 && !projects[0].url) {
                projects = [];
            }
            var existing = _.where(projects, {
                url: url
            });
            if (existing.length === 0) {
                projects.splice(0, 0, {
                    name: name,
                    url: url
                });
                if (projects.length > MAX_RECENT_PROJECTS) {
                    projects.splice(projects.length - 1, 1);
                }
            } else {
                projects.splice(projects.indexOf(existing[0]), 1);
                projects.splice(0, 0, {
                    name: name,
                    url: url
                });
            }
            chrome.storage.local.set({
                recentProjects: projects
            });
        });
    }

    exports.hook = function() {
        var url = options.get("url");
        var io;

        function setupMethods() {
            exports.listFiles = io.listFiles;
            exports.readFile = io.readFile;
            exports.writeFile = io.writeFile;
            exports.deleteFile = io.deleteFile;
            exports.getUrl = io.getUrl;
            exports.watchFile = io.watchFile;
            exports.unwatchFile = io.unwatchFile;
            exports.io = io;
            setTimeout(function() {
                eventbus.emit("ioavailable", exports);
            });
        }

        // TODO: Generalize this
        if (url.indexOf("settings:") === 0) {
            io = require("./fs/settings");
            setupMethods();
        } else if (url.indexOf("manual:") === 0) {
            io = require("./fs/manual");
            setupMethods();
        } else if (url.indexOf("syncfs:") === 0) {
            require("./fs/syncfs")(function(err, io_) {
                io = io_;
                setupMethods();
            });
        } else if (url.indexOf("local:") === 0) {
            var id = url.substring("local:".length);
            // We're opening a specific previously opened directory here
            if (id) {
                chrome.fileSystem.restoreEntry(id, function(dir) {
                    saveRecentLocalProject(dir.fullPath, "local:" + id);
                    io = require("./fs/localfs")(dir);
                    setupMethods();
                });
            } else {
                // Show pick directory
                chrome.fileSystem.chooseEntry({
                    type: "openDirectory"
                }, function(dir) {
                    var id = chrome.fileSystem.retainEntry(dir);
                    saveRecentLocalProject(dir.fullPath, "local:" + id);
                    io = require("./fs/localfs")(dir);
                    setupMethods();
                });
            }
        } else {
            io = require('./fs/web')(url, options.get('username'), options.get('password'), function(err, io_) {
                io = io_;
                setupMethods();
            });
        }
    };
});