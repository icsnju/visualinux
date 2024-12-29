'use client'

import { useContext } from 'react';
import { GlobalStateContext } from '@app/context/Context';

import Popup from 'reactjs-popup';

export function PopViewSelector({ pKey, trigger }: { pKey: number, trigger: JSX.Element }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    // const viewList = state.plots.getViewList();
    const viewList = ['a', 'b', 'c']; // test
    const Poped = ((closePopup: (() => void)) => (
        <div className="fixed inset-0 flex items-center justify-center" onClick={closePopup}>
            <ul className="w-48 py-1 bg-white rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
                {viewList.map((viewName, index) => 
                    <li className="px-2 py-1 border border-gray-200 hover:bg-gray-100 cursor-pointer" key={index} onClick={() => {
                        stateDispatch({ command: 'SWITCH', pKey, viewName });
                        closePopup();
                    } }><a className="block text-gray-800">{viewName}</a></li>
                )}
            </ul>
        </div>
    )) as any as JSX.Element;
    return (
        <Popup trigger={trigger} modal>
            {Poped}
        </Popup>
    )
}

export function DropdownAbstSelector({ pKey, enabled }: { pKey: number, enabled: boolean }) {
    const { state, stateDispatch } = useContext(GlobalStateContext);
    let viewDisplayed = state.panels.getViewDisplayed(pKey);
    let objectKey = state.panels.getObjectSelected(pKey);
    let abstList: string[];
    if (viewDisplayed !== undefined && objectKey !== undefined) {
        abstList = [];//state.plots.getAbstList(viewDisplayed, objectKey);
    } else {
        abstList = [];
    }
    if (abstList.length == 0) { 
        enabled = false;
    }
    const onSwitchAbst = (abstName: string) => {
        if (viewDisplayed !== undefined && objectKey !== undefined) {
            stateDispatch({
                command: 'UPDATE',
                pKey,
                attrs: {
                    [objectKey]: {
                        abst: abstName
                    }
                }
            });
        }
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
                                    <li className="menu-item" key={index} onClick={() => onSwitchAbst(abstName)}>
                                        <a>{abstName}</a>
                                    </li>
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
