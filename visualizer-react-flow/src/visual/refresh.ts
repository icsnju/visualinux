import { ReactFlowGraph, ReactFlowNode, BoxNodeData, ContainerNodeData, ContainerNode } from "@app/visual/types";
import { ReactFlowLayouter } from "@app/visual/layout";
import { type Edge } from "@xyflow/react";

type ReactFlowNodeData = BoxNodeData | ContainerNodeData;
function isBoxNodeData(data: ReactFlowNodeData): data is BoxNodeData {
    return !Array.isArray(data.members);
}

export class ReactFlowRefresher {
    public static refresh(graph: ReactFlowGraph, id: string, rootId: string): ReactFlowGraph {
        console.log('refresh', id, rootId);
        const refresher = new ReactFlowRefresher(graph, id, rootId);
        return refresher.refresh();
    }
    private graph: ReactFlowGraph;
    private updId: string;
    private updRootId: string;
    private intraNodes: Set<string>;
    private intraNodeCollapsed: boolean;
    constructor(graph: ReactFlowGraph, id: string, rootId: string) {
        this.graph = graph;
        this.updId = id;
        this.updRootId = rootId;
        // handle intra-container nodes
        this.intraNodes = new Set<string>();
        let containerNode = this.graph.nodes.find(
            nd => nd.id == this.updId && nd.type == 'container'
        ) as ContainerNode | undefined;
        if (containerNode) {
            for (const member of containerNode.data.members) {
                if (member.key !== null) {
                    this.intraNodes.add(member.key);
                }
            }
        }
        this.intraNodeCollapsed = containerNode ? !containerNode.data.collapsed : false;
    }
    private refresh(): ReactFlowGraph {
        let updatedNodes = this.graph.nodes.map(nd => this.refreshNode(nd));
        let updatedEdges = this.graph.edges.map(ed => this.refreshEdge(ed));
        let graph = ReactFlowLayouter.layout({nodes: updatedNodes, edges: updatedEdges});
        return graph;
    }
    private refreshNode(node: ReactFlowNode): ReactFlowNode {
        if (node.type != 'box' && node.type != 'container') {
            return node;
        }
        if (this.intraNodes.has(node.id)) {
            return {
                ...node,
                data: {
                    ...node.data,
                    parentCollapsed: this.intraNodeCollapsed
                }
            } as ReactFlowNode;
        }
        if (node.id == this.updRootId) {
            return {
                ...node,
                data: this.refreshNodeData(node.data)
            } as ReactFlowNode;
        }
        return { ...node };
    }
    private refreshNodeData(data: ReactFlowNodeData): ReactFlowNodeData {
        if (data.key == this.updId) {
            return {
                ...data,
                collapsed: !data.collapsed
            };
        }
        if (isBoxNodeData(data)) {
            return this.refreshBoxNodeData(data);
        }
        return data;
    }
    private refreshBoxNodeData(data: BoxNodeData): BoxNodeData {
        if (data.key == this.updId) {
            return {
                ...data,
                collapsed: !data.collapsed
            };
        }
        let updatedData = { ...data };
        for (let [label, member] of Object.entries(data.members)) {
            if (member.class == 'box') {
                updatedData.members[label] = {
                    ...member,
                    data: this.refreshBoxNodeData(member.data)
                };
            }
        }
        return updatedData;
    }
    private refreshEdge(edge: Edge): Edge {
        if (this.intraNodes.has(edge.source) && this.intraNodes.has(edge.target)) {
            return { ...edge, hidden: this.intraNodeCollapsed };
        }
        return edge;
    }
}
