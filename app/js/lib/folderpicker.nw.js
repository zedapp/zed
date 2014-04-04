/* global define, $*/
define(function(require, exports, module) {
    return function(callback) {
        var picker = $('<input type="file" nwdirectory/>');
        picker.change(function() {
            callback(null, this.value);
        });
        picker.click();
    };
});
