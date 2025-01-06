import {
    View, Box, Abst,
    Container, ContainerConv, isContainerConv,
    ViewAttrs,
    ReactFlowGraph, BoxNode, ContainerNode
} from "@app/visual/types";

export function convertToReactFlow(view: View, attrs: ViewAttrs): ReactFlowGraph {
    const converter = new ReactFlowConverter(view, attrs);
    return converter.convert();
}

class ReactFlowConverter {
    private view: View;
    private attrs: ViewAttrs;
    private nodeMap: { [key: string]: BoxNode | ContainerNode };
    private graph: ReactFlowGraph;
    constructor(view: View, attrs: ViewAttrs) {
        this.view = view;
        this.attrs = attrs;
        this.nodeMap = {};
        this.graph = { nodes: [], edges: [] };
    }
    public convert(): ReactFlowGraph {
        for (const key of this.view.plot) {
            this.convertShape(key);
        }
        return this.graph;
    }
    private convertShape(key: string) {
        // avoid redundant conversion
        if (this.nodeMap[key] != null) {
            return;
        }
        // convert according to the node type
        if (key in this.view.pool.boxes) {
            this.convertBox(key);
        } else if (key in this.view.pool.containers) {
            this.convertContainer(key);
        }
        // post process
        for (const node of this.graph.nodes) {
            // estimate the box size for layout
            if (node.type === 'box') {
                this.estimateBoxNodeWidth(node);
                this.estimateBoxNodeHeight(node);
            } else if (node.type === 'container') {
                // this.estimateContainerNodeSize(node);
            }
        }
    }
    //
    // convert functions (in the parent-first order)
    //
    private convertBox(key: string) {
        // get box and attrs
        const box = this.view.pool.boxes[key];
        const attrs = this.attrs[key] || {};
        console.log('convertBox', key, box, attrs);
        // convert parent first since react flow requires parent nodes to be listed before their children
        if (box.parent != null) {
            this.convertShape(box.parent);
        }
        const depth = box.parent != null ? this.nodeMap[box.parent].data.depth + 1 : 0;
        // avoid redundant conversion
        if (this.nodeMap[key] != null) {
            return;
        }
        // handle view inheritance to get all members
        const abst = box.absts[attrs.view || 'default'];
        const members = this.getMembersOfBox(box, abst);
        console.log('attrs.view', attrs.view, members);
        // convert the box itself
        let node: BoxNode = {
            id: key, type: "box",
            data: {
                key: key,
                type: box.type, addr: box.addr, label: box.label,
                members: members,
                parent: box.parent,
                depth: depth,
                collapsed: attrs.collapsed === 'true',
            },
            position: { x: 0, y: 0 }
        };
        if (box.parent != null) {
            node.parentId = box.parent;
            node.extent = 'parent';
        }
        this.nodeMap[node.id] = node;
        this.graph.nodes.push(node);
        // convert the pointers, pointed nodes, and nested boxes
        for (const memberKey in members) {
            const member = members[memberKey];
            if (member.class === 'link' && member.target != null) {
                // convert the pointer and pointed node
                this.graph.edges.push({
                    id: `${box.key}.${memberKey}`,
                    // id: `${box.key}.${memberKey}->${member.target}`,
                    source: box.key,
                    sourceHandle: memberKey,
                    target: member.target,
                    zIndex: 10,
                    style: { stroke: 'black' }, // TODO: use custom edge component
                });
                this.convertShape(member.target);
            } else if (member.class === 'box') {
                this.convertShape(member.object);
            }
        }
    }
    private getMembersOfBox(box: Box, abst: Abst): typeof abst.members {
        if (abst.parent === null) {
            return { ...abst.members };
        }
        const parentMembers = this.getMembersOfBox(box, box.absts[abst.parent]);
        return { ...parentMembers, ...abst.members };
    }
    private convertContainer(key: string) {
        // get container and attrs
        const container = this.view.pool.containers[key];
        const attrs = this.attrs[key] || {};
        console.log('convertContainer', key, container, attrs);
        // convert parent first since react flow requires parent nodes to be listed before their children
        if (container.parent != null) {
            this.convertShape(container.parent);
        }
        const depth = container.parent != null ? this.nodeMap[container.parent].data.depth + 1 : 0;
        // avoid redundant conversion
        if (this.nodeMap[key] != null) {
            return;
        }
        // TODO: conv
        if (isContainerConv(container)) {
            return;
        }
        // convert the container itself
        let node: ContainerNode = {
            id: container.key,
            type: "container",
            data: {
                key: container.key,
                label: container.label,
                members: {},
                parent: container.parent,
                depth: depth,
                collapsed: attrs.collapsed === 'true',
            },
            position: { x: 0, y: 0 }
        };
        this.nodeMap[node.id] = node;
        this.graph.nodes.push(node);
        // convert its members
        for (const member of Object.values(container.members)) {
            this.convertShape(member.key);
            const memberBox = this.nodeMap[member.key];
            for (const [label, target] of Object.entries(member.links)) {
                if (!(label in memberBox.data.members)) {
                    memberBox.data.members[label] = {
                        class: 'link',
                        type: 'DIRECT',
                        target: target,
                    };
                }
                if (target != null) {
                    this.graph.edges.push({
                        id: `${member.key}.${label}`,
                        source: member.key,
                        sourceHandle: label,
                        target: target,
                        zIndex: 10,
                        style: { stroke: 'black' }, // TODO: use custom edge component
                    });
                    this.convertShape(target);
                }
            }
        }
    }
    //
    // post process functions
    //
    private estimateBoxNodeWidth(node: BoxNode) {
        node.width = 232 - 8 * node.data.depth;
    }
    private estimateBoxNodeHeight(node: BoxNode) {
        const memberList = Object.values(node.data.members);
        const boxMembers = memberList.filter(m => m.class === 'box');
        const nonBoxMembersCount = memberList.length - boxMembers.length;
        let height = 32 + 16 * nonBoxMembersCount;
        for (let member of boxMembers) {
            const memberNode = this.nodeMap[member.object];
            if (memberNode.type === 'box') {
                this.estimateBoxNodeHeight(memberNode);
            } else if (memberNode.type === 'container') {
                // this.estimateContainerNodeHeight(memberNode);
            }
            if (memberNode.height === undefined) {
                throw new Error(`memberNode.height should not be undefined here: ${memberNode.id}`);
            }
            height += memberNode.height;
        }
        node.height = height;
    }
}
