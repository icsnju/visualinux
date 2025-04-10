import {
    StateView, Box, Abst, Container,
    ViewAttrs, NodeAttrs,
    BoxNode, ContainerNode,
    BoxNodeData, ContainerNodeData,
    ReactFlowGraph,
} from "@app/visual/types";

// renderer pass
export abstract class RendererPass {
    public static render(_istat: RendererInternalState, _graph: ReactFlowGraph): ReactFlowGraph {
        throw new Error('RendererPass.render() must be implemented by a Pass subclass');
        const pass = new (this as any)(_istat);
        return pass.render();
    }
    protected istat: RendererInternalState;
    protected graph: ReactFlowGraph;
    constructor(istat: RendererInternalState, graph: ReactFlowGraph) {
        this.istat = istat;
        this.graph = graph;
    }
    public abstract render(): ReactFlowGraph;
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
            return this.getAttrs(key).view || 'default';
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
