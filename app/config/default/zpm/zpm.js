/* global _ */
"use strict";
var configfs = require("zed/config_fs");
var config = require("zed/config");
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
        return "https://raw.githubusercontent.com/" + repoUsername + "/" + repoName + "/" + branch + "/" + (repoPath ? (repoPath + "/") : "");
    } else if (parts[0] === 'bb') {
        return "https://bitbucket.org/" + repoUsername + "/" + repoName + "/raw/" + branch + "/" + (repoPath ? (repoPath + "/") : "");
    }
    return uri;
}

function uriToPath(uri) {
    return packagesFolder + uri.replace(/:/g, '/');
}

exports.uriToPath = uriToPath;

exports.getInstalledPackages = function() {
    return configfs.listFiles().then(function(allFiles) {
        var packageFiles = _.filter(allFiles, function(path) {
            return !!packageFilenameRegex.exec(path);
        });
        var allPackages = {};
        var packagePromises = packageFiles.map(function(packageFile) {
            return configfs.readFile(packageFile).then(function(text) {
                var packageJson;
                try {
                    packageJson = JSON5.parse(text);
                } catch (e) {
                    console.error("Could not parse package.json", text);
                    throw e;
                }
                var pkgData = {
                    name: packageJson.name,
                    version: packageJson.version,
                    description: packageJson.description,
                    files: packageJson.files
                };
                allPackages[packageJson.uri] = pkgData;
            });
        });
        return Promise.all(packagePromises).then(function() {
            return allPackages;
        });
    });
};

exports.install = function(uri) {
    var url = uriToUrl(uri);
    var packageData, files;
    return http.get(url + "package.json", "json").then(function(packageData_) {
        packageData = packageData_[0];
        packageData.uri = packageData.uri || uri;
        return exports.getInstalledPackages();
    }).then(function(installed) {
        if (installed[uri]) {
            throw new Error("Package already installed");
        }
        if (!packageData.files) {
            packageData.files = [];
        }
        files = packageData.files.slice(0);
        files.push("config.json");
        var folder = uriToPath(uri) + "/";
        return configfs.writeFile(folder + "package.json", JSON5.stringify(packageData, null, 4));
    }, function(err) {
        throw new Error("Could not download file " + url + "package.json");
    }).then(function() {
        return downloadPackageFiles(url, uri, files).
        catch (function(err) {
            deletePackageFiles(uri, files);
            throw err;
        });
    });
};

exports.uninstall = function(uri) {
    return exports.getInstalledPackages().then(function(installed) {
        var pkg = installed[uri];
        if (!pkg) {
            throw new Error(uri + " is not the URI of an installed package.");
        }
        delete installed[uri];
        var files = pkg.files;
        files.push("config.json");
        files.push("package.json");
        return deletePackageFiles(uri, files);
    });
};

exports.update = function(uri) {
    return exports.getInstalledPackages().then(function(packages) {
        if (!packages[uri]) {
            throw new Error(uri + " is not the URI of an installed package.");
        }

        return update(uri, packages[uri]);
    });
};

exports.updateAll = function() {
    var anyUpdates = false;
    return config.get("packages").then(function(packages) {
        var packagePromises = packages.map(function(uri) {
            var packageFile = uriToPath(uri) + "/package.json";
            return configfs.readFile(packageFile).then(function(text) {
                var packageJson = JSON5.parse(text);
                return update(uri, packageJson).then(function(updated) {
                    if (updated) {
                        anyUpdates = true;
                    }
                });
            });
        });
        return Promise.all(packagePromises).then(function() {
            return anyUpdates;
        });
    });
};

exports.installAll = function() {
    var packageUris;
    return config.get("packages").then(function(packageUris_) {
        packageUris = packageUris_;
        return exports.getInstalledPackages();
    }).then(function(packages) {
        // console.log("Installed packages", packages);
        var notYetInstalled = _.filter(packageUris, function(uri) {
            return !packages[uri];
        });
        console.log("These packages should be installed:", notYetInstalled);
        var packagePromises = notYetInstalled.map(function(uri) {
            console.log("Now installing", uri);
            return exports.install(uri)
        });
        return Promise.all(packagePromises).then(function() {
            return notYetInstalled.length > 0;
        }, function(err) {
            console.error("Error installing packages", "" + err);
        });
    });
};

function downloadPackageFiles(url, uri, files) {
    var folder = uriToPath(uri) + "/";

    var filePromises = files.map(function(file) {
        return http.get(url + file, "text").then(function(data) {
            return configfs.writeFile(folder + file, data[0]);
        }, function(err) {
            console.error("Could not download " + url + file);
            throw err;
        });
    });

    return Promise.all(filePromises);
}

function deletePackageFiles(uri, files) {
    var folder = uriToPath(uri) + "/";

    var filePromises = files.map(function(file) {
        return configfs.deleteFile(folder + file);
    });

    return Promise.all(filePromises);
}

function copyFiles(folder, newFolder, files) {
    folder += "/";
    newFolder += "/";
    var filePromises = files.map(function(file) {
        return configfs.readFile(folder + file).then(function(content) {
            return configfs.writeFile(newFolder + file, content);
        }, function(err) {
            throw new Error("Got error " + err + " for file " + folder + file);
        });
    });
    return Promise.all(filePromises);
}

function update(uri, pkg) {
    var packageData;
    return http.get(uriToUrl(uri) + "package.json", "json").then(function(packageData_) {
        packageData = packageData_[0];
        console.log(uri, "current version", pkg.version, "new", packageData.version);
        if (versionCompare(packageData.version, pkg.version, {
            zeroExtend: true
        }) > 0) {
            console.log("Updating", uri);
            packageData.uri = packageData.uri || uri;
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

            return downloadPackageFiles(uriToUrl(uri), uri + ".update", files).then(function() {
                return copyFiles(folder, folder + ".old", oldFiles).then(function() {
                    return copyFiles(folder + ".update", folder, files).then(function() {
                        var filesToDelete = oldFiles.filter(function(file) {
                            return files.indexOf(file) < 0;
                        });
                        return deletePackageFiles(uri + ".update", files).then(function() {
                            return deletePackageFiles(uri + ".old", oldFiles);
                        }).then(function() {
                            return deletePackageFiles(uri, filesToDelete);
                        }).then(function() {
                            return configfs.writeFile(folder + "/package.json", JSON5.stringify(packageData, null, 4));
                        }).then(function() {
                            return true;
                        });
                    }, function(err) {
                        console.log("Error copying stuff", "" + err);
                        return copyFiles(folder + ".old", folder, oldFiles).then(Promise.reject(err));
                    });
                }, function(err) {
                    console.error("Error copying", err);
                    deletePackageFiles(uri + ".old", oldFiles);
                    throw err;
                });
            }, function(err) {
                console.error("Error downloading", err);
                deletePackageFiles(uri + ".update", files);
                throw err;
            });
        } else {
            return false;
        }
    });
}


exports.addToConfig = function(uri) {
    return configfs.readFile("/user.json").then(function(config_) {
        var json = JSON5.parse(config_);
        if (!json.packages) {
            json.packages = [];
        }
        json.packages.push(uri);
        return configfs.writeFile("/user.json", JSON5.stringify(json, null, 4));
    });
};

exports.removeFromConfig = function(uri) {
    return configfs.readFile("/user.json").then(function(config_) {
        var json = JSON5.parse(config_);
        var index = json.packages.indexOf(uri);
        if (index > -1) {
            json.packages.splice(index, 1);
            return configfs.writeFile("/user.json", JSON5.stringify(json, null, 4));
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
