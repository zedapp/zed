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
        }
    };
});