define(function(require, exports, module) {
    // Monkey patch vim mode
    var vimKeyBindings = require("ace/keyboard/vim");

    function patchVimKeys() {
        var vimKeys = vimKeyBindings.handler.defaultKeymap;
        for(var i = 0; i < vimKeys.length; i++) {
            var key = vimKeys[i];
            if(key.keys.indexOf("<C-") === 0) {
                vimKeys.splice(i, 1);
                i--;
            }
        }
    }
    patchVimKeys();
});
