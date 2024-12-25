import { createContext, useReducer } from 'react';
import Panels, { SplitDirection } from './Panels';

const initialState = new Panels();

export type PanelsAction =
| { command: 'SPLIT',    wKey: number, direction: SplitDirection }
| { command: 'PICK',     wKey: number, objectKey: string }
| { command: 'SWITCH',   wKey: number, viewName: string }
| { command: 'FOCUS',    objectKey: string }
| { command: 'REMOVE',   wKey: number }
| { command: 'REFRESH' }

export const PanelsContext = createContext<{
    state: Panels;
    stateDispatch: React.Dispatch<PanelsAction>;
}>({
    state: initialState,
    stateDispatch: () => null
});

export function PanelsContextProvider({ children }: { children: React.ReactNode }) {
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
        case 'REFRESH':
            return state.clone();
        default:
            throw new Error('unknown panels action');
    }
}
