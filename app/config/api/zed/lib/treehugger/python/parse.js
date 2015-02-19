define(function(require, exports, module) {
    var Sk = require("./skulpt.min");
    var tree = require('../tree');

    function block(body) {
        return tree.cons("Block", [tree.list(body.map(transform))]);
    }

    function transform(skt) {
        if (!skt) {
            return tree.cons("None", []);
        }
        var nodeName = skt.constructor.name;
        var resultNode;
        var pos = {
            sl: skt.lineno,
            sc: skt.col_offset
        };
        switch (nodeName) {
            case "Module":
                resultNode = tree.cons("Module", [tree.list(skt.body.map(transform))]);
                break;
            case "Expr":
                resultNode = transform(skt.value);
                break;
            case "Str":
                resultNode = tree.cons("String", [tree.string(skt.s.v)]);
                break;
            case "ImportFrom":
                resultNode = tree.cons("ImportFrom", [tree.string(skt.module.v), tree.list(skt.names.map(transform))]);
                break;
            case "Import_":
                resultNode = tree.cons("Import", [tree.list(skt.names.map(transform))]);
                break;
            case "Assign":
                resultNode = tree.cons("Assign", [tree.list(skt.targets.map(transform)), transform(skt.value)]);
                break;
            case "Tuple":
                resultNode = tree.cons("Tuple", [tree.list(skt.elts.map(transform))]);
                break;
            case "arguments_":
                var vararg = skt.vararg ? tree.string(skt.vararg.v) : tree.cons("None", []);
                var kwarg = skt.kwarg ? tree.string(skt.kwarg.v) : tree.cons("None", []);
                resultNode = tree.cons("Args", [tree.list(skt.args.map(transform)), tree.list(skt.defaults.map(transform)), vararg, kwarg]);
                break;
            case "alias":
                var asName = tree.cons("None", []);
                if(skt.asname) {
                    asName = tree.string(skt.asname.v);
                }
                resultNode = tree.cons("Alias", [tree.string(skt.name.v), asName]);
                break;
            case "Attribute":
                resultNode = tree.cons("PropAccess", [transform(skt.value), tree.string(skt.attr.v)]);
                break;
            case "List":
                resultNode = tree.cons("List", [tree.list(skt.elts.map(transform))]);
                break;
            case "For_":
                resultNode = tree.cons("For", [transform(skt.target), transform(skt.iter), block(skt.body)]);
                break;
            case "If_":
                resultNode = tree.cons("If", [transform(skt.test), block(skt.body), block(skt.orelse)]);
                break;
            case "BoolOp":
                resultNode = tree.cons(skt.op.name, [tree.list(skt.values.map(transform))]);
                break;
            case "UnaryOp":
                resultNode = tree.cons("UnaryOp", [tree.string(skt.op.name), transform(skt.operand)]);
                break;
            case "Call":
                var kwargs = skt.kwargs ? tree.string(skt.kwargs.v) : tree.cons("None", []);
                var starargs = skt.starargs ? tree.string(skt.starargs.v) : tree.cons("None", []);
                resultNode = tree.cons("Call", [transform(skt.func), tree.list(skt.args.map(transform)), tree.list(skt.keywords.map(transform)), starargs, kwargs]);
                break;
            case "Compare":
                resultNode = tree.cons("Compare", [transform(skt.left), tree.list(skt.comparators.map(transform)), tree.list(skt.ops.map(function(fn) {
                    return tree.string(fn.name);
                }))]);
                break;
            case "Continue_":
                resultNode = tree.cons("Continue", []);
                break;
            case "Subscript":
                resultNode = tree.cons("Indexer", [transform(skt.value), transform(skt.slice)]);
                break;
            case "Index":
                resultNode = tree.cons("Index", [transform(skt.value)]);
                break;
            case "Return_":
                resultNode = tree.cons("Return", [transform(skt.value)]);
                break;
            case "Raise":
                resultNode = tree.cons("Raise", [transform(skt.type), transform(skt.inst)]);
                break;
            case "BinOp":
                resultNode = tree.cons("BinOp", [tree.string(skt.op.name), transform(skt.left), transform(skt.right)]);
                break;
            case "Dict":
                var pairs = [];
                for (var i = 0; i < skt.keys.length; i++) {
                    pairs.push(tree.cons("KeyVal", [transform(skt.keys[i]), transform(skt.values[i])]));
                }
                resultNode = tree.cons("Dict", [tree.list(pairs)]);
                break;
            case "ListComp":
                resultNode = tree.cons("ListComp", [transform(skt.elt), tree.list(skt.generators.map(transform))]);
                break;
            case "comprehension":
                resultNode = tree.cons("Comprehension", [transform(skt.target), transform(skt.iter), tree.list(skt.ifs.map(transform))]);
                break;
            case "keyword":
                resultNode = tree.cons("Keyword", [tree.string(skt.arg.v), transform(skt.value)]);
                break;
            case "ClassDef":
                resultNode = tree.cons("ClassDef", [tree.list(skt.decorator_list.map(transform)), tree.string(skt.name.v), tree.list(skt.bases.map(transform)), tree.list(skt.body.map(transform))]);
                break;
            case "FunctionDef":
                resultNode = tree.cons("FunctionDef", [tree.list(skt.decorator_list.map(transform)), tree.string(skt.name.v), transform(skt.args), block(skt.body)]);
                break;
            case "TryExcept":
                resultNode = tree.cons("TryExcept", [block(skt.body), tree.list(skt.handlers.map(function(handler) {
                    return tree.cons("Handler", [transform(handler.type), transform(handler.name), tree.list(handler.body.map(transform))]);
                })), block(skt.orelse)]);
                break;
            case "Pass":
                resultNode = tree.cons("Pass", []);
                break;
            case "GeneratorExp":
                resultNode = tree.cons("GeneratorExp", [transform(skt.elt), tree.list(skt.generators.map(transform))]);
                break;
            case "While_":
                resultNode = tree.cons("While", [transform(skt.test), block(skt.body)]);
                break;
            case "IfExp":
                resultNode = tree.cons("IfExp", [transform(skt.exp), transform(skt.body), transform(skt.orelse)]);
                break;
            case "Delete_":
                resultNode = tree.cons("Delete", [tree.list(skt.targets.map(transform))]);
                break;
            case "Num":
                resultNode = tree.cons("Num", [tree.string("" + skt.n.v)]);
                break;
            case "Yield":
                resultNode = tree.cons("Yield", [transform(skt.value)]);
                break;
            case "Slice":
                resultNode = tree.cons("Slice", [transform(skt.lower), transform(skt.upper), transform(skt.step)]);
                break;
            case "Print":
                resultNode = tree.cons("Print", [transform(skt.dest), tree.list(skt.values.map(transform))]);
                break;
            case "Name":
                if (skt.name) {
                    resultNode = tree.cons("Name", [tree.string(skt.name.v)]);
                } else if (skt.id) {
                    resultNode = tree.cons("Var", [tree.string(skt.id.v)]);
                } else {
                    throw new Error("Unknown name:" + skt);
                }
                // Enhance position info
                pos.el = pos.sl;
                pos.ec = pos.sc + resultNode[0].value.length;
                // console.log("Position for", resultNode.toString(), pos);
                break;
            default:
                // console.error(skt);
                throw new Error("Unknown node type:" + nodeName);
        }
        resultNode.setAnnotation("pos", pos);
        // if (resultNode.cons === "Var" && !pos.ec) {
        //     console.log("WEEERID", resultNode, skt);
        // }
        // console.log("<-", resultNode.toString(), pos);
        return resultNode;
    }

    exports.parse = function(s) {
        var cst;
        try {
            cst = Sk.parse("<<stdin>>", s);
            var ast = Sk.astFromParse(cst, "<<stdin>>");
            return transform(ast);
        } catch (e) {
            var resultNode = tree.cons("ERROR", []);
            resultNode.setAnnotation("pos", {
                sl: e.lineno,
                sc: typeof e.colno !== "number" ? 0 : e.colno
            });
            return resultNode;
        }
    };
});
