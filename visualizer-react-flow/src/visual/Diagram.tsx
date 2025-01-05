import { useCallback, useContext, useEffect, useMemo } from "react";
import { GlobalStateContext } from "@app/context/Context";
import { convertToReactFlow } from "@app/visual/convert";
import { getLayoutedPlot } from "@app/visual/layout";
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
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "../index.css";

import { initialNodes, nodeTypes } from "@app/nodes";
import { initialEdges, edgeTypes } from "@app/edges";

export default function Diagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    return (
        <ReactFlowProvider>
            <ReactFlowDiagram pKey={pKey} updateSelected={updateSelected} />
        </ReactFlowProvider>
    );
}

function ReactFlowDiagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
    const nodesInitialized = useNodesInitialized();
    const { fitView } = useReactFlow();
    // Update nodes and edges when graph changes
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
        const { view, attrs } = state.getPlotOfPanel(pKey);
        console.log('getplotofpanel', view, attrs);
        if (view == null) {
            setNodes(initialNodes);
            setEdges(initialEdges);
        } else {
            const graph = convertToReactFlow(view, attrs);
            setNodes(graph.nodes.map(nd => {
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
            setEdges(graph.edges);
            console.log('graph', graph);
        }
    }, [pKey, state]);
    const onLayout = useCallback((direction: string) => {
        const layouted = getLayoutedPlot(nodes, edges, { direction });
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        window.requestAnimationFrame(() => {
            fitView();
        });
    }, [nodes, edges]);
    useEffect(() => {
        if (nodesInitialized) {
            onLayout('LR');
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
            <MiniMap pannable={true} />
            <Controls />
            <Panel position="top-right">
                <button onClick={() => onLayout('TB')}>vertical layout</button>
                <button onClick={() => onLayout('LR')}>horizontal layout</button>
            </Panel>
        </ReactFlow>
    );
}
