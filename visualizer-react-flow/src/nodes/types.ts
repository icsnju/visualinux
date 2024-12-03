import type { Node, BuiltInNode } from '@xyflow/react';

export type PositionLoggerNode = Node<{ label: string }, 'position-logger'>;
export type MyNode = Node<{ label: string }, 'mynode'>;
export type AppNode = BuiltInNode | PositionLoggerNode | MyNode;
