import { Label, ShapeKey, View } from '@app/visual/type';
import { ViewStorage } from '@app/vql/storage';
import { Attrs, genGoModelData } from '@app/visual/model';
import { preprocess } from '@app/visual/preprocess';
import Panels, { SplitDirection, PrimaryPanel } from '@app/panes/model/state';

import { createContext, useReducer } from 'react';

export class GlobalState {
    // viewHistory: ViewStorage[]
    viewStorage: ViewStorage | undefined
    windowModel: Panels
    lastTime: number
    constructor(viewData?: View, viewStorage?: ViewStorage, windowModel?: Panels) {
        // this.viewHistory = [];
        if (viewData === undefined) {
            this.viewStorage = viewStorage;
        } else {
            this.viewStorage = viewStorage || new ViewStorage(0, viewData);
        }
        this.windowModel = windowModel || new Panels();
        this.lastTime = 0;
    }
    getViewList(): string[] {
        if (this.viewStorage === undefined) {
            return [];
        }
        return Object.keys(this.viewStorage.data);
    }
    getGoModelData(viewDisplayed: string | undefined) {
        if (viewDisplayed === undefined || this.viewStorage === undefined) {
            return new goModelData();
        }
        return genGoModelData(this.viewStorage, viewDisplayed);
    }
    getGoModelDataFocused(viewDisplayed: string, objectKey: string) {
        if (this.viewStorage === undefined) {
            return new goModelData();
        }
        return genGoModelData(this.viewStorage, viewDisplayed, [objectKey]);
    }
    getAbstList(subviewName: string, objectKey: string) {
        if (this.viewStorage === undefined) {
            return [];
        }
        const subview = this.viewStorage.data[subviewName];
        const box = subview.pool.boxes[objectKey];
        if (!box) return [];
        return Object.keys(box.absts);
    }
    getAttrs(subviewName: string, objectKey: ShapeKey): Attrs {
        return this.viewStorage?.getAttrs(subviewName, objectKey) || {};
    }
    getMemberAttrs(subviewName: string, boxKey: ShapeKey, label: Label): Attrs {
        return this.viewStorage?.getMemberAttrs(subviewName, boxKey, label) || {};
    }
    getAttr(subviewName: string, objectKey: ShapeKey, attr: string): any {
        return this.getAttrs(subviewName, objectKey)[attr];
    }
    setAttr(subviewName: string, objectKey: ShapeKey, attr: string, value: any) {
        this.getAttrs(subviewName, objectKey)[attr] = value;
    }
    getAbst(subviewName: string, objectKey: ShapeKey): string {
        return this.getAttr(subviewName, objectKey, 'abst');
    }
    setAbst(subviewName: string, objectKey: ShapeKey, abstName: string) {
        this.setAttr(subviewName, objectKey, 'abst', abstName);
    }
    applyVql(subviewName: string, vqlCode: string) {
        this.viewStorage?.applyVql(subviewName, vqlCode);
    }
    clone() {
        let state = new GlobalState(undefined, this.viewStorage, this.windowModel);
        state.lastTime = this.lastTime;
        return state;
    }
    resetViewData(data: View) {
        let state = new GlobalState(data, undefined, this.windowModel);
        state.lastTime = this.lastTime;
        let vv = Object.values(data);
        if (vv.length > 0) {
            (state.windowModel.root.children[0] as PrimaryPanel).viewDisplayed = vv[0].name;
        }
        return state;
    }
}

const initialState = new GlobalState();

export type GlobalStateAction =
  { command: 'NEWSTATE', data: View }
| { command: 'SPLIT',    wKey: number, direction: SplitDirection }
| { command: 'PICK',     wKey: number, objectKey: string }
| { command: 'SWITCH',   wKey: number, viewName: string }
| { command: 'FOCUS',    objectKey: string }
| { command: 'REMOVE',   wKey: number }
| { command: 'ERASE',    wKey: number } // remove secondary // TODO: merge prim/seco pane key
| { command: 'REFRESH' }
| { command: 'SETABST',  viewName: string, objectKey: string, abstName: string }
| { command: 'APPLY',    wKey: number, vqlCode: string }

// export const GlobalStatusContext = createContext(new GlobalStatus());
export const GlobalStateContext = createContext<{
    state: GlobalState;
    stateDispatch: React.Dispatch<GlobalStateAction>;
}>({
    state: initialState,
    stateDispatch: () => null
});

export function GlobalStateProvider({ initData, children }: { initData?: View, children: React.ReactNode }) {
    const [state, stateDispatch] = useReducer(
        globalStateReducer,
        initialState
    );
    if (state == initialState) {
        stateDispatch({ command: 'NEWSTATE', data: initData || {} });
    }
    return (
        <GlobalStateContext.Provider value={{state, stateDispatch}}>
            {children}
        </GlobalStateContext.Provider>
    );
}

function globalStateReducer(state: GlobalState, action: GlobalStateAction) {
    switch (action.command) {
        case 'NEWSTATE':
            preprocess(action.data);
            let orderedData = Object.keys(action.data).sort().reduce((obj: any, key) => { 
                obj[key] = action.data[key]; 
                return obj;
            }, {});
            return state.resetViewData(orderedData);
        case 'SPLIT':
            state.windowModel.split(action.wKey, action.direction);
            return state.clone();
        case 'PICK':
            state.windowModel.pick(action.wKey, action.objectKey);
            return state.clone();
        case 'SWITCH':
            state.windowModel.setViewDisplayed(action.wKey, action.viewName);
            return state.clone();
        case 'FOCUS':
            state.windowModel.focus(action.objectKey);
            return state;
        case 'REMOVE':
            state.windowModel.remove(action.wKey);
            return state.clone();
        case 'ERASE':
            state.windowModel.erase(action.wKey);
            return state.clone();
        case 'REFRESH':
            return state.clone();
        case 'SETABST':
            state.setAbst(action.viewName, action.objectKey, action.abstName);
            return state.clone();
        case 'APPLY':
            console.log('APPLY', action.wKey, action.vqlCode);
            try {
                let viewName = state.windowModel.getViewDisplayed(action.wKey);
                if (viewName === undefined) throw Error(`viewName undefined for wKey=${action.wKey}`)
                state.applyVql(viewName, action.vqlCode);
            } catch (e: any) {
                console.log('vql error', e);
                state.windowModel.setConsoleText(action.wKey, e.message);
            }
            return state.clone();
        default:
            console.log('warning: unknown window model action', action);
            return state;
    }
}

