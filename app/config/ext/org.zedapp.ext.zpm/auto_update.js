define(function(require, exports, module) {
    var zpm = require("configfs!./zpm.js");

    return function(info, callback) {
       zpm.updateAll(true);
    };
});