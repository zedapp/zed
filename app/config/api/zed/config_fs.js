/* global sandboxRequest*/
module.exports = {
    listFiles: function() {
        return sandboxRequest("zed/configfs", "listFiles", []);
    },
    readFile: function(path) {
        return sandboxRequest("zed/configfs", "readFile", [path]);
    },
    writeFile: function(path, content) {
        return sandboxRequest("zed/configfs", "writeFile", [path, content]);
    },
    deleteFile: function(path) {
        return sandboxRequest("zed/configfs", "deleteFile", [path]);
    }
};
