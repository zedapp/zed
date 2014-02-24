define(function(require, exports, module) {
    var zpm = require("../../zpm");

    return {
        getInstalledExtensions: function(callback) {
            zpm.getInstalledExtensions(callback);
        },
        install: function(url, callback) {
            zpm.install(url, callback);
        },
        uninstall: function(id, callback) {
            zpm.uninstall(id, callback);
        },
        update: function(id, callback) {
            zpm.update(id, callback);
        },
        updateAll: function(callback) {
            zpm.updateAll(false, callback);
        },
        toggleAutoUpdate: function(id, callback) {
            zpm.toggleAutoUpdate(id, callback);
        }
    };
});