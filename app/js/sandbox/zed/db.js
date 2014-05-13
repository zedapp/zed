/*global define, zed*/
define(function(require, exports, module) {
    return {
        getMany: function(storeName, keyPaths, callback) {
            var db = zed.getService("db").get();
            if(!db) {
                return callback("DB not available yet");
            }
            var store = db.readStore(storeName);
            Promise.all(keyPaths.map(store.get.bind(store))).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
        putMany: function(storeName, objs, callback) {
            var db = zed.getService("db").get();
            if(!db) {
                return callback("DB not available yet");
            }
            var store = db.writeStore(storeName);
            Promise.all(objs.map(store.put.bind(store))).then(function() {
                callback();
            }, function(err) {
                callback(err);
            });
        },
        deleteMany: function(storeName, keyPaths, callback) {
            var db = zed.getService("db").get();
            if(!db) {
                return callback("DB not available yet");
            }
            var store = db.writeStore(storeName);
            Promise.all(keyPaths.map(store.delete.bind(store))).then(function() {
                callback();
            }, function(err) {
                callback(err);
            });
        },
        getAll: function(storeName, options, callback) {
            var db = zed.getService("db").get();
            if(!db) {
                return callback("DB not available yet");
            }
            var store = db.readStore(storeName);
            store.getAll(null, options).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
        query: function(storeName, query, callback) {
            var db = zed.getService("db").get();
            if(!db) {
                return callback("DB not available yet");
            }
            var store = db.readStore(storeName);
            store.query.apply(store, query).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
        queryIndex: function(storeName, index, query, callback) {
            var db = zed.getService("db").get();
            if(!db) {
                return callback("DB not available yet");
            }
            var idx = db.readStore(storeName).index(index);
            idx.query.apply(idx, query).then(function(objs) {
                callback(null, objs);
            }, function(err) {
                callback(err);
            });
        },
    };
});
