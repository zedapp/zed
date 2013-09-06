require.config({
    baseUrl: "js",
    waitSeconds: 15
});

/*global $ chrome*/
$(function() {
    var input = $("#gotoinput");
    var hygienic = $("#hygienic");

    function open(url) {
        chrome.app.window.create('editor.html?url=' + url +
         (hygienic.is(":checked") ? "&hygienic=true" : "") + '&chromeapp=true', {
            frame: 'chrome',
            width: 720,
            height: 400,
        });
    }
    
    var defaultHint = $("#hint").html();

    function openChecked(url) {
        $.ajax({
            type: "POST",
            url: url,
            data: {
                action: 'version'
            },
            success: function() {
                open(url);
                input.val("");
            },
            error: function() {
                $("#hint").html("<span class='error'>ERROR</span>: URL does seem to run a (recent) Zed server.");
                setTimeout(function() {
                    $("#hint").html(defaultHint);
                }, 5000);
            },
            dataType: "text"
        });
    }

    function close() {
        chrome.app.window.current().close();
    }

    function updateWindowSize() {
        var win = chrome.app.window.current();
        win.resizeTo(400, $("body").height() + 23);
    }

    input.keyup(function(event) {
        if (event.keyCode == 13) {
            openChecked(input.val());
        }
    });
    
    $(window).keyup(function(event) {
        if (event.keyCode == 27) { // Esc
            close();
        }
    });
    
    chrome.storage.sync.get("hygienicMode", function(results) {
        if(results.hygienicMode) {
            hygienic.attr("checked", "checked");
        }
    });
    
    hygienic.change(function() {
        chrome.storage.sync.set({hygienicMode: hygienic.is(":checked")});
    });

    $("#projects a").click(function(event) {
        open($(event.target).data("url"));
    });

    input.focus();
    updateWindowSize();
});