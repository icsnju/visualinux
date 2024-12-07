'use client'

import { GlobalStateContext } from "@app/state";

import { useContext } from "react";

import Popup from "reactjs-popup";

export function PopViewSelector({ wKey, trigger }: { wKey: number, trigger: JSX.Element }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const viewList = state.getViewList();
    // I'm not sure how to solve this vscode typecheck error, I event don't know what happened;
    // but it is correctly compiled...
    // it comes from https://react-popup.elazizi.com/react-modal
    // TODO: explore it after paper submission
    const Poped = ((closePopup: (() => void)) => (
        <ul className="menu">
            {viewList.map((viewName, index) => 
                <li className="menu-item" key={index} onClick={() => {
                    stateDispatch({ command: 'SWITCH', wKey, viewName });
                    closePopup();
                } }><a className="text-tiny">{viewName}</a></li>
            )}
        </ul>
    )) as unknown as JSX.Element;
    return (
        <Popup trigger={trigger} modal>
            {Poped}
        </Popup>
    )
}

export function DropdownAbstSelector({ wKey, enabled }: { wKey: number, enabled: boolean }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    const model = state.windowModel;
    let viewDisplayed = model.getViewDisplayed(wKey);
    let objectKey = model.getObjectSelected(wKey);
    let abstList: string[];
    if (viewDisplayed !== undefined && objectKey !== undefined) {
        abstList = state.getAbstList(viewDisplayed, objectKey);
    } else {
        abstList = [];
    }
    if (abstList.length == 0) { 
        enabled = false;
    }
    return (
        <div className="popover popover-bottom">
            <button className={`btn btn-sm btn-primary dropdown-toggle ${enabled ? '' : 'disabled'}`}>
                <i className="icon icon-menu"></i>
            </button>
            <div className="popover-container" style={{width: "auto"}}>
                <div className="card">
                    {enabled && viewDisplayed !== undefined && objectKey !== undefined ? 
                        <div className="card-body text-center px-0 py-0">
                            <ul className="menu">
                                {abstList.map((abstName, index) => 
                                    <li className="menu-item" key={index} onClick={() => {
                                        stateDispatch({ command: 'SETABST', viewName: viewDisplayed, objectKey, abstName });
                                    } }><a>{abstName}</a></li>
                                )}
                            </ul>
                        </div>
                    :
                        <div className="card-header text-center text-tiny px-2 py-1">
                            switch
                        </div>
                    }
                </div>
            </div>
        </div>
    );
}
