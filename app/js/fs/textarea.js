/*global define, chrome, _ */
define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var text = options.text;
        var id = options.id;

        chrome.runtime.getBackgroundPage(function(bgPage) {
            var api = {
                listFiles: function(callback) {
                    callback(null, ["/text"]);
                },
                readFile: function(path, callback) {
                    if (path === "/.zedstate") {
                        callback(null, JSON.stringify({
                            "session.current": ["/text"]
                        }));
                    } else if (path === "/text") {
                        callback(null, text);
                    } else {
                        callback(404);
                    }
                },
                writeFile: function(path, content, callback) {
                    if (path === "/text") {
                        bgPage.setTextAreaText(id, content);
                    }
                    callback();
                },
                deleteFile: function(path, callback) {
                    callback();
                },
                watchFile: function() {},
                unwatchFile: function() {},
                getCacheTag: function(path, callback) {
                    callback(null, "1");
                }
            };

            register(null, {
                fs: api
            });
        });
    }
});
