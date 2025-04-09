import {
    StateView, Box, Abst, Container,
    ViewAttrs, NodeAttrs,
    ReactFlowGraph, BoxNode, ContainerNode,
    BoxNodeData,
} from "@app/visual/types";
import { Edge } from "@xyflow/react";
import { Converter } from "@app/visual/renderers/converter";
import { RendererInternalState, RendererPass } from "@app/visual/renderers/pass";
import { ReactFlowLayouter } from "../layout";
import { AttrSetter } from "@app/visual/renderers/setattr";

const Passes: (typeof RendererPass)[] = [
    AttrSetter,
];

export class Renderer {
    public static render(view: StateView, attrs: ViewAttrs): ReactFlowGraph {
        const renderer = new Renderer(view, attrs);
        return renderer.render();
    }
    private state: RendererInternalState;
    private graph: ReactFlowGraph;
    constructor(view: StateView, attrs: ViewAttrs) {
        this.state = new RendererInternalState(view, attrs);
        this.graph = Converter.convert(this.state);
    }
    private render() {
        for (const Pass of Passes) {
            this.graph = Pass.render(this.state, this.graph);
        }
        this.graph = ReactFlowLayouter.layout(this.graph);
        return this.graph;
    }
}

