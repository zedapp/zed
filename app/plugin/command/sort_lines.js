define(function(require, exports, module) {
    return function(data, callback) {
        var lines = data.lines;
        if (data.selection.text) {
            lines = data.selection.text.split("\n");
        }

        lines.sort();

        var content = lines.join("\n");

        callback(null, [{
            "type": "replaceText",
            "what": data.selection.text ? "selection" : "document",
            "content": content
        }]);
    };
});