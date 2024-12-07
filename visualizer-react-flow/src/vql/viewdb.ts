import * as vql from '@app/vql/stmt';
import { Box, Container, ContainerConv } from "@app/visual/type";
import { isMemberText, isMemberLink, isMemberBox } from "@app/visual/type";

import loki from "lokijs";

type Scope = {[identifier: string]: Resultset<any>};

export class ViewDB {
    db: loki
    objects: loki.Collection
    fields: loki.Collection
    constructor(id: string) {
        this.db = new loki(id, { persistenceMethod: 'memory', adapter: new loki.LokiMemoryAdapter() });
        this.objects = this.db.addCollection('objects');
        this.fields = this.db.addCollection('fields');
    }
    addBox(box: Box) {
        // let collection = this.db.getCollection(box.type);
        // if (collection == null) {
        //     collection = this.db.addCollection(box.type);
        // }
        let data: any = {
            "$key":    box.key,
            "$addr":   box.addr,
            "$type":   box.type,
            "$parent": box.parent,
            "$members":   [],
            "$reachable": [],
            "$attrs": {
                "abst": 'default' // TODO: create another file as default templates of box/container/field
            }
        };
        for (let abst of Object.values(box.absts)) {
            for (let label in abst.members) {
                const member = abst.members[label];
                if (isMemberText(member)) {
                    data[label] = member.value;
                } else if (isMemberLink(member)) {
                    data[label] = member.target;
                    if (member.target) (data["$reachable"] as string[]).push(member.target);
                } else if (isMemberBox(member)) {
                    data[label] = member.object;
                    (data["$reachable"] as string[]).push(member.object);
                } else {
                    console.log('ViewDB.addBox unknown member', member);
                }
                const memberKey = `${data['$key']}.${label}`;
                (data["$members"] as string[]).push(memberKey);
                this.fields.insert({
                    '$key': memberKey,
                    "$class": member.class,
                    "$value": data[label],
                    "$attrs": {
                        "visible": true
                    }
                });
            }
        }
        this.objects.insert(data);
    }
    addContainer(container: Container | ContainerConv) {
        let data: any = {
            "$key":     container.key,
            "$addr":    container.key.split(':')[0],
            "$type":    container.key.split(':')[1],
            "$parent":  container.parent,
            "$members": container.members.map(data => data.key),
            "$attrs": {
                "direction": "horizontal"
            }
        };
        data["$reachable"] = data["$members"];
        this.objects.insert(data);
    }
    getAttrsOf(key: string) {
        let data = this.objects.findOne({
            '$key': { '$eq': key }
        });
        return data['$attrs'];
    }
    getMemberAttrsOf(boxKey: string, label: string) {
        let key = `${boxKey}.${label}`;
        let data = this.fields.findOne({
            '$key': { '$eq': key }
        });
        return data['$attrs'];
    }
    apply(stmts: vql.Stmt[]) {
        // console.log('start apply vql', stmts.toString());
        // console.log('this.objects', this.objects.data);
        // console.log('this.fields', this.fields.data);
        let scope: Scope = {};
        for (let stmt of stmts) {
            // console.log('apply', stmt.toString());
            if (vql.isStmtSelect(stmt)) {
                this.intpSelect(stmt, scope);
            } else if (vql.isStmtUpdate(stmt)) {
                this.intpUpdate(stmt, scope); 
            } else {
                console.log('ERROR: unknown stmt:', stmt);
            }
        }
        // console.log('apply vql OK');
    }
    private intpSelect(stmt: vql.Select, scope: Scope) {
        let source = this.intpSetOpt(stmt.srcId, scope).copy();
        // console.log('intpSelect', stmt, 'from', source.data({removeMeta: true}));
        let results = this.intpExpr(stmt.expr, source);
        // console.log('  src;', exprToString(stmt.expr), results.data({removeMeta: true}));
        if (stmt.query != null) {
            if (results.collection == this.objects) {
                let query = this.transformQueryDesc(stmt.query, stmt.srcAlias, false, scope);
                // console.log('intpSelect query:', query);
                results = results.find(query);
            } else {
                let query = this.transformQueryDesc(stmt.query, stmt.srcAlias, true, scope);
                // console.log('intpSelect where:', query);
                let fn = (data: any) => {
                    if (data['$class'] != 'link') return false;
                    let targetData = this.objects.chain().find({
                        '$key': { '$eq': data['$value'] }
                    }).data({ removeMeta: true })[0];
                    return eval(query);
                };
                // console.log('intpSelect where fn:', fn);
                results = results.where(fn);
            }
        }
        scope[stmt.dstId] = results;
        // console.log(' => ', results.data({removeMeta: true}));
    }
    private intpUpdate(stmt: vql.Update, scope: Scope) {
        // console.log('intpUpdate', stmt);
        let target = this.intpSetOpt(stmt.id, scope);
        // console.log('intpUpdate', target);
        if (target === undefined) {
            return;
        }
        target.update((object) => {
            for (let setter of Object.values(stmt.attrs)) {
                let attr  = setter.attr;
                let value = setter.value;
                if (object['$class'] == 'box') {
                    let box = this.objects.findOne({
                        '$key': { '$eq': object['$value'] }
                    });
                    // console.log(`eval: box['$attrs']['${attr}'] = ${value};`);
                    eval(`box['$attrs']['${attr}'] = ${value};`);
                } else {
                    // console.log(`eval: object['$attrs']['${attr}'] = ${value};`);
                    eval(`object['$attrs']['${attr}'] = ${value};`);
                }
            }
        });
        // console.log(' => ', target.data({removeMeta: true}));
    }
    private intpExpr(expr: vql.Expression, source: Resultset<any>): Resultset<any> {
        if (expr.head.value == '*') {
            return source;
        }
        if (expr.head.type == 'object_keys') {
            let query = {
                '$key': { '$in': expr.head.value.map((x: any) => x.value) }
            };
            let results = this.objects.chain().find(query);
            return results;
        }
        let results = source.find({
            '$type': { '$eq': expr.head.value }
        });
        // console.log('intpExpr', expr.head.value, results.data({ removeMeta: true }));
        for (let pr of expr.suffix) {
            let query;
            if (pr.opt == '.') {
                if (isSpecialSuffix(pr.rhs)) {
                    query = {
                        '$and': [{
                            '$key': { '$in': results.data().reduce((members, obj) => members.concat(obj['$members']), []) }
                        }, {
                            '$class': { '$eq': evalSpecialSuffix(pr.rhs) }
                        }]
                    };
                } else {
                    query = {
                        '$key': { '$in': results.data().map(x => `${x['$key']}.${pr.rhs}`) }
                    };
                }
                results = this.fields.chain().find(query);
            } else {
                if (isSpecialSuffix(pr.rhs)) {
                    query = {
                        '$key': { '$in': results.data().reduce((members, obj) => members.concat(obj['$members']), []) }
                    };
                } else {
                    query = {
                        '$key': { '$in': results.data().map(data => data[pr.rhs]) }
                    };
                }
                results = this.objects.chain().find(query);
            }
            // console.log('query:', query);
            // console.log(`intpExpr ${pr.opt}${pr.rhs}: `, results.data({ removeMeta: true }));
        }
        return results;
    }
    private intpSetOpt(expr: vql.SetOpt | string, scope: Scope): Resultset<any> {
        if (!vql.isSetOpt(expr)) {
            if (expr == '*') return this.objects.chain();
            // console.log('???', expr);
            let match = expr.match(/REACHABLE\(\s*(\w+)\s*\)/);
            if (match) {
                // console.log('setopt reachable', match[1], scope[match[1]].data({ removeMeta: true }));
                return this.calcReachable(scope[match[1]]);
            }
            return scope[expr];
        }
        let lhs = this.intpSetOpt(expr.lhs, scope);
        let rhs = this.intpSetOpt(expr.rhs, scope);
        // console.log('intpSetOpt', expr.opt, lhs.filteredrows, rhs.filteredrows);
        let res = lhs.copy();
        res.filteredrows = evalSetOpt(expr.opt, lhs.filteredrows, rhs.filteredrows);
        // console.log('=>', res.filteredrows, res);
        return res;
    }
    private transformQueryDesc(data: vql.QueryDesc | vql.Filter | null, alias: string | null, 
            useWhere: boolean, scope: Scope) {
        if (data == null) {
            return data;
        }
        if (isFilter(data)) {
            return this.transformFilter(data, alias, useWhere, scope);
        }
        // console.log('transformQueryDesc', data, useWhere);
        // recursion
        let queryLeft:  any = this.transformQueryDesc(data.lhs, alias, useWhere, scope);
        let queryRight: any = this.transformQueryDesc(data.rhs, alias, useWhere, scope);
        // construction
        let query: any;
        if (useWhere) {
            let symOpt = {'AND': '&&', 'OR': '||'}[data.opt] as string;
            query = `(${queryLeft}) ${symOpt} (${queryRight})`;
        } else {
            let symOpt = '$' + data.opt.toLowerCase();
            query = {};
            query[symOpt] = [queryLeft, queryRight];
        }
        // return
        return query;
    }
    private transformFilter(data: vql.Filter, alias: string | null,
            useWhere: boolean, scope: Scope) {
        // console.log('transformFilter', data);
        if (useWhere) {
            return `targetData['${data.lhs.head.value}'] ${data.opt.value} ${data.rhs.value}`;
        }
        let comparator: any = {};
        if (data.lhs.suffix.length > 0) {
            throw Error(`filter should have no suffixes, but ${data.lhs.head}`);
        }
        if (data.opt.type == 'IN') {
            comparator['$in'] = scope[data.rhs.head.value].data().reduce(
                (members: any[], obj) => members.concat(obj["$key"]),
            []);
        } else {
            let value: string | null;
            if (data.rhs.type == 'nullptr_literal') {
                value = null;
            } else {
                value = data.rhs.value.toString();
            }
            comparator['$' + data.opt.type] = value;
        }
        let filter: any = {};
        if (data.lhs.head.value == alias) {
            filter['$addr'] = comparator;
        } else {
            filter[data.lhs.head.value] = comparator;
        }
        return filter;
    }
    private calcReachable(set: Resultset<any>): Resultset<any> {
        // console.log('calcReachable', set.data({ removeMeta: true }));
        let result = set;
        while (true) {
            let query = {
                '$key': { '$in': result.data().reduce((members: any[], obj) => members.concat(obj["$key"], obj["$reachable"]), []) }
            };
            let next = this.objects.chain().find(query);
            // console.log('calcReachable, ', next.data({ removeMeta: true }));
            // console.log('calcReachable? ', next.data().length, result.data().length);
            if (next.data().length == result.data().length) {
                break;
            }
            result = next;
        }
        // console.log('calcReachable =>', result.data({ removeMeta: true }));
        return result;
    }
    private getUnusedTempId(scope: Scope): string {
        let i = 0;
        while (true) {
            let tempId = `$${i}^`;
            if (!(tempId in scope)) return tempId;
            i ++;
        }
    }
}

function exprToString(expr: vql.Expression) {
    let ss: string = expr.head.value.toString();
    for (let pr of expr.suffix) {
        ss += pr.opt + pr.rhs;
    }
    return ss;
}

function evalSetOpt(opt: string, lhs: number[], rhs: number[]): number[] {
    switch (opt) {
    case 'cap': return [...lhs].filter(x => (new Set(rhs)).has(x));
    case 'cup': return Array.from(new Set([...lhs, ...rhs]));
    case 'sub': return [...lhs].filter(x => !(new Set(rhs)).has(x));
    default:
        console.log('intpSetOpt error:', opt);
        return [];
    }
}

function isSpecialSuffix(rhs: string) {
    return ["[Text]", "[Link]", "[Box]"].includes(rhs);
}
function evalSpecialSuffix(rhs: string) {
    return rhs.slice(1, -1).toLowerCase();
}

function isFilter(data: vql.QueryDesc | vql.Filter): data is vql.Filter {
    // console.log('isFilter?', data, data.opt);
    return !["AND", "OR"].includes((data as vql.QueryDesc).opt);
}