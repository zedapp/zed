/* global sandboxRequest*/
module.exports = {
    listFiles: function() {
        return sandboxRequest("zed/configfs", "listFiles", []);
    },
    readFile: function(path, binary) {
        return sandboxRequest("zed/configfs", "readFile", [path, binary]);
    },
    writeFile: function(path, content, binary) {
        return sandboxRequest("zed/configfs", "writeFile", [path, content, binary]);
    },
    deleteFile: function(path) {
        return sandboxRequest("zed/configfs", "deleteFile", [path]);
    }
};
