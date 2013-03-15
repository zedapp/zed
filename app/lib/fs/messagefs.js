define(function(require, exports, module) {
    var messageapi = require("messageapi");
    
    messageapi.setupClient(parent);
    
    // Monkey patch jQuery
    $.ajax = function(options) {
        var success = options.success;
        var error = options.error;
        delete options.success;
        delete options.error;
        
        messageapi.invoke("httpRequest", options, function(err, result) {
            if(err)
                return error(err);
            else
                success(result);
        });
    };
});