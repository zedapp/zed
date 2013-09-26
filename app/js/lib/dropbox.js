/*global chrome, define, Dropbox */
define(function(require, exports, module) {
    require("../../dep/dropbox.min.js");

    var callbackUrl = "https://" + chrome.runtime.id + ".chromiumapp.org/dropbox/receiver.html";
    console.log("Requires Dropbox oauth callback URL:", callbackUrl);

    Dropbox.AuthDriver.Chrome.prototype.expandUrl = function(url) {
        return url;
    };

    var dropbox = new Dropbox.Client({
        key: "g2qi3iece6qlu2n"
    });

    dropbox.authDriver(new Dropbox.AuthDriver.Chrome({
        receiverPath: callbackUrl
    }));

    return dropbox;
});