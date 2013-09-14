/*global define*/
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");

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

    exports.hook = function() {
        var url = options.get("url");

        function setupMethods() {
            exports.listFiles = io.listFiles;
            exports.readFile = io.readFile;
            exports.writeFile = io.writeFile;
            exports.deleteFile = io.deleteFile;
            exports.getUrl = io.getUrl;
            exports.watchFile = io.watchFile;
            exports.unwatchFile = io.unwatchFile;
            setTimeout(function() {
                eventbus.emit("ioavailable", exports);
            });
        }

        var io;
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
        } else {
            io = require('./fs/web')(url, options.get('username'), options.get('password'), function(err, io_) {
                io = io_;
                setupMethods();
            });
        }
    };
});