/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        getInstalledExtensions: function(callback) {
            sandboxRequest("zed/zpm", "getInstalledExtensions", [], callback);
        },
        install: function(url, callback) {
            sandboxRequest("zed/zpm", "install", [url], callback);
        },
        uninstall: function(id, callback) {
            sandboxRequest("zed/zpm", "uninstall", [id], callback);
        },
        update: function(id, callback) {
            sandboxRequest("zed/zpm", "update", [id], callback);
        },
        updateAll: function(callback) {
            sandboxRequest("zed/zpm", "updateAll", [], callback);
        },
        toggleAutoUpdate: function(id, callback) {
            sandboxRequest("zed/zpm", "toggleAutoUpdate", [id], callback);
        }
    };
});