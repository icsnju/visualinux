import { useContext, useEffect, useMemo, useState } from "react";
import { GlobalStateContext } from "@app/context/Context";
import { SplitDirection } from "@app/context/Panels";
import Diagram from "@app/visual/Diagram";
import { ButtonDef, ButtonsWrapper, ButtonWrapper } from "@app/panes/buttons";
import * as icons from "@app/panes/libs/Icons";

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
        <div className="h-full flex flex-col border-2 border-[#5755d9]">
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
    let viewname = useMemo(() => state.panels.getViewname(pKey), [state, pKey]);
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
        icon: <icons.AkarIconsAugmentedReality color="#5755d9"/>,
        desc: "focus",
        ifEnabled: state.panels.getObjectSelected(pKey) !== undefined,
        onClick: () => {
            let objectKey = state.panels.getObjectSelected(pKey);
            if (viewname !== undefined && objectKey !== undefined) {
                stateDispatch({ command: 'FOCUS', objectKey });
            }
        }
    }, {
        icon: <icons.AkarIconsArrowForwardThick color="#5755d9"/>,
        desc: "pick",
        ifEnabled: state.panels.getObjectSelected(pKey) !== undefined,
        onClick: () => {
            let objectKey = state.panels.getObjectSelected(pKey);
            if (viewname !== undefined && objectKey !== undefined) {
                // use wKey instead of viewname here to maintain protocol consistency,
                // since it is hard for user (and LLM) to specify viewname in the gdb side.
                stateDispatch({ command: 'PICK', pKey, objectKey });
            }
        }
    }, {
        icon: <icons.AkarIconsChevronVertical color="#5755d9"/>,
        desc: "split (vert)",
        ifEnabled: true,
        onClick: () => clickSplit(SplitDirection.horizontal)
    }, {
        icon: <icons.AkarIconsChevronHorizontal color="#5755d9"/>,
        desc: "split (horiz)",
        ifEnabled: true,
        onClick: () => clickSplit(SplitDirection.vertical)
    }, {
        icon: <icons.AkarIconsDownload color="#5755d9"/>,
        desc: "download",
        ifEnabled: viewname !== undefined,
        onClick: () => {
            alert('download to-be-reimplemented');
            // let diagram  = diagramRef.current?.getDiagram();
            // let filename = viewDisplayed?.slice(viewDisplayed.indexOf('.') + 1);
            // if (diagram && filename) {
            //     downloadDiagram(diagram, filename);
            // }
        }
    }, {
        icon: <icons.AkarIconsTrashCan color="#5755d9"/>,
        desc: "remove",
        ifEnabled: state.panels.isRemovable(pKey),
        onClick: () => {
            console.log('click remove', pKey);
            stateDispatch({ command: 'REMOVE', pKey });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }], [state, selected]);
    return (
        <div className="h-auto flex flex-row justify-between border-b-2 border-[#5755d9]">
            <ButtonsWrapper direction="left">
                <div className="w-[30px] h-[30px] flex items-center justify-center border-2 border-[#5755d9] rounded cursor-pointer">
                    #{pKey}
                </div>
                <ViewSelector pKey={pKey} />
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

function ViewSelector({ pKey }: { pKey: number }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const [isOpen, setIsOpen] = useState(false);
    const viewnameList = state.snapshots.getViewnameList();
    const viewname = state.panels.getViewname(pKey);

    const toggleDropdown = () => setIsOpen(!isOpen);
    const closeDropdown = () => setIsOpen(false);

    const handleSelect = (viewname: string) => {
        stateDispatch({ command: 'SWITCH', pKey, viewname });
        closeDropdown();
    };

    return (
        <div className="relative">
            <button 
                className="h-[30px] px-2 flex items-center justify-center border-2 border-[#5755d9] rounded cursor-pointer"
                onClick={toggleDropdown}
            >
                {viewname ? viewname.slice(viewname.lastIndexOf('.') + 1) : 'select a plot...'}
            </button>
            
            {isOpen && (
                <div className="absolute z-10 mt-0.5 left-0">
                    <ul className="min-w-48 bg-white border-2 border-[#5755d9] rounded shadow-lg">
                        {viewnameList.map((viewname, index, array) => (
                            <li 
                                className={`px-2 py-0.5 cursor-pointer ${index < array.length - 1 ? 'border-b-2 border-[#5755d9]' : ''}`}
                                key={index} 
                                onClick={() => handleSelect(viewname)}
                            >
                                <a className="block text-gray-800">{viewname}</a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
