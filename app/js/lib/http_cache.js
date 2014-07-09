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
    exports.fetchUrl = function(url, options) {
        var cacheKey = "cache:" + url;

        var refreshTimeout = Infinity;
        if (options.refreshTimeout) {
            refreshTimeout = options.refreshTimeout * 1000;
        }

        function hasNotTimedOut(entry) {
            return entry && (Date.now() - entry.time) < refreshTimeout;
        }

        function httpGet() {
            return new Promise(function(resolve, reject) {
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
                        resolve(result);
                    },
                    error: function(xhr) {
                        reject(xhr.status);
                    }
                });
            });
        }

        function cachedGet(callback) {
            var entry = sessionCache[url];
            if (hasNotTimedOut(entry)) {
                return Promise.resolve(entry.content);
            }
            return httpGet(callback);
        }

        if (options.fallbackCache) {
            return httpGet().catch(function() {
                return cachedGet();
            });
        } else {
            return cachedGet();
        }
    };

    exports.flushCache = function() {
        sessionCache = {};
    };
});
