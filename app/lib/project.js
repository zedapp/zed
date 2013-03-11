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
        var url = location.hash.substring(1);
        console.log("URL:", url);
        var io = require('fs/web')(url);
        exports.filelist = io.filelist;
        exports.readFile = io.readFile;
        exports.writeFile = io.writeFile;
        eventbus.emit("ioavailable", exports);
    };
});
