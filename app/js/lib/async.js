/*global define*/
define(function(require, exports, module) {
    module.exports = {
        /**
         * asynchronous sequential version of Array.prototype.forEach
         * @param array the array to iterate over
         * @param fn the function to apply to each item in the array, function
         *        has two argument, the first is the item value, the second a
         *        callback function
         * @param callback the function to call when the forEach has ended
         */
        forEach: function(array, fn, callback) {
            array = array.slice(0).reverse(); // Just to be sure
            function processOne() {
                var item = array.pop();
                fn(item, function(result, err) {
                    if (array.length > 0) {
                        processOne();
                    } else {
                        callback(result, err);
                    }
                });
            }
            if (array.length > 0) {
                processOne();
            } else {
                callback();
            }
        },

        /**
         * asynchronous parallel version of Array.prototype.forEach
         * @param array the array to iterate over
         * @param fn the function to apply to each item in the array, function
         *        has two argument, the first is the item value, the second a
         *        callback function
         * @param callback the function to call when the forEach has ended
         */
        parForEach: function(array, fn, callback) {
            var completed = 0;
            var arLength = array.length;
            if (arLength === 0) {
                callback();
            }
            for (var i = 0; i < arLength; i++) {
                fn(array[i], function(result, err) {
                    completed++;
                    if (completed === arLength) {
                        callback(result, err);
                    }
                });
            }
        },

        waitForEvents: function(emitter, events, callback) {
            var eventsLeft = events.length;
            var eventArgs = {};

            events.forEach(function(event) {
                emitter.once(event, function() {
                    var args = Array.prototype.slice.call(arguments);
                    eventArgs[event] = args;
                    eventsLeft--;
                    checkDone();
                });
            });
            checkDone();

            function checkDone() {
                if (eventsLeft === 0) {
                    callback(eventArgs);
                }
            }
        },

        queueUntilEvent: function(emitter, eventName, fn) {
            emitter.once(eventName, function() {
                fn.alreadyEmitted = true;
            });
            return function() {
                var args = Array.prototype.slice.call(arguments);
                if (fn.alreadyEmitted) {
                    return fn.apply(null, args);
                } else {
                    return new Promise(function(resolve) {
                        emitter.once(eventName, function() {
                            resolve(fn.apply(null, args));
                        });
                    });
                }
            };
        }
    };
});
