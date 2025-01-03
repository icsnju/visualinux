import { createContext, useReducer } from "react";
import Plots from "./Plots";
import Panels, { SplitDirection } from "./Panels";
import { Plot, ViewAttrs } from "@app/visual/types";

type LogEntry = {
    timestamp: number
    type: LogType
    message: string
}
type LogType = 'info' | 'warning' | 'error'

class GlobalState {
    plots: Plots;
    panels: Panels;
    logs: LogEntry[]
    constructor(plots: Plots, panels: Panels, logs: LogEntry[]) {
        this.plots  = plots;
        this.panels = panels;
        this.logs   = logs;
    }
    log(type: LogType, message: string) {
        this.logs.push({
            timestamp: Date.now(),
            type: type,
            message: message
        });
    }
    refresh() {
        return new GlobalState(this.plots, this.panels, this.logs);
    }
    static create() {
        return new GlobalState(new Plots(), new Panels(), []);
    }
}

const initialState = GlobalState.create();

export type GlobalStateAction =
| { command: 'PLOT',   plotKey: string, plot: Plot }
| { command: 'SPLIT',  pKey: number, direction: SplitDirection }
| { command: 'PICK',   pKey: number, objectKey: string }
| { command: 'SWITCH', pKey: number, viewName: string }
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
        case 'PLOT':
            state.log('info', `PLOT ${action.plotKey}`);
            state.plots.plot(action.plotKey, action.plot);
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
            state.log('info', `SWITCH ${action.pKey} ${action.viewName}`);
            state.panels.switch(action.pKey, action.viewName);
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
