var session = require("zed/session");

module.exports = function(info) {
    var routes = info.routes;
    var request = info.request;
    var path = info.path;

    console.log("Path", request.path);

    for(var i = 0; i < routes.length; i++) {
        var route = routes[i];
        var regex = new RegExp(route.pattern);
        var m = regex.exec(request.path);
        if(m) {
            // console.log("Route match", route, m);
            if(route.rewritePath !== undefined) {
                request.path = m[route.rewritePath];
            }
            var cmd = route.command;
            return session.callCommand(path, cmd, {
                fs: route.fs,
                prefix: route.prefix,
                request: request
            });
        }
    }

    return {
        status: 404,
        body: "No matching routes"
    };
};
