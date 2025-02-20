import { ShapeDiffInfo, TextMember, LinkMember, ContainerMember } from "@app/visual/types/plot-model";
import { type Edge, type Node } from "@xyflow/react";

export type ReactFlowPlot = {
    key: string
    timestamp: number
    views: {[name: string]: ReactFlowGraph}
}

export type ReactFlowGraph = {
    nodes: ReactFlowNode[]
    edges: Edge[]
}
export type ReactFlowNode = BoxNode | ContainerNode;
export type BoxNode = Node<BoxNodeData, 'box'>;
export type ContainerNode = Node<ContainerNodeData, 'container'>;

type NodeMetadata = {
    notifier?: (id: string, rootId: string) => void,
    parentCollapsed?: boolean,
}
type BoxNodeMetadata = {
    collapsed: boolean,
} & NodeMetadata
type ContainerNodeMetadata = {
    collapsed: boolean,
    direction: string,
} & NodeMetadata

type BoxNodeMember = TextMember | LinkMember | ({
    class:  'box'
    object: string
    data:   BoxNodeData
} & ShapeDiffInfo)

export type BoxNodeData = {
    key:      string
    type:     string
    addr:     string
    label:    string
    members:  {[label: string]: BoxNodeMember}
    parent:   string | null
} & ShapeDiffInfo & BoxNodeMetadata

export type ContainerNodeData = {
    key:     string
    type:    string
    label:   string
    members: ContainerMember[]
    parent:  string | null
} & ShapeDiffInfo & ContainerNodeMetadata
