define(function(require, exports, module) {
    plugin.consumes = ['editor', 'eventbus'];
    plugin.provides = ['keys'];
    return plugin;

    function plugin(options, imports, register) {
        var keyboardHandler = imports.editor.ace.getKeyboardHandler();
        register(null, {
            keys: {
                bind: function(key, callback) {
                    keyboardHandler.bindKey(key, {
                        name: "key: " + key,
                        exec: callback
                    });
                }
            }
        });
    }
});
