define(function(require, exports, module) {
"use strict";

var dom = require("ace/lib/dom");
var AcePopupExisting = require("ace/autocomplete/popup").AcePopup;

// So this is some insane monkey patching magic. We have to override the tokenizer
// in order to add the icon tokens

exports.AcePopup = function() {
    var popup = AcePopupExisting.apply(this, arguments);
    var bgTokenizer = popup.session.bgTokenizer;
    bgTokenizer.$tokenizeRow = function(row) {
        var data = popup.data[row];
        var tokens = [];
        if (!data)
            return tokens;
        if (typeof data == "string")
            data = {value: data};
        if (!data.caption)
            data.caption = data.value || data.name;

        var last = -1;
        var flag, c;
        for (var i = 0; i < data.caption.length; i++) {
            c = data.caption[i];
            flag = data.matchMask & (1 << i) ? 1 : 0;
            if (last !== flag) {
                tokens.push({type: data.className || "" + ( flag ? "completion-highlight" : ""), value: c});
                last = flag;
            } else {
                tokens[tokens.length - 1].value += c;
            }
        }

        if (data.meta) {
            var maxW = popup.renderer.$size.scrollerWidth / popup.renderer.layerConfig.characterWidth;
            if (data.meta.length + data.caption.length < maxW - 2)
                tokens.push({type: "rightAlignedText", value: data.meta});
        }
        // This is the new stuff: add icon tokens
        if (data.icon) {
            tokens.push({type: "icon_" + data.icon, value: ""});
        }


        return tokens;
    };

    return popup;
};

dom.importCssString("\
.ace_icon_function {\
    display: inline-block;\
    position: absolute;\
    left: 3px;\
    margin-top: 1px;\
    width: 14px;\
    height: 14px;\
    background-image: url('img/function.png');\
    background-size: 14px;\
    z-index: -1;\
}\
.ace_icon_local {\
    display: inline-block;\
    position: absolute;\
    left: 3px;\
    margin-top: 1px;\
    width: 14px;\
    height: 14px;\
    background-image: url('img/local.png');\
    background-size: 14px;\
    z-index: -1;\
}\
.ace_icon_type {\
    display: inline-block;\
    position: absolute;\
    left: 3px;\
    margin-top: 1px;\
    width: 14px;\
    height: 14px;\
    background-image: url('img/type.png');\
    background-size: 14px;\
    z-index: -1;\
}\
.ace_icon_property {\
    display: inline-block;\
    position: absolute;\
    left: 3px;\
    margin-top: 1px;\
    width: 14px;\
    height: 14px;\
    background-image: url('img/property.png');\
    background-size: 14px;\
    z-index: -1;\
}\
.ace_icon_snippet {\
    display: inline-block;\
    position: absolute;\
    left: 3px;\
    margin-top: 1px;\
    width: 14px;\
    height: 14px;\
    background-image: url('img/snippet.png');\
    background-size: 14px;\
    z-index: -1;\
}\
.ace_icon_file {\
    display: inline-block;\
    position: absolute;\
    left: 3px;\
    margin-top: 1px;\
    width: 14px;\
    height: 14px;\
    background-image: url('img/file.png');\
    background-size: 14px;\
    z-index: -1;\
}\
.ace_icon_action {\
    display: inline-block;\
    position: absolute;\
    left: 3px;\
    margin-top: 1px;\
    width: 14px;\
    height: 14px;\
    background-image: url('img/action.png');\
    background-size: 14px;\
    z-index: -1;\
}");

});
