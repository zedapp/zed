define(function(require, exports, module) {
    var filterList = require("../lib/filter_list");
    var urlExtractor = require("../lib/url_extractor");

    return function(githubToken) {
        function githubCall(method, url, args, bodyJson) {
            args.access_token = githubToken;

            return new Promise(function(resolve, reject) {
                var params = [];
                _.each(args, function(val, key) {
                    params.push(key + "=" + encodeURIComponent(val));
                });
                $.ajax({
                    type: method,
                    url: "https://api.github.com" + url + (params.length > 0 ? "?" + params.join("&") : ""),
                    data: bodyJson && JSON.stringify(bodyJson),
                    dataType: "json",
                    processData: false,
                    success: function(resp) {
                        resolve(resp);
                    },
                    error: function(err, type, message) {
                        if (message === "Unauthorized") {
                            window.opener.setToken("githubToken", null);
                            window.close();
                        }
                    }
                });
            });
        }

        function fetchAllRepos() {
            var userRepos;
            return Promise.all([githubCall("GET", "/user/repos", {
                sort: "updated"
            }), githubCall("GET", "/user/orgs", {})]).then(function(results) {
                userRepos = results[0];
                var userOrgs = results[1];
                return Promise.all(userOrgs.map(function(org) {
                    return githubCall("GET", "/orgs/" + org.login + "/repos", {});
                }));
            }).then(function(orgRepos) {
                var allRepos = userRepos;
                orgRepos.forEach(function(orgRepos) {
                    allRepos = allRepos.concat(orgRepos);
                });
                return allRepos;
            });
        }

        function presentRepos(headerEl, phraseEl, resultsEl) {
            headerEl.text("Choose a repo");
            resultsEl.html("Loading repos...");
            return fetchAllRepos().then(function(userRepos) {
                var repos = userRepos.map(function(repo) {
                    return {
                        name: repo.full_name,
                        html: "<img src='/img/github.png'>" + repo.full_name
                    };
                });
                return new Promise(function(resolve, reject) {
                    filterList({
                        inputEl: phraseEl,
                        resultsEl: resultsEl,
                        list: repos,
                        onSelect: function(r) {
                            if (r.notInList) {
                                var data = urlExtractor.extractRepoBranchFromUrl(r.name);
                                if (!data) {
                                    $("#phrase").val("Invalid URL");
                                    presentRepos();
                                } else {
                                    if (data.branch) {
                                        resolve({
                                            repo: data.user + "/" + data.repo,
                                            branch: data.branch
                                        });
                                    } else {
                                        presentBranches(headerEl, phraseEl, resultsEl, data.user + "/" + data.repo).then(resolve, reject);
                                    }
                                }
                            } else {
                                presentBranches(headerEl, phraseEl, resultsEl, r.name).then(resolve, reject);
                            }
                        },
                        onCancel: function() {
                            resolve();
                        }
                    });
                });
            }).
            catch (function(err) {
                console.error("Error", err);
            });
        }

        function presentBranches(headerEl, phraseEl, resultsEl, repo) {
            headerEl.text("Select a branch");
            resultsEl.html("Loading branches...");
            return githubCall("GET", "/repos/" + repo + "/branches", {}).then(function(repoBranches) {
                var branches = repoBranches.map(function(branch) {
                    return {
                        name: branch.name,
                        html: "<img src='../img/branch.png'>" + branch.name
                    };
                });
                phraseEl.val("");
                phraseEl.focus();
                return new Promise(function(resolve) {
                    filterList({
                        inputEl: $("#phrase"),
                        resultsEl: resultsEl,
                        list: branches,
                        onSelect: function(b) {
                            resolve({
                                repo: repo,
                                branch: b.name
                            });
                        },
                        onCancel: function() {
                            resolve();
                        }
                    });
                });
            });
        }

        return presentRepos;
    };

});
