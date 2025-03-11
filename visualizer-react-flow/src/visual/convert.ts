import {
    StateView, Box, Abst, Container,
    ViewAttrs, NodeAttrs,
    ReactFlowGraph, BoxNode, ContainerNode,
    BoxNodeData,
} from "@app/visual/types";
import { type Edge, MarkerType } from "@xyflow/react";

import * as sc from "@app/visual/nodes/styleconf";

const getEdgeProp = (isDiffAdd: boolean | undefined) => {
    return {
        // type: 'bezier',
        zIndex: 10,
        style: {
            stroke: sc.TextColor(isDiffAdd),
            strokeWidth: 1.5,
        },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18, height: 18,
            color: sc.TextColor(isDiffAdd),
        },
    }
}

export class ReactFlowConverter {
    public static convert(view: StateView, attrs: ViewAttrs): ReactFlowGraph {
        const converter = new ReactFlowConverter(view, attrs);
        return converter.convert();
    }
    private view: StateView;
    private attrs: ViewAttrs;
    private rootMap: { [key: string]: string };
    private nodeMap: { [key: string]: BoxNode | ContainerNode };
    private isInternal: Set<string>;
    private graph: ReactFlowGraph;
    constructor(view: StateView, attrs: ViewAttrs) {
        this.view       = view;
        this.attrs      = attrs;
        this.rootMap    = {};
        this.nodeMap    = {};
        this.isInternal = new Set<string>();
        this.graph      = { nodes: [], edges: [] };
    }
    private convert(): ReactFlowGraph {
        // calculate the root box of each shape for further node compaction
        for (const key of Object.keys(this.view.pool.boxes)) {
            this.calcRootShapeOf(key);
        }
        for (const key of Object.keys(this.view.pool.containers)) {
            this.calcRootShapeOf(key);
        }
        // convert viewcl shapes to react flow nodes
        for (const key of this.view.plot) {
            this.convertShape(key);
        }
        // return
        console.log('converted graph', this.graph);
        return this.graph;
    }
    private getShape(key: string): Box | Container {
        if (key in this.view.pool.boxes) {
            return this.view.pool.boxes[key];
        } else if (key in this.view.pool.containers) {
            return this.view.pool.containers[key];
        }
        console.log(this.view.pool);
        throw new Error(`getShape: shape not found: ${key}`);
    }
    private isShapeOutmost(key: string) {
        return this.rootMap[key] == key;
    }
    private calcRootShapeOf(key: string) {
        // avoid redundant searching
        if (key in this.rootMap) {
            return;
        }
        let shape = this.getShape(key);
        // for the outmost shape its root shape is itself
        if (shape.parent === null) {
            this.rootMap[key] = key;
            return;
        }
        // calculate the root shape according to its parent
        this.calcRootShapeOf(shape.parent);
        if (shape.parent in this.view.pool.containers && !shouldCompactContainer(this.view.pool.containers[shape.parent])) {
            this.rootMap[key] = key;
        } else {
            this.rootMap[key] = this.rootMap[shape.parent];
        }
    }
    private convertShape(key: string) {
        // for several reasons/optimizations, we only convert the outmost shapes to react flow nodes
        key = this.rootMap[key];
        // avoid redundant conversion
        if (this.nodeMap[key] !== undefined) {
            return;
        }
        // convert according to the node type
        if (key in this.view.pool.boxes) {
            this.convertBox(this.view.pool.boxes[key], this.attrs[key] || {});
        } else if (key in this.view.pool.containers) {
            this.convertContainer(this.view.pool.containers[key], this.attrs[key] || {});
        }
    }
    private convertBox(box: Box, attrs: NodeAttrs) {
        // console.log('convertBox', box.key, 'p?', box.parent);
        // only convert the outmost shapes
        if (!this.isShapeOutmost(box.key)) {
            return;
        }
        // avoid redundant conversion
        if (this.nodeMap[box.key] !== undefined) {
            return;
        }
        // generate the node
        let node: BoxNode = {
            id: box.key, type: 'box',
            data: {} as BoxNodeData,
            position: { x: 0, y: 0 },
            draggable: false,
        };
        if (box.parent !== null) {
            node.parentId = box.parent;
            node.extent = 'parent';
            this.isInternal.add(box.parent);
        }
        this.nodeMap[node.id] = node;
        // convert data after recorded in nodeMap to avoid circular reference
        node.data = this.convertBoxData(box, attrs);
        // store
        this.graph.nodes.push(node);
    }
    private convertBoxData(box: Box | Container, attrs: NodeAttrs): BoxNodeData {
        // handle Container type
        if ('members' in box) {
            return this._convertArrayDataToBox(box, attrs);
        }
        // handle view inheritance to get all members
        const abst = box.absts[attrs.view || 'default'];
        return {
            key: box.key,
            type: box.type, addr: box.addr, label: box.label,
            members: this.convertBoxMembers(box, abst),
            parent: box.parent,
            isDiffAdd: box.isDiffAdd,
            collapsed: attrs.collapsed == 'true',
        };
    }
    private _convertArrayDataToBox(container: Container, attrs: NodeAttrs): BoxNodeData {
        // this is a temp solution
        // TODO: semantics of array-like containers HOWTO?
        if (!shouldCompactContainer(container)) {
            throw new Error(`container.type should be [Array] here: ${container.key}`);
        }
        let nodeData: BoxNodeData = {
            key: container.key,
            type: container.type, addr: container.addr, label: container.label,
            members: {},
            parent: container.parent,
            isDiffAdd: container.isDiffAdd,
            collapsed: attrs.collapsed == 'true',
        };
        for (const member of container.members) {
            if (member.key !== null) {
                nodeData.members[member.key] = {
                    class: 'box',
                    object: member.key,
                    data: this.convertBoxData(
                        this.getShape(member.key),
                        this.attrs[member.key] || {}
                    ),
                    isDiffAdd: member.isDiffAdd,
                };
            }
        }
        return nodeData;
    }
    private convertBoxMembers(box: Box, abst: Abst): BoxNodeData['members'] {
        if (abst.parent === null) {
            return this.convertAbstMembers(box, abst)
        }
        const parentMembers = this.convertBoxMembers(box, box.absts[abst.parent]);
        return { ...parentMembers, ...this.convertAbstMembers(box, abst) };
    }
    private convertAbstMembers(box: Box, abst: Abst) {
        let members = JSON.parse(JSON.stringify(abst.members)) as BoxNodeData['members'];
        for (let [label, member] of Object.entries(members)) {
            // for links generate the edge and the target node
            if (member.class == 'link') {
                const edgeHandle = `${box.key}.${label}`;
                const convertLinkTarget = (target: string, isDiffAdd: boolean | undefined) => {
                    // for empty containers eliminate the visualization
                    if (target in this.view.pool.containers && this.view.pool.containers[target].members.length == 0) {
                        // target = '(empty)';
                        return;
                    }
                    // normal handling
                    const edge: Edge = {
                        id: edgeHandle + (isDiffAdd === undefined ? '' : (isDiffAdd ? '.add' : '.del')),
                        source: this.rootMap[box.key],
                        sourceHandle: edgeHandle,
                        target: this.rootMap[target],
                        targetHandle: target,
                        ...getEdgeProp(isDiffAdd),
                    };
                    this.graph.edges.push(edge);
                    this.convertShape(edge.target);
                }
                if (member.diffOldTarget !== undefined && member.diffOldTarget !== null) {
                    convertLinkTarget(member.diffOldTarget, false);
                }
                if (member.target !== null) {
                    let isEdgeDiffAdd = undefined;
                    if (member.diffOldTarget !== undefined) {
                        isEdgeDiffAdd = true;
                    }
                    if (box.isDiffAdd !== undefined) {
                        isEdgeDiffAdd = box.isDiffAdd;
                    }
                    convertLinkTarget(member.target, isEdgeDiffAdd);
                }
            // put data of nested box into the box data
            } else if (member.class == 'box') {
                if (member.object !== null) {
                    member.data = this.convertBoxData(
                        this.getShape(member.object),
                        this.attrs[member.object] || {}
                    );
                }
                // @ts-ignore
                if (member.diffOldObject !== undefined) {
                    // TODO: create a diff node for the old nested box
                }
            }
        }
        return members;
    }
    private convertContainer(container: Container, attrs: NodeAttrs) {
        // console.log('convertContainer', container.key, 'p?', container.parent);
        // only convert the outmost shapes
        if (!this.isShapeOutmost(container.key)) {
            return;
        }
        console.log('convertContainer', container.key, container, attrs);
        // avoid redundant conversion
        if (this.nodeMap[container.key] !== undefined) {
            return;
        }
        // compact array-like containers
        if (shouldCompactContainer(container)) {
            const compacted: Box = {
                key: container.key,
                type: container.type, addr: container.addr, label: container.label, 
                parent: container.parent,
                absts: {
                    default: {
                        members: Object.fromEntries(container.members
                            .filter(member => member.key !== null)
                            .map(member => [
                                member.key, {
                                    class: 'box',
                                    object: member.key,
                                }
                            ])
                        ),
                        parent: null
                    }
                },
                isDiffAdd: container.isDiffAdd,
            }
            this.convertBox(compacted, attrs);
            return;
        }
        // generate the node
        if (attrs.collapsed == 'true') {
            console.log('container collapsed', container.key);
        }
        let node: ContainerNode = {
            id: container.key,
            type: 'container',
            data: {
                key: container.key,
                type: container.type, addr: container.addr, label: container.label,
                members: Object.values(container.members).filter(member => member.key !== null),
                parent: container.parent,
                isDiffAdd: container.isDiffAdd,
                collapsed: attrs.collapsed == 'true',
                direction: attrs.direction || 'horizontal',
            },
            position: { x: 0, y: 0 },
            draggable: false,
        };
        this.nodeMap[node.id] = node;
        this.graph.nodes.push(node);
        // convert its members
        for (const member of node.data.members) {
            if (member.key === null) {
                continue;
            }
            this.convertShape(member.key);
            const memberNode = this.nodeMap[member.key];
            if (memberNode === undefined) {
                console.error(`container ${container.key} memberNode undefined: ${member.key}`);
                continue;
            }
            if (memberNode.type != 'box') {
                continue;
            }
            // TODO: merge to a ContainerMemberLinks for vertical direction
            for (const [label, link] of Object.entries(member.links)) {
                if (label in memberNode.data.members) {
                    continue;
                    throw new Error(`container ${container.key} member ${member.key} link ${label} already exists`);
                }
                memberNode.data.members[label] = link;
                const convertLinkTarget = (target: string, isDiffAdd: boolean | undefined) => {
                    if (member.key === null) {
                        return;
                    }
                    console.log('dir',container.key, node.data.direction);
                    const edgeHandle = `${member.key}.${label}`;
                    const sourceHandle = node.data.direction == 'vertical' ? `${member.key}#B` : edgeHandle;
                    const targetHandle = target + (node.data.direction == 'vertical' ? '#T' : '');
                    const edge: Edge = {
                        id: edgeHandle + (isDiffAdd === undefined ? '' : (isDiffAdd ? '.add' : '.del')),
                        source: member.key,
                        sourceHandle: sourceHandle,
                        target: target,
                        targetHandle: targetHandle,
                        ...getEdgeProp(isDiffAdd)
                    };
                    this.graph.edges.push(edge);
                    this.convertShape(edge.target);
                    this.nodeMap[edge.target].data.isContainerMember = true;
                }
                if (link.diffOldTarget !== undefined && link.diffOldTarget !== null) {
                    convertLinkTarget(link.diffOldTarget, false);
                }
                if (link.target !== null) {
                    let isEdgeDiffAdd = undefined;
                    if (link.diffOldTarget !== undefined) {
                        isEdgeDiffAdd = true;
                    }
                    const box = this.getShape(member.key);
                    if (box.isDiffAdd !== undefined) {
                        isEdgeDiffAdd = box.isDiffAdd;
                    }
                    convertLinkTarget(link.target, isEdgeDiffAdd);
                }
            }
        }
    }
}

function shouldCompactContainer(container: Container) {
    return ['[Array]', '[XArray]'].includes(container.type);
}
