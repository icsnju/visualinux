import { createContext, useReducer } from 'react';
import KernSnapshots from './KernSnapshots';
import { State } from '@app/visual/type';

const initialState = new KernSnapshots([]);

export type KernSnapshotsAction =
| { command: 'NEWSTATE', key: string, state: State }
| { command: 'UPDATE',   viewName: string, attrs: any }

export const KernSnapshotsContext = createContext<{
    state: KernSnapshots;
    stateDispatch: React.Dispatch<KernSnapshotsAction>;
}>({
    state: initialState,
    stateDispatch: () => null
});

export function KernSnapshotsContextProvider({ children }: { children: React.ReactNode }) {
    const [state, stateDispatch] = useReducer(
        kernSnapshotsReducer,
        initialState
    );
    return (
        <KernSnapshotsContext.Provider value={{state, stateDispatch}}>
            {children}
        </KernSnapshotsContext.Provider>
    );
}

function kernSnapshotsReducer(state: KernSnapshots, action: KernSnapshotsAction) {
    switch (action.command) {
        case 'NEWSTATE':
            console.log('NEWSTATE', action.key, action.state);
            return state;
        case 'UPDATE':
            console.log('UPDATE', action.viewName, action.attrs);
            return state;
        default:
            throw new Error('unknown kernel states action');
    }
}
