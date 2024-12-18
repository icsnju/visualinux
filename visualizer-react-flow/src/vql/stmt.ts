/* examples:
all_tasks = SELECT task_struct FROM *
kthreads = SELECT *
    FROM all_tasks
    WHERE pid == 2 OR ppid == 2
UPDATE kthreads WITH shrinked: true
UPDATE all_tasks \\ kthreads WITH abst: show_threads

all_tasks = SELECT task_struct FROM *
kthreads = SELECT *
    FROM all_tasks
    WHERE pid == 2 OR ppid == 2
task_children_list = SELECT task_struct->children FROM all_tasks \\ kthreads
UPDATE task_children_list WITH direction: vertical

xboxes = SELECT * FROM * AS box WHERE box IN idr->idr_rt
pid_links = SELECT box->* FROM xboxes AS box
pid_links_needed = SELECT * FROM pid_links WHERE nr == 2 OR nr == 4
UPDATE pid_links \\ pid_links_needed WITH expanded: false
*/

export interface Stmt {
    getType: () => StmtType;
    toString: () => string;
}

export type Expression = {
    head: {
        type:  string,
        value: any
    },
    suffix: {
        rhs: string,
        opt: string
    }[]
}

export type SetOpt = {
    opt: string
    lhs: SetOpt | string
    rhs: SetOpt | string
}
export function isSetOpt(expr: SetOpt | string): expr is SetOpt {
    return (expr as SetOpt).opt !== undefined;
}

export class Select implements Stmt {
    dstId:     string
    expr:      Expression
    srcId:     string | SetOpt
    srcAlias:  string | null
    query:     QueryDesc | Filter | null
    chainFrom: Select | null
    constructor(dstId: string, expr: Expression, srcId: string | SetOpt, srcAlias: string | null, query: QueryDesc | Filter | null) {
        this.dstId     = dstId;
        this.expr      = expr;
        this.srcId     = srcId;
        this.srcAlias  = srcAlias;
        this.query     = query;
        this.chainFrom = null;
    }
    getType() { return StmtType.Select; }
    toString() {
        let expr = `(${this.expr.head.type}, ${this.expr.head.value})` + 
            this.expr.suffix.map(suffix => `${suffix.opt}${suffix.rhs}`).join('');
        let alias = this.srcAlias == null ? '' : `AS ${this.srcAlias}`;
        let where = '';
        if (this.query != null) {
            let query = this.query;
            where = `WHERE ${query}`;
        }
        return `${this.dstId} = SELECT ${expr} FROM ${this.srcId} ${alias} ${where}`;
    }
}
export type QueryDesc = {
    opt: string
    lhs: QueryDesc | Filter
    rhs: QueryDesc | Filter
}
export type Filter = {
    opt: {
        type:  string,
        value: string
    }
    lhs: Expression
    rhs: any
}

export class Update implements Stmt {
    id: string;
    attrs: Setter[];
    constructor(id: string, attrs: Setter[]) {
        this.id = id;
        this.attrs = attrs;
    }
    getType() { return StmtType.Update; }
    toString() {
        return `UPDATE ${this.id} WITH ${this.attrs}`;
    }
}
export type Setter = {
    attr:  string,
    value: string
}

export enum StmtType {
    Select, Update
}
export function isStmtSelect(stmt: Stmt): stmt is Select {
    return (stmt.getType() == StmtType.Select);
}
export function isStmtUpdate(stmt: Stmt): stmt is Update {
    return (stmt.getType() == StmtType.Update);
}
