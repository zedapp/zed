define(function(require, exports, module) {
    return {
        binaryStringAsUint8Array: function(str) {
            var buf = new Uint8Array(str.length);
            for (var i = 0; i < str.length; i++) {
                buf[i] = str.charCodeAt(i);
            }
            return buf;
        },
        uint8ArrayToBinaryString: function(arr) {
            var chunks = [];
            var chunkSize = 2048;
            for (var i = 0; i * chunkSize < arr.length; i++) {
                chunks.push(String.fromCharCode.apply(null, arr.subarray(i * chunkSize, (i + 1) * chunkSize)));
            }
            return chunks.join('');
        },
        /**
         * Used to immediately return a filesystem object, where all methods are queued,
         * fn should be called with the real fs object
         */
        queuedFilesystem: function() {
            var queued = [];
            var resolvedFs;

            function queue(name, noPromise) {
                return function() {
                    var args = _.toArray(arguments);
                    if (resolvedFs) {
                        return resolvedFs[name].apply(resolvedFs, args);
                    }
                    if (noPromise) {
                        queued.push({
                            name: name,
                            args: args
                        });
                    } else {
                        return new Promise(function(resolve, reject) {
                            queued.push({
                                name: name,
                                args: args,
                                resolve: resolve,
                                reject: reject
                            });
                        });
                    }
                };
            }
            return {
                resolve: function(fs) {
                    // console.log("Flushin'", queued);
                    queued.forEach(function(item) {
                        // console.log("calling", item.name, "on", item.args);
                        var prom = fs[item.name].apply(fs, item.args);
                        if (prom && prom.then) {
                            prom.then(item.resolve, item.reject);
                        }
                    });
                    queued = [];
                    resolvedFs = fs;
                },
                listFiles: queue("listFiles"),
                readFile: queue("readFile"),
                writeFile: queue("writeFile"),
                deleteFile: queue("deleteFile"),
                getCacheTag: queue("getCacheTag"),
                watchFile: queue("watchFile", true),
                unwatchFile: queue("unwatchFile", true)
            }
        }
    }
});
