/*global define, zed*/
define(function(require, exports, module) {

    return {
        getPreference: function(preference) {
            return Promise.resolve(zed.getService("config").getPreference(preference, zed.getService("editor").getActiveSession()));
        },
        setPreference: function(preference, value) {
            return Promise.resolve(zed.getService("config").setPreference(preference, value));
        },
        togglePreference: function(preference) {
            return Promise.resolve(zed.getService("config").togglePreference(preference, zed.getService("editor").getActiveSession()));
        },
        incrementInteger: function(preference, amount) {
            return Promise.resolve(zed.getService("config").incrementInteger(preference, amount, zed.getService("editor").getActiveSession()));
        },
        get: function(name) {
            return Promise.resolve(zed.getService("config").getConfiguration()[name]);
        },
        reload: function() {
            return zed.getService("config").loadConfiguration();
        }
    };
});
