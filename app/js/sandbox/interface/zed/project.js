/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        readFile: function(path, callback) {
            sandboxRequest("zed/project", "readFile", [path], callback);
        },
        listFiles: function(callback) {
            sandboxRequest("zed/project", "listFiles", [], callback);
        },
    };
});