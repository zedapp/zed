/* global sandboxRequest*/
module.exports = {
    readFile: function(path, callback) {
        sandboxRequest("zed/project", "readFile", [path], callback);
    },
    writeFile: function(path, text, callback) {
        sandboxRequest("zed/project", "writeFile", [path, text], callback);
    },
    listFiles: function(callback) {
        sandboxRequest("zed/project", "listFiles", [], callback);
    },
    reloadFileList: function(callback) {
        sandboxRequest("zed/project", "reloadFileList", [], callback);
    },
    isConfig: function(callback) {
        sandboxRequest("zed/project", "isConfig", [], callback);
    }
};
