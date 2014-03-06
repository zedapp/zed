/* global sandboxRequest*/
module.exports = {
    getPreference: function(preference, callback) {
        sandboxRequest("zed/config", "getPreference", [preference], callback);
    },
    get: function(name, callback) {
        sandboxRequest("zed/config", "get", [name], callback);
    },
    reload: function(callback) {
        sandboxRequest("zed/config", "reload", [], callback);
    }
};