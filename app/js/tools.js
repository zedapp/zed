define(function(require, exports, module) {
    "use strict";
    var sandbox = require("./sandbox");
    
    function runServiceTool(config, allOptions, content, callback) {
        var queryStringParts = [];
        Object.keys(allOptions).forEach(function(key) {
            queryStringParts.push(escape(key) + "=" + escape(allOptions[key]));
        });
        var queryString = queryStringParts.length === 0 ? "" : "?" + queryStringParts.join("&");
        
        $.ajax({
            url: config.url + queryString,
            type: config.method || "POST",
            data: content,
            success: function(text) {
                callback(null, text);
            },
            error: function(xhr) {
                callback(xhr.status);
            }
        });
    }
    
    function runSandboxTool(config, allOptions, content, callback) {
        sandbox.exec(config.scriptUrl, allOptions, content, callback);
    }
    
    exports.run = function(session, name, options, content, callback) {
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
        
        if(config.url) {
            runServiceTool(config, allOptions, content, callback);
        } else if(config.scriptUrl) {
            runSandboxTool(config, allOptions, content, callback);
        }
    };
    
    exports.hasTool = function(mode, name) {
        return !!mode["tool:" + name];
    };
});
