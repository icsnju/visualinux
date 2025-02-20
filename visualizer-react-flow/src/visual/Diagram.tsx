import { useContext, useEffect, useState } from "react";
import { GlobalStateContext } from "@app/context/Context";
import { ReactFlowGraph, ReactFlowNode, ContainerNode } from "@app/visual/types";
import { ReactFlowConverter } from "@app/visual/convert";
import { ReactFlowLayouter } from "@app/visual/layout";
import {
    ReactFlowProvider,
    ReactFlow,
    Background, Controls, MiniMap, Panel,
    type Node, type Edge,
    useNodesState, useEdgesState,
    useNodesInitialized,
    useReactFlow,
    getNodesBounds, getViewportForBounds,
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
    const [shouldUpdate, setShouldUpdate] = useState<[string, string] | undefined>(undefined);
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
                            notifier: (id: string, rootId: string) => setShouldUpdate([id, rootId])
                        }
                    };
                }));
                setEdges(graph.edges);
            }, 100);
        }
    }, [pKey, state]);
    useEffect(() => {
        if (shouldUpdate) {
            // rootId is used to update the updated nested box
            const [id, rootId] = shouldUpdate;
            // parentCollapsed is used to update member boxes of the updated container
            const fuckNode = nodes.find(nd => nd.id == id);
            const parentId = fuckNode ? id : null;
            const parentCollapsed = fuckNode ? !fuckNode.data.collapsed : false;
            let intraNodes = new Set<string>();
            if (fuckNode && fuckNode.type == 'container') {
                (fuckNode as ContainerNode).data.members.forEach(member => {
                    intraNodes.add(member.key);
                });
            }
            // update all related objects/edges of the given shouldUpdate
            let updatedNodes = nodes.map(nd => {
                if (nd.type != 'box' && nd.type != 'container') {
                    return nd;
                }
                if (nd.id == rootId) {
                    return {
                        ...nd,
                        data: {
                            ...nd.data,
                            collapsed: !nd.data.collapsed
                        }
                    } as ReactFlowNode;
                }
                if (nd.parentId == parentId) {
                    return {
                        ...nd,
                        data: {
                            ...nd.data,
                            parentCollapsed: parentCollapsed
                        }
                    } as ReactFlowNode;
                }
                return { ...nd };
            });
            let updatedEdges = edges.map(ed => {
                if (intraNodes.has(ed.source) && intraNodes.has(ed.target)) {
                    return { ...ed, hidden: parentCollapsed };
                }
                return ed;
            });
            let graph = ReactFlowLayouter.layout({nodes: updatedNodes, edges: updatedEdges} as ReactFlowGraph);
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