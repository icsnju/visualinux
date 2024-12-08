import type { Node, BuiltInNode } from '@xyflow/react';
import { Box } from '@app/visual/type';

export type Group = Node<{ label: string }, 'group'>;
export type PositionLoggerNode = Node<{ label: string }, 'position-logger'>;

export type MyNode = Node<{ label: string, members: string[], depth: number, notifier?: () => void }, 'mynode'>;

type NodeMetadata = {
    depth: number,
    collapsed: boolean,
    notifier?: (id: string) => void
}
export type BoxNode = Node<Box & NodeMetadata, 'box'>;

export type AppNode = BuiltInNode | Group | PositionLoggerNode | BoxNode;

// export type VObject = Node<{
//     label: string
//     children: string[]
//     depth: number
// }, 'vobject'>;

// export type Field = Node<{
//     label: string 
//     value: string
//     depth: number
// }, 'field'>;
// export type AppNode = BuiltInNode | Group | PositionLoggerNode | MyNode | VObject | Field;
