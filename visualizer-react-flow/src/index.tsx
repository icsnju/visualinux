import React from 'react';
import ReactDOM from 'react-dom/client';

import { PanelsContextProvider } from '@app/panes/model/PanelsContext';
import { KernSnapshotsContextProvider } from '@app/visual/model/KernSnapshotsContext';
import Main from "@app/Main";

import './index.css';
// import Diagram from './visual/Diagram';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PanelsContextProvider>
            <KernSnapshotsContextProvider>
                <Main/>
                {/* <Diagram wKey={0} updateSelected={() => {}}/> */}
            </KernSnapshotsContextProvider>
        </PanelsContextProvider>
    </React.StrictMode>
);
