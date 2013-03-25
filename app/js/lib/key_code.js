/*global define*/
define(function(require, exports, module) {
    var keyCodes = {
        Tab: 9,
        Esc: 27,
        Up: 38,
        Down: 40,
        Return: 13,
        Space: 32,
        Backspace: 8,
    };
    
    return function(key) {
        var code = keyCodes[key];
        if(!code) {
            throw Error("No such key:" + key);
        }
        return code;
    };
});