/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        getPreference: function(preference, callback) {
            sandboxRequest("zed/config", "getPreference", [preference], callback);
        }
    };
});