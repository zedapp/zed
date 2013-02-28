define(function () {
    plugin.provides = ['goto'];
    plugin.consumes = ['keys', 'editor', 'eventbus', 'io', 'session_manager'];
    return plugin;

    function plugin(options, imports, register) {
        var cache = [];
        var editor = imports.editor;
        var session_manager = imports.session_manager;

        function filter(phrase) {
            var results = [];
            for(var i = 0; i < cache.length; i++) {
                var file = cache[i];
                // Super trivial matching
                if(file.indexOf(phrase) !== -1) {
                    results.push(file);
                }
            }
            return results;
        }

        function show() {
            $("body").append("<div id='goto'><input type='text' id='gotoinput' placeholder='file'/><ul id='results'>");
            var box = $("#goto");
            var input = $("#gotoinput");
            var resultsEl = $("#results");
            var selectionIdx = 0;
            var lastPhrase = null;
            var results = [];

            function unselect() {
                resultsEl.find("li").eq(selectionIdx).removeClass("selected");
            }

            function select() {
                resultsEl.find("li").eq(selectionIdx).addClass("selected");
            }

            function close() {
                box.remove();
                editor.ace.focus();
            }

            input.keyup(function(key) {
                console.log(key);
                switch(key.keyCode) {
                    case 27:
                        close();
                        break;
                    case 38:
                        unselect();
                        selectionIdx = Math.max(0, selectionIdx - 1);
                        select();
                        break;
                    case 40:
                        unselect();
                        selectionIdx = Math.min(results.length - 1, selectionIdx + 1);
                        select();
                        break;
                    case 13:
                        session_manager.go(resultsEl.find("li.selected").text());
                        close();
                        break;
                    default:
                        if(lastPhrase != input.val()) {
                            selectionIdx = 0;
                            results = filter(input.val()).slice(0, 100);
                            resultsEl.empty();
                            results.forEach(function(r, idx) {
                                resultsEl.append('<li>' + r + '</li>');
                            });
                            select();
                            lastPhrase = input.val();
                        }
                }
            });
            input.focus();
        }

        imports.eventbus.on("pathchange", function() {
            console.log("Fetching file list...");
            imports.io.find(function(err, files) {
                cache = files;
                console.log(files);
            });
        });

        imports.keys.bind("Command-b", function() {
            show();
        });

        register(null, {
            goto: {
                show: show
            }
        });
    };
});
