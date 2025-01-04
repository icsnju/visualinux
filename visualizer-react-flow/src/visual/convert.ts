import { View, Box, ReactFlowGraph, ViewAttrs, NodeAttrs } from "@app/visual/types";

export function convertToReactFlow(view: View, attrs: ViewAttrs) {
    let graph: ReactFlowGraph = { nodes: [], edges: [] };
    for (const key in view.pool.boxes) {
        const box = view.pool.boxes[key];
        const boxAttrs = attrs[key];
        convertBox(box, boxAttrs, graph);
    }
    return graph;
}

function convertBox(box: Box, attrs: NodeAttrs, graph: ReactFlowGraph) {
    // convert the box itself
    graph.nodes.push({
        id: box.key,
        type: "box",
        data: box,
        position: { x: 0, y: 0 },
    });
    // convert the pointers
    // for (const )
    // result.edges.push
    // convert the nested boxes
}
