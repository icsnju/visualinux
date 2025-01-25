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
    key:  ShapeKey
    label: string
    members: ContainerMember[]
    parent: ShapeKey | null
} & ShapeDiffInfo

export type ContainerMember = {
    key:  ShapeKey
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
