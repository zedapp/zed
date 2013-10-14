define(function(require, exports, module) {
    var project = require("../../../project");
    var goto = require("../../../goto");
    return {
        readFile: function(path, callback) {
            project.readFile(path, callback);
        },
        listFiles: function(callback) {
            callback(null, goto.getFileCache());
        }
    };
});