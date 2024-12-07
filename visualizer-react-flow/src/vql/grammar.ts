// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var comment: any;
declare var identifier: any;
declare var special_suffix: any;
declare var nullptr_literal: any;
declare var boolean_literal_true: any;
declare var boolean_literal_false: any;
declare var string_literal: any;
declare var hexnum_literal: any;
declare var number_literal: any;

import * as moo from "moo";
const lexer = moo.compile({
    ws: /[ \t\r]+/,
    nl: { match: "\n", lineBreaks: true },
    comment: {
        match: /--[^\n]+/,
        value: (s: string) => s
    },
    special_suffix: /\[(?:Text|Link|Box)\]/,
    dot: ".", arrow: "->",
    lte: "<=", lt: "<", gte: ">=", gt: ">", eq: "==", ne: "!=",
    cap: "^", cup: "|", sub: "\\",
    assignment: "=",
    lparan: "(", rparan: ")",
    lbracket: "[", rbracket: "]",
    lbrace: "{", rbrace: "}",
    plus: "+", minus: "-", multiply: "*", divide: "/", modulo: "%",
    comma: ",", colon: ":",
    nullptr_literal: "NULL",
    boolean_literal_true: "true",
    boolean_literal_false: "false",
    string_literal: {
        match: /"(?:[^\n\\"]|\\["\\ntbfr])*"/,
        value: (s: string) => JSON.parse(s)
    },
    hexnum_literal: {
        match: /0x[0-9a-fA-F]+/,
        value: (s: string) => s
    },
    number_literal: {
        match: /[0-9]+/,
        value: (s: string) => s
    },
    identifier: {
        match: /[A-Za-z_][A-Za-z0-9_]*/,
        type: moo.keywords({
            select: "SELECT",
            from: "FROM",
            as: "AS",
            where: "WHERE",
            update: "UPDATE",
            with: "WITH",
            AND: "AND",
            OR: "OR",
            IN: "IN",
            true: "true",
            false: "false"
        })
    }
});

function identifierId(data: any) {
    return [id(data)];
}
function idStringLiteral(data: any) {
    return { value: `${id(data)}` };
}
function idStringLiteralUpdate(data: any) {
    return { value: `'${id(data)}'` };
}

type Expression = {
    head: {
        type:  string,
        value: any
    },
    suffix: {
        rhs: string,
        opt: string
    }[]
}
function getExpr(data: any[]): Expression {
    let suffix = [];
    for (let i = 1; i < data.length; i ++) {
        suffix.push({
            opt: data[i].opt.value,
            rhs: data[i].rhs
        });
    }
    return {
        head: {
            type:  data[0].type,
            value: data[0].value
        },
        suffix: suffix
    };
}

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "dqstring$ebnf$1", "symbols": []},
    {"name": "dqstring$ebnf$1", "symbols": ["dqstring$ebnf$1", "dstrchar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dqstring", "symbols": [{"literal":"\""}, "dqstring$ebnf$1", {"literal":"\""}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "sqstring$ebnf$1", "symbols": []},
    {"name": "sqstring$ebnf$1", "symbols": ["sqstring$ebnf$1", "sstrchar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "sqstring", "symbols": [{"literal":"'"}, "sqstring$ebnf$1", {"literal":"'"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "btstring$ebnf$1", "symbols": []},
    {"name": "btstring$ebnf$1", "symbols": ["btstring$ebnf$1", /[^`]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "btstring", "symbols": [{"literal":"`"}, "btstring$ebnf$1", {"literal":"`"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "dstrchar", "symbols": [/[^\\"\n]/], "postprocess": id},
    {"name": "dstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": 
        function(d) {
            return JSON.parse("\""+d.join("")+"\"");
        }
        },
    {"name": "sstrchar", "symbols": [/[^\\'\n]/], "postprocess": id},
    {"name": "sstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": function(d) { return JSON.parse("\""+d.join("")+"\""); }},
    {"name": "sstrchar$string$1", "symbols": [{"literal":"\\"}, {"literal":"'"}], "postprocess": (d) => d.join('')},
    {"name": "sstrchar", "symbols": ["sstrchar$string$1"], "postprocess": function(d) {return "'"; }},
    {"name": "strescape", "symbols": [/["\\/bfnrt]/], "postprocess": id},
    {"name": "strescape", "symbols": [{"literal":"u"}, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/], "postprocess": 
        function(d) {
            return d.join("");
        }
        },
    {"name": "unsigned_int$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_int$ebnf$1", "symbols": ["unsigned_int$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "unsigned_int", "symbols": ["unsigned_int$ebnf$1"], "postprocess": 
        function(d) {
            return parseInt(d[0].join(""));
        }
        },
    {"name": "int$ebnf$1$subexpression$1", "symbols": [{"literal":"-"}]},
    {"name": "int$ebnf$1$subexpression$1", "symbols": [{"literal":"+"}]},
    {"name": "int$ebnf$1", "symbols": ["int$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "int$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "int$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "int$ebnf$2", "symbols": ["int$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "int", "symbols": ["int$ebnf$1", "int$ebnf$2"], "postprocess": 
        function(d) {
            if (d[0]) {
                return parseInt(d[0][0]+d[1].join(""));
            } else {
                return parseInt(d[1].join(""));
            }
        }
        },
    {"name": "unsigned_decimal$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_decimal$ebnf$1", "symbols": ["unsigned_decimal$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", "symbols": ["unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1", "symbols": [{"literal":"."}, "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1"]},
    {"name": "unsigned_decimal$ebnf$2", "symbols": ["unsigned_decimal$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "unsigned_decimal$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "unsigned_decimal", "symbols": ["unsigned_decimal$ebnf$1", "unsigned_decimal$ebnf$2"], "postprocess": 
        function(d) {
            return parseFloat(
                d[0].join("") +
                (d[1] ? "."+d[1][1].join("") : "")
            );
        }
        },
    {"name": "decimal$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "decimal$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "decimal$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "decimal$ebnf$2", "symbols": ["decimal$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "decimal$ebnf$3$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "decimal$ebnf$3$subexpression$1$ebnf$1", "symbols": ["decimal$ebnf$3$subexpression$1$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "decimal$ebnf$3$subexpression$1", "symbols": [{"literal":"."}, "decimal$ebnf$3$subexpression$1$ebnf$1"]},
    {"name": "decimal$ebnf$3", "symbols": ["decimal$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "decimal$ebnf$3", "symbols": [], "postprocess": () => null},
    {"name": "decimal", "symbols": ["decimal$ebnf$1", "decimal$ebnf$2", "decimal$ebnf$3"], "postprocess": 
        function(d) {
            return parseFloat(
                (d[0] || "") +
                d[1].join("") +
                (d[2] ? "."+d[2][1].join("") : "")
            );
        }
        },
    {"name": "percentage", "symbols": ["decimal", {"literal":"%"}], "postprocess": 
        function(d) {
            return d[0]/100;
        }
        },
    {"name": "jsonfloat$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "jsonfloat$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "jsonfloat$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$2", "symbols": ["jsonfloat$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "jsonfloat$ebnf$3$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$3$subexpression$1$ebnf$1", "symbols": ["jsonfloat$ebnf$3$subexpression$1$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "jsonfloat$ebnf$3$subexpression$1", "symbols": [{"literal":"."}, "jsonfloat$ebnf$3$subexpression$1$ebnf$1"]},
    {"name": "jsonfloat$ebnf$3", "symbols": ["jsonfloat$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "jsonfloat$ebnf$3", "symbols": [], "postprocess": () => null},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "symbols": [/[+-]/], "postprocess": id},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$2", "symbols": ["jsonfloat$ebnf$4$subexpression$1$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "jsonfloat$ebnf$4$subexpression$1", "symbols": [/[eE]/, "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "jsonfloat$ebnf$4$subexpression$1$ebnf$2"]},
    {"name": "jsonfloat$ebnf$4", "symbols": ["jsonfloat$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "jsonfloat$ebnf$4", "symbols": [], "postprocess": () => null},
    {"name": "jsonfloat", "symbols": ["jsonfloat$ebnf$1", "jsonfloat$ebnf$2", "jsonfloat$ebnf$3", "jsonfloat$ebnf$4"], "postprocess": 
        function(d) {
            return parseFloat(
                (d[0] || "") +
                d[1].join("") +
                (d[2] ? "."+d[2][1].join("") : "") +
                (d[3] ? "e" + (d[3][1] || "+") + d[3][2].join("") : "")
            );
        }
        },
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "program", "symbols": ["stmts"], "postprocess": id},
    {"name": "stmts", "symbols": ["stmt"], "postprocess": d => [d[0]]},
    {"name": "stmts", "symbols": ["stmt", "_", {"literal":"\n"}, "_", "stmts"], "postprocess": 
        d => [
            d[0],
            ...d[4]
        ]
                },
    {"name": "stmts", "symbols": ["_", {"literal":"\n"}, "stmts"], "postprocess": d => d[2]},
    {"name": "stmts", "symbols": ["_"], "postprocess": d => []},
    {"name": "stmt", "symbols": ["select_stmt"], "postprocess": id},
    {"name": "stmt", "symbols": ["update_stmt"], "postprocess": id},
    {"name": "stmt", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)], "postprocess": 
        d => ({
            stmt: "comment"
        })
                },
    {"name": "identifier", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": id},
    {"name": "identifier", "symbols": [(lexer.has("special_suffix") ? {type: "special_suffix"} : special_suffix)], "postprocess": id},
    {"name": "identifier", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "literal", "symbols": [(lexer.has("nullptr_literal") ? {type: "nullptr_literal"} : nullptr_literal)], "postprocess": id},
    {"name": "literal", "symbols": [(lexer.has("boolean_literal_true") ? {type: "boolean_literal_true"} : boolean_literal_true)], "postprocess": id},
    {"name": "literal", "symbols": [(lexer.has("boolean_literal_false") ? {type: "boolean_literal_false"} : boolean_literal_false)], "postprocess": id},
    {"name": "literal", "symbols": [(lexer.has("string_literal") ? {type: "string_literal"} : string_literal)], "postprocess": idStringLiteral},
    {"name": "literal", "symbols": [(lexer.has("hexnum_literal") ? {type: "hexnum_literal"} : hexnum_literal)], "postprocess": id},
    {"name": "literal", "symbols": [(lexer.has("number_literal") ? {type: "number_literal"} : number_literal)], "postprocess": id},
    {"name": "literal", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": idStringLiteral},
    {"name": "literal", "symbols": ["object_key_literal"], "postprocess": id},
    {"name": "literal_update", "symbols": [(lexer.has("nullptr_literal") ? {type: "nullptr_literal"} : nullptr_literal)], "postprocess": id},
    {"name": "literal_update", "symbols": [(lexer.has("boolean_literal_true") ? {type: "boolean_literal_true"} : boolean_literal_true)], "postprocess": id},
    {"name": "literal_update", "symbols": [(lexer.has("boolean_literal_false") ? {type: "boolean_literal_false"} : boolean_literal_false)], "postprocess": id},
    {"name": "literal_update", "symbols": [(lexer.has("string_literal") ? {type: "string_literal"} : string_literal)], "postprocess": idStringLiteralUpdate},
    {"name": "literal_update", "symbols": [(lexer.has("hexnum_literal") ? {type: "hexnum_literal"} : hexnum_literal)], "postprocess": id},
    {"name": "literal_update", "symbols": [(lexer.has("number_literal") ? {type: "number_literal"} : number_literal)], "postprocess": id},
    {"name": "literal_update", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": idStringLiteralUpdate},
    {"name": "literal_update", "symbols": ["object_key_literal"], "postprocess": id},
    {"name": "object_key_literal", "symbols": [(lexer.has("hexnum_literal") ? {type: "hexnum_literal"} : hexnum_literal), {"literal":":"}, (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        d => ({
            type: "object_key_literal",
            value: `${d[0]}:${d[2]}`
        })
                },
    {"name": "expression", "symbols": ["expression_normal"], "postprocess": id},
    {"name": "expression", "symbols": ["object_keys"], "postprocess": 
        d => [{
            type: "object_keys",
            value: d[0]
        }]
                },
    {"name": "expression_normal", "symbols": ["identifier"], "postprocess": identifierId},
    {"name": "expression_normal", "symbols": ["expression_normal", "forward_operator", "identifier"], "postprocess": 
        d => [
            ...d[0],
            {
                opt: d[1],
                rhs: d[2].value
            }
        ]
                },
    {"name": "forward_operator", "symbols": [{"literal":"."}], "postprocess": id},
    {"name": "forward_operator", "symbols": [{"literal":"->"}], "postprocess": id},
    {"name": "object_keys", "symbols": ["object_key_literal"], "postprocess": d => [d[0]]},
    {"name": "object_keys", "symbols": ["object_key_literal", "_", {"literal":","}, "_", "object_keys"], "postprocess": 
        d => [
            d[0],
            ...d[4]
        ]
                },
    {"name": "set_expression", "symbols": ["set_cap"], "postprocess": id},
    {"name": "set_cap", "symbols": [{"literal":"("}, "set_cap", {"literal":")"}], "postprocess": id},
    {"name": "set_cap", "symbols": ["set_cup"], "postprocess": id},
    {"name": "set_cap", "symbols": ["set_cup", "__", {"literal":"^"}, "__", "set_cap"], "postprocess": 
        d => ({
            opt: d[2].type,
            lhs: d[0],
            rhs: d[4]
        })
                },
    {"name": "set_cup", "symbols": [{"literal":"("}, "set_cup", {"literal":")"}], "postprocess": id},
    {"name": "set_cup", "symbols": ["set_sub"], "postprocess": id},
    {"name": "set_cup", "symbols": ["set_sub", "__", {"literal":"|"}, "__", "set_cup"], "postprocess": 
        d => ({
            opt: d[2].type,
            lhs: d[0],
            rhs: d[4]
        })
                },
    {"name": "set_sub", "symbols": [{"literal":"("}, "set_sub", {"literal":")"}], "postprocess": id},
    {"name": "set_sub", "symbols": ["set_uni"], "postprocess": id},
    {"name": "set_sub", "symbols": ["set_uni", "__", {"literal":"\\"}, "__", "set_sub"], "postprocess": 
        d => ({
            opt: d[2].type,
            lhs: d[0],
            rhs: d[4]
        })
                },
    {"name": "set_uni", "symbols": ["identifier"], "postprocess": 
        d => d[0].value
                },
    {"name": "set_uni", "symbols": [{"literal":"REACHABLE"}, {"literal":"("}, "_", "identifier", "_", {"literal":")"}], "postprocess": 
        d => `REACHABLE(${d[3].value})`
                },
    {"name": "select_stmt", "symbols": ["identifier", "_", {"literal":"="}, "_", "select_def", "where_def"], "postprocess": 
        d => ({
            dstId: d[0],
            ...d[4],
            query: d[5]
        })
                },
    {"name": "select_def", "symbols": [{"literal":"SELECT"}, "__", "expression", "__", {"literal":"FROM"}, "__", "set_expression", "select_def_alias"], "postprocess": 
        d => ({
            stmt: "select",
            expr: getExpr(d[2]),
            srcId: d[6],
            srcAlias: d[7]
        })
                },
    {"name": "select_def_alias", "symbols": ["__", {"literal":"AS"}, "__", "identifier"], "postprocess": d => d[3]},
    {"name": "select_def_alias", "symbols": [], "postprocess": d => null},
    {"name": "where_def", "symbols": ["__", {"literal":"WHERE"}, "__", "query"], "postprocess": d => d[3]},
    {"name": "where_def", "symbols": [], "postprocess": d => null},
    {"name": "query", "symbols": ["query_and"], "postprocess": id},
    {"name": "query_and", "symbols": [{"literal":"("}, "query_and", {"literal":")"}], "postprocess": id},
    {"name": "query_and", "symbols": ["query_or"], "postprocess": id},
    {"name": "query_and", "symbols": ["query_or", "__", {"literal":"AND"}, "__", "query_and"], "postprocess": 
        d => ({
            opt: d[2].value,
            lhs: d[0],
            rhs: d[4]
        })
                },
    {"name": "query_or", "symbols": [{"literal":"("}, "query_or", {"literal":")"}], "postprocess": id},
    {"name": "query_or", "symbols": ["filter"], "postprocess": id},
    {"name": "query_or", "symbols": ["filter", "__", {"literal":"OR"}, "__", "query_or"], "postprocess": 
        d => ({
            opt: d[2].value,
            lhs: d[0],
            rhs: d[4]
        })
                },
    {"name": "filter", "symbols": ["expression"], "postprocess": id},
    {"name": "filter", "symbols": ["expression", "_", "comparison_operator", "_", "expression_or_literal"], "postprocess": 
        d => ({
            opt: d[2],
            lhs: getExpr(d[0]),
            rhs: d[4]
        })
                },
    {"name": "filter", "symbols": ["expression", "__", {"literal":"IN"}, "__", "expression"], "postprocess": 
        d => ({
            opt: d[2],
            lhs: getExpr(d[0]),
            rhs: getExpr(d[4])
        })
                },
    {"name": "expression_or_literal", "symbols": ["expression"], "postprocess": getExpr},
    {"name": "expression_or_literal", "symbols": ["literal"], "postprocess": 
        d => ({
            type:  d[0].type,
            value: d[0].value
        })
                },
    {"name": "comparison_operator", "symbols": [{"literal":">"}], "postprocess": id},
    {"name": "comparison_operator", "symbols": [{"literal":">="}], "postprocess": id},
    {"name": "comparison_operator", "symbols": [{"literal":"<"}], "postprocess": id},
    {"name": "comparison_operator", "symbols": [{"literal":"<="}], "postprocess": id},
    {"name": "comparison_operator", "symbols": [{"literal":"=="}], "postprocess": id},
    {"name": "comparison_operator", "symbols": [{"literal":"!="}], "postprocess": id},
    {"name": "update_stmt", "symbols": [{"literal":"UPDATE"}, "__", "set_expression", "__", {"literal":"WITH"}, "__", "update_attrs"], "postprocess": 
        d => ({
            stmt: "update",
            id: d[2],
            attrs: d[6]
        })
                },
    {"name": "update_attrs", "symbols": ["update_attr"], "postprocess": d => [d[0]]},
    {"name": "update_attrs", "symbols": ["update_attr", "_", {"literal":","}, "_", "update_attrs"], "postprocess": 
        d => [
            d[0],
            ...d[4]
        ]
                },
    {"name": "update_attr", "symbols": ["identifier", "_", {"literal":":"}, "_", "literal_update"], "postprocess": 
        d => ({
            attr:  d[0].value,
            value: d[4].value
        })
                },
    {"name": "wschar", "symbols": [/[\r]/], "postprocess": id}
  ],
  ParserStart: "program",
};

export default grammar;
