# nearleyc src/app/vql/grammar.ne -o src/app/vql/grammar.ts

@preprocessor typescript

@{%
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
%}

# imports
# https://github.com/kach/nearley/tree/master/builtin

@builtin "string.ne"
@builtin "number.ne"
@builtin "whitespace.ne"

@lexer lexer

# program entry

program -> stmts {% id %}

stmts
    -> stmt {% d => [d[0]] %}
     | stmt _ "\n" _ stmts
        {%
            d => [
                d[0],
                ...d[4]
            ]
        %}
    # below 2 sub-rules handle blank lines
     | _ "\n" stmts {% d => d[2] %}
     | _ {% d => [] %}

stmt -> select_stmt {% id %}
      | update_stmt {% id %}
      | %comment
        {%
            d => ({
                stmt: "comment"
            })
        %}

# primitives

identifier
    -> %identifier {% id %}
     | %special_suffix {% id %}
     | "*" {% id %}

literal
    -> %nullptr_literal {% id %}
     | %boolean_literal_true {% id %}
     | %boolean_literal_false {% id %}
     | %string_literal {% idStringLiteral %}
     | %hexnum_literal {% id %}
     | %number_literal {% id %}
     | %identifier {% idStringLiteral %}
     | object_key_literal {% id %}

literal_update
    -> %nullptr_literal {% id %}
     | %boolean_literal_true {% id %}
     | %boolean_literal_false {% id %}
     | %string_literal {% idStringLiteralUpdate %}
     | %hexnum_literal {% id %}
     | %number_literal {% id %}
     | %identifier {% idStringLiteralUpdate %}
     | object_key_literal {% id %}

object_key_literal
    -> %hexnum_literal ":" %identifier
        {%
            d => ({
                type: "object_key_literal",
                value: `${d[0]}:${d[2]}`
            })
        %}

# expression

expression
    -> expression_normal {% id %}
     | object_keys
        {%
            d => [{
                type: "object_keys",
                value: d[0]
            }]
        %}

expression_normal
    -> identifier {% identifierId %}
     | expression_normal forward_operator identifier
        {%
            d => [
                ...d[0],
                {
                    opt: d[1],
                    rhs: d[2].value
                }
            ]
        %}

forward_operator
    -> "."  {% id %}
     | "->" {% id %}

object_keys
    -> object_key_literal {% d => [d[0]] %}
     | object_key_literal _ "," _ object_keys
        {%
            d => [
                d[0],
                ...d[4]
            ]
        %}

# set expression

set_expression
    -> set_cap {% id %}

set_cap
    -> "(" set_cap ")" {% id %}
     | set_cup {% id %}
     | set_cup __ "^" __ set_cap
        {%
            d => ({
                opt: d[2].type,
                lhs: d[0],
                rhs: d[4]
            })
        %}

set_cup
    -> "(" set_cup ")" {% id %}
     | set_sub {% id %}
     | set_sub __ "|" __ set_cup
        {%
            d => ({
                opt: d[2].type,
                lhs: d[0],
                rhs: d[4]
            })
        %}

set_sub
    -> "(" set_sub ")" {% id %}
     | set_uni {% id %}
     | set_uni __ "\\" __ set_sub
        {%
            d => ({
                opt: d[2].type,
                lhs: d[0],
                rhs: d[4]
            })
        %}

set_uni
    -> identifier
        {%
            d => d[0].value
        %}
     | "REACHABLE" "(" _ identifier _ ")"
        {%
            d => `REACHABLE(${d[3].value})`
        %}

# SELECT

select_stmt
    -> identifier _ "=" _ select_def where_def
        {%
            d => ({
                dstId: d[0],
                ...d[4],
                query: d[5]
            })
        %}

select_def
    -> "SELECT" __ expression __ "FROM" __ set_expression select_def_alias
        {%
            d => ({
                stmt: "select",
                expr: getExpr(d[2]),
                srcId: d[6],
                srcAlias: d[7]
            })
        %}

select_def_alias
    -> __ "AS" __ identifier {% d => d[3] %}
     | null {% d => null %}

where_def
    -> __ "WHERE" __ query {% d => d[3] %}
     | null {% d => null %}

query
    -> query_and {% id %}

query_and
    -> "(" query_and ")" {% id %}
     | query_or {% id %}
     | query_or __ "AND" __ query_and
        {%
            d => ({
                opt: d[2].value,
                lhs: d[0],
                rhs: d[4]
            })
        %}

query_or
    -> "(" query_or ")" {% id %}
     | filter {% id %}
     | filter __ "OR" __ query_or
        {%
            d => ({
                opt: d[2].value,
                lhs: d[0],
                rhs: d[4]
            })
        %}

filter
    -> expression {% id %}
     | expression _ comparison_operator _ expression_or_literal
        {%
            d => ({
                opt: d[2],
                lhs: getExpr(d[0]),
                rhs: d[4]
            })
        %}
     | expression __ "IN" __ expression
        {%
            d => ({
                opt: d[2],
                lhs: getExpr(d[0]),
                rhs: getExpr(d[4])
            })
        %}

expression_or_literal
    -> expression {% getExpr %}
     | literal
        {%
            d => ({
                type:  d[0].type,
                value: d[0].value
            })
        %}

comparison_operator
    -> ">"   {% id %}
     | ">="  {% id %}
     | "<"   {% id %}
     | "<="  {% id %}
     | "=="  {% id %}
     | "!="  {% id %}

# ref: https://github.com/kach/nearley/blob/master/examples/fun-lang.ne

# UPDATE

update_stmt
    -> "UPDATE" __ set_expression __ "WITH" __ update_attrs
        {%
            d => ({
                stmt: "update",
                id: d[2],
                attrs: d[6]
            })
        %}

update_attrs
    -> update_attr {% d => [d[0]] %}
     | update_attr _ "," _ update_attrs
        {%
            d => [
                d[0],
                ...d[4]
            ]
        %}

update_attr
    -> identifier _ ":" _ literal_update
        {%
            d => ({
                attr:  d[0].value,
                value: d[4].value
            })
        %}

# fuck the CRLF

wschar -> [\r] {% id %}
