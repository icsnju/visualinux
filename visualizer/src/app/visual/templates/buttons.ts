import * as go from "gojs";

import { goGroupData, goNodeData } from "@app/visual/gotype";

export function updateExpansion(node: go.Node) {
    if (node.diagram == null) {
        console.log('updateExpansion: node.diagram is null', node);
        return;
    }
    setExpansionFrom(node.diagram, node, !node.data.isShrinked, node.data.group as string);
}
function setExpansionFrom(diagram: go.Diagram, node: go.Node, isShrinked: boolean, start: string) {
    let nodeData = node.data as goNodeData;
    // console.log('setExpansionFrom', nodeData.key, isShrinked, nodeData);
    diagram.model.setDataProperty(nodeData, "isShrinked", isShrinked);
    let it = node.findNodesOutOf();
    while (it.next()) {
        setExpansionFromShape(diagram, it.value.data.key, isShrinked, start);
    }
}
function setExpansionFromShape(diagram: go.Diagram, key: string | null, isShrinked: boolean, start: string) {
    if (key == null || key == start) {
        return;
    }
    let nodeData = diagram.model.findNodeDataForKey(key) as goGroupData;
    if (nodeData == null) {
        return;
    }
    // console.log('setExpShp', key, isShrinked);
    // console.log('  before:', nodeData.isShrinked);
    diagram.model.setDataProperty(nodeData, "isShrinked", isShrinked);
    if (!nodeData.outTargets) {
        return;
    }
    for (let next_key of nodeData.outTargets) {
        setExpansionFromShape(diagram, next_key, isShrinked, key);
    }
}
