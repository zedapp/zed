/*global define */
define(function(require, exports, module) {

    return function(isSettingsProject, callback) {
        require(["./union", "./static", "./sync"], function(unionfs, staticfs, syncfs) {
            staticfs("settings", {
                readOnlyFn: function(path) {
                    return path !== "/.zedstate" && path !== "/settings.user.json";
                }
            }, function(err, settingsStatic) {
                syncfs("settings", function(err, settingsSync) {
                    unionfs([settingsSync, settingsStatic], {
                        watchSelf: !isSettingsProject
                    }, function(err, io) {
                        callback(null, io);
                    });
                });
            });
        });
    };
});