import { ReactFlowGraph, BoxNode, ContainerNode } from "@app/visual/types";
import { RendererInternalState, RendererPass } from "@app/visual/renderers/pass";
import { EachIterator } from "@app/visual/renderers/iterators/each";

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
        EachIterator.traverse(this.istat, this.graph,
            (id, data) => {
                const attrs = this.istat.getAttrs(id);
                data.collapsed = attrs.collapsed == 'true';
                return data;
            },
            (id, data) => {
                const attrs = this.istat.getAttrs(id);
                data.direction = attrs.direction || 'horizontal';
                for (const member of data.members) {
                    let edgeCandidates = this.graph.edges.filter(e => e.source == member.key);
                    for (const label of Object.keys(member.links)) {
                        if (member.key === null) {
                            continue;
                        }
                        const edgeHandle = `${member.key}.${label}`;
                        let edge = edgeCandidates.find(e => e.id.startsWith(edgeHandle));
                        if (edge === undefined) {
                            continue;
                        }
                        if (data.direction == 'horizontal') {
                            edge.sourceHandle = edgeHandle;
                            edge.targetHandle = edge.target;
                        } else {
                            edge.sourceHandle = member.key + '#B';
                            edge.targetHandle = edge.target + '#T';
                        }
                    }
                }
                return data;
            }
        )
    }
    private setTrimmed() {
        // for (let node of this.graph.nodes) {
        //     if (this.istat.getAttrs(node.id).trimmed == 'true') {
        //         this.setTrimmedFor(node);
        //     }
        // }
    }
    private setTrimmedFor(nd: BoxNode | ContainerNode) {
        if (nd.data.trimmed) {
            return;
        }
        nd.data.trimmed = true;
        // if (nd.type == 'box') {
        //     for (let member of Object.values(nd.data.members)) {
        //         if (member.class == 'box') {
        //             this.setTrimmedFor(this.istat.nodeMap[member.object]);
        //         } else if (member.class == 'link' && member.target !== null) {
        //             this.setTrimmedFor(this.istat.nodeMap[member.target]);
        //         }
        //     }
        // }
    }
}
