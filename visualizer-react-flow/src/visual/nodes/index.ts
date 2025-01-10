import type { Node, NodeTypes } from "@xyflow/react";
import BoxNode from "@app/visual/nodes/BoxNode";
import ContainerNode from "@app/visual/nodes/ContainerNode";

export type Group = Node<{ label: string }, 'group'>;

export const nodeTypes = {
    'box': BoxNode,
    'container': ContainerNode,
} satisfies NodeTypes;
