module.exports = {
    readFile: function(path) {
        return sandboxRequest("zed/fs", "readFile", [path]);
    },
    writeFile: function(path, text) {
        return sandboxRequest("zed/fs", "writeFile", [path, text]);
    },
    listFiles: function() {
        return sandboxRequest("zed/fs", "listFiles", []);
    },
    listFilesOfKnownFileTypes: function() {
        return sandboxRequest("zed/fs", "listFilesOfKnownFileTypes", []);
    },
    reloadFileList: function() {
        return sandboxRequest("zed/fs", "reloadFileList", []);
    },
    isConfig: function() {
        return sandboxRequest("zed/fs", "isConfig", []);
    }
};
