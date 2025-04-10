import { StateViewIterator } from "@app/visual/renderers/iterators/iterator";
import { RendererInternalState } from "@app/visual/renderers/pass";
import { ReactFlowGraph, BoxNodeData, ContainerNodeData, BoxNode, ContainerNode } from "@app/visual/types";

export class SubtreeIterator extends StateViewIterator {
    public static traverse(
        istat: RendererInternalState,
        graph: ReactFlowGraph,
        fnBox: (data: BoxNodeData) => BoxNodeData,
        fnContainer: (data: ContainerNodeData) => ContainerNodeData,
        roots?: string[]
    ): void {
        const iterator = new SubtreeIterator(istat, graph, fnBox, fnContainer, roots);
        iterator.traverse();
    }
    public traverse() {
        for (const root of this.roots) {
            this.traverseNode(this.istat.getNode(root));
        }
    }
    private traverseNode(node: BoxNode | ContainerNode) {
        if (node.type == 'box') {
            this.traverseBox(node.data);
        } else if (node.type == 'container') {
            this.traverseContainer(node.data);
        }
    }
    private traverseBox(data: BoxNodeData) {
        if (this.visited.has(data.key)) {
            return;
        }
        this.visited.add(data.key);
        this.fnBox(data);
        for (let member of Object.values(data.members)) {
            let succKey: string | undefined;
            if (member.class == 'box') {
                succKey = member.object;
            } else if (member.class == 'link' && member.target !== null) {
                succKey = member.target;
            }
            if (succKey !== undefined && succKey !== '(empty)') {
                let succNode = this.istat.getNode(succKey);
                if (succNode !== undefined) {
                    this.traverseNode(succNode);
                } else {
                    let succNodeData = this.istat.getBoxNodeData(succKey);
                    if (succNodeData !== undefined) {
                        this.traverseBox(succNodeData);
                    } else {
                        throw new Error(`SubtreeIterator: succ node/nodedata ${succKey} not found`);
                    }
                }
            }
        }
    }
    private traverseContainer(data: ContainerNodeData) {
        if (this.visited.has(data.key)) {
            return;
        }
        this.visited.add(data.key);
        this.fnContainer(data);
        for (let member of data.members) {
            if (member.key !== null) {
                this.traverseNode(this.istat.getNode(member.key));
            }
        }
    }
}
