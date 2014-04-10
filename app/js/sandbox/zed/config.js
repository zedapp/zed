/*global define, zed*/
define(function(require, exports, module) {

    return {
        getPreference: function(preference, callback) {
            callback(null, zed.getService("config").getPreference(
                preference, zed.getService("editor").getActiveSession()));
        },
        setPreference: function(preference, value, callback) {
            callback(null, zed.getService("config").setPreference(preference, value));
        },
        togglePreference: function(preference, callback) {
            callback(null, zed.getService("config").togglePreference(
                preference, zed.getService("editor").getActiveSession()));
        },
        incrementInteger: function(preference, amount, callback) {
            callback(null, zed.getService("config").incrementInteger(
                preference, amount, zed.getService("editor").getActiveSession()));
        },
        get: function(name, callback) {
            callback(null, zed.getService("config").getConfiguration()[name]);
        },
        reload: function(callback) {
            callback(null, zed.getService("config").loadConfiguration());
        }
    };
});
