import { Snapshot, StateView, Box, Abst, Member, LinkMember, Container, ContainerMember } from "./types";
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
        this.snSrc = JSON.parse(JSON.stringify(snSrc));
        this.snDst = JSON.parse(JSON.stringify(snDst));
        this.snRes = { key: key, views: {}, pc: '', timestamp: 0 };
        this.logs = [];
    }
    synthesize() {
        console.log('synthesize diff', this.snSrc, this.snDst);
        // synthesize diff for each view
        for (const [viewname, viewDst] of Object.entries(this.snDst.views)) {
            if (viewname in this.snSrc.views) {
                const viewSrc = this.snSrc.views[viewname];
                this.snRes.views[viewname] = this.calcStateViewDiff(viewname, viewSrc, viewDst);
            }
        }
        console.log('synthesize diff OK', this.snRes);
        return this.snRes;
    }
    private calcStateViewDiff(viewname: string, viewSrc: StateView, viewDst: StateView): StateView {
        const viewDiff: StateView = {
            name: viewname,
            pool: {
                boxes: {},
                containers: {},
            },
            plot: viewDst.plot,
            init_attrs: { ...viewSrc.init_attrs, ...viewDst.init_attrs },
            stat: 0,
        }
        // boxes
        for (const [key, boxDst] of Object.entries(viewDst.pool.boxes)) {
            if (key in viewSrc.pool.boxes) {
                const boxSrc = viewSrc.pool.boxes[key];
                viewDiff.pool.boxes[key] = this.calcBoxDiff(boxSrc, boxDst);
            } else {
                viewDiff.pool.boxes[key] = { ...boxDst, isDiffAdd: true };
            }
        }
        for (const [key, boxSrc] of Object.entries(viewSrc.pool.boxes)) {
            if (!(key in viewDst.pool.boxes)) {
                viewDiff.pool.boxes[key] = { ...boxSrc, isDiffAdd: false };
            }
        }
        // containers
        for (const [key, containerDst] of Object.entries(viewDst.pool.containers)) {
            if (key in viewSrc.pool.containers) {
                const containerSrc = viewSrc.pool.containers[key];
                viewDiff.pool.containers[key] = this.calcContainerDiff(containerSrc, containerDst);
            } else {
                viewDiff.pool.containers[key] = { ...containerDst, isDiffAdd: true };
            }
        }
        for (const [key, containerSrc] of Object.entries(viewSrc.pool.containers)) {
            if (!(key in viewDst.pool.containers)) {
                viewDiff.pool.containers[key] = { ...containerSrc, isDiffAdd: false };
            }
        }
        // return
        return viewDiff;
    }
    private calcBoxDiff(boxSrc: Box, boxDst: Box): Box {
        const boxDiff: Box = {
            key: boxDst.key,
            type: boxDst.type,
            addr: boxDst.addr,
            label: boxDst.label,
            absts: {},
            parent: boxDst.parent,
        };
        for (const [viewname, viewDst] of Object.entries(boxDst.absts)) {
            if (viewname in boxSrc.absts) {
                const viewSrc = boxSrc.absts[viewname];
                // since the kernel developer can change view definition,
                // it is more compatible to handle view inheritance here
                const membersSrc = this.handleViewInheritance(boxSrc, viewSrc);
                const membersDst = this.handleViewInheritance(boxDst, viewDst);
                const membersDiff = this.calcViewDiff(membersSrc, membersDst);
                boxDiff.absts[viewname] = { parent: null, members: membersDiff };
            } else {
                boxDiff.absts[viewname] = { parent: null, members: {} };
            }
        }
        return boxDiff;
    }
    private calcViewDiff(membersSrc: Abst['members'], membersDst: Abst['members']): Abst['members'] {
        const membersDiff: Abst['members'] = {};
        for (const [label, memberDst] of Object.entries(membersDst)) {
            if (label in membersSrc) {
                const memberSrc = membersSrc[label];
                membersDiff[label] = this.calcMemberDiff(memberSrc, memberDst);
            } else {
                membersDiff[label] = { ...memberDst };
            }
        }
        return membersDiff;
    }
    private calcMemberDiff(memberSrc: Member, memberDst: Member): Member {
        if (memberSrc.class === 'text' && (memberDst.class !== 'text' || memberSrc.value != memberDst.value)) {
            return { ...memberDst, diffOldValue: memberSrc.value };
        } else if (memberSrc.class === 'link' && (memberDst.class !== 'link' || memberSrc.target != memberDst.target)) {
            return { ...memberDst, diffOldTarget: memberSrc.target };
        } else if (memberSrc.class === 'box' && (memberDst.class !== 'box' || memberSrc.object != memberDst.object)) {
            return { ...memberDst, diffOldObject: memberSrc.object };
        }
        return { ...memberDst };
    }
    private handleViewInheritance(box: Box, abst: Abst): Abst['members'] {
        if (abst.parent === null) {
            return { ...abst.members };
        }
        const parentMembers = this.handleViewInheritance(box, box.absts[abst.parent]);
        return { ...parentMembers, ...abst.members };
    }
    private calcContainerDiff(containerSrc: Container, containerDst: Container): Container {
        const containerDiff: Container = {
            key: containerDst.key,
            addr: containerDst.addr,
            type: containerDst.type,
            label: containerDst.label,
            members: [],
            parent: containerDst.parent,
        };
        for (const memberDst of containerDst.members) {
            const memberSrc = containerSrc.members.find(m => m.key === memberDst.key);
            if (memberSrc) {
                const memberDiff: ContainerMember = {
                    key: memberDst.key,
                    links: {},
                };
                for (const [label, linkDst] of Object.entries(memberDst.links)) {
                    if (label in memberSrc.links) {
                        const linkSrc = memberSrc.links[label];
                        memberDiff.links[label] = this.calcMemberDiff(linkSrc, linkDst) as LinkMember;
                    } else {
                        this.log('warning', `container member ${memberDst.key} has link ${label} not found in source`);
                    }
                }
                containerDiff.members.push(memberDiff);
            } else {
                containerDiff.members.push({ ...memberDst, isDiffAdd: true });
            }
        }
        for (const memberSrc of containerSrc.members) {
            const memberDst = containerDst.members.find(m => m.key === memberSrc.key);
            if (!memberDst) {
                containerDiff.members.push({ ...memberSrc, isDiffAdd: false });
            }
        }
        return containerDiff;
    }

    private log(type: LogType, message: string) {
        addLogTo(this.logs, type, message);
    }
}
