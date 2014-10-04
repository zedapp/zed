if (window.nodeRequire) {
    require.nodeRequire = window.nodeRequire;
    define("nw.gui", [], function() {
        var oldRequire = require;
        require = nodeRequire;
        var lib = nodeRequire("nw.gui");
        require = oldRequire;
        return lib;
    });
    require(["nw.gui"]);
}
