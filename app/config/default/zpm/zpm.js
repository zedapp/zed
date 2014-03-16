/* global _ */
"use strict";
var configfs = require("zed/config_fs");
var config = require("zed/config");
var async = require("zed/lib/async");
var http = require("zed/http");

var packagesFile = "/packages/installed.json";
var packagesFolder = "/packages/";


/**
 * Supports "nice" URIs for packages:
 * - full URLs
 * - gh:username/repo (for github)
 * - gh:username/repo:branch
 * - bb:username/repo (for bitbucket)
 * - bb:username/repo:branch
 */
function uriToUrl(uri) {
    var parts = uri.split(':');
    var repo = parts[1];
    var branch = parts[2] || 'master';
    if (parts[0] === 'gh') {
        return "https://raw.github.com/" + repo + "/" + branch + "/";
    } else if (parts[0] === 'bb') {
        return "https://bitbucket.org/" + repo + "/raw/" + branch + "/";
    }
    return uri;
}

function uriToPath(uri) {
    return packagesFolder + uri.replace(/:/g, '/');
}

exports.getInstalledPackages = function(callback) {
    configfs.readFile(packagesFile, function(err, installed) {
        if (err) {
            // File doesn't exist yet, that's ok
            installed = '{}';
        }
        try {
            var json = JSON.parse(installed);
            callback(null, json);
        } catch (e) {
            callback(e);
        }
    });
};

exports.install = function(uri, callback) {
    var url = uriToUrl(uri);
    http.get(url + "package.json", "json", function(err, data) {
        if (err) {
            return callback("Could not download " + url + "package.json");
        }
        exports.getInstalledPackages(function(err, installed) {
            if (err) {
                return callback(err);
            }
            if (installed[uri]) {
                return callback("Package already installed");
            }
            if (!data.files) {
                data.files = [];
            }
            installed[uri] = {
                "name": data.name,
                "version": data.version,
                "description": data.description,
                "files": data.files,
                "autoUpdate": true
            };

            var files = data.files.slice(0);
            files.push("config.json");
            downloadPackageFiles(url, uri, files, function(err) {
                if (err) {
                    deletePackageFiles(uri, files);
                    return callback(err);
                }
                configfs.writeFile(packagesFile, JSON.stringify(installed, null, 4), function(err) {
                    if (err) {
                        deletePackageFiles(uri, files);
                        return callback(err);
                    }
                    callback();
                });
            });
        });
    });
};

exports.uninstall = function(uri, callback) {
    exports.getInstalledPackages(function(err, installed) {
        if (err) {
            return callback(err);
        }
        var pkg = installed[uri];
        if (typeof(pkg) === 'undefined') {
            return callback(uri + " is not the URI of an installed package.");
        }
        delete installed[uri];
        configfs.writeFile(packagesFile, JSON.stringify(installed, null, 4), function(err) {
            if (err) {
                return callback(err);
            }
            var files = pkg.files;
            files.push("config.json");
            deletePackageFiles(uri, files, function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

exports.toggleAutoUpdate = function(uri, callback) {
    exports.getInstalledPackages(function(err, packages) {
        if (err) {
            return callback(err);
        }

        if (!packages[uri]) {
            callback(uri + " is not the URI of an installed package.");
        }

        packages[uri].autoUpdate = !packages[uri].autoUpdate;
        configfs.writeFile(packagesFile, JSON.stringify(packages, null, 4), function(err) {
            if (err) {
                return callback(err);
            }
            callback();
        });
    });
};

exports.update = function(uri, callback) {
    exports.getInstalledPackages(function(err, packages) {
        if (err) {
            return callback(err);
        }

        if (!packages[uri]) {
            callback(uri + " is not the URI of an installed package.");
        }

        update(uri, packages[uri], packages, callback);
    });
};

exports.updateAll = function(autoUpdate, callback) {
    exports.getInstalledPackages(function(err, packages) {
        if (err) {
            return callback && callback(err);
        }
        var uriPackagePairs = [];
        for (var id in packages) {
            uriPackagePairs.push([id, packages[id]]);
        }
        var anyUpdates = false;
        async.each(uriPackagePairs, function(uriPackagePair, next) {
            if (!autoUpdate || uriPackagePair[1].autoUpdate) {
                update(uriPackagePair[0], uriPackagePair[1], packages, function(err, updated) {
                    if (err) {
                        return callback && callback(err);
                    }
                    if (updated) {
                        anyUpdates = true;
                    }
                    next();
                });
            }
        }, function() {
            callback && callback(null, anyUpdates);
        });
    });
};

exports.installAll = function(callback) {
    config.get("packages", function(err, packageUris) {
        exports.getInstalledPackages(function(err, packages) {
            var notYetInstalled = _.filter(packageUris, function(uri) {
                return !packages[uri];
            });
            console.log("These packages should be installed:", notYetInstalled);
            async.each(notYetInstalled, function(uri, next) {
                console.log("Now installing", uri);
                exports.install(uri, next);
            }, function(err) {
                if (err) {
                    return console.error("Error installing packages", err);
                }
                callback(null, notYetInstalled.length > 0);
            });
        });
    });
};

function downloadPackageFiles(url, uri, files, callback) {
    var folder = uriToPath(uri) + "/";

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
        callback();
    });
}

function deletePackageFiles(uri, files, callback) {
    var folder = uriToPath(uri) + "/";

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
    }, callback);
}

function update(uri, pkg, packages, callback) {
    http.get(uriToUrl(uri) + "package.json", "json", function(err, data) {
        if (err) {
            return callback("Could not download package.json");
        }
        console.log("Current version", pkg.version, "new", data.version);
        if (versionCompare(data.version, pkg.version, {
            zeroExtend: true
        }) > 0) {
            console.log("Updating", uri);
            if (!data.files) {
                data.files = [];
            }
            var folder = uriToPath(uri);
            var oldFiles = pkg.files.slice(0);
            oldFiles.push("config.json");

            packages[uri].version = data.version;
            packages[uri].name = data.name;
            packages[uri].description = data.description;
            packages[uri].files = data.files;

            var files = data.files.slice(0);
            files.push("config.json");

            downloadPackageFiles(uriToUrl(uri), uri + ".update", files, function(err) {
                if (err) {
                    console.error("Error downloading", err);
                    deletePackageFiles(uri + ".update", files);
                    return callback(err);
                }
                copyFiles(folder, folder + ".old", oldFiles, function(err) {
                    if (err) {
                        console.error("Error copying 1", err);
                        deletePackageFiles(uri + ".old", oldFiles);
                        deletePackageFiles(uri + ".update", files);
                        return callback(err);
                    }

                    copyFiles(folder + ".update", folder, files, function(err) {
                        function rollback(err) {
                            copyFiles(folder + ".old", folder, oldFiles, function() {
                                deletePackageFiles(uri + ".update", files);
                                deletePackageFiles(uri + ".old", oldFiles);
                                callback(err);
                            });
                        }
                        if (err) {
                            console.error("Error copying 2", err);
                            return rollback(err);
                        }

                        var filesToDelete = oldFiles.filter(function(file) {
                            return files.indexOf(file) < 0;
                        });
                        configfs.writeFile(packagesFile, JSON.stringify(packages, null, 4), function(err) {
                            if (err) {
                                return rollback(err);
                            }
                            deletePackageFiles(uri + ".update", files);
                            deletePackageFiles(uri + ".old", oldFiles);
                            deletePackageFiles(uri, filesToDelete);
                            callback(null, true);
                        });
                    });
                });
            });
        } else {
            callback(null, false);
        }
    });
}


exports.addToConfig = function(uri, callback) {
    configfs.readFile("/user.json", function(err, config_) {
        try {
            var json = JSON.parse(config_);
            if(!json.packages) {
                json.packages = [];
            }
            json.packages.push(uri);
            configfs.writeFile("/user.json", JSON.stringify(json, null, 4), callback);
        } catch (e) {
            callback(e);
        }
    });
};

exports.removeFromConfig = function (uri, callback) {
    configfs.readFile("/user.json", function(err, config_) {
        try {
            var json = JSON.parse(config_);
            var index = json.packages.indexOf(uri);
            if (index > -1) {
                json.packages.splice(index, 1);
                configfs.writeFile("/user.json", JSON.stringify(json, null, 4), function(err) {
                    callback && callback(err);
                });
            } else {
                callback && callback();
            }
        } catch (e) {
            callback && callback(e);
        }
    });
};

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
        while (v1parts.length < v2parts.length) {
            v1parts.push("0");
        }
        while (v2parts.length < v1parts.length) {
            v2parts.push("0");
        }
    }

    if (!lexicographical) {
        v1parts = v1parts.map(Number);
        v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length === i) {
            return 1;
        }

        if (v1parts[i] === v2parts[i]) {
            continue;
        } else if (v1parts[i] > v2parts[i]) {
            return 1;
        } else {
            return -1;
        }
    }

    if (v1parts.length !== v2parts.length) {
        return -1;
    }

    return 0;
}