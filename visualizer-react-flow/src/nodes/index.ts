import type { NodeTypes } from '@xyflow/react';

import { AppNode } from './types';
import { PositionLoggerNode } from './PositionLoggerNode';
import BoxNode from './BoxNode';
import ContainerNode from './ContainerNode';

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
                },
                'faasdsad': {
                    class: 'text',
                    type: 'uint64_t',
                    size: 8,
                    value: '9223372036854775808'
                },
            },
            parent: null,
            depth: 0,
            collapsed: false,
            heightMembers: {},
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
            members: {
                'vruntime': {
                    class: 'text',
                    type: 'int',
                    size: 8,
                    value: '1145141919810'
                },
                'linktest1': {
                    class: 'link',
                    type: 'DIRECT',
                    target: '0xffff:test1',
                },
                'linktest2': {
                    class: 'link',
                    type: 'DIRECT',
                    target: null,
                },
            },
            parent: '0xaa:task_struct',
            depth: 1,
            collapsed: false,
            heightMembers: {},
        },
        parentId: '0xaa:task_struct',
        extent: 'parent',
        draggable: false,
        selectable: true,
    }, {
        id: '0xffff:test1',
        type: 'box',
        position: { x: 320, y: 30 },
        data: {
            key: '0xffff:test1',
            type: 'test1',
            addr: '0xffff',
            label: 'test1',
            members: {
                'foobar': {
                    class: 'text',
                    type: 'int',
                    size: 4,
                    value: '114514'
                },
            },
            parent: null,
            depth: 0,
            collapsed: false,
            heightMembers: {},
        },
    }
];

export const nodeTypes = {
    'position-logger': PositionLoggerNode,
    'box': BoxNode,
    'container': ContainerNode,
    // 'vobject': VObject,
    // 'field': Field,
    // Add any of your custom nodes here!
} satisfies NodeTypes;
