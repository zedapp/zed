/* global chrome, $ */
define(function(require, exports, module) {
    var sessionCache = {};

    /**
     * Options:
     * - persistent: save to local storage
     * - fallbackCache: attempt HTTP call first, if it fails use cache
     * - refreshTimeout: (in seconds) use cache if cached more recently than the timeout,
     *                   otherwise attempt refresh, if it fails, use cache anyway
     */
    exports.fetchUrl = function(url, options, callback) {
        var cacheKey = "cache:" + url;

        var refreshTimeout = Infinity;
        if (options.refreshTimeout) {
            refreshTimeout = options.refreshTimeout * 1000;
        }
        
        function hasNotTimedOut(entry) {
            return entry && (Date.now() - entry.time) < refreshTimeout;
        }

        function httpGet(callback) {
            $.ajax({
                method: "GET",
                url: url,
                dataType: "text",
                success: function(result) {
                    var cacheEntry = {
                        time: Date.now(),
                        content: result
                    };
                    if (options.persistent) {
                        var obj = {};
                        obj[cacheKey] = cacheEntry;
                        chrome.storage.local.set(obj);
                    }
                    sessionCache[url] = cacheEntry;
                    callback(null, result);
                },
                error: function(xhr) {
                    callback(xhr.status);
                }
            });
        }

        function cachedGet(callback) {
            var entry = sessionCache[url];
            if (hasNotTimedOut(entry)) {
                return callback(null, entry.content);
            }
            chrome.storage.local.get(cacheKey, function(results) {
                var entry = results[cacheKey];
                if (hasNotTimedOut(entry)) {
                    return callback(null, entry.content);
                }
                httpGet(callback);
            });
        }

        if (options.fallbackCache) {
            httpGet(function(err, result) {
                if (err) {
                    return cachedGet(callback);
                }
                callback(null, result);
            });
        } else {
            cachedGet(callback);
        }
    };

    exports.flushCache = function() {
        sessionCache = {};
        chrome.storage.local.get(null, function(results) {
            var toRemove = [];
            Object.keys(results).forEach(function(key) {
                if (key.indexOf("cache:") === 0) {
                    toRemove.push(key);
                }
            });
            chrome.storage.local.remove(toRemove);
        });
    };
});