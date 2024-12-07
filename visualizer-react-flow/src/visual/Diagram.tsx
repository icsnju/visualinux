import { useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    type OnConnect,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import '../index.css';

import { initialNodes, nodeTypes } from '@app/nodes';
import { initialEdges, edgeTypes } from '@app/edges';

export default function Diagram({ wKey, updateSelected }: { wKey: number, updateSelected: (s: string | undefined) => void }) {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    // const onConnect: OnConnect = useCallback(
    //     (connection) => setEdges((edges) => addEdge(connection, edges)),
    //     [setEdges]
    // );
    return (
        <ReactFlow
            nodes={nodes}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            edges={edges}
            edgeTypes={edgeTypes}
            onEdgesChange={onEdgesChange}
            // onConnect={onConnect}
            nodesConnectable={false}
            deleteKeyCode={null} // Prevent node deletion on backspace
            fitView
        >
            <Background />
            <MiniMap />
            <Controls />
        </ReactFlow>
    );
}
