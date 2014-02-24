/* global $, _*/
define(function(require, exports, module) {
    "use strict";
    var config = require("./config");
    var eventbus = require("./lib/eventbus");
    var async = require("async");
    
    var extensionsFile = "/default/zpm/installed.json";
    
    exports.hook = function() {
        eventbus.once("configavailable", function() {
            exports.updateAll(true);
        });
    };

    exports.getInstalledExtensions = function(callback) {
        var configfs = config.getFs();
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
        $.getJSON(url + "package.json", function(data) {
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
                        var configfs = config.getFs();
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
        }).fail(function() {
            callback("Could not download " + url + "package.json");
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
                var configfs = config.getFs();
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
            config.getFs().writeFile(extensionsFile, JSON.stringify(extensions, null, 4), function(err) {
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
            
            async.each(_.pairs(extensions), function(idExtPair, next) {
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
        var configfs = config.getFs();
        var folder = "/" + id + "/";
        
        async.each(files, function(file, next) {
            $.get(url + file, function(data) {
                configfs.writeFile(folder + file, data, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    next();
                });
            }, "text").fail(function() {
               callback("Could not download " + url + file); 
            });
        }, function() {
            callback(null);
        });
    }
    
    function deleteExtensionFiles(id, files, callback) {
        var configfs = config.getFs();
        var folder = "/" + id + "/";
        
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
    
    function update(id, extension, extensions, callback) {
        $.getJSON(extension.url + "package.json", function(data) {
            if (versionCompare(data.version, extension.version, {zeroExtend: true}) > 0) {
                if (!data.files) {
                    data.files = [];
                }
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
                downloadExtensionFiles(extension.url, id, files, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    var filesToDelete = _.difference(oldFiles, files);
                    deleteExtensionFiles(id, filesToDelete, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        if (oldConfigFile !== data.configFile) {
                            reapply(id, oldConfigFile, data.configFile, function(err) {
                                if (err) {
                                    return callback(err);
                                }
                                config.getFs().writeFile(extensionsFile, JSON.stringify(extensions, null, 4), callback);
                            });
                        } else {
                            config.getFs().writeFile(extensionsFile, JSON.stringify(extensions, null, 4), callback);
                        }
                    });
                });
            } else {
                callback(null);
            }
        }).fail(function() {
            callback("Could not download package.json");
        });
    }
    
    function apply(id, extension, callback) {
        var configFile = "/" + id + "/" + extension.configFile;
        var configfs = config.getFs();
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
        var configFile = "/" + id + "/" + extension.configFile;
        var configfs = config.getFs();
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
        oldConfig = "/" + id + "/" + oldConfig;
        newConfig = "/" + id + "/" + newConfig;
        var configfs = config.getFs();
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