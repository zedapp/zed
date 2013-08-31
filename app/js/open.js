require.config({
    baseUrl: "js",
    waitSeconds: 15
});

/*global $ chrome*/
require(["./fs/web", "./lib/fuzzyfind"], function(webfs, fuzzyfind) {
    var input = $("#gotoinput");
    
    function open(url) {
        chrome.app.window.create('editor.html?url=' + url + '&chromeapp=true', {
            frame: 'chrome',
            width: 720,
            height: 400,
        });
        input.val("");
        //close();
    }
    
    function close() {
        chrome.app.window.current().close();
    }
    
    input.keyup(function(event) {
        if(event.keyCode == 13) {
            open(input.val());
        }
    });
    $(window).keyup(function(event) {
        if(event.keyCode == 27) { // Esc
            close();
        }
    });
    
    input.focus();
    
});
