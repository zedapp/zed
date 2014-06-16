/* global define, $*/
define(function(require, exports, module) {
    return function(callback) {
        var picker = $('<input type="file" nwdirectory/>');
        var btnEl = $("<button style='margin: 30px 30px;'>Close this window</button>");
        picker.change(function() {
            btnEl.remove();
            callback(null, this.value);
        });
        picker.click();
        btnEl.click(function() { window.close(); });
        $("body").append(btnEl);
    };
});
