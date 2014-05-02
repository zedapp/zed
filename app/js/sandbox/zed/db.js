/*global define, zed*/
define(function(require, exports, module) {
    return {
        getMany: function(storeName, keyPaths, callback) {
            var store = zed.getService("db").get().readStore(storeName);
            Promise.all(keyPaths.map(store.get.bind(store))).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
        putMany: function(storeName, objs, callback) {
            var store = zed.getService("db").get().writeStore(storeName);
            Promise.all(objs.map(store.put.bind(store))).then(function() {
                callback();
            }, function(err) {
                callback(err);
            });
        },
        deleteMany: function(storeName, keyPaths, callback) {
            var store = zed.getService("db").get().writeStore(storeName);
            Promise.all(keyPaths.map(store.delete.bind(store))).then(function() {
                callback();
            }, function(err) {
                callback(err);
            });
        },
        getAll: function(storeName, options, callback) {
            var store = zed.getService("db").get().readStore(storeName);
            store.getAll(null, options).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
        query: function(storeName, query, callback) {
            var store = zed.getService("db").get().readStore(storeName);
            store.query.apply(store, query).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
        queryIndex: function(storeName, index, query, callback) {
            var idx = zed.getService("db").get().readStore(storeName).index(index);
            idx.query.apply(idx, query).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
    };
});
