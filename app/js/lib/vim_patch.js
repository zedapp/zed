define(function(require, exports, module) {
    // Monkey patch vim mode
    var vimKeyBindings = require("ace/keyboard/vim");
    var scrollKeys = [
            { keys: '<PageDown>', type: 'motion', motion: 'moveByScroll', motionArgs: { forward: true, explicitRepeat: true }},
            { keys: '<PageUp>', type: 'motion', motion: 'moveByScroll', motionArgs: { forward: false, explicitRepeat: true }},
        ];

    function patchVimKeys() {
        var vimKeys = vimKeyBindings.handler.defaultKeymap;
        for(var i = 0; i < vimKeys.length; i++) {
            var key = vimKeys[i];
            if(key.keys.indexOf("<C-") === 0 || (key.type == "keyToKey" && key.toKeys.indexOf("<C-") === 0)) {
                vimKeys.splice(i, 1);
                i--;
            }
        }
        for(key in scrollKeys) {
            vimKeys.push(key);
        }
    }
    patchVimKeys();
});
