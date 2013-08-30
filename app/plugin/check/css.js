define(function(require, exports, module) {
    var CSSLint = require("./csslint.js").CSSLint;

    return function(options, content, callback) {
        var result = CSSLint.verify(content, options);
        callback(null, result.messages.map(function(msg) {
            return {
                row: msg.line - 1,
                column: msg.col - 1,
                text: msg.message,
                type: msg.type
            };
        }));
        
    };
});