/* global sandboxRequest*/
module.exports = {
    readFile: function(path) {
        return sandboxRequest("zed/project", "readFile", [path]);
    },
    writeFile: function(path, text) {
        return sandboxRequest("zed/project", "writeFile", [path, text]);
    },
    listFiles: function() {
        return sandboxRequest("zed/project", "listFiles", []);
    },
    reloadFileList: function() {
        return sandboxRequest("zed/project", "reloadFileList", []);
    },
    isConfig: function() {
        return sandboxRequest("zed/project", "isConfig", []);
    }
};
