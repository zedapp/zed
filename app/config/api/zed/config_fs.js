/* global sandboxRequest*/
module.exports = {
    readFile: function(path, callback) {
        sandboxRequest("zed/configfs", "readFile", [path], callback);
    }
};