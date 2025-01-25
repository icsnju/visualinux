import { useCallback, useContext, useEffect, useMemo } from "react";
import { GlobalStateContext } from "@app/context/Context";
import { convertToReactFlow } from "@app/visual/convert";
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
    getNodesBounds,
    getViewportForBounds,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";

import "@xyflow/react/dist/style.css";
import "../index.css";

import { nodeTypes } from "@app/visual/nodes";
import { edgeTypes } from "@app/visual/edges";

export default function Diagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    return (
        <ReactFlowProvider>
            <ReactFlowDiagram pKey={pKey} updateSelected={updateSelected} />
        </ReactFlowProvider>
    );
}

function ReactFlowDiagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const nodesInitialized = useNodesInitialized();
    const { fitView } = useReactFlow();
    // Update nodes and edges when graph changes
    useEffect(() => {
        const nodeNotifier = (id: string) => {
            console.log(id, 'notified!');
            setNodes(nds => nds.map(nd => {
                if (nd.type != 'box' && nd.type != 'container') {
                    return nd;
                }
                if (nd.id == id) {
                    // TODO: re-calculate the height of the box for collapsing
                    return {
                        ...nd,
                        data: {
                            ...nd.data,
                            collapsed: !nd.data.collapsed
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
        // clear-then-reset to avoid react-flow render error (root cause of which is unknown)
        setNodes([]);
        setEdges([]);
        if (view !== null) {
            setTimeout(() => {
                const graph = convertToReactFlow(view, attrs);
                setNodes(graph.nodes.map(nd => {
                    if (nd.type != 'box' && nd.type != 'container') {
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
            }, 100);
        }
    }, [pKey, state]);
    useEffect(() => {
        if (nodesInitialized) {
            window.requestAnimationFrame(() => {
                fitView();
            });
        }
    }, [nodesInitialized]);
    return (
        <ReactFlow
            nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange}
            edges={edges} edgeTypes={edgeTypes} onEdgesChange={onEdgesChange}
            nodesConnectable={false} deleteKeyCode={null} // Prevent node deletion on backspace
            fitView
        >
            <Background />
            <MiniMap pannable={true} />
            <Controls />
            <Panel position="top-right">
                <DownloadButton />
            </Panel>
            {/* <Panel position="top-right">
                <button onClick={() => onLayout('TB')}>vertical layout</button>
                <button onClick={() => onLayout('LR')}>horizontal layout</button>
            </Panel> */}
        </ReactFlow>
    );
}

function downloadImage(dataUrl: string, fmt: string) {
    const a = document.createElement('a');
    a.setAttribute('download', `reactflow.${fmt}`);
    a.setAttribute('href', dataUrl);
    a.click();
    a.remove();
}

function DownloadButton() {
    const { getNodes } = useReactFlow();
    // TODO: create a function to calculate the image size based on the position and size of the nodes
    const imageWidth = 1200;
    const imageHeight = 4000;
    const onClick = () => {
        // we calculate a transform for the nodes so that all nodes are visible
        // we then overwrite the transform of the `.react-flow__viewport` element
        // with the style option of the html-to-image library
        const nodesBounds = getNodesBounds(getNodes());
        const viewport = getViewportForBounds(
            nodesBounds,
            imageWidth,
            imageHeight,
            1,
            1,
            2,
        );
        toPng(document.querySelector('.react-flow__viewport'), {
            backgroundColor: '#ffffff',
            width: imageWidth,
            height: imageHeight,
            style: {
                width: imageWidth,
                height: imageHeight,
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            },
        }).then(data => downloadImage(data, 'png'));
        // toSvg(document.querySelector('.react-flow__viewport'), {
        //     backgroundColor: 'transparent',
        //     width: imageWidth,
        //     height: imageHeight,
        //     style: {
        //         width: imageWidth,
        //         height: imageHeight,
        //         transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        //     },
        // }).then(data => downloadImage(data, 'svg'));
    };
   
    return (
      <Panel position="top-right">
        <button className="download-btn" onClick={onClick}>
          Download Image
        </button>
      </Panel>
    );
  }