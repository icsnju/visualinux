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

export function getLayoutedPlot(nodes: Node[], edges: Edge[], options: PlotLayoutOptions): LayoutResult {
    return layoutGraph(nodes, edges, options);
}

function layoutGraph(nodes: Node[], edges: Edge[], options: PlotLayoutOptions): LayoutResult {
    let fuck = layoutGraphByDagre(nodes, edges, options);
    return fuck;
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

function layoutGraphByDagre(nodes: Node[], edges: Edge[], options: PlotLayoutOptions): LayoutResult {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: options.direction });
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) =>
        g.setNode(node.id, {
            ...node,
            width: node.measured?.width ?? 0,
            height: node.measured?.height ?? 0,
        }),
    );
    Dagre.layout(g);
    return {
        nodes: nodes.map((node) => {
            const position = g.node(node.id);
            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            const x = position.x - (node.measured?.width ?? 0) / 2;
            const y = position.y - (node.measured?.height ?? 0) / 2;
    
            return { ...node, position: { x, y } };
        }),
        edges,
    };
};

function layoutBox(node: Node, options: PlotLayoutOptions): LayoutResult {
    // TODO: implement the intra-object layout
    return { nodes: [node], edges: [] };
}
