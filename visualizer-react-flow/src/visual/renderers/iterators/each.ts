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
        this.graph.nodes.map(node => {
            if (node.type == 'box') {
                return {
                    ...node,
                    data: this.traverseBox(node.id, node.data)
                }
            } else if (node.type == 'container') {
                return {
                    ...node,
                    data: this.traverseContainer(node.id, node.data)
                }
            }
            return { ...node };
        });
    }
    private traverseBox(id: string, data: BoxNodeData) {
        let updatedData = { ...this.fnBox(id, data) };
        for (let [label, member] of Object.entries(data.members)) {
            if (member.class == 'box') {
                updatedData.members[label] = {
                    ...member,
                    data: this.traverseBox(member.object, member.data)
                };
            }
        }
        return updatedData;
    }
    private traverseContainer(id: string, data: ContainerNodeData) {
        return { ...this.fnContainer(id, data) }
    }
}
