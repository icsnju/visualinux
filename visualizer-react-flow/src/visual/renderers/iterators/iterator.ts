import { RendererInternalState } from "@app/visual/renderers/pass";
import { ReactFlowGraph, BoxNodeData, ContainerNodeData } from "@app/visual/types";

export abstract class StateViewIterator {
    public static traverse(
        _istat: RendererInternalState,
        _graph: ReactFlowGraph,
        _fnBox: (data: BoxNodeData) => BoxNodeData,
        _fnContainer: (data: ContainerNodeData) => ContainerNodeData,
        _roots?: string[]
    ): void {
        throw new Error('ReactFlowIterator.traverse() must be implemented by a Iterator subclass');
    }
    protected istat: RendererInternalState;
    protected graph: ReactFlowGraph;
    protected roots: string[];
    protected fnBox: (data: BoxNodeData) => BoxNodeData
    protected fnContainer: (data: ContainerNodeData) => ContainerNodeData
    protected visited: Set<string>;
    constructor(
        istat: RendererInternalState,
        graph: ReactFlowGraph,
        fnBox: (data: BoxNodeData) => BoxNodeData,
        fnContainer: (data: ContainerNodeData) => ContainerNodeData,
        roots?: string[]
    ) {
        this.istat       = istat;
        this.graph       = graph;
        this.fnBox       = fnBox;
        this.fnContainer = fnContainer;
        this.visited     = new Set<string>();
        this.roots       = roots || [];
    }
    public abstract traverse(): void;
}
