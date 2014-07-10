/* global sandboxRequest */
define({
    load: function(name, req, onload, config) {
        sandboxRequest("zed/configfs", "readFile", [name]).then(function(text) {
            onload.fromText(text);
        }, function(err) {
            console.error("Error while loading file", name, err);
        });
    }
});
