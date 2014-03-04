function Map() {
    this.items = {};
}

Map.prototype = {
    set: function(key, value) {
        this.items['_' + key] = value;
    },
    get: function(key) {
        return this.items['_' + key];
    },
    contains: function(key) {
        return this.items['_' + key] !== undefined;
    },
    remove: function(key) {
        // We won't delete, since that may be slow in Chrome
        this.items['_' + key] = undefined;
    },
    keys: function() {
        var keys = [];
        for (var key in this.items) {
            if (this.items.hasOwnProperty(key)) {
                keys.push(key.substring(1));
            }
        }
        return keys;
    }
};

exports.Map = Map;