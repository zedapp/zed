/* global sandboxRequest */
define({
    load: function(name, req, onload, config) {
        sandboxRequest("zed/configfs", "readFile", [name], function(err, text) {
            if(err) {
                return console.error("Error while loading file", err);
            }
            onload.fromText(text);
        });
    }
});