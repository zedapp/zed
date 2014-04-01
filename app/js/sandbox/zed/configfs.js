/* global define, zed */
define(function(require, exports, module) {
    return {
        listFiles: function(callback) {
            zed.getService("configfs").listFiles(callback);
        },
        readFile: function(path, callback) {
            zed.getService("configfs").readFile(path, callback);
        },
        writeFile: function(path, content, callback) {
            zed.getService("configfs").writeFile(path, content, callback);
        },
        deleteFile: function(path, callback) {
            zed.getService("configfs").deleteFile(path, callback);
        }
    };
});
