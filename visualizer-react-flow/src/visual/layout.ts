import {
    ReactFlowGraph, BoxNode, ContainerNode,
    BoxNodeData,
} from "@app/visual/types";
import { type Node, type Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";

import * as sc from "@app/visual/nodes/styleconf";

export class ReactFlowLayouter {
    public static layout(graph: ReactFlowGraph): ReactFlowGraph {
        const layouter = new ReactFlowLayouter(graph);
        return layouter.layout();
    }
    private graph: ReactFlowGraph;
    private layoutDirection: 'LR' | 'TB' = 'LR';
    constructor(graph: ReactFlowGraph) {
        this.graph = graph;
    }
    private layout(): ReactFlowGraph {
        //
        for (const node of this.graph.nodes) {
            if (node.type == 'box' || node.type == 'container') {
                node.width = undefined;
                node.height = undefined;
            }
        }
        //
        this.estimateNodeSize();
        this.layoutOutmostNodes();
        // // eliminate estimation errors
        // for (const node of this.graph.nodes) {
        //     if (node.type == 'box') {
        //         // node.height = undefined;
        //     }
        // }
        // return
        console.log('final graph', this.graph);
        return this.graph;
    }
    private estimateNodeSize() {
        // estimate the node size for layout
        for (const node of this.graph.nodes) {
            if (node.type == 'box') {
                this.estimateBoxNodeSize(node, 0);
            } else if (node.type == 'container') {
                this.estimateContainerNodeSize(node, 0);
            }
        }
    }
    //
    // post process functions
    //
    private estimateBoxNodeSize(node: BoxNode, depth: number, isParentCollapsed: boolean = false) {
        // avoid redundant estimation
        if (node.width !== undefined) {
            return;
        }
        // estimate the width
        let width = sc.boxNodeWidth;
        // estimate the height according to the height of its members
        let height = this._estimateBoxNodeHeight(node.data, depth, isParentCollapsed);
        // return
        node.width  = width;
        node.height = height;
    }
    private _estimateBoxNodeHeight(nodeData: BoxNodeData, depth: number, isParentCollapsed: boolean) {
        // basic height: space for the label at the top and object address at the bottom
        let height = 50;
        // count the height of each member
        let members = Object.entries(nodeData.members);
        for (let index = 0; index < members.length; index++) {
            const [label, member] = members[index];
            // estimation for primitive members
            if (member.class === "text" || member.class === "link") {
                let value, oldvl;
                if (member.class === "text") {
                    value = member.value;
                    if (member.diffOldValue !== undefined) {
                        oldvl = member.diffOldValue;
                    }
                } else {
                    value = member.target?.split(':')[0] || "null";
                    if (member.diffOldTarget !== undefined) {
                        oldvl = member.diffOldTarget?.split(':')[0] || "null";
                    }
                }
                const { labelLines, valueLines, oldvlLines } = sc.TextFieldAdaption(label, value, oldvl, depth);
                height += 2 * sc.textPadding;
                height += 16 * Math.max(labelLines.length, valueLines.length + oldvlLines.length);
                console.log('esti', nodeData.key, label, Math.max(labelLines.length, valueLines.length, oldvlLines.length), labelLines, valueLines, oldvlLines, depth)
                continue;
            }
            // handle non-primitive members
            if (member.data === undefined) {
                console.error(`memberNode is undefined: ${member.object}`);
                continue;
            }
            // estimate the member node size first
            let memberHeight = this._estimateBoxNodeHeight(member.data, depth + 1, isParentCollapsed || nodeData.collapsed);
            // add necessary spaces to estimate the node size
            let space = memberHeight + 8;
            if (index > 0 && members[index - 1][1].class === 'box') {
                space -= 3;
            }
            // finally estimated
            height += space;
        }
        // return
        if (isParentCollapsed) {
            return sc.boxNodeHeightCollapsed;
        }
        if (nodeData.collapsed) {
            return sc.boxNodeHeightCollapsed;
        }
        return height;
    }
    private estimateContainerNodeSize(node: ContainerNode, depth: number, isParentCollapsed: boolean = false) {
        // handle members one by one
        let memberNodes: (BoxNode | ContainerNode)[] = [];
        let memberEdges: Edge[] = [];
        for (const member of node.data.members) {
            const memberNode = this.graph.nodes.find(n => n.id === member.key);
            if (memberNode === undefined) {
                throw new Error(`memberNode not found: ${member.key}`);
            }
            // estimate the member size first
            if (memberNode.type == 'box') {
                this.estimateBoxNodeSize(memberNode, depth, isParentCollapsed || node.data.collapsed);
            } else if (memberNode.type == 'container') {
                this.estimateContainerNodeSize(memberNode, depth + 1, isParentCollapsed || node.data.collapsed);
            }
            // prepare the subgraph for subflow layout
            memberNodes.push(memberNode);
            for (const [label, link] of Object.entries(member.links)) {
                if (link.target !== null) {
                    memberEdges.push({
                        id: `${member.key}.${label}`,
                        source: member.key,
                        target: link.target,
                    });
                }
            }
        }
        // return if parent collapsed
        if (isParentCollapsed) {
            node.width  = 0;
            node.height = 0;
            return;
        }
        // init for the subflow layout
        let layoutOptions: Dagre.GraphLabel = {
            // rankdir: this.layoutDirection
            rankdir: node.data.direction == 'vertical' ? 'TB' : 'LR'
        };
        layoutOptions.marginx = 24;
        layoutOptions.marginy = 16;
        // if (node.id.split(':')[1].endsWith('[Array]')) {
        //     layoutOptions.marginx = 4;
        //     layoutOptions.marginy = 4;
        //     layoutOptions.nodesep = 4;
        //     memberNodes.forEach(memberNode => memberNode.draggable = false);
        // } else {
        //     layoutOptions.marginx = 16;
        //     layoutOptions.marginy = 16;
        // }
        // do not need subflow layout if collapsed
        if (node.data.collapsed) {
            console.log('haha!', node.id, node.position)
            node.width  = sc.boxNodeWidth + layoutOptions.marginx * 2;
            node.height = sc.boxNodeHeightCollapsed;
            for (const memberNode of memberNodes) {
                if (memberNode.width === undefined || memberNode.height === undefined) {
                    throw new Error(`memberNode.width/height should not be undefined here: ${memberNode.id}`);
                }
                memberNode.position.x = (node.width - memberNode.width);
                memberNode.position.y = (node.height - memberNode.height) / 2;
            }
            return;
        }
        // perform the subflow layout
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
    // layout the rest, i.e., outermost nodes
    private layoutOutmostNodes() {
        let nodes = this.graph.nodes.filter(node => node.parentId === undefined);
        // edges must be converted to outermost-to-outermost edges for the dagre layout to work correctly
        let getRoot = (key: string) => {
            let node = this.graph.nodes.find(n => n.id === key);
            if (node === undefined) {
                throw new Error(`node not found for key ${key}`);
            }
            while (node.parentId !== undefined) {
                const parentId: string = node.parentId;
                node = this.graph.nodes.find(n => n.id === parentId);
                if (node === undefined) {
                    throw new Error(`node not found for key ${parentId}`);
                }
            }
            return node.id;
        }
        let edges = this.graph.edges.map(edge => ({
            ...edge,
            source: getRoot(edge.source),
            target: getRoot(edge.target),
        }));
        layoutGraphByDagre(nodes, edges, { rankdir: this.layoutDirection, marginx: 16, marginy: 16, ranksep: 96 });
    }
}

function layoutGraphByDagre(nodes: Node[], edges: Edge[], options: Dagre.GraphLabel) {
    // layout the graph by dagre
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph(options);
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) => g.setNode(node.id, { width: node.width, height: node.height }));
    Dagre.layout(g);

    // convert positions from dagre to react flow
    for (let node of nodes) {
        const position = g.node(node.id);
        const x = position.x - (node.width ?? 0) / 2;
        const y = position.y - (node.height ?? 0) / 2;
        node.position = { x, y };
    }

    // group nodes by rank
    const nodesByRank: {[key: number]: Node[]} = {};
    for (let node of nodes) {
        const rank = g.node(node.id).rank ?? 0;
        if (!nodesByRank[rank]) {
            nodesByRank[rank] = [];
        }
        nodesByRank[rank].push(node);
    }
    // make nodes with the same rank aligned
    for (let rank in nodesByRank) {
        const rankNodes = nodesByRank[rank];
        if (options.rankdir == 'LR') {
            let minX = Math.min(...rankNodes.map(node => node.position.x));
            for (let node of rankNodes) {
                node.position.x = minX;
            }
        } else {
            let minY = Math.min(...rankNodes.map(node => node.position.y));
            for (let node of rankNodes) {
                node.position.y = minY;
            }
        }
    }
}
