/* global sandboxRequest*/
module.exports = {
    // CRUD
    get: function(storeName, keyPath) {
        return module.exports.getMany(storeName, [keyPath]).then(function(objs) {
            return objs[0];
        });
    },
    put: function(storeName, obj) {
        return module.exports.putMany(storeName, [obj]);
    },
    delete: function(storeName, keyPath) {
        return module.exports.putMany(storeName, [keyPath]);
    },
    getMany: function(storeName, keyPaths) {
        return sandboxRequest("zed/db", "getMany", [storeName, keyPaths]);
    },
    putMany: function(storeName, objs) {
        return sandboxRequest("zed/db", "putMany", [storeName, objs]);
    },
    deleteMany: function(storeName, keyPaths) {
        return sandboxRequest("zed/db", "deleteMany", [storeName, keyPaths]);
    },
    getAll: function(storeName, options) {
        return sandboxRequest("zed/db", "getAll", [storeName, options]);
    },
    query: function(storeName, query) {
        return sandboxRequest("zed/db", "query", [storeName, query]);
    },
    queryIndex: function(storeName, index, query) {
        return sandboxRequest("zed/db", "queryIndex", [storeName, index, query]);
    },
    lastChar: String.fromCharCode(255)
};
