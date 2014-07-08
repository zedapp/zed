/*global define, zed*/
define(function(require, exports, module) {
    var options = require("../../lib/options");
    return {
        readFile: function(path, callback) {
            zed.getService("fs").readFile(path, function(err, text) {
                if(err) {
                    if(err.message) {
                        return callback(err.message);
                    } else {
                        return callback(""+err);
                    }
                }
                callback(null, text);
            });
        },
        writeFile: function(path, text, callback) {
            zed.getService("fs").writeFile(path, text, function(err) {
                if(err) {
                    if(err.message) {
                        return callback(err.message);
                    } else {
                        return callback(""+err);
                    }
                }
                // TODO: perhaps replace with different event?
                zed.getService("eventbus").emit("newfilecreated", path);
                callback();
            });
        },
        listFiles: function(callback) {
            callback(null, zed.getService("goto").getFileCache());
        },
        listFilesOfKnownFileTypes: function(callback) {
            callback(null, zed.getService("goto").getFileListKnownTypes());
        },
        reloadFileList: function(callback) {
            callback(null, zed.getService("goto").fetchFileList());
        },
        isConfig: function(callback) {
            if (options.get("url").indexOf("config:") === 0) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        }
    };
});
