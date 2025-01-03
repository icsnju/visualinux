import { GlobalStateContext } from "@app/context/Context";
import { SecondaryPanel } from "@app/context/Panels";
import { ButtonDef, ButtonsWrapper, ButtonWrapper } from "@app/panes/buttons";

import { useContext, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import Diagram from "@app/visual/Diagram";

export default function SecondaryPane({ node }: { node: SecondaryPanel }) {
    const [rndPosition, setRndPosition] = useState({
        x: 150, y: 205
    });
    const [rndSize, setRndSize] = useState({
        width: 360, height: 256
    });
    const { state, stateDispatch } = useContext(GlobalStateContext);
    // let modelData = useMemo(() => state.getGoModelDataFocused(node.viewDisplayed, node.objectKey), [state, node]);
    // let diagramRef = useRef<ReactDiagram>(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // useMemo(() => state.initDiagramRef(node.key, diagramRef, false), []);
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
            stateDispatch({ command: 'REMOVE', pKey: node.key });
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
                <Diagram pKey={node.key} updateSelected={() => {}}/>
                {/* <GoJSDiagram modelData={modelData} diagramRef={diagramRef} style={{backgroundColor: 'seashell'}}/> */}
            </div>
        </Rnd>
    );
}
