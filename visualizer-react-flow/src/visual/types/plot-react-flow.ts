import { type Edge, type Node } from '@xyflow/react';
import { ViewAttrs } from './plot-model';

export type ReactFlowPlot = {
    key: string
    timestamp: number
    views: {[name: string]: ReactFlowGraph}
}

// TODO: think it carefully
export type ReactFlowGraph = {
    nodes: Node[]
    edges: Edge[]
}
