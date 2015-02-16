/*global define, zed*/
define(function(require, exports, module) {
    var options = require("../../lib/options");
    return {
        readFile: function(path, binary) {
            return zed.getService("fs").readFile(path, binary).
            catch (function(err) {
                if (err.message) {
                    return Promise.reject(err.message);
                } else {
                    return Promise.reject("" + err);
                }
            });
        },
        writeFile: function(path, text, binary) {
            return zed.getService("fs").writeFile(path, text, binary).then(function() {
                // TODO: perhaps replace with different event?
                zed.getService("eventbus").emit("newfilecreated", path);
            }).
            catch (function(err) {
                if (err.message) {
                    return Promise.reject(err.message);
                } else {
                    return Promise.reject("" + err);
                }
            });
        },
        listFiles: function() {
            return Promise.resolve(zed.getService("goto").getFileCache());
        },
        listFilesOfKnownFileTypes: function() {
            return Promise.resolve(zed.getService("goto").getFileListKnownTypes());
        },
        reloadFileList: function() {
            return Promise.resolve(zed.getService("goto").fetchFileList());
        },
        isConfig: function() {
            return Promise.resolve(options.get("url").indexOf("config:") === 0);
        },
        getCapabilities: function() {
            return Promise.resolve(zed.getService("fs").getCapabilities());
        },
        run: function(command, stdin) {
            var fs = zed.getService("fs");
            if(!fs.getCapabilities().run) {
                return Promise.reject("not-supported");
            }
            return fs.run(command, stdin);
        }
    };
});
