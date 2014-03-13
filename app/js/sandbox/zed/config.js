/*global define, _*/
define(function(require, exports, module) {
    var editor = require("../../editor");
    var config = require("../../config");

    return {
        getPreference: function(preference, callback) {
            var edit = editor.getActiveEditor();
            var session = edit.getSession();
            var pref = config.getPreference(preference, session);
            callback(null, pref);
        },
        togglePreference: function(preference, callback) {
            var edit = editor.getActiveEditor();
            var session = edit.getSession();
            var pref = config.togglePreference(preference, session);
            callback(null, pref);
        },
        get: function(name, callback) {
            callback(null, config.getConfiguration()[name]);
        },
        reload: function(callback) {
            callback(null, config.loadConfiguration());
        }
    };
});
