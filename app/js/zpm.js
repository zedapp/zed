/* global $, _*/
define(function(require, exports, module) {
    "use strict";
    var config = require("./config");
    var command = require("./command");
    var eventbus = require("./lib/eventbus");
    var ui = require("./lib/ui");

    exports.getInstalledExtensions = function(callback) {
        var configfs = config.getFs();
        configfs.readFile("/zpm/installed.json", function(err, installed) {
            try {
                if (err) {
                    callback(err);
                    return;
                }
                var json = JSON.parse(installed);
                callback(null, json);
            } catch (e) {
                callback(e);
            }
        });
    };

    exports.hook = function() {
    };
    
    exports.install = function(url, callback) {
        $.getJSON(url + "package.json", function(data) {
            exports.getInstalledExtensions(function(err, installed) {
                if (err) {
                    return callback(err);
                }
                if (installed[data.id]) {
                    return callback("Package already installed");
                }
                installed[data.id] = {
                    "name": data.name,
                    "url": url,
                    "version": data.version,
                    "description": data.description,
                    "configFile": data.configFile,
                    "autoUpdate": true,
                    "global": true
                };
                
                var configfs = config.getFs();
                var folder = "/" + data.id + "/";
                var files = data.files;
                files.push(data.configFile);
                
                function downloadFiles(files, i, callback) {
                    $.get(url + files[i], function(data) {
                        configfs.writeFile(folder + files[i], data, function(error) {
                            if (error) {
                                return callback(error);
                            }
                            i++;
                            if (i < files.length) {
                                downloadFiles(files, i, callback);
                            } else {
                                callback(null);
                            }
                        });
                    }, "text");
                }
                
                downloadFiles(files, 0, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    configfs.writeFile("/zpm/installed.json", JSON.stringify(installed, null, 4), function(err) {
                        if (err) {
                            return callback(err);
                        }
                        apply(data.id, installed[data.id], callback);
                    });
                });
            });
        }).fail(function() {
            callback("Could not download package.json");
        });
    };
    
    function apply(id, extension, callback) {
        var configFile = "/" + id + "/" + extension.configFile;
        var configfs = config.getFs();
        configfs.readFile("/user.json", function(err, config_) {
            try {
                var json = JSON.parse(config_);
                json.imports.push(configFile);
                configfs.writeFile("/user.json", JSON.stringify(json, null, 4), function(err) {
                    callback(err);
                });
            } catch (e) {
                callback(e);
            }
        });
    }
    
    exports.apply = function(id, callback) {
        exports.getInstalledExtensions(function(err, installed) {
            if (err) {
                return callback(err);
            }
            var extension = installed[id];
            apply(id, extension, callback);
        });
    };
    
    function unapply(id, extension, callback) {
        var configFile = "/" + id + "/" + extension.configFile;
        var configfs = config.getFs();
        configfs.readFile("/user.json", function(err, config_) {
            try {
                var json = JSON.parse(config_);
                var index = json.imports.indexOf(configFile);
                if (index > -1) {
                    json.imports.splice(index, 1);
                    configfs.writeFile("/user.json", JSON.stringify(json, null, 4), function(err) {
                        callback(err);
                    });
                } else {
                    callback(null);
                }
            } catch (e) {
                callback(e);
            }
        });
    }
    
    exports.unapply = function(id, callback) {
        exports.getInstalledExtensions(function(err, installed) {
            if (err) {
                return callback(err);
            }
            var extension = installed[id];
            unapply(id, extension, callback);
        });
    };
    
    exports.uninstall = function(id, callback) {
        exports.getInstalledExtensions(function(err, installed) {
            if (err) {
                return callback(err);
            }
            var extension = installed[id];
            if (typeof(extension) === 'undefined') {
                return callback(id + " is not the id of an installed extension.");
            }
            if (extension.global) {
                unapply(id, extension, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    delete installed[id];
                    var configfs = config.getFs();
                    configfs.writeFile("/zpm/installed.json", JSON.stringify(installed, null, 4), function(err) {
                        if (err) {
                            return callback(err);
                        }
                        
                        function deleteFiles(files, i, callback) {
                            configfs.deleteFile(files[i], function(err) {
                                if (err) {
                                    return callback(err);
                                }
                                i++;
                                if (i < files.length) {
                                    deleteFiles(files, i, callback);
                                } else {
                                    callback(null);
                                }
                            });
                        }
                        
                        configfs.listFiles(function(err, files) {
                            files = files.filter(function(file) {
                                return file.indexOf("/" + id) === 0;
                            });
                            deleteFiles(files, 0, callback);
                        });
                    });
                });
            }
        });
    };
    
    command.define("Zpm:Uninstall", {
       exec: function() {
           setTimeout(function() {
               ui.prompt({
                   width: 400,
                   height: 150,
                   message: "Extension id to uninstall:",
                   input: ""
               }, function(err, id) {
                  exports.uninstall(id, function(err) {
                      if (err) {
                          ui.prompt({message: err});
                      } else {
                          ui.prompt({message: "Extension uninstalled!"});
                      }
                  }); 
               });
           }, 0);
       } 
    });
});