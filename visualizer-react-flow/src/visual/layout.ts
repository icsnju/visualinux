import { type Node, type Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";

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
