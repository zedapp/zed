require.config({
    baseUrl: "../js",
    paths: {
        "text": "../../dep/text"
    },
});

/*global chrome, $ */
require(["lib/dropbox"], function(dropbox) {

    var dropboxOauthAppId = ["fkjcgamnceomfnbcaedlhhopcchmnlkj",
        "pfmjnmeipppmcebplngmhfkleiinphhp"];
    if (dropboxOauthAppId.indexOf(chrome.runtime.id) === -1) {
        $("body").empty();
        $("body").append("<h1>Dropbox only supported in <a href='https://chrome.google.com/webstore/detail/zed/pfmjnmeipppmcebplngmhfkleiinphhp' target='_blank'>Chrome Webstore version of Zed</a></h1>");
        return;
    }
    dropbox.authenticate(function(err, dropbox) {
        var treeEl = $("#tree");
        $("#logout").click(function() {
            dropbox.signOut(close);
        });

        function open(path) {
            var url = "dropbox:" + path;
            chrome.app.window.create('editor.html?url=' + url + "&title=" + path + '&chromeapp=true', {
                frame: 'chrome',
                width: 720,
                height: 400,
            });
        }

        function close() {
            chrome.app.window.current().close();
        }

        function readDir(path, callback) {
            dropbox.readdir(path, function(err, resultStrings, dirState, entries) {
                if (err) {
                    return callback(err);
                }
                var dirs = [];
                entries.forEach(function(entry) {
                    if (entry.isFolder) {
                        dirs.push({
                            title: entry.name,
                            key: entry.path,
                            isFolder: true,
                            isLazy: true
                        });
                    }
                });
                callback(null, dirs);
            });
        }

        function renderInitialTree(err, children) {
            treeEl.dynatree({
                onActivate: function(node) {
                    open(node.data.key);
                    close();
                },
                onLazyRead: function(node) {
                    readDir(node.data.key, function(err, dirs) {
                        if (err) {
                            return console.error(err);
                        }
                        dirs.forEach(function(dir) {
                            node.addChild(dir);
                        });
                        node.setLazyNodeStatus(DTNodeStatus_Ok);
                    });
                },
                onKeydown: function(node, event) {
                    if (event.keyCode === 27) {
                        close();
                    }
                },
                keyboard: true,
                autoFocus: true,
                debugLevel: 0,
                children: children
            });
        }

        readDir("/", renderInitialTree);
    });
});