import { ReactFlowGraph } from "@app/visual/types";
import { RendererInternalState, RendererPass } from "@app/visual/renderers/pass";
import { EachIterator } from "@app/visual/renderers/iterators/each";
import { SubtreeIterator } from "./iterators/subtree";

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
            (data) => {
                const attrs = this.istat.getAttrs(data.key);
                data.collapsed = attrs.collapsed == 'true';
                return data;
            },
            (data) => {
                const attrs = this.istat.getAttrs(data.key);
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
        const trimmedNodes = this.graph.nodes.filter(
            n => this.istat.getAttrs(n.id).trimmed == 'true'
        ).map(
            n => n.id
        );
        SubtreeIterator.traverse(this.istat, this.graph,
            (data) => {
                data.trimmed = true;
                return data;
            },
            (data) => {
                data.trimmed = true;
                return data;
            },
            trimmedNodes
        );
    }
}
