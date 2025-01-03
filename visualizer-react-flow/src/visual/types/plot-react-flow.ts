import { ViewAttrs } from './plot-model';

export type ReactFlowPlot = {
    key: string
    timestamp: number
    views: {[name: string]: ReactFlowGraph}
}

// TODO: think it carefully
export type ReactFlowGraph = {
    name: string
    init_attrs: ViewAttrs
    stat: number
}
