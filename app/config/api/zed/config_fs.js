/* global sandboxRequest*/
module.exports = {
    listFiles: function(callback) {
        sandboxRequest("zed/configfs", "listFiles", [], callback);
    },
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
