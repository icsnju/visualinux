import { useCallback, useEffect } from 'react';
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
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    useEffect(() => {
        console.log('init', nodes);
        const nodeNotifier = (id: string) => {
            console.log(id, 'notified!');
            setNodes(nds => nds.map(nd => {
                if (nd.type != 'box') {
                    return nd;
                }
                if (nd.id == id) {
                    return {
                        ...nd,
                        data: {
                            ...nd.data,
                            collapsed: !nd.data.collapsed // should be managed in view storage
                        }
                    }
                }
                // assumed that nodes are already sorted by depth
                if (nd.parentId == id) {
                    return {
                        ...nd,
                        // hidden: nd.parent.data.collapsed
                        hidden: true,
                    }
                }
                return nd;
            }));
        }
        setNodes(nds => nds.map(nd => {
            if (nd.type != 'box') {
                return nd;
            }
            return {
                ...nd,
                data: {
                    ...nd.data,
                    notifier: nodeNotifier
                }
            };
        }));
    }, []);
    // const onConnect: OnConnect = useCallback(
    //     (connection) => setEdges((edges) => addEdge(connection, edges)),
    //     [setEdges]
    // );
    return (
        <ReactFlow
            nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange}
            edges={edges} edgeTypes={edgeTypes} onEdgesChange={onEdgesChange}
            // onConnect={onConnect}
            nodesConnectable={false} deleteKeyCode={null} // Prevent node deletion on backspace
            fitView
        >
            <Background />
            <MiniMap />
            <Controls />
        </ReactFlow>
    );
}
