/*global define, zed*/
define(function(require, exports, module) {

    return {
        getPreference: function(preference) {
            return Promise.resolve(zed.getService("config").getPreference(preference, zed.getService("editor").getActiveSession()));
        },
        getPreferences: function() {
            return Promise.resolve(zed.getService("config").getPreferences());
        },
        setPreference: function(preference, value) {
            return Promise.resolve(zed.getService("config").setPreference(preference, value));
        },
        getMode: function(modeName) {
            return Promise.resolve(zed.getService("config").getModes()[modeName]);
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
