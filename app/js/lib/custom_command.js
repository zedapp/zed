define(function(require, exports, module) {
    var eventbus = require("./eventbus");

    return {
        buildCustomCommandRequest: function(session, options) {
            var doc = session.getDocument();
            var selectionRange = session.getSelection().getRange();
            return {
                path: session.filename,
                modeName: session.mode.name,
                text: doc.getValue(),
                cursor: session.selection.getCursor(),
                options: options,
                selection: {
                    start: selectionRange.start,
                    end: selectionRange.end,
                    text: session.getTextRange(selectionRange)
                }
            };
        },
        applyInstructions: function(session, instructions, callback) {
            instructions.forEach(function(instr) {
                switch (instr.type) {
                    case "replaceText":
                        var range = session.getSelection().getRange();
                        if (instr.what === "document") {
                            range.start.row = 0;
                            range.start.column = 0;
                            range.end.row = session.getLength();
                            range.end.column = session.getLine(range.end.row - 1).length;
                        } else if(instr.what === "line") {
                            range.start.column = 0;
                            range.end.row = range.start.row;
                            range.end.column = session.getLine(range.start.row).length;
                        }
                        session.replace(range, instr.text);
                        break;
                    case "moveCursor":
                        session.selection.clearSelection();
                        session.selection.moveCursorTo(instr.row, instr.column);
                        break;
                    case "flashMessage":
                        eventbus.emit("sessionactivitystarted", session, instr.text);
                        setTimeout(function() {
                            eventbus.emit("sessionactivitycompleted", session);
                        }, instr.timeOut || 2000);
                        break;
                    case "writeFile":
                        require(["../project"], function(project) {
                            project.writeFile(instr.path, instr.text, function(err) {
                                if(err) {
                                    return console.error(err);
                                }
                                eventbus.emit("newfilecreated", instr.path);
                            });
                        });
                        break;
                    case "gotoFile":
                        require(["../session_manager", "../editor"], function(session_manager, editor) {
                            session_manager.go(instr.path, editor.getActiveEditor(), session);
                        });
                        break;
                    case "setAnnotations":
                        session.setAnnotations(instr.annotations);
                        break;
                    case "updateCTags":
                        require(["../ctags"], function(ctags) {
                            ctags.updateCTags(instr.path, instr.tags);
                        });
                        break;
                    default:
                        console.error("Not supported", instr);
                }
            });
            callback();
        }
    };
});