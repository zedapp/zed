define(function(require, exports, module) {

    var keyCode = require("./key_code");

    /**
     * - inputEl
     * - resultsEl
     * - list // {name: ..., html: ...}
     * - onSelect
     * - onUpdate
     * - onCancel
     * - onDelete
     */
    return function(options) {
        var inputEl = options.inputEl;
        var resultsEl = options.resultsEl;
        var list = options.list;
        var onSelect = options.onSelect;
        var onUpdate = options.onUpdate;
        var onCancel = options.onCancel;
        var onDelete = options.onDelete;

        var lastFilterPhrase = inputEl.val();

        var selectIdx = 0;

        function getFilteredList() {
            var filterPhrase = inputEl.val().toLowerCase();
            return list.filter(function(p) {
                if (p.section) {
                    return true;
                }
                return p.name.toLowerCase().indexOf(filterPhrase) !== -1;
            });
        }

        function getFilteredListLength() {
            var count = 0;
            var filterPhrase = inputEl.val().toLowerCase();
            list.forEach(function(p) {
                if (p.section) {
                    return;
                }
                if (p.name.toLowerCase().indexOf(filterPhrase) !== -1) {
                    count++;
                }
            });
            return count;
        }

        function update() {
            var filtered = getFilteredList();

            resultsEl.empty();
            var idx = 0;
            filtered.forEach(function(item) {
                var el;
                if (item.section) {
                    el = $("<div class='section'>");
                    el.text(item.section);
                    resultsEl.append(el);
                } else {
                    el = $("<a href='#'>");
                    el.data("info", item);
                    var html = item.html;
                    if(item.key) {
                        html += '<span class="meta">Alt-' + item.key + '</span>';
                    }
                    el.html(html);
                    el.data("idx", idx);
                    if (idx === selectIdx) {
                        el.addClass("active");
                    }
                    resultsEl.append(el);
                    idx++;
                }
            });

            onUpdate && onUpdate();
        }

        function updateSelection(noScroll) {
            var els = resultsEl.find("a");
            els.removeClass("active");
            var selectedEl = els.eq(selectIdx);
            if (selectedEl.length > 0) {
                selectedEl.addClass("active");
                if (!noScroll) {
                    selectedEl[0].scrollIntoView(false);
                }
            }
        }

        function keyUpHandler() {
            if (lastFilterPhrase != inputEl.val()) {
                selectIdx = 0;
                lastFilterPhrase = inputEl.val();
                update();
            }
        }

        function keyHandler(event) {
            var selectedEl;
            switch (event.keyCode) {
                case keyCode('Return'):
                    selectedEl = resultsEl.find("a").eq(selectIdx);
                    if (selectedEl.length > 0) {
                        selectedEl.click();
                        // inputEl.val("");
                        // update();
                        event.preventDefault();
                    } else {
                        onSelect({
                            name: inputEl.val(),
                            notInList: true
                        });
                        cleanup();
                    }
                    break;
                case keyCode('PgUp'):
                    selectIdx = Math.max(0, selectIdx - 10);
                    break;
                case keyCode('Up'):
                    selectIdx = Math.max(0, selectIdx - 1);
                    break;
                case keyCode('Down'):
                    selectIdx = Math.min(getFilteredListLength() - 1, selectIdx + 1);
                    break;
                case keyCode('PgDown'):
                    selectIdx = Math.min(getFilteredListLength() - 1, selectIdx + 10);
                    break;
                case keyCode('Tab'):
                    if (event.shiftKey) {
                        // Up
                        selectIdx = Math.max(0, selectIdx - 1);
                    } else {
                        // Down
                        selectIdx = Math.min(getFilteredList().length - 1, selectIdx + 1);
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case keyCode('Esc'):
                    inputEl.val("");
                    update();
                    onCancel && onCancel();
                    cleanup();
                    break;
                case keyCode('Delete'):
                    selectedEl = resultsEl.find("a").eq(selectIdx);
                    onDelete && onDelete(selectedEl.data("info"));
                    update();
                    break;
            }
            if(event.altKey) {
                console.log("Key", event);
                var filteredItems = getFilteredList();
                filteredItems.forEach(function(item) {
                    console.log(item);
                    if(item.key && item.key.charCodeAt(0) === event.keyCode) {
                        cleanup();
                        onSelect(item);
                    }
                });
            }
            updateSelection();
        }

        function clickHandler(event) {
            var info = $(event.target).data("info");
            cleanup();
            onSelect(info);
        }

        function cleanup() {
            $("body").off("keydown", keyHandler);
            resultsEl.off("click", "a", clickHandler);
            resultsEl.off("mouseover", "a", mouseOverHandler);
            inputEl.off("keyup", keyUpHandler);
        }

        function mouseOverHandler(event) {
            var idx = $(event.target).data("idx");
            selectIdx = idx;
            updateSelection(true);
        }

        inputEl.keyup(keyUpHandler);
        resultsEl.on("click", "a", clickHandler);
        resultsEl.on("mouseover", "a", mouseOverHandler);
        $("body").keydown(keyHandler);

        update();
    };

});
