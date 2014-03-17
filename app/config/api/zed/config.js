/* global sandboxRequest*/
module.exports = {
    getPreference: function(preference, callback) {
        sandboxRequest("zed/config", "getPreference", [preference], callback);
    },
    togglePreference: function(preference, callback) {
        sandboxRequest("zed/config", "togglePreference", [preference], callback);
    },
    incrementInteger: function(preference, integer, callback) {
        sandboxRequest("zed/config", "incrementInteger", [preference, integer], callback);
    },
    get: function(name, callback) {
        sandboxRequest("zed/config", "get", [name], callback);
    },
    reload: function(callback) {
        sandboxRequest("zed/config", "reload", [], callback);
    }
};
