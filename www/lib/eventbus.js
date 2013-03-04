define(function(require, exports, module) {
    var events = require("events");
    module.exports = new events.EventEmitter();
    module.exports.hook = function() { };
    module.exports.init = function() { };
});
