define(function(require, exports, module) {
    plugin.consumes = ["ui", "fs", "goto"];
    plugin.provides = ["dnd"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("./lib/async");
        var ui = imports.ui;
        var fs = imports.fs;
        var goto = imports.goto;

        var api = {
            init: function() {
                var el = document.querySelector("body");
                var overCount = 0;

                function dragenter(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    overCount++;
                    ui.blockUI("Drop your files or directories to upload to project...", true);
                }

                function dragover(e) {
                    e.stopPropagation();
                    e.preventDefault();
                }

                function dragleave(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (--overCount <= 0) {
                        ui.unblockUI();
                        overCount = 0;
                    }
                }

                function drop(e) {
                    e.stopPropagation();
                    e.preventDefault();

                    ui.unblockUI();

                    filesDropped(e.dataTransfer);
                }

                el.addEventListener('dragenter', dragenter, false);
                el.addEventListener('dragover', dragover, false);
                el.addEventListener('dragleave', dragleave, false);
                el.addEventListener('drop', drop, false);
            }
        };

        function saveFile(entry, rootPath, callback) {
            var fileReader = new FileReader();
            fileReader.onload = function(e) {
                var content = e.target.result;
                console.log(entry.fullPath);
                fs.writeFile(rootPath + entry.fullPath, content, callback);
            };
            entry.file(function(file) {
                fileReader.readAsText(file);
            });
        }

        function saveDirectory(dir, rootPath, callback) {
            var reader = dir.createReader();
            reader.readEntries(function(entries) {
                async.parForEach(entries, function(entry, next) {
                    if (entry.isDirectory) {
                        saveDirectory(entry, rootPath, next);
                    } else {
                        saveFile(entry, rootPath, next);
                    }
                }, callback);
            }, callback);
        }

        function filesDropped(data) {
            var entries = [];
            for (var i = 0; i < data.items.length; i++) {
                var item = data.items[i];
                entries.push(item.webkitGetAsEntry());
            }
            ui.prompt({
                message: "Uploading files. Desired path prefix:",
                input: "/"
            }, function(err, path) {
                if (!path) {
                    return;
                }
                if (path[path.length - 1] === "/") {
                    path = path.substring(0, path.length - 1);
                }
                ui.blockUI("Uploading...");
                async.parForEach(entries, function(entry, next) {
                    if (entry.isFile) {
                        saveFile(entry, path, next);
                    } else if (entry.isDirectory) {
                        saveDirectory(entry, path, next);
                    }
                }, function() {
                    goto.fetchFileList();
                    ui.unblockUI();
                });
            });
        }

        register(null, {
            dnd: api
        });
    }
});
