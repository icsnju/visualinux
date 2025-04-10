import {
    StateView, Box, Abst, Container,
    ReactFlowGraph, BoxNode, ContainerNode,
    BoxNodeData,
} from "@app/visual/types";
import { type Edge, MarkerType } from "@xyflow/react";

import * as sc from "@app/visual/nodes/styleconf";
import { RendererInternalState } from "@app/visual/renderers/pass";

export class Converter {
    public static convert(istat: RendererInternalState): ReactFlowGraph {
        const converter = new Converter(istat);
        return converter.convert();
    }
    private istat: RendererInternalState;
    private view:  StateView;
    private graph: ReactFlowGraph;
    constructor(istat: RendererInternalState) {
        this.istat  = istat;
        this.view   = istat.view;
        this.graph  = { nodes: [], edges: [] };
    }
    private convert(): ReactFlowGraph {
        // calculate the root box of each shape for further node compaction
        this.view.forEachShapeKey(key => {
            this.calcRootShapeOf(key);
        });
        // convert viewcl shapes to react flow nodes
        this.view.forEachPlotKey(key => {
            this.convertShape(key);
        });
        // return
        console.log('converted graph', this.graph);
        return this.graph;
    }
    private calcRootShapeOf(key: string) {
        // avoid redundant searching
        if (key in this.istat.rootMap) {
            return;
        }
        let shape = this.view.getShape(key);
        // for the outmost shape its root shape is itself
        if (shape.parent === null) {
            this.istat.rootMap[key] = key;
            return;
        }
        // calculate the root shape according to its parent
        this.calcRootShapeOf(shape.parent);
        if (this.view.hasContainer(shape.parent) && !shouldCompactContainer(this.view.getContainer(shape.parent))) {
            this.istat.rootMap[key] = key;
        } else {
            this.istat.rootMap[key] = this.istat.rootMap[shape.parent];
        }
    }
    private convertShape(key: string) {
        // for easy-to-layout and better performance, we only convert the outmost shapes to react flow nodes
        key = this.istat.rootMap[key];
        // avoid redundant conversion
        if (this.istat.nodeMap[key] !== undefined) {
            return;
        }
        // convert according to the node type
        if (this.view.hasBox(key)) {
            this.convertBox(this.view.getBox(key));
        } else if (this.view.hasContainer(key)) {
            this.convertContainer(this.view.getContainer(key));
        } else {
            throw new Error(`convertShape: shape key ${key} is neither box nor container`);
        }
    }
    private convertBox(box: Box) {
        // only convert the outmost shapes
        if (!this.istat.isShapeOutmost(box.key)) {
            return;
        }
        console.log('convertBox', box.key, '?p', box.parent);
        // avoid redundant conversion
        if (this.istat.nodeMap[box.key] !== undefined) {
            return;
        }
        // generate the node
        let node: BoxNode = {
            id: box.key, type: 'box',
            data: {} as BoxNodeData,
            position: { x: 0, y: 0 },
            draggable: false,
        };
        if (box.parent !== null) {
            node.parentId = box.parent;
            node.extent = 'parent';
        }
        this.istat.nodeMap[node.id] = node;
        // convert data after recorded in nodeMap to avoid circular reference
        node.data = this.convertBoxData(box);
        // store
        this.graph.nodes.push(node);
    }
    private convertBoxData(box: Box | Container): BoxNodeData {
        console.log('convertBoxData', box.key, box);
        // handle Container type
        if ('members' in box) {
            const data = this._convertArrayDataToBox(box);
            this.istat.boxNodeDataMap[box.key] = data;
            return data;
        }
        // handle view inheritance to get all members
        const abst = box.absts[this.istat.getShapeView(box.key)];
        const data = {
            key: box.key,
            type: box.type, addr: box.addr, label: box.label,
            members: this.convertBoxMembers(box, abst),
            parent: box.parent,
            isDiffAdd: box.isDiffAdd,
        };
        this.istat.boxNodeDataMap[box.key] = data;
        return data;
    }
    private _convertArrayDataToBox(container: Container): BoxNodeData {
        console.log('treat_cont_as_box', container.key);
        // this is a temp solution
        // TODO: semantics of array-like containers HOWTO?
        if (!shouldCompactContainer(container)) {
            throw new Error(`container.type should be [Array] here: ${container.key}`);
        }
        let nodeData: BoxNodeData = {
            key: container.key,
            type: container.type, addr: container.addr, label: container.label,
            members: {},
            parent: container.parent,
            isDiffAdd: container.isDiffAdd,
        };
        for (const member of container.members) {
            if (member.key !== null) {
                const memberData = this.convertBoxData(this.view.getShape(member.key));
                nodeData.members[member.key] = {
                    class: 'box',
                    object: member.key,
                    data: memberData,
                    isDiffAdd: member.isDiffAdd,
                };
            }
        }
        return nodeData;
    }
    private convertBoxMembers(box: Box, abst: Abst): BoxNodeData['members'] {
        if (abst.parent === null) {
            return this.convertAbstMembers(box, abst)
        }
        const parentMembers = this.convertBoxMembers(box, box.absts[abst.parent]);
        return { ...parentMembers, ...this.convertAbstMembers(box, abst) };
    }
    private convertAbstMembers(box: Box, abst: Abst): BoxNodeData['members'] {
        let members = JSON.parse(JSON.stringify(abst.members)) as BoxNodeData['members'];
        for (let [label, member] of Object.entries(members)) {
            // for links generate the edge and the target node
            if (member.class == 'link') {
                const edgeHandle = `${box.key}.${label}`;
                const convertLinkTarget = (target: string, isDiffAdd: boolean | undefined) => {
                    // for empty containers eliminate the visualization
                    if (this.view.hasContainer(target) && this.view.getContainer(target).members.length == 0) {
                        return '(empty)';
                    }
                    // normal handling
                    const edge: Edge = {
                        id: edgeHandle + (isDiffAdd === undefined ? '' : (isDiffAdd ? '.add' : '.del')),
                        source: this.istat.rootMap[box.key],
                        sourceHandle: edgeHandle,
                        target: this.istat.rootMap[target],
                        targetHandle: target,
                        ...getEdgeProp(isDiffAdd),
                    };
                    this.graph.edges.push(edge);
                    this.convertShape(edge.target);
                    return target;
                }
                if (member.diffOldTarget !== undefined && member.diffOldTarget !== null) {
                    member.diffOldTarget = convertLinkTarget(member.diffOldTarget, false);
                }
                if (member.target !== null) {
                    let isEdgeDiffAdd = undefined;
                    if (member.diffOldTarget !== undefined) {
                        isEdgeDiffAdd = true;
                    }
                    if (box.isDiffAdd !== undefined) {
                        isEdgeDiffAdd = box.isDiffAdd;
                    }
                    member.target = convertLinkTarget(member.target, isEdgeDiffAdd);
                }
            // put data of nested box into the box data
            } else if (member.class == 'box') {
                if (member.object !== null) {
                    member.data = this.convertBoxData(this.view.getShape(member.object));
                }
                // @ts-ignore
                if (member.diffOldObject !== undefined) {
                    // TODO: create a diff node for the old nested box
                }
            }
        }
        return members;
    }
    private convertContainer(container: Container) {
        // only convert the outmost shapes
        if (!this.istat.isShapeOutmost(container.key)) {
            return;
        }
        console.log('convertContainer', container.key, '?p', container.parent);
        // avoid redundant conversion
        if (this.istat.nodeMap[container.key] !== undefined) {
            return;
        }
        // compact array-like containers
        if (false && shouldCompactContainer(container)) {
            // const compactedMembers = Object.fromEntries(
            //     container.members.filter(member => member.key !== null)
            //     .map(member => {
            //         const shape = this.getShape(member.key as string);
            //         const tryCompactMember = () => {
            //             if (isShapeBox(shape) && shape.addr == 'virtual' && Object.keys(shape.absts).length == 1) {
            //                 const memberMembers = Object.entries(shape.absts['default'].members);
            //                 if (memberMembers.length == 1) {
            //                     return memberMembers[0];
            //                 }
            //             }
            //             return null;
            //         }
            //         const compactedMember = tryCompactMember();
            //         if (compactedMember !== null) {
            //             return compactedMember;
            //         } else {
            //             return [member.key, {
            //                 class: 'box',
            //                 object: member.key,
            //             }];
            //         }
            //     })
            // );
            const compacted: Box = {
                key: container.key,
                type: container.type, addr: container.addr, label: container.label, 
                parent: container.parent,
                absts: {
                    default: {
                        members: Object.fromEntries(container.members
                            .filter(member => member.key !== null)
                            .map(member => [
                                member.key, {
                                    class: 'box',
                                    object: member.key,
                                }
                            ])
                        ),
                        parent: null
                    }
                },
                isDiffAdd: container.isDiffAdd,
            }
            this.convertBox(compacted);
            return;
        }
        // generate the node
        let node: ContainerNode = {
            id: container.key,
            type: 'container',
            data: {
                key: container.key,
                type: container.type, addr: container.addr, label: container.label,
                members: Object.values(container.members).filter(member => member.key !== null),
                parent: container.parent,
                isDiffAdd: container.isDiffAdd,
            },
            position: { x: 0, y: 0 },
            draggable: false,
        };
        this.istat.nodeMap[node.id] = node;
        this.graph.nodes.push(node);
        // convert its members
        for (const member of node.data.members) {
            if (member.key === null) {
                continue;
            }
            this.convertShape(member.key);
            const memberNode = this.istat.nodeMap[member.key];
            if (memberNode === undefined) {
                console.error(`container ${container.key} memberNode undefined: ${member.key}`);
                continue;
            }
            if (memberNode.type != 'box') {
                continue;
            }
            for (const [label, link] of Object.entries(member.links)) {
                if (label in memberNode.data.members) {
                    continue;
                    // throw new Error(`container ${container.key} member ${member.key} link ${label} already exists`);
                }
                memberNode.data.members[label] = link;
                const convertLinkTarget = (target: string, isDiffAdd: boolean | undefined) => {
                    if (member.key === null) {
                        return;
                    }
                    const edgeHandle = `${member.key}.${label}`;
                    const sourceHandle = edgeHandle;
                    const targetHandle = target;
                    const edge: Edge = {
                        id: edgeHandle + (isDiffAdd === undefined ? '' : (isDiffAdd ? '.add' : '.del')),
                        source: member.key,
                        sourceHandle: sourceHandle,
                        target: target,
                        targetHandle: targetHandle,
                        ...getEdgeProp(isDiffAdd)
                    };
                    this.graph.edges.push(edge);
                    this.convertShape(edge.target);
                    // TODO: do this in another pass
                    // this.istat.nodeMap[edge.target].data.isContainerMember = true;
                }
                if (link.diffOldTarget !== undefined && link.diffOldTarget !== null) {
                    convertLinkTarget(link.diffOldTarget, false);
                }
                if (link.target !== null) {
                    let isEdgeDiffAdd = undefined;
                    if (link.diffOldTarget !== undefined) {
                        isEdgeDiffAdd = true;
                    }
                    const box = this.view.getShape(member.key);
                    if (box.isDiffAdd !== undefined) {
                        isEdgeDiffAdd = box.isDiffAdd;
                    }
                    convertLinkTarget(link.target, isEdgeDiffAdd);
                }
            }
        }
    }
}

const getEdgeProp = (isDiffAdd: boolean | undefined) => {
    return {
        // type: 'bezier',
        zIndex: 10,
        style: {
            stroke: sc.TextColor(isDiffAdd),
            strokeWidth: 1.5,
        },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18, height: 18,
            color: sc.TextColor(isDiffAdd),
        },
    }
}

function shouldCompactContainer(container: Container) {
    return ['[Array]', '[XArray]'].includes(container.type);
}
