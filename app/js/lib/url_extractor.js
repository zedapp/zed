define(function(require, exports, module) {
    return {
        extractRepoBranchFromUrl: function(url) {
            var parts;
            if (url.indexOf("https://github.com/") === 0) {
                parts = url.substring("https://github.com/".length).split("/");
            } else if (url.indexOf("git@github.com:") === 0) {
                parts = url.substring("git@github.com:".length).split("/");
            } else {
                return null;
            }
            var user = parts[0];
            var repo = parts[1].replace(/\.git$/, "");
            var branch = null;
            if (parts[2] === "tree") {
                branch = parts[3];
            }
            return {
                user: user,
                repo: repo,
                branch: branch
            };
        },
        niceName: function(url) {
            var parts = url.split('?')[0].split('/');
            return parts[parts.length - 1];
        }
    }
});
