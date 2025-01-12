import {
    View, Box, Abst,
    Container, ContainerConv, isContainerConv,
    ViewAttrs,
    ReactFlowGraph, BoxNode, ContainerNode
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
    private nodeMap: { [key: string]: BoxNode | ContainerNode };
    private graph: ReactFlowGraph;
    private layoutDirection: "LR" | "TB" = "LR";
    constructor(view: View, attrs: ViewAttrs) {
        this.view = view;
        this.attrs = attrs;
        this.nodeMap = {};
        this.graph = { nodes: [], edges: [] };
    }
    public convert(): ReactFlowGraph {
        // convert the nodes
        for (const key of this.view.plot) {
            this.convertShape(key);
        }
        // post process
        this.estimateNodeSize();
        this.layoutOutmostNodes();
        // return
        return this.graph;
    }
    private convertShape(key: string) {
        // avoid redundant conversion
        if (this.nodeMap[key] != null) {
            return;
        }
        // convert according to the node type
        if (key in this.view.pool.boxes) {
            this.convertBox(key);
        } else if (key in this.view.pool.containers) {
            this.convertContainer(key);
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
    // convert functions (in the parent-first order)
    //
    private convertBox(key: string) {
        // get box and attrs
        const box = this.view.pool.boxes[key];
        const attrs = this.attrs[key] || {};
        console.log('convertBox', key, box, attrs);
        // convert parent first since react flow requires parent nodes to be listed before their children
        if (box.parent != null) {
            this.convertShape(box.parent);
        }
        // get the depth from its parent
        const parent = box.parent != null ? this.nodeMap[box.parent] : null;
        let depth;
        if (parent == null) {
            depth = 0;
        } else if (parent.type == 'box') {
            depth = parent.data.depth + 1;
        } else {
            depth = parent.data.depth;
        }
        // avoid redundant conversion
        if (this.nodeMap[key] != null) {
            return;
        }
        // handle view inheritance to get all members
        const abst = box.absts[attrs.view || 'default'];
        const members = this.getMembersOfBox(box, abst);
        console.log('attrs.view', attrs.view, members);
        // convert the box itself
        let node: BoxNode = {
            id: key, type: "box",
            data: {
                key: key,
                type: box.type, addr: box.addr, label: box.label,
                members: members,
                parent: box.parent,
                depth: depth,
                collapsed: attrs.collapsed == 'true',
                heightMembers: {},
            },
            position: { x: 0, y: 0 }
        };
        if (box.parent != null) {
            node.parentId = box.parent;
            node.extent = 'parent';
            node.draggable = false;
        }
        this.nodeMap[node.id] = node;
        this.graph.nodes.push(node);
        // convert the pointers, pointed nodes, and nested boxes
        for (const memberKey in members) {
            const member = members[memberKey];
            if (member.class == 'link' && member.target != null) {
                // convert the pointer and pointed node
                this.graph.edges.push({
                    id: `${box.key}.${memberKey}`,
                    // id: `${box.key}.${memberKey}->${member.target}`,
                    source: box.key,
                    sourceHandle: memberKey,
                    target: member.target,
                    ...edgeProp
                });
                this.convertShape(member.target);
            } else if (member.class == 'box') {
                this.convertShape(member.object);
            }
        }
    }
    private getMembersOfBox(box: Box, abst: Abst): typeof abst.members {
        if (abst.parent == null) {
            return { ...abst.members };
        }
        const parentMembers = this.getMembersOfBox(box, box.absts[abst.parent]);
        return { ...parentMembers, ...abst.members };
    }
    private convertContainer(key: string) {
        // get container and attrs
        const container = this.view.pool.containers[key];
        const attrs = this.attrs[key] || {};
        console.log('convertContainer', key, container, attrs);
        // convert parent first since react flow requires parent nodes to be listed before their children
        if (container.parent != null) {
            this.convertShape(container.parent);
        }
        const depth = container.parent != null ? this.nodeMap[container.parent].data.depth + 1 : 0;
        // avoid redundant conversion
        if (this.nodeMap[key] != null) {
            return;
        }
        // TODO: conv
        if (isContainerConv(container)) {
            return;
        }
        // convert the container itself
        let node: ContainerNode = {
            id: container.key,
            type: "container",
            data: {
                key: container.key,
                label: container.label,
                members: Object.values(container.members).filter(member => member.key != null),
                parent: container.parent,
                depth: depth,
                collapsed: attrs.collapsed == 'true',
                heightMembers: {},
            },
            position: { x: 0, y: 0 }
        };
        if (container.parent != null) {
            node.parentId = container.parent;
            node.extent = 'parent';
            node.draggable = false;
        }
        this.nodeMap[node.id] = node;
        this.graph.nodes.push(node);
        // convert its members
        for (const member of node.data.members) {
            this.convertShape(member.key);
            const memberNode = this.nodeMap[member.key];
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
        let width = 256 - 10 * node.data.depth;
        // estimate the height according to the height of its members
        // also perform the intra-node layout
        let height = 25;
        let members = Object.values(node.data.members);
        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // simple estimation for primitive members
            if (member.class != 'box') {
                height += 20;
                continue;
            }
            // handle non-primitive members
            const memberNode = this.nodeMap[member.object];
            if (memberNode === undefined) {
                console.error(`memberNode is undefined: ${member.object}`);
                continue;
            }
            // estimate the member node size first
            if (memberNode.type == 'box') {
                this.estimateBoxNodeSize(memberNode);
            } else if (memberNode.type == 'container') {
                this.estimateContainerNodeSize(memberNode);
            }
            if (memberNode.width === undefined || memberNode.height === undefined) {
                throw new Error(`memberNode.width/height should not be undefined here: ${memberNode.id}`);
            }
            // perform the intra-node layout
            memberNode.position = { x: 5, y: height + 5 };
            // add necessary spaces to estimate the node size
            let space = memberNode.height + 8;
            // also fine-tune the display style
            if (index > 0 && members[index - 1].class === 'box') {
                memberNode.position.y -= 3;
                space -= 3;
            }
            // finally estimated
            node.data.heightMembers[member.object] = space;
            height += space;
        }
        // add spaces for the object address displayed at the bottom
        height += 24;
        // return
        node.width  = width;
        node.height = height;
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
