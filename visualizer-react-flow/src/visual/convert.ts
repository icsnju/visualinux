import {
    View, Box, Abst, Container,
    ViewAttrs, NodeAttrs,
    ReactFlowGraph, BoxNode, ContainerNode,
    BoxNodeData,
} from "@app/visual/types";
import { layoutGraphByDagre } from "@app/visual/layout";
import { type Edge, MarkerType } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";

export function convertToReactFlow(view: View, attrs: ViewAttrs): ReactFlowGraph {
    const converter = new ReactFlowConverter(view, attrs);
    return converter.convert();
}

const edgeProp = {
    type: 'step',
    zIndex: 10,
    style: { stroke: 'black' },
    markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20, height: 20,
        color: 'black',
    },
}

class ReactFlowConverter {
    private view: View;
    private attrs: ViewAttrs;
    private rootMap:   { [key: string]: string };
    private nodeMap: { [key: string]: BoxNode | ContainerNode };
    private graph: ReactFlowGraph;
    private layoutDirection: 'LR' | 'TB' = 'LR';
    constructor(view: View, attrs: ViewAttrs) {
        this.view      = view;
        this.attrs     = attrs;
        this.rootMap   = {};
        this.nodeMap   = {};
        this.graph     = { nodes: [], edges: [] };
    }
    public convert(): ReactFlowGraph {
        // calculate the root box of each shape for further node compaction
        for (const key of Object.keys(this.view.pool.boxes)) {
            this.calcRootShapeOf(key);
        }
        for (const key of Object.keys(this.view.pool.containers)) {
            this.calcRootShapeOf(key);
        }
        console.log('rootmap', this.rootMap);
        // convert viewcl shapes to react flow nodes
        for (const key of this.view.plot) {
            this.convertShape(key);
        }
        // post process
        this.estimateNodeSize();
        this.layoutOutmostNodes();
        // return
        console.log('final graph', this.graph);
        return this.graph;
    }
    private getShape(key: string): Box | Container {
        if (key in this.view.pool.boxes) {
            return this.view.pool.boxes[key];
        } else if (key in this.view.pool.containers) {
            return this.view.pool.containers[key];
        }
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
        if (shape.parent == null) {
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
        console.log('convertShape?', key, this.rootMap[key]);
        key = this.rootMap[key];
        // avoid redundant conversion
        if (this.nodeMap[key] != null) {
            return;
        }
        // convert according to the node type
        if (key in this.view.pool.boxes) {
            this.convertBox(this.view.pool.boxes[key], this.attrs[key] || {});
        } else if (key in this.view.pool.containers) {
            this.convertContainer(this.view.pool.containers[key], this.attrs[key] || {});
        }
    }
    private estimateNodeSize() {
        // estimate the node size for layout
        for (const node of this.graph.nodes) {
            if (node.type == 'box') {
                this.estimateBoxNodeSize(node);
            } else if (node.type == 'container') {
                this.estimateContainerNodeSize(node);
            }
        }
    }
    //
    // convert functions (only for outmost shapes)
    //
    private convertBox(box: Box, attrs: NodeAttrs) {
        // only convert the outmost shapes
        if (!this.isShapeOutmost(box.key)) {
            return;
        }
        console.log('convertBox', box.key, box, attrs);
        // avoid redundant conversion
        if (this.nodeMap[box.key] != null) {
            return;
        }
        // generate the node
        let node: BoxNode = {
            id: box.key, type: 'box',
            data: this.convertBoxData(box, attrs),
            position: { x: 0, y: 0 }
        };
        if (box.parent != null) {
            node.parentId = box.parent;
            node.extent = 'parent';
            node.draggable = false;
        }
        this.nodeMap[node.id] = node;
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
            collapsed: attrs.collapsed == 'true',
        };
    }
    private _convertArrayDataToBox(container: Container, attrs: NodeAttrs): BoxNodeData {
        // this is a temp solution
        // TODO: semantics of array-like containers HOWTO?
        if (!shouldCompactContainer(container)) {
            throw new Error(`container.type should be Array here: ${container.key}`);
        }
        let nodeData: BoxNodeData = {
            key: container.key,
            type: '', addr: '', label: container.label,
            members: {},
            parent: container.parent,
            collapsed: attrs.collapsed == 'true',
        };
        for (const member of container.members) {
            if (member.key != null) {
                nodeData.members[member.key] = {
                    class: 'box',
                    object: member.key,
                    data: this.convertBoxData(
                        this.getShape(member.key),
                        this.attrs[member.key] || {}
                    )
                };
            }
        }
        return nodeData;
    }
    private convertBoxMembers(box: Box, abst: Abst): BoxNodeData['members'] {
        if (abst.parent == null) {
            return this.convertAbstMembers(box, abst)
        }
        const parentMembers = this.convertBoxMembers(box, box.absts[abst.parent]);
        return { ...parentMembers, ...this.convertAbstMembers(box, abst) };
    }
    private convertAbstMembers(box: Box, abst: Abst) {
        let members = abst.members as BoxNodeData['members'];
        for (let [label, member] of Object.entries(members)) {
            // generate the edge
            if (member.class == 'link' && member.target != null) {
                const edgeId = `${box.key}.${label}`;
                console.log('for edge ', edgeId);
                console.log(member.target, 'root:', this.rootMap[member.target]);
                const edge: Edge = {
                    id: edgeId,
                    source: this.rootMap[box.key],
                    sourceHandle: edgeId,
                    target: this.rootMap[member.target],
                    targetHandle: member.target,
                    ...edgeProp
                };
                this.graph.edges.push(edge);
                if (edge.source != edge.target) this.convertShape(edge.target);
            // put data of nested box into the box data
            } else if (member.class == 'box') {
                if (member.object != null) {
                    member.data = this.convertBoxData(
                        this.getShape(member.object),
                        this.attrs[member.object] || {}
                    );
                }
            }
        }
        return members;
    }
    private convertContainer(container: Container, attrs: NodeAttrs) {
        // only convert the outmost shapes
        if (!this.isShapeOutmost(container.key)) {
            return;
        }
        console.log('convertContainer', container.key, container, attrs);
        // avoid redundant conversion
        if (this.nodeMap[container.key] != null) {
            return;
        }
        // compact array-like containers
        if (shouldCompactContainer(container)) {
            const [addr, type] = container.key.split(':', 2);
            const compacted: Box = {
                key: container.key,
                type: type, label: container.label, addr: addr,
                parent: container.parent,
                absts: {
                    default: {
                        members: Object.fromEntries(
                            container.members.map(member => [
                                member.key, {
                                    class: 'box',
                                    object: member.key,
                                }
                            ])
                        ),
                        parent: null
                    }
                }
            }
            this.convertBox(compacted, attrs);
            // this._convertArrayDataToContainer(container, attrs);
            return;
        }
        // generate the node
        let node: ContainerNode = {
            id: container.key,
            type: 'container',
            data: {
                key: container.key,
                label: container.label,
                members: Object.values(container.members).filter(member => member.key != null),
                parent: container.parent,
                collapsed: attrs.collapsed == 'true',
            },
            position: { x: 0, y: 0 }
        };
        this.nodeMap[node.id] = node;
        this.graph.nodes.push(node);
        // convert its members
        for (const member of node.data.members) {
            this.convertShape(member.key);
            const memberNode = this.nodeMap[member.key];
            if (memberNode === undefined) {
                console.error(`container ${container.key} memberNode undefined: ${member.key}`);
                continue;
            }
            if (memberNode.type != 'box') {
                continue;
            }
            for (const [label, target] of Object.entries(member.links)) {
                if (!(label in memberNode.data.members)) {
                    memberNode.data.members[label] = {
                        class: 'link',
                        type: 'DIRECT',
                        target: target,
                    };
                }
                if (target != null) {
                    this.graph.edges.push({
                        id: `${member.key}.${label}`,
                        source: member.key,
                        sourceHandle: label,
                        target: target,
                        targetHandle: target,
                        ...edgeProp
                    });
                    this.convertShape(target);
                }
            }
        }
    }
    //
    // post process functions
    //
    private estimateBoxNodeSize(node: BoxNode) {
        // avoid redundant estimation
        if (node.width !== undefined) {
            return;
        }
        // estimate the width
        let width = 256;
        // estimate the height according to the height of its members
        let height = this._estimateBoxNodeHeight(node.data);
        // return
        node.width  = width;
        node.height = height;
    }
    private _estimateBoxNodeHeight(nodeData: BoxNodeData) {
        let height = 25;
        let members = Object.values(nodeData.members);
        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // simple estimation for primitive members
            if (member.class != 'box') {
                height += 20;
                continue;
            }
            // handle non-primitive members
            if (member.data === undefined) {
                console.error(`memberNode is undefined: ${member.object}`);
                continue;
            }
            // estimate the member node size first
            let memberHeight = this._estimateBoxNodeHeight(member.data);
            // add necessary spaces to estimate the node size
            let space = memberHeight + 8;
            if (index > 0 && members[index - 1].class === 'box') {
                space -= 3;
            }
            // finally estimated
            height += space;
        }
        // add spaces for the object address displayed at the bottom
        height += 24;
        // return
        return height;
    }
    private estimateContainerNodeSize(node: ContainerNode) {
        console.log('estimateContainerNodeSize', node.id, node.data.members);
        // handle members one by one
        let memberNodes: (BoxNode | ContainerNode)[] = [];
        let memberEdges: Edge[] = [];
        for (const member of node.data.members) {
            const memberNode = this.nodeMap[member.key];
            // estimate the member size first
            if (memberNode.type == 'box') {
                this.estimateBoxNodeSize(memberNode);
            } else if (memberNode.type == 'container') {
                this.estimateContainerNodeSize(memberNode);
            }
            // prepare the subgraph for subflow layout
            memberNodes.push(memberNode);
            for (const [label, target] of Object.entries(member.links)) {
                if (target != null) {
                    memberEdges.push({
                        id: `${member.key}.${label}`,
                        source: member.key,
                        target: target,
                    });
                }
            }
        }
        // perform the subflow layout
        let layoutOptions: Dagre.GraphLabel = {
            rankdir: this.layoutDirection
        };
        if (node.id.split(':')[1].endsWith('Array')) {
            layoutOptions.marginx = 4;
            layoutOptions.marginy = 4;
            layoutOptions.nodesep = 4;
            memberNodes.forEach(memberNode => memberNode.draggable = false);
        } else {
            layoutOptions.marginx = 16;
            layoutOptions.marginy = 16;
        }
        let hdrOffsetY = 32 - layoutOptions.marginy;
        layoutGraphByDagre(memberNodes, memberEdges, layoutOptions);
        // left spaces for the node header
        memberNodes.forEach(memberNode => memberNode.position.y += hdrOffsetY);
        // estimate the container size according to the layouted subflow graph
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const memberNode of memberNodes) {
            if (memberNode.width === undefined || memberNode.height === undefined) {
                throw new Error(`memberNode.width/height should not be undefined here: ${memberNode.id}`);
            }
            const x = memberNode.position.x;
            const y = memberNode.position.y;
            const w = memberNode.width;
            const h = memberNode.height;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x + w);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y + h);
        }
        if (memberNodes.length == 0) {
            minX = 0; maxX = 0;
            minY = 0; maxY = 0;
        }
        const width  = maxX - minX + 2 * layoutOptions.marginx;
        const height = maxY - minY + 2 * layoutOptions.marginy + hdrOffsetY;
        // return
        node.width  = width;
        node.height = height;
    }
    // layout the rest, i.e., outmost nodes
    private layoutOutmostNodes() {
        // TODO: merge nested nodes to perform correct layout
        let nodes = this.graph.nodes.filter(node => node.parentId === undefined);
        let edges = this.graph.edges;
        layoutGraphByDagre(nodes, edges, { rankdir: this.layoutDirection, marginx: 16, marginy: 16 });
    }
}

function shouldCompactContainer(container: Container) {
    const typo = container.key.split(':')[1];
    return ['Array', 'XArray'].includes(typo);
}
