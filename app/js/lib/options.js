/*global define*/
define(function(require, exports, module) {
    var options = {};
    
    var urlReq = location.search.substring(1);
    var parts = urlReq.split("&");
    
    parts.forEach(function(part) {
        var spl = part.split('=');
        options[spl[0]] = spl[1];
    });
    
    exports.get = function(name) {
        return options[name];
    };
});