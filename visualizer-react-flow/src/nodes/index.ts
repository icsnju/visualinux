import type { NodeTypes } from '@xyflow/react';

import { AppNode } from './types';
import { PositionLoggerNode } from './PositionLoggerNode';
import BoxNode from './BoxNode';

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
        position: { x: 150, y: 300 },
        style: { width: 300, height: 150 },
        type: 'group',
    }, {
        id: '0xaa:task_struct',
        type: 'box',
        position: { x: 320, y: 30 },
        data: {
            key: '0xaa:task_struct',
            type: 'task_struct',
            addr: '0xaa',
            label: 'test',
            absts: {
                'default': {
                    parent: null,
                    members: {
                        'refcount.count': {
                            class: 'text',
                            type: 'int',
                            size: 4,
                            value: '2147483647'
                        },
                        'foo': {
                            class: 'text',
                            type: 'string',
                            size: 3,
                            value: 'bar'
                        },
                        'se': {
                            class: 'box',
                            object: '0xab:sched_entity',
                            abst: 'default'
                        },
                        'faasdsad': {
                            class: 'text',
                            type: 'uint64_t',
                            size: 8,
                            value: '9223372036854775808'
                        },
                    },
                    distilled: false
                },
            },
            parent: null,
            depth: 0,
            collapsed: false
        },
    }, {
        id: '0xab:sched_entity',
        type: 'box',
        position: { x: 4, y: 28 + 16*2 },
        data: {
            key: '0xab:sched_entity',
            type: 'sched_entity',
            addr: '0xab',
            label: 'test se',
            absts: {
                'default': {
                    parent: null,
                    members: {
                        'vruntime': {
                            class: 'text',
                            type: 'int',
                            size: 8,
                            value: '1145141919810'
                        }
                    },
                    distilled: false
                }
            },
            parent: '0xaa:task_struct',
            depth: 1,
            collapsed: false
        },
        parentId: '0xaa:task_struct',
        extent: 'parent',
        draggable: false,
        selectable: true,
    }
];

export const nodeTypes = {
    'position-logger': PositionLoggerNode,
    'box': BoxNode,
    // 'vobject': VObject,
    // 'field': Field,
    // Add any of your custom nodes here!
} satisfies NodeTypes;
