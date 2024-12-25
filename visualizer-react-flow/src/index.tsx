import React from 'react';
import ReactDOM from 'react-dom/client';

import { PanelsContextProvider } from '@app/panes/model/PanelsContext';
import { PlotsContextProvider } from '@app/visual/model/PlotsContext';
import Main from "@app/Main";

import './index.css';
// import Diagram from './visual/Diagram';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PanelsContextProvider>
            <PlotsContextProvider>
                <Main/>
                {/* <Diagram wKey={0} updateSelected={() => {}}/> */}
            </PlotsContextProvider>
        </PanelsContextProvider>
    </React.StrictMode>
);
