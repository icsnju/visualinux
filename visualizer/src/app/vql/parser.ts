import * as nearley from "nearley";
import grammar from "@app/vql/grammar";
const neGrammar = nearley.Grammar.fromCompiled(grammar);

import * as vql from "@app/vql/stmt";

export function parseVQL(program: string): vql.Stmt[] {
    let lines = program.split('\n');
    program = '';
    for (let line of lines) {
        program += line.replace(/^\s+/, '') + '\n';
    }
    const neParser = new nearley.Parser(neGrammar, { keepHistory: true });
    neParser.feed(program);
    if (neParser.results.length > 1) {
        console.log('warning: ambiguous grammar');
        console.log(neParser.results);
    }
    let parseResult = neParser.results[0];
    console.log(parseResult);
    let stmts: vql.Stmt[] = [];
    for (let data of parseResult) {
        console.log(data);
        if (data.stmt == 'select') {
            let stmt = new vql.Select(data.dstId.value, data.expr, data.srcId, data.srcAlias?.value, data.query);
            stmts.push(stmt);
        } else if (data.stmt == 'update') {
            let stmt = new vql.Update(data.id, data.attrs);
            stmts.push(stmt);
        } else if (data.stmt == 'comment') {
            continue;
        } else {
            console.log('unknown stmt', data);
        }
    }
    console.log('parse vql OK', stmts.toString());
    return stmts;
}
