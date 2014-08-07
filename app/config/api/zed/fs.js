module.exports = {
    readFile: function(path, binary) {
        return sandboxRequest("zed/fs", "readFile", [path, binary]);
    },
    writeFile: function(path, text, binary) {
        return sandboxRequest("zed/fs", "writeFile", [path, text, binary]);
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
