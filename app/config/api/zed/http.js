/* global sandboxRequest*/
module.exports = {
    fetchUrl: function(url, callback) {
        sandboxRequest("zed/http", "fetchUrl", [url], callback);
    }
};