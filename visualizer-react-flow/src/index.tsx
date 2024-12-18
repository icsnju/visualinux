import React from 'react';
import ReactDOM from 'react-dom/client';

import { PanelsProvider } from '@app/panes/model/Context';
import Main from "@app/Main";

import './index.css';
// import Diagram from './visual/Diagram';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PanelsProvider>
            <Main/>
            {/* <Diagram wKey={0} updateSelected={() => {}}/> */}
        </PanelsProvider>
    </React.StrictMode>
);
