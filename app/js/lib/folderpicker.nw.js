/* global define, $*/
define(function(require, exports, module) {
    return function(callback) {
        var nwWindow = require("nw.gui").Window.get();
        var cleanup = function() { window.close(); };
        var picker = $('<input type="file" nwdirectory/>');
        picker.change(function() {
            window.removeEventListener("focus", cleanup);
            nwWindow.removeListener("focus", cleanup);
            callback(null, this.value);
        });
        picker.click();
        window.addEventListener("focus", cleanup); // needed for windows
        nwWindow.on("focus", cleanup); //needed for mac
    };
});
