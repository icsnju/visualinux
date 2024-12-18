import { createContext, useReducer } from 'react';
import Panels, { SplitDirection } from './state';

const initialState = new Panels();

export type PanelsAction =
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
export const PanelsContext = createContext<{
    state: Panels;
    stateDispatch: React.Dispatch<PanelsAction>;
}>({
    state: initialState,
    stateDispatch: () => null
});

export function PanelsProvider({ children }: { children: React.ReactNode }) {
    const [state, stateDispatch] = useReducer(
        panelsReducer,
        initialState
    );
    return (
        <PanelsContext.Provider value={{state, stateDispatch}}>
            {children}
        </PanelsContext.Provider>
    );
}

function panelsReducer(state: Panels, action: PanelsAction) {
    switch (action.command) {
        case 'SPLIT':
            state.split(action.wKey, action.direction);
            return state.clone();
        case 'PICK':
            state.pick(action.wKey, action.objectKey);
            return state.clone();
        case 'SWITCH':
            state.setViewDisplayed(action.wKey, action.viewName);
            return state.clone();
        case 'FOCUS':
            state.focus(action.objectKey);
            return state;
        case 'REMOVE':
            state.remove(action.wKey);
            return state.clone();
        case 'ERASE':
            state.erase(action.wKey);
            return state.clone();
        case 'REFRESH':
            return state.clone();
        default:
            console.log('warning: unknown window model action', action);
            return state;
    }
}
