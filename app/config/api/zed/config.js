/* global sandboxRequest*/
module.exports = {
    getPreference: function(preference, callback) {
        sandboxRequest("zed/config", "getPreference", [preference], callback);
    }
};