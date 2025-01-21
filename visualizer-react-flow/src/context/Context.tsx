import { createContext, useReducer } from "react";
import Snapshots from "./Snapshots";
import Panels, { SplitDirection } from "./Panels";
import { Snapshot, ViewAttrs } from "@app/visual/types";
import { addLogTo, LogEntry, LogType } from "@app/utils";

class GlobalState {
    snapshots: Snapshots;
    panels: Panels;
    logs: LogEntry[]
    constructor(snapshots: Snapshots, panels: Panels, logs: LogEntry[]) {
        this.snapshots = snapshots;
        this.panels    = panels;
        this.logs      = logs;
    }
    getPlotOfPanel(pKey: number) {
        const viewname = this.panels.getViewname(pKey);
        const view = this.snapshots.getView(viewname);
        if (viewname === undefined || view === null) {
            return { view: null, attrs: {} };
        }
        const panelAttrs = this.panels.getViewAttrs(pKey);
        let attrs: ViewAttrs = {
            ...view.init_attrs,
            ...panelAttrs
        };
        return { view, attrs };
    }
    log(type: LogType, message: string) {
        addLogTo(this.logs, type, message);
    }
    refresh() {
        return new GlobalState(this.snapshots, this.panels, this.logs);
    }
    static create() {
        return new GlobalState(new Snapshots(), new Panels(), []);
    }
}

const initialState = GlobalState.create();

export type GlobalStateAction =
| { command: 'NEW',    snKey: string, snapshot: Snapshot, pc: string, timestamp: string }
| { command: 'USE',    snKey: string }
| { command: 'DIFF',   snKeySrc: string, snKeyDst: string }
| { command: 'SPLIT',  pKey: number, direction: SplitDirection }
| { command: 'PICK',   pKey: number, objectKey: string }
| { command: 'SWITCH', pKey: number, viewname: string }
| { command: 'UPDATE', pKey: number, attrs: ViewAttrs }
| { command: 'RESET',  pKey: number }
| { command: 'FOCUS',  objectKey: string }
| { command: 'REMOVE', pKey: number }

// export const GlobalStatusContext = createContext(new GlobalStatus());
export const GlobalStateContext = createContext<{
    state: GlobalState;
    stateDispatch: React.Dispatch<GlobalStateAction>;
}>({
    state: initialState,
    stateDispatch: () => null
});

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
    const [state, stateDispatch] = useReducer(
        globalStateReducer,
        initialState
    );
    return (
        <GlobalStateContext.Provider value={{state, stateDispatch}}>
            {children}
        </GlobalStateContext.Provider>
    );
}

function globalStateReducer(state: GlobalState, action: GlobalStateAction) {
    try {
        return globalStateDispatcher(state, action);
    } catch (error) {
        state.log('error', error instanceof Error ? error.message : String(error));
        return state.refresh();
    }
}

function globalStateDispatcher(state: GlobalState, action: GlobalStateAction) {
    switch (action.command) {
        case 'NEW':
            state.log('info', `NEW ${action.snKey} ${action.snapshot.pc} ${action.snapshot.timestamp}`);
            state.snapshots.new(action.snKey, action.snapshot);
            return state.refresh();
        case 'USE':
            state.log('info', `USE ${action.snKey}`);
            state.snapshots.use(action.snKey);
            return state.refresh();
        case 'DIFF':
            state.log('info', `DIFF ${action.snKeySrc} ${action.snKeyDst}`);
            state.snapshots.diff(action.snKeySrc, action.snKeyDst);
            return state.refresh();
        case 'SPLIT':
            state.log('info', `SPLIT ${action.pKey} ${action.direction}`);
            state.panels.split(action.pKey, action.direction);
            return state.refresh();
        case 'PICK':
            state.log('info', `PICK ${action.pKey} ${action.objectKey}`);
            state.panels.pick(action.pKey, action.objectKey);
            return state.refresh();
        case 'SWITCH':
            state.log('info', `SWITCH ${action.pKey} ${action.viewname}`);
            state.panels.switch(action.pKey, action.viewname);
            return state.refresh();
        case 'UPDATE':
            state.log('info', `UPDATE ${action.pKey} ${JSON.stringify(action.attrs)}`);
            state.panels.update(action.pKey, action.attrs);
            return state.refresh();
        case 'RESET':
            state.log('info', `RESET ${action.pKey}`);
            state.panels.reset(action.pKey);
            return state.refresh();
        case 'FOCUS':
            state.log('info', `FOCUS ${action.objectKey}`);
            state.panels.focus(action.objectKey);
            return state.refresh();
        case 'REMOVE':
            state.log('info', `REMOVE ${action.pKey}`);
            state.panels.remove(action.pKey);
            return state.refresh();
        default:
            throw new Error('unknown action: ' + JSON.stringify(action));
    }
}
