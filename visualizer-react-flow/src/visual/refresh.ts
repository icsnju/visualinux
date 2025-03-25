import { ReactFlowGraph, ReactFlowNode, BoxNodeData, ContainerNodeData, ContainerNode, BoxNode } from "@app/visual/types";
import { ReactFlowLayouter } from "@app/visual/layout";
import { type Edge } from "@xyflow/react";

type ReactFlowNodeData = BoxNodeData | ContainerNodeData;
function isBoxNodeData(data: ReactFlowNodeData): data is BoxNodeData {
    return !Array.isArray(data.members);
}

export class ReactFlowRefresher {
    public static refresh(graph: ReactFlowGraph, id: string, rootId: string, type: string): ReactFlowGraph {
        console.log('refresh', id, rootId, type);
        const refresher = new ReactFlowRefresher(graph, id, rootId, type);
        return refresher.refresh();
    }
    private graph: ReactFlowGraph;
    private updId: string;
    private updRootId: string;
    private updType: string;
    private intraNodes: Set<string>;
    private intraNodeCollapsed: boolean;
    private nodeMap: { [key: string]: BoxNode | ContainerNode };
    private fuckedNodes: Set<string>;
    private trimmedNodes: Set<string>;
    constructor(graph: ReactFlowGraph, id: string, rootId: string, type: string) {
        this.graph = graph;
        this.updId = id;
        this.updRootId = rootId;
        this.updType = type;
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
        // TODO: use passes
        this.nodeMap = {};
        for (const node of this.graph.nodes) {
            this.nodeMap[node.id] = node;
        }
        this.fuckedNodes = new Set<string>();
        this.trimmedNodes = new Set<string>();
    }
    private refresh(): ReactFlowGraph {
        if (this.updType == 'collapsed') {
            let updatedNodes = this.graph.nodes.map(nd => this.refreshNode(nd));
            let updatedEdges = this.graph.edges.map(ed => this.refreshEdge(ed));
            let graph = ReactFlowLayouter.layout({nodes: updatedNodes, edges: updatedEdges});
            return graph;
        }
        if (this.updType == 'trimmed') {
            let nodeToTrim = this.nodeMap[this.updId];
            if (nodeToTrim !== undefined) {
                this.setTrimFrom(nodeToTrim, !nodeToTrim.data.trimmed);
                let updatedNodes = this.graph.nodes.map(nd => {
                    if (this.fuckedNodes.has(nd.id)) {
                        let nnode = {
                            ...nd,
                            data: {
                                ...nd.data,
                                trimmed: this.trimmedNodes.has(nd.id)
                            }
                        } as ReactFlowNode;
                        this.nodeMap[nd.id] = nnode;
                        return nnode;
                    }
                    return { ...nd };
                });
                for (const node of updatedNodes) {
                    if (node.type == 'box') {
                        this.fuckallfortargettrimmed(node.data, this.updId);
                    }
                }
                let updatedEdges = this.graph.edges.map(ed => {
                    let shouldHidden = this.nodeMap[ed.source].data.trimmed || this.nodeMap[ed.target].data.trimmed;
                    if (ed.hidden != shouldHidden) {
                        return {
                            ...ed,
                            hidden: shouldHidden
                        } as Edge;
                    }
                    return { ...ed };
                });
                let graph = ReactFlowLayouter.layout({nodes: updatedNodes, edges: updatedEdges});
                return graph;
            }
            return this.graph;
        }
        return this.graph;
    }
    // TODO: proj structure refinement: use passes
    private setTrimFrom(node: BoxNode | ContainerNode, trimmed: boolean) {
        if (node.type == 'box') {
            this.setTrimForBoxData(node.data, trimmed);
        } else if (node.type == 'container') {
            this.setTrimForContainerData(node.data, trimmed);
        }
    }
    private setTrimForBoxData(data: BoxNodeData, trimmed: boolean) {
        if (this.fuckedNodes.has(data.key)) {
            return;
        }
        this.fuckedNodes.add(data.key);
        if (trimmed) this.trimmedNodes.add(data.key);
        for (let member of Object.values(data.members)) {
            let nodeToTrim: BoxNode | ContainerNode | undefined;  
            // bug: link to inner box is bad
            if (member.class == 'link' && member.target !== null) {
                nodeToTrim = this.nodeMap[member.target];
            }
            if (member.class == 'box') {
                nodeToTrim = this.nodeMap[member.object];
                if (nodeToTrim === undefined) {
                    let nmdata = this.fuckfind(member.object);
                    if (nmdata !== undefined) {
                        this.setTrimForBoxData(nmdata, trimmed);
                    }
                }
            }
            if (nodeToTrim !== undefined) {
                if (nodeToTrim.type == 'box') {
                    this.setTrimForBoxData(nodeToTrim.data, trimmed);
                } else if (nodeToTrim.type == 'container') {
                    this.setTrimForContainerData(nodeToTrim.data, trimmed);
                }
            }
        }
    }
    private fuckallfortargettrimmed(data: BoxNodeData, key: string) {
        for (const member of Object.values(data.members)) {
            if (member.class == 'link' && member.target !== null) {
                member.isTargetTrimmed = this.nodeMap[member.target]?.data.trimmed ?? false;
            }
            if (member.class == 'box') {
                this.fuckallfortargettrimmed(member.data, key);
            }
        }
    }
    private fuckfind(key: string): BoxNodeData | undefined {
        for (const node of this.graph.nodes) {
            if (node.type == 'box') {
                let data = this.fuckfinddata(node.data, key);
                if (data !== undefined) return data;
            }
        }
        return undefined;
    }
    private fuckfinddata(data: BoxNodeData, key: string): BoxNodeData | undefined {
        for (const member of Object.values(data.members)) {
            if (member.class == 'box') {
                if (member.object == key) return member.data;
                let data = this.fuckfinddata(member.data, key);
                if (data !== undefined) return data;
            }
        }
        return undefined;
    }
    private setTrimForContainerData(data: ContainerNodeData, trimmed: boolean) {
        if (this.fuckedNodes.has(data.key)) {
            return;
        }
        this.fuckedNodes.add(data.key);
        if (trimmed) this.trimmedNodes.add(data.key);
        for (let member of data.members) {
            if (member.key !== null) {
                this.setTrimFrom(this.nodeMap[member.key], trimmed);
            }
        }
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
        return { ...edge };
    }
}
