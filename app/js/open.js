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
        }, function(win) {
            
        });
        close();
    }
    
    function close() {
        chrome.app.window.current().hide();
        input.val("");
    }
    
    input.keyup(function(event) {
        switch(event.keyCode) {
            case 13: // Return
                open(input.val());
                break;
        }
    });
    $(window).keyup(function(event) {
        if(event.keyCode == 27) { // Esc
            close();
        }
    });
});
