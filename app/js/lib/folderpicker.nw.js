/* global define, $*/
define(function(require, exports, module) {
    return function() {
        return new Promise(function(resolve, reject) {
            var picker = $('<input type="file" nwdirectory/>');
            var btnEl = $("<button style='margin: 30px 30px;'>Close this window</button>");
            picker.change(function() {
                btnEl.remove();
                resolve(this.value);
            });
            picker.click();
            btnEl.click(function() { window.close(); });
            $("body").append(btnEl);
        });
    };
});
