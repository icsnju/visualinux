// json type of diagrams received from the gdb extension

export type Plot = {
    key: string
    timestamp: number
    views: {[name: string]: View}
}

export type ShapeKey = string
export type AbstName = string
export type Label    = string

// old version TODO modify API betw gdb and visualizer
// export type State = {
//     [name: string]: View
// }
export type View = {
    name: string
    pool: Pool
    plot: ShapeKey[]
    init_attrs: ViewAttrs
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
}

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
}
export type LinkMember = {
    class:  'link'
    type:   'DIRECT' | 'REMOTE'
    target: ShapeKey | null
}
export type BoxMember = {
    class:  'box'
    object: ShapeKey
}

export type Container = {
    key:  ShapeKey
    label: string
    members: ContainerMember[]
    parent: ShapeKey | null
}

export type ContainerMember = {
    key:  ShapeKey
    abst: AbstName | null
    links: {[label: Label]: ShapeKey}
}

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
    if (box.parent == null || Object.keys(box.absts).length > 1) {
        return false;
    }
    const abst = Object.values(box.absts)[0];
    const members = Object.values(abst.members);
    return members.length == 1 && members[0].class != 'box';
}
