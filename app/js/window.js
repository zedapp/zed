/*global chrome, define*/
define(function(require, exports, module) {
    var command = require("./command");
    
    command.define("Window:Close", {
        exec: function() {
            chrome.app.window.current().close();
        },
        readOnly: true
    });
});