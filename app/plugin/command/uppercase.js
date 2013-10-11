define(function(require, exports, module) {
    return function(data, callback) {
        if (!data.selection.text) {
            callback(null, [{
                "type": "replaceText",
                "what": "document",
                "content": data.lines.join("\n").toUpperCase()
            }]);
        } else {
            callback(null, [{
                "type": "replaceText",
                "what": "selection",
                "content": data.selection.text.toUpperCase()
            }]);
        }
    };
});