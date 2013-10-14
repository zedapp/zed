define(function(require, exports, module) {
    "use strict";
    var sandbox = require("./sandbox");
    var custom_command = require("./lib/custom_command");

    exports.run = function(session, name, options, callback) {
        var mode = session.mode;
        if(!mode) {
            return callback("not-supported");
        }
        var config = mode["tool:" + name];
        if(!config) {
            return callback("not-supported");
        }

        var allOptions = {};
        if(config.options) {
            Object.keys(config.options).forEach(function(key) {
                allOptions[key] = config.options[key];
            });
        }
        Object.keys(options).forEach(function(key) {
            allOptions[key] = options[key];
        });

        sandbox.execCommand({scriptUrl: config.scriptUrl, options: allOptions}, session, callback);
    };

    exports.hasTool = function(mode, name) {
        return !!mode["tool:" + name];
    };
});
