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

export class StateView {
    public name: string
    public pool: Pool
    public plot: ShapeKey[]
    public init_attrs: ViewAttrs // TODO: clarify where are attrs attached to
    public stat: number
    constructor(name: string, pool: Pool, plot: ShapeKey[], init_attrs: ViewAttrs, stat: number) {
        this.name = name;
        this.pool = pool;
        this.plot = plot;
        this.init_attrs = init_attrs;
        this.stat = stat;
    }
    //
    // getters
    //
    hasBox(key: string): boolean {
        return (key in this.pool.boxes);
    }
    hasContainer(key: string): boolean {
        return (key in this.pool.containers);
    }
    hasShape(key: string): boolean {
        return this.hasBox(key) || this.hasContainer(key);
    }
    getBox(key: string): Box {
        const box = this.pool.boxes[key];
        if (box === undefined) {
            throw new Error(`getBox(${key}): not found`);
        }
        return box;
    }
    getContainer(key: string): Container {
        const container = this.pool.containers[key];
        if (container === undefined) {
            throw new Error(`getContainer(${key}): not found`);
        }
        return container;
    }
    getShape(key: string): Box | Container {
        if (key in this.pool.boxes) {
            return this.pool.boxes[key];
        } else if (key in this.pool.containers) {
            return this.pool.containers[key];
        }
        throw new Error(`getShape(${key}): not found`);
    }
    //
    // iterators
    //
    forEachBox(callback: (box: Box) => void): void {
        for (const key of Object.keys(this.pool.boxes)) {
            callback(this.getBox(key));
        }
    }
    forEachBoxKey(callback: (key: string) => void): void {
        for (const key of Object.keys(this.pool.boxes)) {
            callback(key);
        }
    }
    forEachContainer(callback: (container: Container) => void): void {
        for (const key of Object.keys(this.pool.containers)) {
            callback(this.getContainer(key));
        }
    }
    forEachContainerKey(callback: (key: string) => void): void {
        for (const key of Object.keys(this.pool.containers)) {
            callback(key);
        }
    }
    forEachShape(callback: (shape: Box | Container) => void): void {
        this.forEachBox(callback);
        this.forEachContainer(callback);
    }
    forEachShapeKey(callback: (key: string) => void): void {
        this.forEachBoxKey(callback);
        this.forEachContainerKey(callback);
    }
    forEachPlotKey(callback: (key: string) => void): void {
        for (const key of this.plot) {
            callback(key);
        }
    }
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

export function isShapeBox(shape: Box | Container): shape is Box {
    return (shape as Box).absts !== undefined;
}
// export function isMemberText(member: Member): member is TextMember {
//     return (member as TextMember).value !== undefined;
// }
// export function isMemberLink(member: Member): member is LinkMember {
//     return (member as LinkMember).target !== undefined;
// }
// export function isMemberBox(member: Member): member is BoxMember {
//     return (member as BoxMember).object !== undefined;
// }

// export function getShapeFromPool(pool: Pool, key: string): Box | Container {
//     if (key in pool.boxes) {
//         return pool.boxes[key];
//     } else if (key in pool.containers) {
//         return pool.containers[key];
//     }
//     throw new Error(`getShapeFromPool: shape not found: ${key}`);
// }
