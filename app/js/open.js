require.config({
    baseUrl: "js",
    waitSeconds: 15
});

/*global $ chrome*/
require(["./fs/web"], function(webfs) {
    var input = $("#gotoinput");

    function open(url) {
        if (url == "local") {
            url = "http://127.0.0.1:7336/fs/local";
        }
        chrome.app.window.create('editor.html?url=' + url + '&chromeapp=true', {
            frame: 'chrome',
            width: 720,
            height: 400,
        });
        input.val("");
    }

    function close() {
        chrome.app.window.current().close();
    }

    function updateWindowSize() {
        var win = chrome.app.window.current();
        win.resizeTo(400, $("body").height() + 20);
    }

    input.keyup(function(event) {
        if (event.keyCode == 13) {
            open(input.val());
        }
    });
    $(window).keyup(function(event) {
        if (event.keyCode == 27) { // Esc
            close();
        }
    });

    $("#projects a").click(function(event) {
        open($(event.target).data("url"));
    });

    input.focus();
    updateWindowSize();
    window.updateWindowSize = updateWindowSize;

});