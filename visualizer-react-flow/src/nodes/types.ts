import type { Node, BuiltInNode } from '@xyflow/react';

export type Group = Node<{ label: string }, 'group'>;
export type PositionLoggerNode = Node<{ label: string }, 'position-logger'>;
export type MyNode = Node<{ label: string, members: string[] }, 'mynode'>;
export type AppNode = BuiltInNode | Group | PositionLoggerNode | MyNode;
