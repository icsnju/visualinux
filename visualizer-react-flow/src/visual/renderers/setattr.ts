import { ReactFlowGraph, BoxNode, ContainerNode } from "@app/visual/types";
import { RendererInternalState, RendererPass } from "@app/visual/renderers/pass";

export class AttrSetter extends RendererPass {
    public static render(istat: RendererInternalState, graph: ReactFlowGraph): ReactFlowGraph {
        const setter = new AttrSetter(istat, graph);
        return setter.render();
    }
    public render(): ReactFlowGraph {
        console.log('AttrSetter.render()');
        this.setPrimitiveAttrs();
        this.setTrimmed();
        return this.graph;
    }
    private setPrimitiveAttrs() {
        // this.graph.nodes.forEach(nd => {
        //     const attrs = this.istat.getAttrs(nd.id);
        //     nd.data.collapsed = attrs.collapsed == 'true';
        //     if (nd.type == 'container') {
        //         nd.data.direction = attrs.direction || 'horizontal';
        //     }
        // });
    }
    private setTrimmed() {
    }
    private setTrimmedFor(nd: BoxNode | ContainerNode) {
        nd.data.trimmed = true;
        if (nd.type == 'box') {
            for (let member of Object.values(nd.data.members)) {
                if (member.class == 'box') {
                    this.setTrimmedFor(this.istat.nodeMap[member.object]);
                } else if (member.class == 'link' && member.target !== null) {
                    this.setTrimmedFor(this.istat.nodeMap[member.target]);
                }
            }
        }
    }
}
