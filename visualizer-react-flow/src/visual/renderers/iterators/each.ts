import { StateViewIterator } from "@app/visual/renderers/iterators/iterator";
import { RendererInternalState } from "@app/visual/renderers/pass";
import { ReactFlowGraph, BoxNodeData, ContainerNodeData } from "@app/visual/types";

export class EachIterator extends StateViewIterator {
    public static traverse(
        istat: RendererInternalState,
        graph: ReactFlowGraph,
        fnBox: (data: BoxNodeData) => BoxNodeData,
        fnContainer: (data: ContainerNodeData) => ContainerNodeData,
        roots?: string[]
    ): void {
        const iterator = new EachIterator(istat, graph, fnBox, fnContainer, roots);
        iterator.traverse();
    }
    public traverse() {
        this.graph.nodes.map(node => {
            if (node.type == 'box') {
                return {
                    ...node,
                    data: this.traverseBox(node.data)
                }
            } else if (node.type == 'container') {
                return {
                    ...node,
                    data: this.traverseContainer(node.data)
                }
            }
            return { ...node };
        });
    }
    private traverseBox(data: BoxNodeData) {
        let updatedData = { ...this.fnBox(data) };
        for (let [label, member] of Object.entries(data.members)) {
            if (member.class == 'box') {
                updatedData.members[label] = {
                    ...member,
                    data: this.traverseBox(member.data)
                };
            }
        }
        return updatedData;
    }
    private traverseContainer(data: ContainerNodeData) {
        return { ...this.fnContainer(data) }
    }
}
