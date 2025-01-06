import { type Edge, type Node } from '@xyflow/react';
import { Member } from './plot-model';

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
    depth: number,
    collapsed: boolean,
    notifier?: (id: string) => void,
    heightMembers: {[label: string]: number},
}

export type BoxNodeData = {
    key:    string
    type:   string
    addr:   string
    label:  string
    members: {[label: string]: Member}
    parent: string | null
} & NodeMetadata

export type ContainerNodeData = {
    key:    string
    label:  string
    members: {[label: string]: Member}
    parent: string | null
} & NodeMetadata
