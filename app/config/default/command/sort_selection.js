var session = require("zed/session");

module.exports = function(info, callback) {
    var lines = info.inputs.selectionText.replace(/\n$/, "").split("\n").sort().concat([""]);
    session.replaceRange(info.path, info.inputs.selectionRange, lines.join("\n"), callback);
};
