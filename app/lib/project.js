define(function(require, exports, module) {
    var eventbus = require("eventbus");
    var state = require("state");
    
    eventbus.declare('ioavailable');
    
    function dirname(path) {
        if(path[path.length-1] === '/')
            path = path.substring(0, path.length-1);
        var parts = path.split("/");
        return parts.slice(0, parts.length - 1).join("/");
    }
    
    function filename(path) {
        if(path[path.length-1] === '/')
            path = path.substring(0, path.length-1);
        var parts = path.split("/");
        return parts[parts.length - 1];
    }
    
    exports.dirname = dirname;
    exports.filename = filename;
    
    exports.hook = function() {
        var urlReq = location.search.substring(1);
        var parts = urlReq.split("&");
        var options = {}
        parts.forEach(function(part) {
            var spl = part.split('=');
            options[spl[0]] = spl[1];
        });
        
        console.log("URL:", options.url);
        var io;
        if(options.url === "draganddrop") {
            var dir = window.dir;
            return;
        } else if(options.url.indexOf("settings:") === 0) {
            io = require("fs/settings");
        } else if(options.url.indexOf("manual:") === 0) {
            io = require("fs/manual");
        } else {
            io = require('fs/web')(options.url, options.username, options.password);
        }
        exports.filelist = io.filelist;
        exports.readFile = io.readFile;
        exports.writeFile = io.writeFile;
        exports.getUrl = io.getUrl;
        exports.watchFile = io.watchFile;
        exports.unwatchFile = io.unwatchFile;
        setTimeout(function() {
            eventbus.emit("ioavailable", exports);
        });
    };
});
