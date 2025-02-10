import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GlobalStateContext } from "@app/context/Context";
import { ReactFlowGraph, ReactFlowNode } from "@app/visual/types";
import { ReactFlowConverter } from "@app/visual/convert";
import { ReactFlowLayouter } from "@app/visual/layout";
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
    const [shouldUpdate, setShouldUpdate] = useState<string | undefined>(undefined);
    const { fitView } = useReactFlow();
    // Update nodes and edges when graph changes
    useEffect(() => {
        const { view, attrs } = state.getPlotOfPanel(pKey);
        console.log('getplotofpanel', view, attrs);
        // clear-then-reset to avoid react-flow render error (root cause of which is unknown)
        setNodes([]);
        setEdges([]);
        if (view !== null) {
            setTimeout(() => {
                let graph = ReactFlowConverter.convert(view, attrs);
                graph = ReactFlowLayouter.layout(graph);
                setNodes(graph.nodes.map(nd => {
                    if (nd.type != 'box' && nd.type != 'container') {
                        return nd;
                    }
                    return {
                        ...nd,
                        data: {
                            ...nd.data,
                            notifier: (id: string) => setShouldUpdate(id)
                        }
                    };
                }));
                setEdges(graph.edges);
            }, 100);
        }
    }, [pKey, state]);
    useEffect(() => {
        if (shouldUpdate) {
            let updatedNodes = nodes.map(nd => {
                if (nd.type != 'box' && nd.type != 'container') {
                    return nd;
                }
                if (nd.id == shouldUpdate) {
                    return {
                        ...nd,
                        data: {
                            ...nd.data,
                            collapsed: !nd.data.collapsed
                        }
                    } as ReactFlowNode;
                }
                return { ...nd };
            });
            let graph = ReactFlowLayouter.layout({nodes: updatedNodes, edges} as ReactFlowGraph);
            setNodes(graph.nodes);
            setEdges(graph.edges);
            setShouldUpdate(undefined);
        }
    }, [shouldUpdate]);
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
        // @ts-ignore
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