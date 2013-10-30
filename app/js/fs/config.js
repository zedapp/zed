/*global define */
define(function(require, exports, module) {

    return function(isConfigurationProject, callback) {
        require(["./union", "./static", "./sync"], function(unionfs, staticfs, syncfs) {
            staticfs("config", {
                readOnlyFn: function(path) {
                    return path !== "/.zedstate" && path !== "/user.json";
                }
            }, function(err, configStatic) {
                syncfs("config", function(err, configSync) {
                    unionfs([configSync, configStatic], {
                        watchSelf: !isConfigurationProject
                    }, function(err, io) {
                        callback(null, io);
                    });
                });
            });
        });
    };
});