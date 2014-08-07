/* global define, zed */
define(function(require, exports, module) {
    return {
        listFiles: function() {
            return Promise.resolve(zed.getService("configfs").listFiles());
        },
        readFile: function(path, binary) {
            return zed.getService("configfs").readFile(path, binary);
        },
        writeFile: function(path, content, binary) {
            return zed.getService("configfs").writeFile(path, content, binary);
        },
        deleteFile: function(path) {
            return zed.getService("configfs").deleteFile(path);
        }
    };
});
