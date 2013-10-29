/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        readFile: function(path, callback) {
            sandboxRequest("zed/settingsfs", "readFile", [path], callback);
        }
    };
});