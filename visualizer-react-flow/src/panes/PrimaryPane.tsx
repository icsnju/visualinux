import { useContext, useEffect, useMemo, useState } from 'react';
import { GlobalStateContext } from '@app/context/Context';
import { SplitDirection } from '@app/context/Panels';
import Diagram from '@app/visual/Diagram';
import { ButtonDef, ButtonsWrapper, ButtonWrapper, borderColor } from '@app/panes/buttons';
import * as icons from './libs/Icons';
// import { DropdownAbstSelector, PopViewSelector } from './view-selector';

type useStateSelected = typeof useState<string | undefined>;

export default function PrimaryPane({ pKey }: { pKey: number }) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // useMemo(() => model.initDiagramRef(wKey, diagramRef), []);
    // this is used to update buttons ifEnabled() without refreshing the diagram
    // let [selected, setSelected] = useState<string | undefined>(undefined);
    let [selected, setSelected]: ReturnType<useStateSelected> | [null, null] = [null, null];
    const onChildMount = (dataFromChild: ReturnType<useStateSelected>) => {
        selected = dataFromChild[0];
        setSelected = dataFromChild[1];
    };
    let updateSelected = (s: string | undefined) => {
        if (setSelected) setSelected(s);
        // diagramRef.current?.forceUpdate();
    };
    //
    return (
        <div className={`h-full flex flex-col border-2 ${borderColor}`}>
            <PrimaryWindowHeader pKey={pKey} onMount={onChildMount}/>
            <div className="flex h-full bg-white">
                <Diagram pKey={pKey} updateSelected={updateSelected}/>
                {/* <Console wKey={wKey}/> */}
            </div>
        </div>
    );
}

function PrimaryWindowHeader({ pKey, onMount }: {
    pKey: number,
    onMount: (dataFromChild: ReturnType<useStateSelected>) => void
}) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    let viewDisplayed = state.panels.getViewDisplayed(pKey);
    //
    let [selected, setSelected] = useState<string | undefined>(undefined);
    useEffect(() => {
        onMount([selected, setSelected]);
    }, [onMount, selected]);
    //
    let clickSplit = (direction: SplitDirection) => {
        console.log('click split', pKey, SplitDirection[direction]);
        stateDispatch({ command: 'SPLIT', pKey, direction });
    };
    let buttons: ButtonDef[] = useMemo(() => [{
        onClick: () => {
            let objectKey = state.panels.getObjectSelected(pKey);
            if (viewDisplayed !== undefined && objectKey !== undefined) {
                stateDispatch({ command: 'FOCUS', objectKey });
            }
        },
        ifEnabled: state.panels.getObjectSelected(pKey) !== undefined,
        icon: <icons.AkarIconsAugmentedReality color="purple"/>,
        desc: "focus"
    }, {
        onClick: () => {
            let objectKey = state.panels.getObjectSelected(pKey);
            if (viewDisplayed !== undefined && objectKey !== undefined) {
                // use wKey instead of viewDisplayed here to maintain protocol consistency,
                // since it is hard for user (and LLM) to specify viewDisplayed in the gdb side.
                stateDispatch({ command: 'PICK', pKey, objectKey });
            }
        },
        ifEnabled: state.panels.getObjectSelected(pKey) !== undefined,
        icon: <></>,
        desc: "pick"
    }, {
        onClick: () => clickSplit(SplitDirection.horizontal),
        ifEnabled: true,
        icon: <icons.AkarIconsAugmentedReality color="red"/>,
        desc: "split (vert)"
    }, {
        onClick: () => clickSplit(SplitDirection.vertical),
        ifEnabled: true,
        icon: <></>,
        desc: "split (horiz)"
    }, {
        onClick: () => {
            alert('download to-be-reimplemented');
            // let diagram  = diagramRef.current?.getDiagram();
            // let filename = viewDisplayed?.slice(viewDisplayed.indexOf('.') + 1);
            // if (diagram && filename) {
            //     downloadDiagram(diagram, filename);
            // }
        },
        ifEnabled: viewDisplayed !== undefined,
        icon: "photo",
        desc: "download"
    }, {
        onClick: () => {
            console.log('click remove', pKey);
            stateDispatch({ command: 'REMOVE', pKey });
        },
        ifEnabled: state.panels.isRemovable(pKey),
        icon: "delete",
        desc: "remove"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }], [state, selected]);
    return (
        <div className={`h-auto flex flex-row justify-between border-b-2 ${borderColor}`}>
            <ButtonsWrapper direction="left">
                <div className="w-[30px] h-[30px] flex items-center justify-center border-2 border-[#5755d9] rounded cursor-pointer">
                    #{pKey}
                </div>
                {/* <PopViewSelector wKey={wKey} trigger={
                    <button className="btn btn-sm btn-primary">
                        <i className="icon icon-apps"></i>
                    </button>
                }/> */}
                <span className="btn btn-sm btn-link c-auto px-0 text-dark text-bold">
                    {viewDisplayed ? viewDisplayed.slice(viewDisplayed.lastIndexOf('.') + 1) : 'select a view...'}
                </span>
            </ButtonsWrapper>
            <ButtonsWrapper direction="right">
                {/* <DropdownAbstSelector wKey={wKey} enabled={selected !== undefined}/> */}
                {...buttons.map((btn, i) => 
                    <ButtonWrapper buttonDef={btn} key={i}/>
                )}
            </ButtonsWrapper>
        </div>
    );
}
