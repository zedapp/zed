define(function(require, exports, module) {

    function protocolIcon(url) {
        var protocol = url.split(":")[0];
        switch (protocol) {
            case "dropbox":
                return "img/dropbox.png";
            case "syncfs":
                return "img/sync.png";
            case "manual":
                return "img/manual.png";
            case "config":
                return "img/config.png";
            case "nwconfig":
                return "img/config.png";
            case "gh":
                return "img/github.png";
            case "zedrem":
                return "img/remote.png";
            case "http":
                return "img/zedd.png";
            case "https":
                return "img/zedd.png";
            case "zedd":
                return "img/zedd.png";
            default:
                return "img/project.png";
        }
    }

    return {
        protocolIcon: protocolIcon
    };
});
