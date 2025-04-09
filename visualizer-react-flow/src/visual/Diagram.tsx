import { useContext, useEffect, useState } from "react";
import { GlobalStateContext } from "@app/context/Context";
import { ReactFlowGraph, ReactFlowNode, ContainerNode } from "@app/visual/types";
import { Renderer } from "@app/visual/renderers";
import {
    ReactFlowProvider,
    ReactFlow,
    Background, Controls, MiniMap, Panel,
    type Node, type Edge,
    useNodesState, useEdgesState,
    useReactFlow,
    getNodesBounds, getViewportForBounds,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";

import "@xyflow/react/dist/style.css";
import "../index.css";

import { nodeTypes } from "@app/visual/nodes";
import { edgeTypes } from "@app/visual/edges";

import { ReactFlowRefresher } from "@app/visual/refresh";
import { Finalizer } from "@app/visual/renderers/finalizer";

export default function Diagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    return (
        <ReactFlowProvider>
            <ReactFlowDiagram pKey={pKey} updateSelected={updateSelected} />
        </ReactFlowProvider>
    );
}

function ReactFlowDiagram({ pKey, updateSelected }: { pKey: number, updateSelected: (s: string | undefined) => void }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const [graph, setGraph] = useState<ReactFlowGraph>({ nodes: [], edges: [] });
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [shouldUpdate, setShouldUpdate] = useState<[string, string, string] | undefined>(undefined);
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
                let graph = Renderer.render(view, attrs);
                let { nodes, edges } = Finalizer.render(graph);
                setGraph(graph);
                setNodes(nodes.map(nd => {
                    if (nd.type != 'box' && nd.type != 'container') {
                        return nd;
                    }
                    return {
                        ...nd,
                        data: {
                            ...nd.data,
                            notifier: (id: string, rootId: string, type: string) => setShouldUpdate([id, rootId, type])
                        }
                    };
                }));
                setEdges(edges);
                setTimeout(() => {
                    window.requestAnimationFrame(() => {
                        fitView();
                    });
                }, 100);
            }, 100);
        }
    }, [pKey, state]);
    useEffect(() => {
        if (shouldUpdate) {
            const [id, rootId, type] = shouldUpdate;
            let newGraph = ReactFlowRefresher.refresh(graph, id, rootId, type);
            let { nodes, edges } = Finalizer.render(newGraph);
            setGraph(newGraph);
            setNodes(nodes);
            setEdges(edges);
            setShouldUpdate(undefined);
        }
    }, [shouldUpdate]);
    return (
        <ReactFlow
            nodes={nodes} nodeTypes={nodeTypes} onNodesChange={onNodesChange}
            edges={edges} edgeTypes={edgeTypes} onEdgesChange={onEdgesChange}
            nodesConnectable={false} deleteKeyCode={null} // Prevent node deletion on backspace
            onSelect={() => {
                console.log('selected');
            }}
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