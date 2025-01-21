import { calcSnapshotDiff } from "@app/visual/diff";
import { Snapshot } from "@app/visual/types";

export default class Snapshots {
    data: Snapshot[]
    dataIndex: Map<string, number>
    currIndex: number
    constructor(data: Snapshot[] = [], currIndex: number = -1) {
        this.data = data;
        this.dataIndex = new Map();
        this.currIndex = currIndex;
    }
    //
    // context APIs
    //
    new(snKey: string, snapshot: Snapshot) {
        let orderedViews = Object.keys(snapshot.views).sort().reduce((obj: any, key) => { 
            obj[key] = snapshot.views[key]; 
            return obj;
        }, {});
        snapshot.views = orderedViews;
        this.data.push(snapshot);
        this.dataIndex.set(snKey, this.data.length - 1);
        this.currIndex = this.data.length - 1;
    }
    diff(snKeySrc: string, snKeyDst: string) {
        const diffKey = `diff-${snKeySrc}-${snKeyDst}`;
        if (this.has(diffKey)) {
            return this.get(diffKey);
        }
        const snSrc = this.get(snKeySrc);
        const snDst = this.get(snKeyDst);
        if (snSrc == null) return snDst;
        if (snDst == null) return snSrc;
        const snDiff = calcSnapshotDiff(diffKey, snSrc, snDst);
        this.new(diffKey, snDiff);
    }
    //
    //
    //
    getView(viewname: string | undefined) {
        if (viewname === undefined) {
            return null;
        }
        const plot = this.getCurrent();
        if (plot === null) {
            return null;
        }
        return plot.views[viewname];
    }
    getViewnameList(): string[] {
        const plot = this.getCurrent();
        if (plot === null) {
            return [];
        }
        return Object.keys(plot.views);
    }
    //
    // utilities
    //
    isEmpty() {
        return this.data.length === 0 || this.currIndex === -1;
    }
    has(snKey: string) {
        return this.dataIndex.has(snKey);
    }
    get(snKey: string) {
        const index = this.dataIndex.get(snKey);
        if (index === undefined) {
            return null;
        }
        return this.data[index];
    }
    getCurrent() {
        if (this.isEmpty()) {
            return null;
        }
        return this.data[this.currIndex];
    }
    use(snKey: string) {
        const index = this.dataIndex.get(snKey);
        if (index === undefined) {
            this.currIndex = -1;
            return;
        }
        this.currIndex = index;
    }
}
