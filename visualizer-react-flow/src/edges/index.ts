import type { Edge, EdgeTypes } from '@xyflow/react';

export const initialEdges: Edge[] = [
    { id: 'a->c', source: 'a', target: 'c', animated: true },
    { id: 'b->d', source: 'b', target: 'd' },
    { id: 'c->d', source: 'c', target: 'd', animated: true },
    { id: 'f->f', source: '0xab:sched_entity', target: 'd', zIndex: 100 },
];

export const edgeTypes = {
    // Add your custom edge types here!
} satisfies EdgeTypes;
