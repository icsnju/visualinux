export type ShapeKey = string
export type AbstName = string
export type Label    = string

export type View = {
    [name: string]: SubView
}
export type SubView = {
    name: string,
    pool: Pool,
    plot: ShapeKey[],
    init_vql: string,
    stat: number
}
export type Pool = {
    boxes: {[key: ShapeKey]: Box},
    containers: {[key: ShapeKey]: Container | ContainerConv}
}

export type Box = {
    key:   ShapeKey,
    type:  string,
    size:  number,
    addr:  string,
    label: string,
    absts: {[name: AbstName]: Abst},
}
export type Abst = {
    parent: string | null,
    members: {[label: Label]: Member},
    distilled: boolean
}

export type Member = TextMember | LinkMember | BoxMember

export type TextMember = {
    class: 'text',
    type:  string,
    size:  number,
    value: string
}
export type LinkMember = {
    class:  'link',
    type:   string,
    target: ShapeKey | null,
    abst:   AbstName | null
}
export type BoxMember = {
    class:  'box',
    object: ShapeKey,
    abst:   AbstName | null
}

export type Container = {
    key:  ShapeKey,
    label: string,
    members: ContainerMember[],
    style: {[name: string]: string}
    parent: ShapeKey | null,
    depth?: number
}
export type ContainerConv = {
    source: ShapeKey,
    key:  ShapeKey,
    members: ContainerMember[],
    parent: ShapeKey | null,
    depth?: number
}

export type ContainerMember = {
    key:  ShapeKey,
    abst: AbstName | null,
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

export function isContainerConv(container: Container | ContainerConv): container is ContainerConv {
    return (container as ContainerConv).source !== undefined;
}
