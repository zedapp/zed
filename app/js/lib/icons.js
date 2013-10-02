define(function(require, exports, module) {
    
    function protocolIcon(url) {
        var protocol = url.split(":")[0];
        switch (protocol) {
            case "dropbox":
                return "img/dropbox.png";
            default:
                return "img/project.png";
        }
    }
    
    return {
        protocolIcon: protocolIcon
    };
});