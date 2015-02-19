/*global define, chrome, _ */
define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var text = options.text;
        var id = options.id;

        chrome.runtime.getBackgroundPage(function(bgPage) {
            var api = {
                listFiles: function() {
                    return Promise.resolve(["/text"]);
                },
                readFile: function(path) {
                    if (path === "/.zedstate") {
                        return Promise.resolve(JSON.stringify({
                            "session.current": ["/text"]
                        }));
                    } else if (path === "/text") {
                        return Promise.resolve(text);
                    } else {
                        return Promise.reject(404);
                    }
                },
                writeFile: function(path, content) {
                    if (path === "/text") {
                        bgPage.setTextAreaText(id, content);
                    }
                    return Promise.resolve();
                },
                deleteFile: function(path) {
                    return Promise.resolve();
                },
                watchFile: function() {},
                unwatchFile: function() {},
                getCacheTag: function(path, callback) {
                    return Promise.resolve("1");
                },
                getCapabilities: function() {
                    return {};
                }
            };

            register(null, {
                fs: api
            });
        });
    }
});
