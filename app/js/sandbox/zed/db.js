/*global define, zed*/
define(function(require, exports, module) {
    return {
        getMany: function(storeName, keyPaths) {
            var db = zed.getService("db").get();
            if(!db) {
                return Promise.reject("DB not available yet");
            }
            var store = db.readStore(storeName);
            return Promise.all(keyPaths.map(store.get.bind(store)));
        },
        putMany: function(storeName, objs) {
            var db = zed.getService("db").get();
            if(!db) {
                return Promise.reject("DB not available yet");
            }
            var store = db.writeStore(storeName);
            return Promise.all(objs.map(store.put.bind(store)));
        },
        deleteMany: function(storeName, keyPaths) {
            var db = zed.getService("db").get();
            if(!db) {
                return Promise.reject("DB not available yet");
            }
            var store = db.writeStore(storeName);
            return Promise.all(keyPaths.map(store.delete.bind(store)));
        },
        getAll: function(storeName, options) {
            var db = zed.getService("db").get();
            if(!db) {
                return Promise.reject("DB not available yet");
            }
            var store = db.readStore(storeName);
            return store.getAll(null, options);
        },
        query: function(storeName, query) {
            var db = zed.getService("db").get();
            if(!db) {
                return Promise.reject("DB not available yet");
            }
            var store = db.readStore(storeName);
            return store.query.apply(store, query);
        },
        queryIndex: function(storeName, index, query) {
            var db = zed.getService("db").get();
            if(!db) {
                return Promise.reject("DB not available yet");
            }
            var idx = db.readStore(storeName).index(index);
            return idx.query.apply(idx, query);
        },
    };
});
