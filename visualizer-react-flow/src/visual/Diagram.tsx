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
    type Node,
    type Edge,
    useReactFlow,
    Panel,
    ReactFlowProvider,
    useNodesInitialized,
} from '@xyflow/react';
import Dagre from '@dagrejs/dagre';

import '@xyflow/react/dist/style.css';
import '../index.css';

import { initialNodes, nodeTypes } from '@app/nodes';
import { initialEdges, edgeTypes } from '@app/edges';

export default function Diagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    return (
        <ReactFlowProvider>
            <ReactFlowDiagram pKey={pKey} updateSelected={updateSelected} />
        </ReactFlowProvider>
    );
}

function ReactFlowDiagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
    const nodesInitialized = useNodesInitialized();
    const { fitView } = useReactFlow();
    useEffect(() => {
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
    const onLayout = useCallback((direction: string) => {
        console.log('onLayout', direction, nodes);
        const layouted = getLayoutedElements(nodes, edges, { direction });
        console.log('onLayout after', layouted.nodes);
        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);
    
        window.requestAnimationFrame(() => {
            fitView();
        });
    }, [nodes, edges]);
    useEffect(() => {
        if (nodesInitialized) {
            onLayout('TB');
        }
    }, [nodesInitialized]);
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
            <Panel position="top-right">
                <button onClick={() => onLayout('TB')}>vertical layout</button>
                <button onClick={() => onLayout('LR')}>horizontal layout</button>
            </Panel>
        </ReactFlow>
    );
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], options: { direction: string }) => {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: options.direction });
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) =>
        g.setNode(node.id, {
            ...node,
            width: node.measured?.width ?? 0,
            height: node.measured?.height ?? 0,
        }),
    );
    Dagre.layout(g);
    return {
        nodes: nodes.map((node) => {
            const position = g.node(node.id);
            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            const x = position.x - (node.measured?.width ?? 0) / 2;
            const y = position.y - (node.measured?.height ?? 0) / 2;
    
            return { ...node, position: { x, y } };
        }),
        edges,
    };
};
