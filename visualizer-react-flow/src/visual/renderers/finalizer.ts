import {
    ReactFlowGraph, BoxNode, ContainerNode,
} from "@app/visual/types";
import { ReactFlowLayouter } from "../layout";

// a special pass that performs some breaking changes for final optimization
// export class Finalizer extends RendererPass {
export class Finalizer {
    public static render(graph: ReactFlowGraph): ReactFlowGraph {
        const finalizer = new Finalizer(graph);
        return finalizer.render();
    }
    private graph: ReactFlowGraph;
    private nodeMap: { [key: string]: BoxNode | ContainerNode } = {};
    constructor(graph: ReactFlowGraph) {
        this.graph = {
            nodes: graph.nodes.map(node => ({ ...node })),
            edges: graph.edges.map(edge => ({ ...edge })),
        };
        this.nodeMap = {};
        for (const node of graph.nodes) {
            this.nodeMap[node.id] = node;
        }
    }
    private render() {
        this.removeTrimmed();
        this.graph = ReactFlowLayouter.layout(this.graph);
        return this.graph;
    }
    private removeTrimmed() {
        let trimmedNodes = new Set<string>();
        for (const node of this.graph.nodes) {
            if (node.data.trimmed) {
                trimmedNodes.add(node.id);
            }
        }
        for (let node of this.graph.nodes) {
            if (node.type == 'box') {
                for (let member of Object.values(node.data.members)) {
                    if (member.class == 'link' && member.target !== null && trimmedNodes.has(member.target)) {
                        member.isTargetTrimmed = true;
                    }
                }
            } else if (node.type == 'container') {
                node.data = { ...node.data };
                node.data.members = node.data.members.filter(member => member.key !== null && !trimmedNodes.has(member.key));
                this.removeTrimmedContainerMembers(node, trimmedNodes);
            }
        }
        this.graph.nodes = this.graph.nodes.filter(node => {
            return !node.data.trimmed;
        });
        this.graph.edges = this.graph.edges.filter(edge => {
            return !this.nodeMap[edge.source].data.trimmed && !this.nodeMap[edge.target].data.trimmed;
        });
    }
    private removeTrimmedContainerMembers(node: ContainerNode, trimmedNodes: Set<string>) {
        if (node.data.trimmed) {
            for (let member of node.data.members) {
                if (member.key !== null && !trimmedNodes.has(member.key)) {
                    let memberNode = this.nodeMap[member.key];
                    memberNode.data.trimmed = true;
                    if (memberNode.type == 'container') {
                        this.removeTrimmedContainerMembers(memberNode, trimmedNodes);
                    }
                }
            }
        }
    }
}
