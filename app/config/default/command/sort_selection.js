var session = require("zed/session");

module.exports = function(info, callback) {
    var lines = info.inserts.selectionText.replace(/\n$/, "").split("\n").sort().concat([""]);
    session.replaceRange(info.path, info.inserts.selectionRange, lines.join("\n"), callback);
};
