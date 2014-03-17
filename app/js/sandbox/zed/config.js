/*global define, _*/
define(function(require, exports, module) {
    var editor = require("../../editor");
    var config = require("../../config");

    return {
        getPreference: function(preference, callback) {
            callback(null, config.getPreference(
                preference, editor.getActiveSession()));
        },
        togglePreference: function(preference, callback) {
            callback(null, config.togglePreference(
                preference, editor.getActiveSession()));
        },
        incrementInteger: function(preference, amount, callback) {
            callback(null, config.incrementInteger(
                preference, amount, editor.getActiveSession()));
        },
        get: function(name, callback) {
            callback(null, config.getConfiguration()[name]);
        },
        reload: function(callback) {
            callback(null, config.loadConfiguration());
        }
    };
});
