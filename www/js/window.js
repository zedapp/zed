/*global define chrome*/
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var state = require("./state");

    exports.hook = function() {
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