define(function(require, exports, module) {
    var config = {};

    // TODO add listeners

    module.exports = {
        set: function(key, value) {
            config[key] = value;
        },
        get: function(key, value) {
            return config[key];
        }
    };
});
