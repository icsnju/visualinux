import { StateViewIterator } from "@app/visual/renderers/iterators/iterator";
import { RendererInternalState } from "@app/visual/renderers/pass";
import { ReactFlowGraph, BoxNodeData, ContainerNodeData } from "@app/visual/types";

export class EachIterator extends StateViewIterator {
    public static traverse(
        istat: RendererInternalState,
        graph: ReactFlowGraph,
        fnBox: (id: string, data: BoxNodeData) => BoxNodeData,
        fnContainer: (id: string, data: ContainerNodeData) => ContainerNodeData
    ): void {
        const iterator = new EachIterator(istat, graph, fnBox, fnContainer);
        iterator.traverse();
    }
    public traverse() {
    }
}
