import {
    StateView, Box, Abst, Container,
    ViewAttrs, NodeAttrs,
    BoxNode, ContainerNode,
    BoxNodeData, ContainerNodeData,
    ReactFlowGraph,
} from "@app/visual/types";

// renderer pass
export abstract class RendererPass {
    public static render(istat: RendererInternalState, graph: ReactFlowGraph): ReactFlowGraph {
        throw new Error('RendererPass.render() must be implemented by a Pass subclass');
        const pass = new (this as any)(istat);
        return pass.render();
    }
    protected istat: RendererInternalState;
    protected graph: ReactFlowGraph;
    constructor(istat: RendererInternalState, graph: ReactFlowGraph) {
        this.istat = istat;
        this.graph = graph;
    }
    public abstract render(): ReactFlowGraph;
    public refreshEachNodeData(
        fnBoxNodeData: (data: BoxNodeData) => BoxNodeData,
        fnContainerNodeData: (data: ContainerNodeData) => ContainerNodeData
    ) {
        return this.graph.nodes.map(node => {
            if (node.type == 'box') {
                return {
                    ...node,
                    data: this.refreshBoxNodeData(node.data, fnBoxNodeData)
                }
            } else if (node.type == 'container') {
                return {
                    ...node,
                    data: fnContainerNodeData(node.data)
                }
            }
            return { ...node };
        });
    }
    public refreshBoxNodeData(data: BoxNodeData, fn: (data: BoxNodeData) => BoxNodeData) {
        let updatedData = fn(data);
        for (let [label, member] of Object.entries(data.members)) {
            if (member.class == 'box') {
                updatedData.members[label] = {
                    ...member,
                    data: this.refreshBoxNodeData(member.data, fn)
                };
            }
        }
        return updatedData;
    }
}

type ReactFlowNodeData = BoxNodeData | ContainerNodeData;
function isBoxNodeData(data: ReactFlowNodeData): data is BoxNodeData {
    return !Array.isArray(data.members);
}

// internal state across multiple passes during rendering
// maintains metadata for objects in the view
export class RendererInternalState {
    public view:  StateView;
    public attrs: ViewAttrs;
    public rootMap: { [key: string]: string } = {};
    public nodeMap: { [key: string]: BoxNode | ContainerNode } = {};
    public containerMembers: Set<string> = new Set<string>();
    public loggers: { [name: string]: RendererLogger } = {};
    constructor(view: StateView, attrs: ViewAttrs) {
        this.view  = view;
        this.attrs = attrs;
    }
    public getAttrs(key: string) {
        return this.attrs[key] || {};
    }
    public getShapeView(key: string) {
        if (this.view.hasShape(key)) {
            return this.attrs[key].view || 'default';
        }
        throw new Error(`getShapeView: shape ${key} not found`);
    }
    public isShapeOutmost(key: string) {
        return this.rootMap[key] == key;
    }
    public isShapeContainerMember(key: string) {
        return this.containerMembers.has(key);
    }
    public getLogger(name: string) {
        if (!(name in this.loggers)) {
            this.loggers[name] = new RendererLogger();
        }
        return this.loggers[name];
    }
}

export class RendererLogger {
    public logs: RendererLog[] = [];
    public log(...args: any[]) {
        this.logs.push({ level: 'info', content: args });
    }
    public error(...args: any[]) {
        this.logs.push({ level: 'error', content: args });
    }
}

type RendererLog = {
    level: string;
    content: any[];
}
