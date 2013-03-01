define(function(require, exports, module) {
    var io = require("io");
    var config = {};

    // TODO add listeners

    module.exports = {
        set: function(key, value) {
            config[key] = value;
        },
        get: function(key, value) {
            return config[key];
        },
        load: function(callback) {
            io.readFile("/.zeditsession", function(err, json) {
                config = JSON.parse(json);
                callback(config);
            });
        },
        save: function(callback) {
            io.writeFile("/.zeditsession", this.toJSON(), callback || function() {});
        },
        toJSON: function() {
            return JSON.stringify(config, null, 2);
        }
    };
});
