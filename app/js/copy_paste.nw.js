/* global define, nodeRequire */
define(function(require, exports, module) {
    plugin.consumes = ["command"];
    return plugin;

    function plugin(options, imports, register) {
        var gui = nodeRequire("nw.gui");
        var clipboard = gui.Clipboard.get();

        var command = imports.command;

        command.define("Edit:Copy", {
            exec: function(edit, session) {
                var selectionRange = edit.getSelection().getRange();
                var text = session.getTextRange(selectionRange);
                clipboard.set(text, 'text');
            },
            readOnly: true
        });

        command.define("Edit:Cut", {
            exec: function(edit, session) {
                var selectionRange = edit.getSelection().getRange();
                var text = session.getTextRange(selectionRange);
                session.remove(selectionRange);
                clipboard.set(text, 'text');
            },
            readOnly: true
        });

        command.define("Edit:Paste", {
            exec: function(edit, session) {
                var pos = edit.getCursorPosition();
                session.insert(pos, clipboard.get());
            },
            readOnly: true
        });

        register();
    }
});
