import { View, SubView } from "@app/visual/type";
import { ViewDB } from "@app/vql/viewdb";
import * as vql from '@app/vql/stmt';
import { parseVQL } from "@app/vql/parser";

// export interface ViewStorage {
//     id: number;
//     data: View;
//     getSubviewStorage(subview: SubView): ViewDB;
//     getAttrs(subview: SubView, key: string): {[attr: string]: any};
//     getMemberAttrs(subview: SubView, boxKey: string, label: string): {[attr: string]: any};
//     evaluate(program: string): vql.Stmt[];
//     applyTo(stmts: vql.Stmt[], subview: SubView);
// }

export class ViewStorage {
    id: number
    data: View
    dbSet: {[id: string]: ViewDB}
    constructor(id: number, viewData: View) {
        this.id = id;
        this.data = viewData;
        this.dbSet = {};
        for (let name in viewData) {
            this.initSubview(viewData[name]);
        }
    }
    initSubview(subview: SubView) {
        const dbId = calcDBId(this.id, subview.name);
        if (dbId in this.dbSet) {
            console.log(`ERROR: ${subview.name} is already in ViewDB #${this.id}`, this.dbSet);
        }
        let db = new ViewDB(dbId);
        const pool = subview.pool;
        for (let box of Object.values(pool.boxes)) {
            db.addBox(box);
        }
        for (let container of Object.values(pool.containers)) {
            db.addContainer(container);
        }
        this.dbSet[dbId] = db;
        if (subview.init_vql.length > 0) {
            this.applyVql(subview.name, subview.init_vql);
        }
    }
    getSubviewStorage(subviewName: string): ViewDB {
        const dbId = calcDBId(this.id, subviewName);
        if (!(dbId in this.dbSet)) {
            console.log(`ERROR: ${subviewName} not found in ViewDB #${this.id}`, this.dbSet);
        }
        return this.dbSet[dbId];
    }
    getAttrs(subviewName: string, key: string): {[attr: string]: any} {
        return this.getSubviewStorage(subviewName).getAttrsOf(key);
    }
    getMemberAttrs(subviewName: string, boxKey: string, label: string): {[attr: string]: any} {
        return this.getSubviewStorage(subviewName).getMemberAttrsOf(boxKey, label);
    }
    applyVql(subviewName: string, vqlCode: string) {
        try {
            let stmts = parseVQL(vqlCode);
            return this.getSubviewStorage(subviewName).apply(stmts);
        } catch (e) {
            console.error('ERROR: Failed to parse VQL:', vqlCode);
            console.error(e);
        }
    }
}

function calcDBId(viewId: number, subviewName: string) {
    return `[${viewId}]${subviewName}`;
}
