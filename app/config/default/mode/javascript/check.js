/* ***** BEGIN LICENSE BLOCK *****
 * Based on:
 *
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

/* global define*/

define(function(require, exports, module) {
    var lint = require("configfs!./jshint.js");
    var session = require("zed/session");
    var identRegex = /[a-zA-Z\$_0-9]/;

    function startRegex(arr) {
        return RegExp("^(" + arr.join("|") + ")");
    }

    var disabledWarningsRe = startRegex([
        "Bad for in variable '(.+)'.",
        'Missing "use strict"']);
    var errorsRe = startRegex([
        "Unexpected",
        "Expected ",
        "Confusing (plus|minus)",
        "\\{a\\} unterminated regular expression",
        "Unclosed ",
        "Unmatched ",
        "Unbegun comment",
        "Bad invocation",
        "Missing space after",
        "Missing operator at"]);
    var infoRe = startRegex([
        "Expected an assignment",
        "Bad escapement of EOL",
        "Unexpected comma",
        "Unexpected space",
        "Missing radix parameter.",
        "A leading decimal point can",
        "\\['{a}'\\] is better written in dot notation.",
        "'{a}' used out of scope"]);

    function isValidJS(str) {
        try {
            // evaluated code can only create variables in this function
            eval("throw 0;" + str);
        } catch (e) {
            if (e === 0) return true;
        }
        return false;
    }



    function findIdentifierRange(line, startColumn) {
        var pos = {
            column: startColumn,
            endColumn: undefined
        };
        if (!line) {
            return pos;
        }
        // Look backwards
        for (var i = startColumn; i >= 0; i--) {
            var ch = line[i];
            if (identRegex.exec(ch)) {
                pos.column = i;
                break;
            }
        }
        for (var i = pos.column; i >= 0; i--) {
            var ch = line[i];
            if (!identRegex.exec(ch)) {
                pos.column = i + 1;
                break;
            }
        }
        // And ahead
        for (var i = pos.column; i <= line.length; i++) {
            var ch = line[i];
            if (!identRegex.exec(ch) || !ch) {
                if (i !== pos.column) {
                    pos.endColumn = i;
                }
                break;
            }
        }
        return pos;
    }


    return function(info, callback) {
        var path = info.path;
        session.getText(path, function(err, value) {
            value = value.replace(/^#!.*\n/, "\n");
            if (!value) {
                return callback(null, []);
            }
            var lines = value.split("\n");
            var errors = [];

            // js hint reports many false errors
            // report them as error only if code is actually invalid
            var maxErrorLevel = isValidJS(value) ? "warning" : "error";

            // var start = new Date();
            lint(value, info.options);
            var results = lint.errors;

            for (var i = 0; i < results.length; i++) {
                var error = results[i];
                if (!error) continue;
                var raw = error.raw;
                var type = "warning";

                if (raw == "Missing semicolon.") {
                    var str = error.evidence.substr(error.character);
                    str = str.charAt(str.search(/\S/));
                    if (maxErrorLevel == "error" && str && /[\w\d{(['"]/.test(str)) {
                        error.reason = 'Missing ";" before statement';
                        type = "error";
                    } else {
                        type = "info";
                    }
                } else if (disabledWarningsRe.test(raw)) {
                    continue;
                } else if (infoRe.test(raw)) {
                    type = "info";
                } else if (errorsRe.test(raw)) {
                    type = maxErrorLevel;
                } else if (raw == "'{a}' is not defined.") {
                    type = "warning";
                } else if (raw == "'{a}' is defined but never used.") {
                    type = "info";
                }

                var line = lines[error.line - 1];
                var pos = findIdentifierRange(line, error.character - 1);
                // console.log("Error", error, pos);

                errors.push({
                    row: error.line - 1,
                    column: pos.column,
                    endColumn: pos.endColumn,
                    text: error.reason,
                    type: type,
                    raw: raw
                });
            }
            callback(null, errors);
        });
    };
});