import React from 'react';
import ReactDOM from 'react-dom/client';

import { GlobalStateProvider } from '@app/context/Context';
import Main from "@app/Main";

import './index.css';
// import Diagram from './visual/Diagram';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalStateProvider>
            <Main/>
            {/* <Diagram wKey={0} updateSelected={() => {}}/> */}
        </GlobalStateProvider>
    </React.StrictMode>
);
