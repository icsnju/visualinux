import {
    ReactFlowGraph, BoxNode, ContainerNode,
    BoxNodeData,
} from "@app/visual/types";
import { type Node, type Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";

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
                this.estimateBoxNodeSize(node);
            } else if (node.type == 'container') {
                this.estimateContainerNodeSize(node);
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
        // basic height: space for the label at the top and object address at the bottom
        let basicHeight = 26 + 24;
        let height = basicHeight;
        // count the height of each member
        let members = Object.values(nodeData.members);
        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            // simple estimation for primitive members
            const countTextHeight = (text: string) => {
                const lines = text.split('\n');
                return 6 + 16 * lines.length;
            }
            if (member.class === "text") {
                height += countTextHeight(member.value);
                if (member.diffOldValue !== undefined) {
                    height += countTextHeight(member.diffOldValue);
                }
                continue;
            }
            if (member.class === "link") {
                height += countTextHeight(member.target || "");
                if (member.diffOldTarget !== undefined) {
                    height += countTextHeight(member.diffOldTarget || "");
                }
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
        // return
        if (nodeData.collapsed) {
            return basicHeight;
        }
        return height;
    }
    private estimateContainerNodeSize(node: ContainerNode) {
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
                this.estimateBoxNodeSize(memberNode);
            } else if (memberNode.type == 'container') {
                this.estimateContainerNodeSize(memberNode);
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
        // perform the subflow layout
        let layoutOptions: Dagre.GraphLabel = {
            // rankdir: this.layoutDirection
            rankdir: node.data.direction == 'vertical' ? 'TB' : 'LR'
        };
        if (node.id.split(':')[1].endsWith('[Array]')) {
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
    console.log('nodes', g.nodes().map(node => g.node(node)));
    console.log('edges', g.edges().map(edge => g.edge(edge)));
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
    // make nodes with the same rank left-aligned
    for (let rank in nodesByRank) {
        const rankNodes = nodesByRank[rank];
        let minX = Math.min(...rankNodes.map(node => node.position.x));
        for (let node of rankNodes) {
            node.position.x = minX;
        }
    }
};
