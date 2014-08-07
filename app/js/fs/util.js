define(function(require, exports, module) {
    return {
        binaryStringAsUint8Array: function(str) {
            var buf = new Uint8Array(str.length);
            for (var i = 0; i < str.length; i++) {
                buf[i] = str.charCodeAt(i);
            }
            return buf;
        },
        uint8ArrayToBinaryString: function(arr) {
            return String.fromCharCode.apply(null, arr);
        }
    }
});
