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
        Delete: 46,
        PgUp: 33,
        PgDown: 34,
        End: 35,
        Home: 36
    };
    
    return function(key) {
        var code = keyCodes[key];
        if(!code) {
            throw Error("No such key:" + key);
        }
        return code;
    };
});