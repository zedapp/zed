/*global zed, chrome*/
zed.register({
    "commands": {
        "My Extension Command": {
            "extId": chrome.runtime.id,
        },
    }
});

zed.oncommand = function(project, name, spec, info, callback) {
    zed.exec(project, "zed.ui.prompt", ["What is your name?", "", 320, 200], function(err, result) {
        zed.exec(project, "zed.ui.blockUI", ["Hello " + result, false]);
        setTimeout(function() {
            zed.exec(project, "zed.ui.unblockUI", []);
            callback();
        }, 2000);
    });
};
