import { View, Box, Abst, ViewAttrs, NodeAttrs, ReactFlowGraph, BoxNode } from "@app/visual/types";

export function convertToReactFlow(view: View, attrs: ViewAttrs) {
    let graph: ReactFlowGraph = { nodes: [], edges: [] };
    for (const key in view.pool.boxes) {
        const box = view.pool.boxes[key];
        const boxAttrs = attrs[key] || {};
        convertBox(box, boxAttrs, graph);
    }
    return graph;
}

function convertBox(box: Box, attrs: NodeAttrs, graph: ReactFlowGraph) {
    // handle view inheritance to get all members
    const abst = box.absts[attrs.view || 'default'];
    const members = getAllMembers(box, abst);
    // convert the box itself
    let node: BoxNode = {
        id: box.key,
        type: "box",
        data: {
            key: box.key, type: box.type, addr: box.addr, label: box.label,
            members: members,
            parent: box.parent,
            depth: 0,
            collapsed: attrs.collapsed === 'true',
        },
        position: { x: 0, y: 0 },
    };
    graph.nodes.push(node);
    // convert pointers and nested boxes
    for (const memberKey in members) {
        const member = members[memberKey];
        switch (member.class) {
            case 'link':
                if (member.target != null) {
                    graph.edges.push({
                        id: `${box.key}.${memberKey}->${member.target}`,
                        source: box.key,
                        sourceHandle: memberKey,
                        target: member.target,
                    });
                }
                break;
            case 'box':
                // convertBox(member.object, attrs, graph);
                break;
            default:
                break;
        }
    }
    // convert the nested boxes
}

function getAllMembers(box: Box, abst: Abst): typeof abst.members {
    if (abst.parent === null) {
        return { ...abst.members };
    }
    const parentMembers = getAllMembers(box, box.absts[abst.parent]);
    return { ...parentMembers, ...abst.members };
}
