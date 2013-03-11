define(function(require, exports, module) {
    var eventbus = require("eventbus");
    var editor = require("editor");
    var keys = require("keys");
    var Map = require("collection").Map;
    
    var splitRegex = /[^a-zA-Z_0-9\$\-]+/;
    var identifierRegex = /[a-zA-Z_0-9\$\-]/;

    function retrievePrecedingIdentifier(text, pos) {
        var buf = [];
        for (var i = pos-1; i >= 0; i--) {
            if (identifierRegex.test(text[i]))
                buf.push(text[i]);
            else
                break;
        }
        return buf.reverse().join("");
    }
    
    function getWordIndex(doc, pos) {
        var textBefore = doc.getLines(0, pos.row-1).join("\n") + "\n";
        var line = doc.getLine(pos.row);
        textBefore += line.substr(0, pos.column);
        return textBefore.trim().split(splitRegex).length - 1;
    }

    /**
     * Does a distance analysis of the word `prefix` at position `pos` in `doc`.
     * @return Map
     */
    function wordDistance(doc, pos, prefix) {
        var prefixPos = getWordIndex(doc, pos);
        var words = doc.getValue().split(splitRegex);
        var wordScores = new Map();
        
        var currentWord = words[prefixPos];
        
        words.forEach(function(word, idx) {
            if(!word || word === currentWord)
                return;
            
            var distance = Math.abs(prefixPos - idx);
            var score = words.length - distance;
            if(wordScores.contains(word)) {
                wordScores.set(word, Math.max(score, wordScores.get(word)));
            } else {
                wordScores.set(word, score);
            }
            
        });
        return wordScores;
    }
    
    // NOTE: Naive implementation O(n), can be O(log n) with binary search
    function filterPrefix(prefix, words) {
        var results = [];
        for(var i = 0; i < words.length; i++)
            if(words[i].indexOf(prefix) === 0)
                results.push(words[i]);
        
        return results;
    }
    
    function getCompletions(edit) {
        var session = edit.getSession();
        var doc = session.getDocument();
        var text = session.getValue();
        var pos = edit.getCursorPosition();
        
        var line = doc.getLine(pos.row);
        var prefix = retrievePrecedingIdentifier(line, pos.column);
        if(!prefix)
            return false;
        
        var wordScore = wordDistance(doc, pos, prefix);
        var wordList = wordScore.keys();
        
        var matches = filterPrefix(prefix, wordList);
        matches.sort(function(a, b) {
            var scoreA = wordScore[a];
            var scoreB = wordScore[b];
            if(scoreA !== scoreB)
                return scoreB - scoreA;
            
            return a < b ? -1 : 1;
        });
        return {
            prefix: prefix,
            matches: matches
        };
    }
    
    function complete() {
        var edit = editor.getActiveEditor();
        var result = getCompletions(edit);
        if(!result)
            return false;
        if(result.matches.length === 1) {
            edit.insert(result.matches[0].substring(result.prefix.length));
        } else if(result.matches.length > 0) {
            renderCompletionBox(result.matches, result.prefix, edit);
        }
        return true;
    }
    
    function renderCompletionBox(matches, prefix, edit) {
        var cursorLayer = edit.renderer.$cursorLayer;
        var cursorConfig = cursorLayer.config;
        var oldOnCommandKey;
        var oldOnTextInput;
        
        $("body").append('<ul id="complete-box">');
        var completionEl = $("#complete-box");
        completionEl.menu({
            select: function(event, ui) {
                edit.insert(ui.item.text().substring(prefix.length));
                edit.focus();
                event.preventDefault();
                close();
            }
        });
        updatePosition();
        updateCompletion();
        completionEl.width(200);
        completionEl.hide();
        
        function updatePosition() {
            // Need a timeout, to give ACE some time to move the cursor
            setTimeout(function() {
                completionEl.show();
                var cursorPosition = $(cursorLayer.cursor).offset();
                completionEl.css("left", (cursorPosition.left - cursorConfig.characterWidth * prefix.length - 4) + "px");
                completionEl.css("top", (cursorPosition.top + cursorConfig.lineHeight) + "px");
            }, 100);
        }
        
        function updateCompletion() {
            completionEl.html(renderOptionsHtml(matches));
            completionEl.menu("refresh");
            completionEl.menu("next");
        }
        
        function close() {
            completionEl.remove();
            $("body").unbind("click", close);
            edit.container.removeEventListener("DOMMouseScroll", close);
            edit.container.removeEventListener("mousewheel", close);
            edit.keyBinding.onCommandKey = oldOnCommandKey;
            edit.keyBinding.onTextInput = oldOnTextInput;
        }
        
        function renderOptionsHtml(matches) {
            var html = '';
            matches.forEach(function(match) {
                var matchHtml = "<span class='match'>" + match.substring(0, prefix.length) + "</span>" + match.substring(prefix.length);
                html += '<li><a href="#">' + matchHtml + '</a></li>';
            });
            return html;
        }
        
        // Icky stuff
        function onCommandKey(event) {
            var args = arguments;
            keyHandler(event, function() {
                oldOnCommandKey.apply(edit.keyBinding, args);
            });
        }
        
        function onTextInput(event) {
            var args = arguments;
            keyHandler(event, function() {
                oldOnTextInput.apply(edit.keyBinding, args);
            });
        }
        
        function keyHandler(event, passOnCallback) {
            switch(event.keyCode) {
                case 27: // esc
                    close();
                    event.preventDefault();
                    return;
                case 38: // up
                    completionEl.menu("previous");
                    event.preventDefault();
                    break;
                case 40: // down
                    completionEl.menu("next");
                    event.preventDefault();
                    break;
                case 13: // enter
                    if(completionEl.find("a.ui-state-focus").length > 0) {
                        completionEl.menu("select");
                        event.preventDefault();
                    } else {
                        passOnCallback();
                    }
                    break;
                case 9: // tab
                    if(event.shiftKey)
                        completionEl.menu("previous");
                    else
                        completionEl.menu("next");
                    event.preventDefault();
                    break;
                default:
                    passOnCallback();
                    var result = getCompletions(edit);
                    matches = result.matches;
                    prefix = result.prefix;
                    if(!matches || matches.length === 0) {
                        close();
                    } else {
                        updatePosition();
                        updateCompletion();
                    }
            }
        }
        
        if(!oldOnCommandKey) {
            oldOnCommandKey = edit.keyBinding.onCommandKey;
            edit.keyBinding.onCommandKey = onCommandKey;
            oldOnTextInput = edit.keyBinding.onTextInput;
            edit.keyBinding.onTextInput = onTextInput;
        }
        
        // Subscribe to events that should make the completion box close
        $("body").bind("click", close);
        edit.container.addEventListener("DOMMouseScroll", close);
        edit.container.addEventListener("mousewheel", close);
    }
    
    
    exports.hook = function() {
        keys.bind("codecomplete", "Tab", function() {
            if(!complete())
                editor.getActiveEditor().indent();
        })
    };
});