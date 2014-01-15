/*global define*/
define(function(require, exports, module) {
    var events = require("./events");

    module.exports = new events.EventEmitter(true);
    
    window.eventbus = module.exports;
});