import React from 'react';
import ReactDOM from 'react-dom/client';

import { GlobalStateProvider } from '@app/context/Context';
import Main from '@app/Main';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    // <React.StrictMode>
        <GlobalStateProvider>
            <Main/>
        </GlobalStateProvider>
    // </React.StrictMode>
);
