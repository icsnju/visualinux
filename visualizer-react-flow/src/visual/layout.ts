import { type Node, type Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import { Box, BoxNode } from "@app/visual/types";

export type PlotLayoutOptions = {
    direction: string
}

type LayoutResult = {
    nodes: Node[]
    edges: Edge[]
}

// TODO: implement the react-flow-based layout algorithm
// for inter-object layout, use Dagre
// for intra-object layout, calculate the position of embedded objects

function layoutGraph(nodes: Node[], edges: Edge[], options: PlotLayoutOptions) {
    layoutGraphByDagre(nodes, edges, { rankdir: options.direction });
    return;
    // first layout the outer graph
    let nodesOuter: Node[] = [], nodesInner: Node[] = [];
    let nodesOuterRec: Set<string> = new Set();
    for (const node of nodes) {
        const data = node.data as Box;
        if (data.parent == null) {
            nodesOuter.push(node);
            nodesOuterRec.add(data.key);
        } else {
            nodesInner.push(node);
        }
    }
    let edgesOuter: Edge[] = [], edgesInner: Edge[] = [];
    for (const edge of edges) {
        if (nodesOuterRec.has(edge.source) && nodesOuterRec.has(edge.target)) {
            edgesOuter.push(edge);
        } else {
            edgesInner.push(edge);
        }
    }
    let layoutedOuter = layoutGraphByDagre(nodesOuter, edgesOuter, options);
    // there's no need to layout the edges
    let layouted = { nodes: layoutedOuter.nodes, edges: edges };
    // then layout the non-outer nodes
    // TODO: implement the intra-object layout
    layouted.nodes.push(...nodesInner);
    for (const node of nodesInner) {
        // for nodes of type subgraph, layout it recursively
        // for normal nodes, layout their embedded objects
    }
    // return
    return layouted;
}
export function layoutGraphByDagre(nodes: Node[], edges: Edge[], options: Dagre.GraphLabel) {
    // layout the graph by dagre
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph(options);
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) =>
        // g.setNode(node.id, { width: node.measured?.width ?? 0, height: node.measured?.height ?? 0 })
        g.setNode(node.id, { width: node.width, height: node.height })
    );
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

function layoutBox(node: Node, options: PlotLayoutOptions): LayoutResult {
    // TODO: implement the intra-object layout
    return { nodes: [node], edges: [] };
}
