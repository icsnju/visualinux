import { createContext, useReducer } from 'react';
import Plots from './Plots';
import { Plot, ViewAttrs } from '@app/visual/type';

const initialState = new Plots([]);

export type PlotsAction =
| { command: 'ADDPLOT', pKey: string, plot: Plot }
| { command: 'UPDATE',  pKey: string, viewName: string, attrs: ViewAttrs }

export const PlotsContext = createContext<{
    state: Plots;
    stateDispatch: React.Dispatch<PlotsAction>;
}>({
    state: initialState,
    stateDispatch: () => null
});

export function PlotsProvider({ children }: { children: React.ReactNode }) {
    const [state, stateDispatch] = useReducer(
        plotsReducer,
        initialState
    );
    return (
        <PlotsContext.Provider value={{state, stateDispatch}}>
            {children}
        </PlotsContext.Provider>
    );
}

function plotsReducer(state: Plots, action: PlotsAction) {
    switch (action.command) {
        case 'ADDPLOT':
            console.log('ADDPLOT', action.pKey, action.plot);
            return state.addplot(action.plot);
        case 'UPDATE':
            console.log('UPDATE', action.pKey, action.viewName, action.attrs);
            return state.update(action.pKey, action.viewName, action.attrs);
        default:
            throw new Error('unknown kernel states action');
    }
}
