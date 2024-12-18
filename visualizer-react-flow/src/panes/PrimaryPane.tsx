import { useContext, useEffect, useMemo, useState } from 'react';
import { PanelsContext } from '@app/panes/model/Context';
import { SplitDirection } from '@app/panes/model/state';
import Diagram from '@app/visual/Diagram';
import { ButtonDef, ButtonsWrapper, ButtonWrapper } from '@app/panes/buttons';
// import { DropdownAbstSelector, PopViewSelector } from './view-selector';

type useStateSelected = typeof useState<string | undefined>;

const borderColor = 'border-[#5755d9]';

export default function PrimaryPane({ wKey }: { wKey: number }) {
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
            <PrimaryWindowHeader wKey={wKey} onMount={onChildMount}/>
            <div className="primary-window-body">
                <Diagram wKey={wKey} updateSelected={updateSelected}/>
                {/* <Console wKey={wKey}/> */}
            </div>
        </div>
    );
}

function PrimaryWindowHeader({ wKey, onMount }: {
    wKey: number,
    onMount: (dataFromChild: ReturnType<useStateSelected>) => void
}) {
    const { state, stateDispatch } = useContext(PanelsContext);
    let viewDisplayed = state.getViewDisplayed(wKey);
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
            let objectKey = state.getObjectSelected(wKey);
            if (viewDisplayed !== undefined && objectKey !== undefined) {
                stateDispatch({ command: 'FOCUS', objectKey });
            }
        },
        ifEnabled: state.getObjectSelected(wKey) !== undefined,
        icon: "bookmark",
        desc: "focus"
    }, {
        onClick: () => {
            let objectKey = state.getObjectSelected(wKey);
            if (viewDisplayed !== undefined && objectKey !== undefined) {
                // use wKey instead of viewDisplayed here to maintain protocol consistency,
                // since it is hard for user (and LLM) to specify viewDisplayed in the gdb side.
                stateDispatch({ command: 'PICK', wKey, objectKey });
            }
        },
        ifEnabled: state.getObjectSelected(wKey) !== undefined,
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
            console.log('click remove', wKey);
            stateDispatch({ command: 'REMOVE', wKey });
        },
        ifEnabled: state.isRemovable(wKey),
        icon: "delete",
        desc: "remove"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }], [state, selected]);
    return (
        // <div className="primary-window-header container px-0">
        <div className={`h-8 flex flex-row justify-between border-b-2 ${borderColor}`}>
            <ButtonsWrapper direction="left">
                <span className="btn btn-sm btn-default c-auto">#{wKey}</span>
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
