/*global define*/
define(function(require, exports, module) {
    "use strict";
    var configfs = require("zed/config_fs");
    var async = require("zed/lib/async");
    var http = require("zed/http");
    
    var extensionsFile = "/ext/org.zedapp.ext.zpm/data/installed.json";
    var extensionsFolder = "/ext/";

    exports.getInstalledExtensions = function(callback) {
        configfs.readFile(extensionsFile, function(err, installed) {
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
    
    exports.install = function(url, callback) {
        http.get(url + "package.json", "json", function(err, data) {
            if (err) {
                return callback("Could not download " + url + "package.json");
            }
            exports.getInstalledExtensions(function(err, installed) {
                if (err) {
                    return callback(err);
                }
                if (data.id.indexOf('.') < 0) {
                    return callback("Extension ID must have at least one '.' in it.");
                }
                if (installed[data.id]) {
                    return callback("Extension already installed");
                }
                if (!data.files) {
                    data.files = [];
                }
                installed[data.id] = {
                    "name": data.name,
                    "url": url,
                    "version": data.version,
                    "description": data.description,
                    "configFile": data.configFile,
                    "files": data.files,
                    "autoUpdate": true
                };
                
                var files = data.files.slice(0);
                files.push(data.configFile);
                downloadExtensionFiles(url, data.id, files, function(err) {
                    if (err) {
                        deleteExtensionFiles(data.id, files);
                        return callback(err);
                    }
                    apply(data.id, installed[data.id], function(err) {
                        if (err) {
                            deleteExtensionFiles(data.id, files);
                            return callback(err);
                        }
                        configfs.writeFile(extensionsFile, JSON.stringify(installed, null, 4), function(err) {
                            if (err) {
                                deleteExtensionFiles(data.id, files);
                                unapply(data.id, data);
                                return callback(err);
                            }
                            callback(null);
                        });
                    });
                });
            });
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
            unapply(id, extension, function(err) {
                if (err) {
                    return callback(err);
                }
                delete installed[id];
                configfs.writeFile(extensionsFile, JSON.stringify(installed, null, 4), function(err) {
                    if (err) {
                        return callback(err);
                    }
                    var files = extension.files;
                    files.push(extension.configFile);
                    deleteExtensionFiles(id, files, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                });
            });
        });
    };
    
    exports.toggleAutoUpdate = function(id, callback) {
        exports.getInstalledExtensions(function(err, extensions) {
            if (err) {
                return callback(err);
            }
            
            if (!extensions[id]) {
                callback(id + " is not the id of an installed extension.");
            }
            
            extensions[id].autoUpdate = !extensions[id].autoUpdate;
            configfs.writeFile(extensionsFile, JSON.stringify(extensions, null, 4), function(err) {
                if (err) {
                    return callback(err);
                }
                    callback(null);
            });
        });
    };
    
    exports.update = function(id, callback) {
        exports.getInstalledExtensions(function(err, extensions) {
            if (err) {
                return callback(err);
            }
            
            if (!extensions[id]) {
                callback(id + " is not the id of an installed extension.");
            }
            
            update(id, extensions[id], extensions, callback);
        });
    };
    
    exports.updateAll = function(autoUpdate, callback) {
        exports.getInstalledExtensions(function(err, extensions) {
            if (err) {
                return callback && callback(err);
            }
            var idExtPairs = [];
            for (var id in extensions) {
                idExtPairs.push([id, extensions[id]]);
            }
            async.each(idExtPairs, function(idExtPair, next) {
                if (!autoUpdate || idExtPair[1].autoUpdate) {
                    update(idExtPair[0], idExtPair[1], extensions, function(err) {
                        if (err) {
                            return callback && callback(err);
                        }
                        next();
                    });
                }
            }, function() {
                callback && callback(null);
            });
        });
    };
    
    function downloadExtensionFiles(url, id, files, callback) {
        var folder = extensionsFolder + id + "/";
        
        async.each(files, function(file, next) {
            http.get(url + file, "text", function(err, data) {
                if (err) {
                    return callback("Could not download " + url + file);
                }
                configfs.writeFile(folder + file, data, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    next();
                });
            });
        }, function() {
            callback(null);
        });
    }
    
    function deleteExtensionFiles(id, files, callback) {
        var folder = extensionsFolder + id + "/";
        
        async.each(files, function(file, next) {
            configfs.deleteFile(folder + file, function(err) {
                if (err) {
                    return callback && callback(err);
                }
                next();
            });
        }, function() {
            callback && callback(null);
        });
    }
    
    function copyFiles(folder, newFolder, files, callback) {
        folder += "/";
        newFolder += "/";
        async.each(files, function(file, next) {
            configfs.readFile(folder + file, function(err, content) {
                if (err) {
                    return callback(err);
                }
                configfs.writeFile(newFolder + file, content, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    next();
                });
            });
        }, function() {
            callback && callback(null);
        });
    }
    
    function update(id, extension, extensions, callback) {
        http.get(extension.url + "package.json", "json", function(err, data) {
            if (err) {
                return callback("Could not download package.json");
            }
            if (versionCompare(data.version, extension.version, {zeroExtend: true}) > 0) {
                console.log('updating');
                if (!data.files) {
                    data.files = [];
                }
                var folder = extensionsFolder + id;
                var oldFiles = extension.files.slice(0);
                oldFiles.push(extension.configFile);
                var oldConfigFile = extension.configFile;
                
                extensions[id].version = data.version;
                extensions[id].name = data.name;
                extensions[id].description = data.description;
                extensions[id].configFile = data.configFile;
                extensions[id].files = data.files;
                
                var files = data.files.slice(0);
                files.push(data.configFile);
                downloadExtensionFiles(extension.url, id + ".update", files, function(err) {
                    if (err) {
                        deleteExtensionFiles(id + ".update", files);
                        return callback(err);
                    }
                    copyFiles(folder, folder + ".old", oldFiles, function(err) {
                        if (err) {
                            deleteExtensionFiles(id + ".old", oldFiles);
                            deleteExtensionFiles(id + ".update", files);
                            return callback(err);
                        }
                        
                        copyFiles(folder + ".update", folder, files, function(err) {
                            function rollback(err) {
                                copyFiles(folder + ".old", folder, oldFiles, function() {
                                    deleteExtensionFiles(id + ".update", files);
                                    deleteExtensionFiles(id + ".old", oldFiles);
                                    callback(err);
                                });
                            }
                            if (err) {
                                return rollback(err);
                            }
                            
                            var filesToDelete = oldFiles.filter(function(file) {
                                return files.indexOf(file) < 0;
                            });
                            if (oldConfigFile !== data.configFile) {
                                reapply(id, oldConfigFile, data.configFile, function(err) {
                                    if (err) {
                                        return rollback(err);
                                    }
                                    configfs.writeFile(extensionsFile, JSON.stringify(extensions, null, 4), function(err) {
                                        if (err) {
                                            return rollback(err);
                                        }
                                        deleteExtensionFiles(id + ".update", files);
                                        deleteExtensionFiles(id + ".old", oldFiles);
                                        deleteExtensionFiles(id, filesToDelete);
                                        callback(null);
                                    });
                                });
                            } else {
                                configfs.writeFile(extensionsFile, JSON.stringify(extensions, null, 4), function(err) {
                                    if (err) {
                                        return rollback(err);
                                    }
                                    deleteExtensionFiles(id + ".update", files);
                                    deleteExtensionFiles(id + ".old", oldFiles);
                                    deleteExtensionFiles(id, filesToDelete);
                                    callback(null);
                                });
                            }
                        });
                    });
                });
            } else {
                callback(null);
            }
        });
    }
    
    function apply(id, extension, callback) {
        var configFile = extensionsFolder + id + "/" + extension.configFile;
        configfs.readFile("/user.json", function(err, config_) {
            try {
                var json = JSON.parse(config_);
                json.imports.push(configFile);
                configfs.writeFile("/user.json", JSON.stringify(json, null, 4), callback);
            } catch (e) {
                callback(e);
            }
        });
    }
    
    function unapply(id, extension, callback) {
        var configFile = extensionsFolder + id + "/" + extension.configFile;
        configfs.readFile("/user.json", function(err, config_) {
            try {
                var json = JSON.parse(config_);
                var index = json.imports.indexOf(configFile);
                if (index > -1) {
                    json.imports.splice(index, 1);
                    configfs.writeFile("/user.json", JSON.stringify(json, null, 4), function(err) {
                        callback && callback(err);
                    });
                } else {
                    callback && callback(null);
                }
            } catch (e) {
                callback && callback(e);
            }
        });
    }
    
    function reapply(id, oldConfig, newConfig, callback) {
        oldConfig = extensionsFolder + id + "/" + oldConfig;
        newConfig = extensionsFolder + id + "/" + newConfig;
        configfs.readFile("/user.json", function(err, config_) {
            try {
                var json = JSON.parse(config_);
                var index = json.imports.indexOf(oldConfig);
                if (index > -1) {
                    json.imports.splice(index, 1);
                }
                json.imports.push(newConfig);
                configfs.writeFile("/user.json", JSON.stringify(json, null, 4), callback);
            } catch (e) {
                callback(e);
            }
        });
    }
    
    /**
     * Code taken from:
     * http://stackoverflow.com/questions/6832596/how-to-compare-software-version-number-using-js-only-number
     * copyright by Jon Papaioannou
     * This function is in the public domain. Do what you want with it, no strings attached.
     */
    function versionCompare(v1, v2, options) {
        var lexicographical = options && options.lexicographical,
            zeroExtend = options && options.zeroExtend,
            v1parts = v1.split('.'),
            v2parts = v2.split('.');
     
        function isValidPart(x) {
            return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
        }
     
        if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
            return NaN;
        }
     
        if (zeroExtend) {
            while (v1parts.length < v2parts.length) v1parts.push("0");
            while (v2parts.length < v1parts.length) v2parts.push("0");
        }
     
        if (!lexicographical) {
            v1parts = v1parts.map(Number);
            v2parts = v2parts.map(Number);
        }
     
        for (var i = 0; i < v1parts.length; ++i) {
            if (v2parts.length == i) {
                return 1;
            }
     
            if (v1parts[i] == v2parts[i]) {
                continue;
            }
            else if (v1parts[i] > v2parts[i]) {
                return 1;
            }
            else {
                return -1;
            }
        }
     
        if (v1parts.length != v2parts.length) {
            return -1;
        }
     
        return 0;
    }
});