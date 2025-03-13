import { Snapshot, StateView, ShapeKey, Box, Abst, Container, getShapeFromPool, isShapeBox } from "@app/visual/types";

export function preprocess(snapshot: Snapshot) {
    console.log('preprocess', snapshot);
    for (const view of Object.values(snapshot.views)) {
        try {
            ViewPreprocessor.preprocess(view);
        } catch (e) {
            console.error('preprocess error on view', view.name, e);
        }
    }
    console.log('preprocess OK', snapshot);
}

class ViewPreprocessor {
    public static preprocess(view: StateView) {
        const converter = new ViewPreprocessor(view);
        return converter.preprocess();
    }
    private view: StateView;
    constructor(view: StateView) {
        this.view = view;
    }
    private preprocess() {
        this.resetVBoxAddr();
        this.resetVBoxKeyForDiff();
        this.compactContainer();
    }
    private resetVBoxAddr() {
        // vboxes has fake negative addresses
        for (const obj of [...Object.values(this.view.pool.boxes), ...Object.values(this.view.pool.containers)]) {
            if (obj.addr && obj.addr.startsWith('-')) {
                obj.addr = 'virtual';
            }
        }
    }
    private resetVBoxKeyForDiff() {
        const keys = Object.keys(this.view.pool.boxes);
        for (const key of keys) {
            const box = this.view.pool.boxes[key];
            if (box.addr == 'virtual') {
                let newKey = this.genVBoxKeyFor(box);
                if (newKey == key) continue;
                for (let suffix = 1; newKey in this.view.pool.boxes || newKey in this.view.pool.containers; suffix ++) {
                    newKey = `${newKey.split('_')[0]}_${suffix}`;
                }
                this.resetBoxKey(key, newKey);
            }
        }
    }
    private genVBoxKeyFor(box: Box) {
        const chain = [];
        let parent = box.parent;
        while (parent) {
            let oldparent = parent;
            chain.push(parent);
            if (parent in this.view.pool.boxes) {
                parent = this.view.pool.boxes[parent].parent;
            } else if (parent in this.view.pool.containers) {
                parent = this.view.pool.containers[parent].parent;
            } else {
                throw new Error(`preprocessVBoxesForDiff: object not found: ${parent}`);
            }
            if (oldparent == parent) {
                throw new Error(`preprocessVBoxesForDiff: circular reference: ${box.label}, parent:${parent}`);
            }
        }
        chain.reverse();
        if (box.label) chain.push(box.label);
        return chain.join('.');
    }
    private resetBoxKey(key: ShapeKey, newKey: ShapeKey) {
        let box = this.view.pool.boxes[key];
        box.key = newKey;
        this.view.pool.boxes[newKey] = box;
        delete this.view.pool.boxes[key];
        for (const box of Object.values(this.view.pool.boxes)) {
            for (const abst of Object.values(box.absts)) {
                for (const member of Object.values(abst.members)) {
                    if (member.class == 'link' && member.target == key) {
                        member.target = newKey;
                    } else if (member.class == 'box' && member.object == key) {
                        member.object = newKey;
                    }
                }
            }
        }
        for (const container of Object.values(this.view.pool.containers)) {
            for (const member of container.members) {
                if (member.key == key) {
                    member.key = newKey;
                }
            }
        }
    }
    private compactContainer() {
        for (const container of Object.values(this.view.pool.containers)) {
            if (this.shouldCompactContainer(container)) {
                this.doCompactContainer(container);
            }
        }
    }
    private shouldCompactContainer(container: Container) {
        return ['[Array]', '[XArray]'].includes(container.type);
    }
    private doCompactContainer(container: Container) {
        let compactedMembers: Abst['members'] = {};
        for (const [index, member] of container.members.entries()) {
            if (member.key === null) {
                continue;
            }
            const shape = getShapeFromPool(this.view.pool, member.key);
            if (isShapeBox(shape) && shape.addr == 'virtual' && Object.keys(shape.absts).length == 1) {
                const memberMembers = Object.entries(shape.absts['default'].members);
                if (memberMembers.length == 1 && shape.label == memberMembers[0][0]) {
                    // compact
                    const setLabelAlias = (label: string) => {
                        if (label in compactedMembers) {
                            const existedMember = compactedMembers[label];
                            compactedMembers[`${label} #${index - 1}`] = existedMember;
                            delete compactedMembers[label];
                            return `${label} #${index}`;
                        }
                        return label;
                    }
                    const memberKey = setLabelAlias(memberMembers[0][0]);
                    compactedMembers[memberKey] = memberMembers[0][1];
                } else {
                    // no compact
                    compactedMembers[member.key] = {
                        class: 'box',
                        object: member.key,
                    };
                }
            } else {
                // no compact
                compactedMembers[member.key] = {
                    class: 'box',
                    object: member.key,
                };
            }
        }
        const compacted: Box = {
            key: container.key,
            type: container.type, addr: container.addr, label: container.label, 
            parent: container.parent,
            absts: {
                default: {
                    members: compactedMembers,
                    parent: null
                }
            },
            isDiffAdd: container.isDiffAdd,
        }
        delete this.view.pool.containers[container.key];
        this.view.pool.boxes[compacted.key] = compacted;
    }
}
