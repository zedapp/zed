define(function(require, exports, module) {
    return {
        buildCustomCommandRequest: function(edit) {
            var session = edit.getSession();
            var doc = session.getDocument();
            var selectionRange = session.getSelection().getRange();
            return {
                path: session.filename,
                lines: doc.getAllLines(),
                cursorPos: edit.getCursorPosition(),
                selection: {
                    start: selectionRange.start,
                    end: selectionRange.end,
                    text: session.getTextRange(selectionRange)
                }
            };
        },
        applyInstructions: function(edit, instructions) {
            var session = edit.getSession();
            instructions.forEach(function(instr) {
                switch (instr.type) {
                    case "replaceText":
                        var range = session.getSelection().getRange();
                        if (instr.what === "document") {
                            range.start.row = 0;
                            range.start.column = 0;
                            range.end.row = session.getLength();
                            range.end.column = session.getLine(range.end.row - 1).length;
                        }
                        session.replace(range, instr.content);
                        break;
                    default:
                        console.error("Not supported", instr);
                }
            });
        }
    };
});