define(function(require, exports, module) {
    var EventEmitter = exports.EventEmitter = function(checked) {
        this._events = {};
        this._checked = checked;
    };

    var toString = Object.prototype.toString;

    var isArray = Array.isArray || function(obj) {
            return toString.call(obj) === '[object Array]';
        };

    var _indexOf = function(arr, el) {
        if (arr.indexOf) {
            return arr.indexOf(el);
        }
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === el) {
                return i;
            }
        }
        return -1;
    };

    var defaultMaxListeners = 25;

    EventEmitter.prototype.setMaxListeners = function(n) {
        this._events.maxListeners = n;
    };

    EventEmitter.prototype.declare = function(type) {
        this._events[type] = [];
    };

    EventEmitter.prototype.emit = function(type) {
        // console.log("Emitting", type);
        var handler = this._events[type];

        if (!handler && this._checked) throw Error("Event not declared: " + type);
        else if (!handler) handler = this._events[type] = [];

        var args = Array.prototype.slice.call(arguments, 1);

        var listeners = handler.slice();
        try {
            for (var i = 0, l = listeners.length; i < l; i++) {
                listeners[i].apply(this, args);
            }
        } catch (e) {
            console.error("Error while emitting", type, e.message, e.stack);
            throw e;
        }
        return listeners.length > 0;
    };

    EventEmitter.prototype.addListener = function(type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('addListener only takes instances of Function');
        }

        if (!this._events[type] && this._checked) {
            // Optimize the case of one listener. Don't need the extra array object.
            throw new Error("Event not declared: " + type);
        } else if (!this._events[type]) {
            this._events[type] = [];
        }
        // Check for listener leak
        if (!this._events[type].warned) {
            var m;
            if (this._events.maxListeners !== undefined) {
                m = this._events.maxListeners;
            } else {
                m = defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
                console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                this._events[type].length);
                console.trace();
            }
        }

        // If we've already got an array, just append.
        this._events[type].push(listener);

        return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function(type, listener) {
        var self = this;
        self.on(type, function g() {
            self.removeListener(type, g);
            listener.apply(this, arguments);
        });

        return this;
    };

    EventEmitter.prototype.removeListener = function(type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('removeListener only takes instances of Function');
        }

        // does not use listeners(), so no side effect of creating _events[type]
        if (!this._events || !this._events[type]) return this;

        var list = this._events[type];

        var i = _indexOf(list, listener);
        if (i < 0) return this;
        list.splice(i, 1);
        return this;
    };

    EventEmitter.prototype.removeAllListeners = function(type) {
        if (type && this._events && this._events[type]) this._events[type] = [];
        return this;
    };

    EventEmitter.prototype.listeners = function(type) {
        return this._events[type];
    };
});
