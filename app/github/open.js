require(["../js/lib/filter_list", "../js/lib/url_extractor"], function(filterList, urlExtractor) {
    var githubToken = /token=(.+)$/.exec(location)[1];

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
                error: function(err) {
                    reject(err);
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

    function presentRepos() {
        fetchAllRepos().then(function(userRepos) {
            var repos = userRepos.map(function(repo) {
                return {
                    name: repo.full_name,
                    html: "<img src='../img/github.png'>" + repo.full_name
                };
            });
            filterList({
                inputEl: $("#phrase"),
                resultsEl: $("#item-list"),
                list: repos,
                onSelect: function(r) {
                    if (r.notInList) {
                        var data = urlExtractor.extractRepoBranchFromUrl(r.name);
                        if (!data) {
                            $("#phrase").val("Invalid URL");
                            presentRepos();
                        } else {
                            if (data.branch) {
                                window.opener.openProject(data.user + "/" + data.repo + " [" + data.branch + "]", "gh:" + data.user + "/" + data.repo + ":" + data.branch);
                                window.close();
                            } else {
                                presentBranches(data.user + "/" + data.repo);
                            }
                        }
                    } else {
                        presentBranches(r.name);
                    }
                },
                onCancel: function() {
                    window.close();
                }
            });
        }).
        catch (function(err) {
            console.error("Error", err);
        });
    }

    function presentBranches(repo) {
        $("h1 span").text("Select a branch");
        var listEl = $("#item-list");
        listEl.html("Loading branches...");
        githubCall("GET", "/repos/" + repo + "/branches", {}).then(function(repoBranches) {
            var branches = repoBranches.map(function(branch) {
                return {
                    name: branch.name,
                    html: "<img src='../img/branch.png'>" + branch.name
                };
            });
            var phraseEl = $("#phrase");
            phraseEl.val("");
            phraseEl.focus();
            filterList({
                inputEl: $("#phrase"),
                resultsEl: listEl,
                list: branches,
                onSelect: function(b) {
                    window.opener.openProject(repo + " [" + b.name + "]", "gh:" + repo + ":" + b.name);
                    window.close();
                },
                onCancel: function() {
                    window.close();
                }
            });
        });
    }
    presentRepos();

    $("#phrase").focus();
});
