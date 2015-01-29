/* global indexedDB, IDBKeyRange, Promise */
(function() {
    function zedb() {

        var exports = {};

        function Database(db) {
            this.db = db;
        }

        Database.prototype = {
            getObjectStoreNames: function() {
                return this.db.objectStoreNames;
            },
            /**
             * Possible options:
             * - keyPath
             * - autoIncrement
             */
            createObjectStore: function(name, options) {
                return new ObjectStore(this.db.createObjectStore(name, options));
            },
            deleteObjectStore: function(name) {
                this.db.deleteObjectStore(name);
            },
            /**
             * type:
             * - read
             * - readwrite
             */
            transaction: function(dataStores, type) {
                type = type || "readonly";
                return new Transaction(this.db.transaction(dataStores, type));
            },

            // Useful shortcuts
            readStore: function(dataStore) {
                return this.transaction(dataStore, "readonly").objectStore(dataStore);
            },
            writeStore: function(dataStore) {
                return this.transaction(dataStore, "readwrite").objectStore(dataStore);
            },
            close: function() {
                return this.db.close();
            }
        };


        function ObjectStore(store) {
            this.store = store;
        }

        ObjectStore.prototype = {
            // Same as put, but fails when already exists
            add: function(data) {
                return promisifyRequest(this.store.add(data));
            },
            put: function(data) {
                return promisifyRequest(this.store.put(data));
            },
            delete: function(keyPath) {
                return promisifyRequest(this.store.delete(keyPath));
            },
            get: function(keyPath) {
                return promisifyRequest(this.store.get(keyPath));
            },
            /**
             * direction values:
             * - undefined
             * - "next"
             * - "nextunique"
             * - "prev"
             * - "prevunique"
             */
            openCursor: function(range, options, each, error) {
                options.direction = options.direction || "next";
                var req = this.store.openCursor(range, options.direction);
                req.onsuccess = function(e) {
                    var result = e.target.result;
                    var cont = each(result);
                    if (cont !== false && result) {
                        result["continue"]();
                    }
                };

                req.onerror = error;
            },
            getAll: function(range, options) {
                var store = this;
                options = options || {};
                return new Promise(function(resolve, reject) {
                    var results = [];
                    store.openCursor(range, options, function(el) {
                        if (el) {
                            results.push(el.value);
                        } else {
                            resolve(results);
                        }
                        if (options.limit && results.length >= options.limit) {
                            resolve(results);
                            return false;
                        }
                    }, reject);
                });
            },
            getAllKeys: function(range, options) {
                var store = this;
                options = options || {};
                return new Promise(function(resolve, reject) {
                    var results = [];
                    store.openCursor(range, options, function(el) {
                        if (el) {
                            results.push(el.key);
                        } else {
                            resolve(results);
                        }
                        if (options.limit && results.length >= options.limit) {
                            resolve(results);
                            return false;
                        }
                    }, reject);
                });
            },
            query: function() {
                return query(arguments, this.getAll.bind(this));
            },
            /**
             * Possible options:
             * - unique
             */
            createIndex: function(indexName, keyPath, options) {
                this.store.createIndex(indexName, keyPath, options);
            },
            index: function(name) {
                return new Index(this.store.index(name));
            }
        };

        function Index(idx) {
            this.idx = idx;
        }

        Index.prototype = {
            get: function(value) {
                return promisifyRequest(this.idx.get(value));
            },
            openCursor: function(range, options, each, error) {
                options.direction = options.direction || "next";
                var req = this.idx.openCursor(range, options.direction);
                req.onsuccess = function(e) {
                    var result = e.target.result;
                    var cont = each(result);
                    if (cont !== false && result) {
                        result["continue"]();
                    }
                };

                req.onerror = error;
            },
            openKeyCursor: function(range, options, each, error) {
                options.direction = options.direction || "next";
                var req = this.idx.openKeyCursor(range, options.direction);
                req.onsuccess = function(e) {
                    var result = e.target.result;
                    var cont = each(result);
                    if (cont !== false && result) {
                        result["continue"]();
                    }
                };

                req.onerror = error;
            },
            getAll: function(range, options) {
                var idx = this;
                return new Promise(function(resolve, reject) {
                    var results = [];
                    idx.openCursor(range, options, function(el) {
                        if (el) {
                            results.push(el.value);
                        } else {
                            resolve(results);
                        }
                        if (options.limit && results.length >= options.limit) {
                            resolve(results);
                            return false;
                        }
                    }, reject);
                });
            },
            // Returns promise with array of {key: ..., value: ...}
            getAllKeys: function(range, options) {
                var idx = this;
                return new Promise(function(resolve, reject) {
                    var results = [];
                    idx.openKeyCursor(range, options, function(el) {
                        if (el) {
                            results.push(el);
                        } else {
                            resolve(results);
                        }
                        if (options.limit && results.length >= options.limit) {
                            resolve(results);
                            return false;
                        }
                    }, reject);
                });
            },

            query: function() {
                return query(arguments, this.getAll.bind(this));
            }
        };

        function query(args, getAll) {
            var r;
            var options = {
                direction: "next"
            };
            if (args.length % 2 === 0) {
                r = range.apply(null, args);
            } else {
                r = range.apply(null, Array.prototype.slice.call(args, 0, -1));
                options = args[args.length - 1];
            }
            return getAll(r, options);
        }

        function Transaction(tx) {
            this.tx = tx;
        }

        Transaction.prototype = {
            objectStore: function(name) {
                return new ObjectStore(this.tx.objectStore(name));
            },
            setCompleteHandler: function(callback) {
                this.tx.oncomplete = callback;
            },
            setErrorHandler: function(callback) {
                this.tx.onerror = callback;
            },
            setAbortHandler: function(callback) {
                this.tx.onabort = callback;
            }
        };

        exports.garbageCollect = function(age) {
            age = age || 1000 * 60 * 60 * 24 * 14; // 2 weeks
            console.log("Garbage collecting old databases...");
            promisifyRequest(indexedDB.webkitGetDatabaseNames()).then(function(dbNames) {
                for (var i = 0; i < dbNames.length; i++) {
                    (function() {
                        var dbName = dbNames[i];
                        exports.open(dbName, 1, null).then(function(db) {
                            if (db.getObjectStoreNames().contains("_meta")) {
                                db.readStore("_meta").get("meta").then(function(meta) {
                                    if (meta.lastUse < Date.now() - age) {
                                        console.log("Deleting", dbName, "since it is old");
                                        db.close();
                                        exports.delete(dbName).then(function() {
                                            console.log("Deleted.");
                                        }, function(err) {
                                            console.error("Delete failed", err);
                                        });
                                    }
                                });
                            }
                        }).
                        catch (function(err) {
                            console.error("Error", err);
                        });
                    })();
                }
            });
        }

        exports.open = function open(name, version, upgradeFn) {
            return new Promise(function(resolve, reject) {
                var req = indexedDB.open(name, version);
                req.onsuccess = function(e) {
                    resolve(new Database(e.target.result));
                };
                if (upgradeFn) {
                    req.onupgradeneeded = function(e) {
                        e.target.transaction.onerror = reject;
                        upgradeFn(new Database(e.target.result));
                    };
                }
                req.onerror = function(e) {
                    reject(e);
                };
            });
        };

        exports.delete = function(name) {
            return promisifyRequest(indexedDB.deleteDatabase(name));
        };

        exports.list = function() {
            return promisifyRequest(indexedDB.webkitGetDatabaseNames());
        };

        // key("=", "Bla") // only
        // key(">=", "Bla") // lowerBound
        // key(">", "Bla") // lowerBound, true
        // key("<=", "Bla") // upperBound
        // key("<", "Bla") // upperBound, true
        // key(">", "Bla", "<=", "Hank") // bound("Bla", "Hank", true, false)
        function range(op1, val1, op2, val2) {
            if (arguments.length === 2) {
                switch (op1) {
                    case "=":
                        return IDBKeyRange.only(val1);
                    case ">=":
                        return IDBKeyRange.lowerBound(val1, false);
                    case ">":
                        return IDBKeyRange.lowerBound(val1, true);
                    case "<=":
                        return IDBKeyRange.upperBound(val1, false);
                    case "<":
                        return IDBKeyRange.upperBound(val1, true);
                    default:
                        throw new Error("Invalid operator:", op1);
                }
            } else if (arguments.length === 4) {
                var boundType1, boundType2;
                switch (op1) {
                    case ">=":
                        boundType1 = false;
                        break;
                    case ">":
                        boundType2 = true;
                        break;
                    default:
                        throw new Error("Invalid operator for inner bound check, first has to be > or >=");
                }
                switch (op2) {
                    case "<=":
                        boundType2 = false;
                        break;
                    case "<":
                        boundType2 = true;
                        break;
                    default:
                        throw new Error("Invalid operator for inner bound check, first has to be < or <=");
                }
                return IDBKeyRange.bound(val1, val2, boundType1, boundType2);
            } else {
                throw new Error("Invalid number of arguments, must be either 2 or 4");
            }
        }

        exports.range = range;

        exports.getDatabases = function() {
            return promisifyRequest(indexedDB.webkitGetDatabaseNames());
        };

        function promisifyRequest(req) {
            return new Promise(function(resolve, reject) {
                req.onsuccess = function(e) {
                    resolve(e.target.result);
                };
                req.onerror = reject;
            });
        }

        return exports;
    }
    if (window.define) {
        window.define("zedb", zedb);
    } else {
        window.zedb = zedb();
    }
})();
