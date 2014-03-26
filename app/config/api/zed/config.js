/* global sandboxRequest*/
module.exports = {
    getPreference: function(preference) {
        return sandboxRequest("zed/config", "getPreference", [preference]);
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
