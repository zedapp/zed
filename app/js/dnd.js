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

                function isFile(e) {
                    var types = e.dataTransfer.types;
                    if (types && Array.prototype.indexOf.call(types, "Files") !== -1)
                        return true;
                }

                function dragover(e) {
                    if (!isFile(e)) return;
                    e.stopPropagation();
                    e.preventDefault();
                }

                function dragleave(e) {
                    if (!isFile(e)) return;
                    e.stopPropagation();
                    e.preventDefault();
                }

                function drop(e) {
                    if (!isFile(e)) return;
                    console.log("Dropped");
                    e.stopPropagation();
                    e.preventDefault();

                    ui.unblockUI();

                    filesDropped(e.dataTransfer);
                }

                el.addEventListener('dragover', dragover, false);
                el.addEventListener('dragleave', dragleave, false);
                el.addEventListener('drop', drop, false);
            }
        };

        function saveFile(entry, rootPath) {
            return new Promise(function(resolve, reject) {
                var fileReader = new FileReader();
                fileReader.onload = function(e) {
                    var content = e.target.result;
                    console.log(entry.fullPath);
                    fs.writeFile(rootPath + entry.fullPath, content, true).then(resolve, reject);
                };
                entry.file(function(file) {
                    fileReader.readAsBinaryString(file);
                });
            });
        }

        function saveDirectory(dir, rootPath) {
            // TODO: This won't work with directories with > 100 files yet (need to depleate reader)
            return new Promise(function(resolve, reject) {
                var reader = dir.createReader();
                reader.readEntries(function(entries) {
                    async.parForEach(entries, function(entry, next) {
                        if (entry.isDirectory) {
                            saveDirectory(entry, rootPath, next);
                        } else {
                            saveFile(entry, rootPath, next);
                        }
                    }, resolve);
                }, reject);
            });
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
            }).then(function(path) {
                if (!path) {
                    return;
                }
                if (path[path.length - 1] === "/") {
                    path = path.substring(0, path.length - 1);
                }
                ui.blockUI("Uploading...");
                return Promise.all(entries.map(function(entry) {
                    if (entry.isFile) {
                        return saveFile(entry, path);
                    } else if (entry.isDirectory) {
                        return saveDirectory(entry, path);
                    }
                })).then(function() {
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
