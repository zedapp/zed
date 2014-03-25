/* global _ */
"use strict";
var configfs = require("zed/config_fs");
var config = require("zed/config");
var async = require("zed/lib/async");
var http = require("zed/http");

// var packagesFile = "/packages/installed.json";
var packagesFolder = "/packages/";

var packageFilenameRegex = /^\/packages\/(.+)\/package\.json$/;

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
    var repoParts = parts[1].split('/');
    var repoUsername = repoParts[0];
    var repoName = repoParts[1];
    var repoPath = repoParts.slice(2).join('/');
    var branch = parts[2] || 'master';
    if (parts[0] === 'gh') {
        return "https://raw.github.com/" + repoUsername + "/" + repoName + "/" + branch + "/" + repoPath + "/";
    } else if (parts[0] === 'bb') {
        return "https://bitbucket.org/" + repoUsername + "/" + repoName + "/raw/" + branch + "/" + repoPath + "/";
    }
    return uri;
}

function uriToPath(uri) {
    return packagesFolder + uri.replace(/:/g, '/');
}

exports.getInstalledPackages = function(callback) {
    configfs.listFiles(function(err, allFiles) {
        if (err) {
            return console.error("Could not list files in configuration project");
        }
        var packageFiles = _.filter(allFiles, function(path) {
            return !!packageFilenameRegex.exec(path);
        });
        var allPackages = {};
        async.each(packageFiles, function(packageFile, next) {
            configfs.readFile(packageFile, function(err, text) {
                if (err) {
                    console.error("Could not read package.json:", err);
                    return next();
                }
                var packageJson;
                try {
                    packageJson = JSON.parse(text);
                } catch (e) {
                    console.error("Could not parse package.json", text);
                    return next();
                }
                var pkgData = {
                    name: packageJson.name,
                    version: packageJson.version,
                    description: packageJson.description,
                    files: packageJson.files
                };
                allPackages[packageJson.uri] = pkgData;
                next();
            });
        }, function() {
            callback(null, allPackages);
        });
    });
};

exports.install = function(uri, callback) {
    var url = uriToUrl(uri);
    http.get(url + "package.json", "json", function(err, packageData) {
        if (err) {
            return callback("Could not download " + url + "package.json");
        }
        packageData.uri = uri;
        exports.getInstalledPackages(function(err, installed) {
            if (err) {
                return callback(err);
            }
            if (installed[uri]) {
                return callback("Package already installed");
            }
            if (!packageData.files) {
                packageData.files = [];
            }

            var files = packageData.files.slice(0);
            files.push("config.json");
            var folder = uriToPath(uri) + "/";
            configfs.writeFile(folder + "package.json", JSON.stringify(packageData, null, 4), function(err) {
                if (err) {
                    return callback(err);
                }
                downloadPackageFiles(url, uri, files, function(err) {
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
        if (!pkg) {
            return callback(uri + " is not the URI of an installed package.");
        }
        delete installed[uri];
        var files = pkg.files;
        files.push("config.json");
        files.push("package.json");
        deletePackageFiles(uri, files, function(err) {
            if (err) {
                return callback(err);
            }
            callback(null);
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

        update(uri, packages[uri], callback);
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
            update(uriPackagePair[0], uriPackagePair[1], function(err, updated) {
                if (err) {
                    return callback && callback(err);
                }
                if (updated) {
                    anyUpdates = true;
                }
                next();
            });
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

function update(uri, pkg, callback) {
    http.get(uriToUrl(uri) + "package.json", "json", function(err, packageData) {
        if (err) {
            return callback("Could not download package.json");
        }
        console.log(uri, "current version", pkg.version, "new", packageData.version);
        if (versionCompare(packageData.version, pkg.version, {
            zeroExtend: true
        }) > 0) {
            console.log("Updating", uri);
            packageData.uri = uri;
            if (!packageData.files) {
                packageData.files = [];
            }
            var folder = uriToPath(uri);
            var oldFiles = pkg.files.slice(0);
            oldFiles.push("config.json");
            oldFiles.push("package.json");

            var files = packageData.files.slice(0);
            files.push("config.json");
            files.push("package.json");

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
                        deletePackageFiles(uri + ".update", files);
                        deletePackageFiles(uri + ".old", oldFiles);
                        deletePackageFiles(uri, filesToDelete);

                        configfs.writeFile(folder + "/package.json", JSON.stringify(packageData, null, 4), function(err) {
                            if (err) {
                                console.error("Error writing package.json", err);
                                return callback(err);
                            }
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
            if (!json.packages) {
                json.packages = [];
            }
            json.packages.push(uri);
            configfs.writeFile("/user.json", JSON.stringify(json, null, 4), callback);
        } catch (e) {
            callback(e);
        }
    });
};

exports.removeFromConfig = function(uri, callback) {
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
