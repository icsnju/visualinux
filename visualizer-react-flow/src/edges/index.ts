import type { Edge, EdgeTypes } from '@xyflow/react';

export const initialEdges: Edge[] = [
    { id: 'a->c', source: 'a', target: 'c', animated: true },
    { id: 'b->d', source: 'b', target: 'd' },
    { id: 'c->d', source: 'c', target: 'd', animated: true },
    { id: 'fft', source: '0xab:sched_entity', sourceHandle: 'linktest1', target: '0xffff:test1', zIndex: 100 },
];

export const edgeTypes = {
    // Add your custom edge types here!
} satisfies EdgeTypes;
