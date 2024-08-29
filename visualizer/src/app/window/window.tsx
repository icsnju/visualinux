'use client'

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import SplitPane, { Pane } from "split-pane-react";

import { PrimaryArea, PrimaryPanel, SecondaryPanel, isPrimaryPanel, SplitDirection } from "./model";

import "@styles/window.css";

const minPanelSize = 64;

export default function MainWindow() {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const [fuckHydrationError, setHydrationError] = useState(false);
    useEffect(() => {
        setHydrationError(true);
        const eventSource = new EventSource('/sse');
        eventSource.addEventListener('message', function(event) {
            const data = JSON.parse(event.data);
            console.log('sse receive:', data);
            stateDispatch(data);
        });
        eventSource.addEventListener('error', function(event) {
            if (event.eventPhase == EventSource.CLOSED) {
                console.log('sse closed');
                eventSource.close();
            } else {
                console.log('sse error: ', event);
            }
        }, false);
        return () => {
            eventSource.close();
        };
    }, [])
    const model = state.windowModel;
    return fuckHydrationError && (
        <div className='main-window' id='popup-root'>
            <ModeledWindow node={model.root}/>
            { model.followers.map((follower, index) => follower ? <SecondaryWindow key={index} node={follower}/> : '') }
        </div>
    );
}

// // the deprecated version which polls the local data to update the diagrams
// import { mtimeLocal, readLocal } from "@app/local";
// import { preprocess } from "@app/visual/preprocess";
// import { View } from "@app/visual/type";
// const DumpPath = '/public/statedump/latest.json';
// export default function MainWindow() {
//     const { state, stateDispatch } = useContext(GlobalStateContext);
//     const [fuckHydrationError, setHydrationError] = useState(false);
//     useEffect(() => {
//         setHydrationError(true);
//         let interval = setInterval(async () => {
//             let mtime = await mtimeLocal(DumpPath);
//             if (mtime > state.lastTime) {
//                 state.lastTime = mtime;
//                 console.log('update view data');
//                 setTimeout(async () => {
//                     let data: View = JSON.parse(await readLocal(DumpPath));
//                     preprocess(data);
//                     stateDispatch({ command: 'INIT', data });
//                 }, 1000);
//             }
//         }, 2000);
//         return () => {
//             clearInterval(interval);
//         }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []);
//     const model = state.windowModel;
//     return fuckHydrationError && (
//         <div className='main-window' id='popup-root'>
//             <ModeledWindow node={model.root}/>
//             { model.followers.map((follower, index) => follower ? <SecondaryWindow key={index} node={follower}/> : '') }
//         </div>
//     );
// }

export function ModeledWindow({ node }: { node: PrimaryArea | PrimaryPanel }) {
    const [sizes, setSizes] = useState<(number | string)[]>(['auto']);
    if (isPrimaryPanel(node)) {
        return (
            <Pane key={node.key} minSize={minPanelSize} style={{height: '100%'}}>
                <PrimaryWindow wKey={node.key}/>
            </Pane>
        )
    }
    return (
        // @ts-ignore
        <SplitPane split={node.propSplit} sizes={sizes} onChange={(sizes) => setSizes(sizes)}>
            { node.children.map(child => <ModeledWindow key={child.key} node={child}/>) }
        </SplitPane>
    )
}

import GoJSDiagram from "@app/visual/diagram";
import { downloadDiagram } from "@app/visual/diagram-init";
import { GlobalStateContext } from "@app/state";

import { ButtonDef, ButtonWrapper, ButtonsWrapper } from "@app/window/buttons";
import { PopViewSelector, DropdownAbstSelector } from "@app/window/view-selector";
import { Rnd } from "react-rnd";
import { ReactDiagram } from "gojs-react";
import Console from "@app/console/console";
import { View } from "../visual/type";
import { preprocess } from "../visual/preprocess";

type useStateSelected = typeof useState<string | undefined>;

// export function PrimaryWindow({ style }: { style?: React.CSSProperties }) {
function PrimaryWindow({ wKey }: { wKey: number }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const model = state.windowModel;
    let viewDisplayed = model.getViewDisplayed(wKey);
    let modelData = useMemo(() => state.getGoModelData(viewDisplayed), [state, viewDisplayed]);
    let diagramRef = useRef<ReactDiagram>(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useMemo(() => model.initDiagramRef(wKey, diagramRef), []);
    // this is used to update buttons ifEnabled() without refreshing gojs diagram
    // let [selected, setSelected] = useState<string | undefined>(undefined);
    let [selected, setSelected]: ReturnType<useStateSelected> | [null, null] = [null, null];
    const onChildMount = (dataFromChild: ReturnType<useStateSelected>) => {
        selected = dataFromChild[0];
        setSelected = dataFromChild[1];
    };
    let updateSelected = (s: string | undefined) => {
        if (setSelected) setSelected(s);
        diagramRef.current?.forceUpdate();
    };
    //
    return (
        <div className="primary-window">
            <PrimaryWindowHeader wKey={wKey} diagramRef={diagramRef} onMount={onChildMount}/>
            <div className="primary-window-body">
                <GoJSDiagram modelData={modelData} diagramRef={diagramRef} updateSelected={updateSelected}/>
                <Console wKey={wKey}/>
            </div>
        </div>
    );
}
function PrimaryWindowHeader({ wKey, diagramRef, onMount }: {
    wKey: number,
    diagramRef: React.RefObject<ReactDiagram>,
    onMount: (dataFromChild: ReturnType<useStateSelected>) => void
}) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const model = state.windowModel;
    let viewDisplayed = model.getViewDisplayed(wKey);
    //
    let [selected, setSelected] = useState<string | undefined>(undefined);
    useEffect(() => {
        onMount([selected, setSelected]);
    }, [onMount, selected]);
    //
    let clickSplit = (direction: SplitDirection) => {
        console.log('click split', wKey, SplitDirection[direction]);
        stateDispatch({ command: 'SPLIT', wKey, direction });
    };
    let buttons: ButtonDef[] = useMemo(() => [{
        onClick: () => {
            let objectKey = model.getObjectSelected(wKey);
            if (viewDisplayed !== undefined && objectKey !== undefined) {
                stateDispatch({ command: 'FOCUS', objectKey });
            }
        },
        ifEnabled: model.getObjectSelected(wKey) !== undefined,
        icon: "bookmark",
        desc: "focus"
    }, {
        onClick: () => {
            let objectKey = model.getObjectSelected(wKey);
            if (viewDisplayed !== undefined && objectKey !== undefined) {
                // use wKey instead of viewDisplayed here to maintain protocol consistency,
                // since it is hard for user (and LLM) to specify viewDisplayed in the gdb side.
                stateDispatch({ command: 'PICK', wKey, objectKey });
            }
        },
        ifEnabled: model.getObjectSelected(wKey) !== undefined,
        icon: "share",
        desc: "pick"
    }, {
        onClick: () => clickSplit(SplitDirection.horizontal),
        ifEnabled: true,
        icon: "resize-vert",
        desc: "split (vert)"
    }, {
        onClick: () => clickSplit(SplitDirection.vertical),
        ifEnabled: true,
        icon: "resize-horiz",
        desc: "split (horiz)"
    }, {
        onClick: () => {
            let diagram  = diagramRef.current?.getDiagram();
            let filename = viewDisplayed?.slice(viewDisplayed.indexOf('.') + 1);
            if (diagram && filename) {
                downloadDiagram(diagram, filename);
            }
        },
        ifEnabled: viewDisplayed !== undefined,
        icon: "photo",
        desc: "download"
    }, {
        onClick: () => {
            console.log('click remove', wKey);
            stateDispatch({ command: 'REMOVE', wKey });
        },
        ifEnabled: model.isRemovable(wKey),
        icon: "delete",
        desc: "remove"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }], [state, model, selected]);
    return (
        <div className="primary-window-header container px-0">
            <ButtonsWrapper direction="left">
                <span className="btn btn-sm btn-default c-auto">#{wKey}</span>
                <PopViewSelector wKey={wKey} trigger={
                    <button className="btn btn-sm btn-primary">
                        <i className="icon icon-apps"></i>
                    </button>
                }/>
                <span className="btn btn-sm btn-link c-auto px-0 text-dark text-bold">
                    {viewDisplayed ? viewDisplayed.slice(viewDisplayed.lastIndexOf('.') + 1) : 'select a view...'}
                </span>
            </ButtonsWrapper>
            <ButtonsWrapper direction="right">
                <DropdownAbstSelector wKey={wKey} enabled={selected !== undefined}/>
                {...buttons.map((btn, i) => 
                    <ButtonWrapper buttonDef={btn} key={i}/>
                )}
            </ButtonsWrapper>
        </div>
    );
}

function SecondaryWindow({ node }: { node: SecondaryPanel }) {
    const [rndPosition, setRndPosition] = useState({
        x: 150, y: 205
    });
    const [rndSize, setRndSize] = useState({
        width: 360, height: 256
    });
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const model = state.windowModel;
    let modelData = useMemo(() => state.getGoModelDataFocused(node.viewDisplayed, node.objectKey), [state, node]);
    let diagramRef = useRef<ReactDiagram>(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useMemo(() => model.initDiagramRef(node.key, diagramRef, false), []);
    //
    let clickSwitchAbst = () => {
        console.log('clickSwitchAbst');
    };
    let buttons: ButtonDef[] = [{
        onClick: () => {
            console.log('click focus', node.key);
            stateDispatch({ command: 'FOCUS', objectKey: node.objectKey });
        },
        ifEnabled: true,
        icon: "bookmark",
        desc: "focus"
    }, {
        onClick: () => {
            console.log('click erase', node.key);
            stateDispatch({ command: 'ERASE', wKey: node.key });
        },
        ifEnabled: true,
        icon: "delete",
        desc: "remove"
    }];
    return (
        <Rnd position={rndPosition} size={rndSize} minWidth={256} minHeight={256} bounds=".main-window"
            dragHandleClassName="react-draggable-cursor"
            onDragStop={(event, data) => {
                setRndPosition({ x: data.x, y: data.y });
            }}
            onResizeStop={(event, dir, ref, delta, position) => {
                setRndPosition(position);
                setRndSize({
                    width: parseInt(ref.style.width),
                    height: parseInt(ref.style.height),
                });
            }}
        >
            <div className='secondary-window'>
                <div className="secondary-window-header react-draggable-cursor container px-0">
                    <ButtonsWrapper direction="left">
                        <button className="btn btn-sm btn-primary" onClick={clickSwitchAbst}>
                            <i className="icon icon-menu"></i>
                        </button>
                        <div className="show-object-key btn btn-sm btn-link c-auto text-dark">
                            {node ? node.objectKey : ''}
                            {/* <i className="icon icon-minus"></i> */}
                        </div>
                        <></>
                    </ButtonsWrapper>
                    <ButtonsWrapper direction="right">
                        {buttons.map((btn, i) => <ButtonWrapper buttonDef={btn} key={i}/>)}
                    </ButtonsWrapper>
                </div>
                <GoJSDiagram modelData={modelData} diagramRef={diagramRef} style={{backgroundColor: 'seashell'}}/>
            </div>
        </Rnd>
    );
}
