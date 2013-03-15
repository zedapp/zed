define(function(require, exports, module) {
    var state = require("./state");
    var eventbus = require("./eventbus");

    exports.hook = function() {
        return;
        eventbus.once("stateloaded", function() {
            if (chrome.app.window) {
                var win = chrome.app.window.current();
                var bounds = state.get('window');
                if(bounds) {
                    win.setBounds(bounds);
                }
                win.onBoundsChanged.addListener(function() {
                    state.set("window", win.getBounds());
                });
            }
        });
    };
});