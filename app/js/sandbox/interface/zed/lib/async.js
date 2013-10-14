define(function(require, exports, module) {
    return {
        doGets: function (obj, array, callback) {
            var results = [];
            function doOne() {
                var method = array.shift();
                obj[method](function(err, result) {
                    results.push(result);
                    if(array.length === 0) {
                        callback.apply(null, results);
                    } else {
                        doOne();
                    }
                });
            }
            doOne();
        }
    };
});