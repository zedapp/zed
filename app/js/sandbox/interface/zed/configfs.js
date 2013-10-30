/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        readFile: function(path, callback) {
            sandboxRequest("zed/configfs", "readFile", [path], callback);
        }
    };
});