/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        readFile: function(path, callback) {
            sandboxRequest("zed/configfs", "readFile", [path], callback);
        },
        writeFile: function(path, content, callback) {
            sandboxRequest("zed/configfs", "writeFile", [path, content], callback);
        },
        deleteFile: function(path, callback) {
            sandboxRequest("zed/configfs", "deleteFile", [path], callback);
        }
    };
});