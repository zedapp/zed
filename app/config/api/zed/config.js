/* global sandboxRequest*/
module.exports = {
    getPreference: function(preference) {
        return sandboxRequest("zed/config", "getPreference", [preference]);
    },
    getPreferences: function() {
        return sandboxRequest("zed/config", "getPreferences", []);
    },
    setPreference: function(preference, value) {
        return sandboxRequest("zed/config", "setPreference", [preference, value]);
    },
    getMode: function(modeName) {
        return sandboxRequest("zed/config", "getMode", [modeName]);
    },
    togglePreference: function(preference) {
        return sandboxRequest("zed/config", "togglePreference", [preference]);
    },
    incrementInteger: function(preference, integer) {
        return sandboxRequest("zed/config", "incrementInteger", [preference, integer]);
    },
    get: function(name) {
        return sandboxRequest("zed/config", "get", [name]);
    },
    reload: function() {
        return sandboxRequest("zed/config", "reload", []);
    }
};
