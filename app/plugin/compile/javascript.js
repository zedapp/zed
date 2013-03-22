define(function(require, exports, module) {
    require("./uglifyjs.js");
    uglifyJs();
    var jsp = uglifyJs.require("uglify-js").parser;
    var pro = uglifyJs.require("uglify-js").uglify;

    return function(options, content, callback) {
        var ast = jsp.parse(content);
        ast = pro.ast_mangle(ast);
        ast = pro.ast_squeeze(ast);
        var minifiedJs = pro.gen_code(ast);
        var path = options.path.replace(/\.js$/, ".min.js");
        callback(null, {
            outputPath: path,
            content: minifiedJs
        });
    };
});