// diff extension

export type ShapeDiffInfo = {
    isDiffAdd?: boolean
}

export type MemberDiffInfo = {
    diffOldValue?: string
    diffOldTarget?: ShapeKey | null
    diffOldObject?: ShapeKey
}

// json type of diagrams received from the gdb stub

export type Snapshot = {
    key: string
    views: {[name: string]: StateView}
    pc: string
    timestamp: number
}

export type ShapeKey = string
export type AbstName = string
export type Label    = string

export type StateView = {
    name: string
    pool: Pool
    plot: ShapeKey[]
    init_attrs: ViewAttrs // TODO: clarify where are attrs attached to
    stat: number
}
export type Pool = {
    boxes: {[key: ShapeKey]: Box},
    containers: {[key: ShapeKey]: Container}
}
export type ViewAttrs = {
    [key: string]: NodeAttrs
}
export type NodeAttrs = {
    [attr: string]: string
}

export type Box = {
    key:    ShapeKey
    type:   string
    addr:   string
    label:  string
    absts:  {[name: AbstName]: Abst}
    parent: ShapeKey | null
} & ShapeDiffInfo

export type Abst = {
    parent: string | null
    members: {[label: Label]: Member}
}

export type Member = TextMember | LinkMember | BoxMember

export type TextMember = {
    class: 'text'
    type:  string
    size:  number
    value: string
} & MemberDiffInfo
export type LinkMember = {
    class:  'link'
    type:   'DIRECT' | 'REMOTE'
    target: ShapeKey | null
} & MemberDiffInfo
export type BoxMember = {
    class:  'box'
    object: ShapeKey
} & MemberDiffInfo

export type Container = {
    key:     ShapeKey
    type:    string
    addr:    string
    label:   string
    members: ContainerMember[]
    parent:  ShapeKey | null
} & ShapeDiffInfo

export type ContainerMember = {
    key:  ShapeKey | null
    links: {[label: Label]: LinkMember}
} & ShapeDiffInfo

export function isMemberText(member: Member): member is TextMember {
    return (member as TextMember).value !== undefined;
}
export function isMemberLink(member: Member): member is LinkMember {
    return (member as LinkMember).target !== undefined;
}
export function isMemberBox(member: Member): member is BoxMember {
    return (member as BoxMember).object !== undefined;
}

export function shouldCompress(box: Box): boolean {
    if (box.parent === null || Object.keys(box.absts).length > 1) {
        return false;
    }
    const abst = Object.values(box.absts)[0];
    const members = Object.values(abst.members);
    return members.length == 1 && members[0].class != 'box';
}

//

export function preprocess(snapshot: Snapshot) {
    console.log('preprocess', snapshot);
    preprocessVBoxAddr(snapshot);
    try {
        preprocessVBoxesForDiff(snapshot);
    } catch (e) {
        console.error('preprocess error', e);
    }
    console.log('preprocess OK', snapshot);
}

function preprocessVBoxAddr(snapshot: Snapshot) {
    // vboxes has fake negative addresses
    for (const view of Object.values(snapshot.views)) {
        for (const obj of [...Object.values(view.pool.boxes), ...Object.values(view.pool.containers)]) {
            if (obj.addr && obj.addr.startsWith('-')) {
                obj.addr = 'virtual';
            }
        }
    }
}

function preprocessVBoxesForDiff(snapshot: Snapshot) {
    for (const view of Object.values(snapshot.views)) {
        let changes: { oldKey: string, newKey: string, box: Box }[] = [];
        const keys = Object.keys(view.pool.boxes);
        for (const key of keys) {
            const box = view.pool.boxes[key];
            if (box.addr == 'virtual') {
                let newKey = genVBoxKeyFor(view, box);
                if (newKey == key) continue;
                for (let suffix = 1; newKey in view.pool.boxes || newKey in view.pool.containers; suffix ++) {
                    newKey = `${newKey.split('_')[0]}_${suffix}`;
                }
                console.log('reset vbox key', key, newKey);
                box.key = newKey;
                view.pool.boxes[newKey] = box;
                delete view.pool.boxes[key];
                // changes.push({ oldKey: key, newKey, box });
                resetVBoxKey(view, key, newKey);
            }
        }
        for (const { box, oldKey, newKey } of changes) {
            box.key = newKey;
            view.pool.boxes[newKey] = box;
            delete view.pool.boxes[oldKey];
            resetVBoxKey(view, oldKey, newKey);
        }
    }
}
function genVBoxKeyFor(view: StateView, box: Box) {
    const chain = [];
    let parent = box.parent;
    while (parent) {
        let oldparent = parent;
        chain.push(parent);
        if (parent in view.pool.boxes) {
            console.log('--box', view.pool.boxes[parent]);
            parent = view.pool.boxes[parent].parent;
        } else if (parent in view.pool.containers) {
            console.log('--cont', view.pool.containers[parent]);
            parent = view.pool.containers[parent].parent;
        } else {
            throw new Error(`preprocessVBoxesForDiff: object not found: ${parent}`);
        }
        if (oldparent == parent) {
            throw new Error(`preprocessVBoxesForDiff: circular reference: ${box.label}, parent:${parent}`);
        }
    }
    chain.reverse();
    if (box.label) chain.push(box.label);
    console.log('genVBoxKeyFor', box.label, chain.join('.'));
    return chain.join('.');
}
function resetVBoxKey(view: StateView, key: ShapeKey, newKey: ShapeKey) {
    console.log('resetVBoxKey', key, newKey);
    for (const box of Object.values(view.pool.boxes)) {
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
    for (const container of Object.values(view.pool.containers)) {
        for (const member of container.members) {
            if (member.key == key) {
                member.key = newKey;
            }
        }
    }
}
