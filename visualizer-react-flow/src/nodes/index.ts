import type { NodeTypes } from '@xyflow/react';

import { AppNode } from './types';
import { PositionLoggerNode } from './PositionLoggerNode';
import { MyNode } from './MyNode';

export const initialNodes: AppNode[] = [
    { id: 'a', type: 'input', position: { x: 0, y: 0 }, data: { label: 'wire' } },
    {
        id: 'b',
        type: 'position-logger',
        position: { x: -100, y: 100 },
        data: { label: 'drag me!' },
    },
    { id: 'c', position: { x: 100, y: 100 }, data: { label: 'your ideas' } },
    {
        id: 'd',
        type: 'output',
        position: { x: 0, y: 200 },
        data: { label: 'with React Flow' },
    },
    {
        id: '4',
        data: { label: 'Group B' },
        position: { x: 320, y: 200 },
        style: { width: 300, height: 300 },
        type: 'group',
    }, {
        id: 'e',
        type: 'mynode',
        position: { x: 30, y: 30 },
        data: {
            label: 'test',
            members: ['refcount.count', 'ttk', 'q2eqeq', 'tzmttk', 'fofofo', '13123', 'ddaggad', 'aaga', 'foggddoo', 'bar']
        },
        parentId: '4',
        extent: 'parent',
        draggable: false,
        selectable: true,
    }, {
        id: 'f',
        type: 'mynode',
        position: { x: 120, y: 10 },
        data: {
            label: 'test',
            members: ['foggddoo', 'bar']
        },
        parentId: 'e',
        extent: 'parent',
        draggable: false,
        selectable: true,
    },
];

export const nodeTypes = {
    'position-logger': PositionLoggerNode,
    'mynode': MyNode,
    // Add any of your custom nodes here!
} satisfies NodeTypes;
