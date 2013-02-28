define(function() {
    plugin.provides = ["config"];
    return plugin;

    function plugin(options, imports, register) {
        var config = {};

        register(null, {
            config: {
                set: function(key, value) {
                    config[key] = value;
                },
                get: function(key, value) {
                    return config[key];
                }
            }
        });
    }
});
