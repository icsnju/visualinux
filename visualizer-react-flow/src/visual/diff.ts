import { Abst, Box, Snapshot, StateView } from "./types";
import { addLogTo, LogEntry, LogType } from "@app/utils";

export function calcSnapshotDiff(diffKey: string, snSrc: Snapshot, snDst: Snapshot): Snapshot {
    return new SnapshotDiffSynthesizer(diffKey, snSrc, snDst).synthesize();
}

class SnapshotDiffSynthesizer {
    key: string;
    snSrc: Snapshot;
    snDst: Snapshot;
    snRes: Snapshot;
    logs: LogEntry[];
    constructor(key: string, snSrc: Snapshot, snDst: Snapshot) {
        this.key = key;
        this.snSrc = snSrc;
        this.snDst = snDst;
        this.snRes = { key: key, views: {}, pc: '', timestamp: 0 };
        this.logs = [];
    }
    synthesize() {
        for (const [viewName, viewSrc] of Object.entries(this.snSrc.views)) {
            if (viewName in this.snDst.views) {
                const viewDst = this.snDst.views[viewName];
                this.snRes.views[viewName] = this.calcStateViewDiff(viewSrc, viewDst);
            }
        }
        return this.snRes;
    }
    private calcStateViewDiff(viewSrc: StateView, viewDst: StateView): StateView {
        if (viewSrc.name !== viewDst.name) {
            throw new Error(`calcStateViewDiff viewname mismatch: ${viewSrc.name} != ${viewDst.name}`);
        }
        const viewDiff: StateView = {
            name: viewSrc.name,
            pool: {
                boxes: {},
                containers: {},
            },
            plot: [],
            init_attrs: {},
            stat: 0,
        }
        for (const [key, boxSrc] of Object.entries(viewSrc.pool.boxes)) {
            if (key in viewDst.pool.boxes) {
                const boxDst = viewDst.pool.boxes[key];
                viewDiff.pool.boxes[key] = this.calcBoxDiff(boxSrc, boxDst);
            } else {
                ;
            }
        }
        return viewDiff;
    }
    private calcBoxDiff(boxSrc: Box, boxDst: Box): Box {
        const boxDiff: Box = {
            key: boxSrc.key,
            type: boxSrc.type,
            addr: boxSrc.addr,
            label: boxSrc.label,
            absts: {},
            parent: boxSrc.parent,
        };
        for (const [key, viewSrc] of Object.entries(boxSrc.absts)) {
            ;
        }
        return boxDiff;
    }
    private calcViewDiff(viewSrc: Abst, viewDst: Abst): Abst {
        const viewDiff: Abst = {
        };
        return viewDiff;
    }
    private log(type: LogType, message: string) {
        addLogTo(this.logs, type, message);
    }
}
