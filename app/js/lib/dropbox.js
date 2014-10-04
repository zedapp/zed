/*global chrome, define, Dropbox */
define(function(require, exports, module) {
    require("../../dep/dropbox.js");

    // var callbackUrl = "https://" + chrome.runtime.id + ".chromiumapp.org/";
    // console.log("Requires Dropbox oauth callback URL:", callbackUrl);

    var dropbox = new Dropbox.Client({
        key: "g2qi3iece6qlu2n"
    });

    return dropbox;
});
