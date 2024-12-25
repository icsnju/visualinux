import { useContext, useEffect, useState } from 'react';
import { PlotsContext } from '@app/visual/model/PlotsContext';
import { PanelsContext } from '@app/panes/model/PanelsContext';
import MainPane from '@app/panes/MainPane';

export default function Main() {
    const { stateDispatch: plotsStateDispatch } = useContext(PlotsContext);
    const { stateDispatch: panelsStateDispatch } = useContext(PanelsContext);
    const [avoidHydrationError, setAvoidHydrationError] = useState(false);
    useEffect(() => {
        setAvoidHydrationError(true);
        const eventSource = new EventSource('/sse');
        eventSource.addEventListener('message', function(event) {
            const data = JSON.parse(event.data);
            console.log('sse receive:', data);
            try {
                if (['ADDPLOT', 'UPDATE'].includes(data.command)) {
                    plotsStateDispatch(data);
                } else {
                    panelsStateDispatch(data);
                }
            } catch (error) {
                console.error('unknown front-end action', data.command, data);
            }
        });
        eventSource.addEventListener('error', function(event) {
            if (event.eventPhase == EventSource.CLOSED) {
                console.log('sse closed');
                eventSource.close();
            } else {
                console.log('sse error: ', event);
            }
        }, false);
        return () => {
            eventSource.close();
        };
    }, [])
    return avoidHydrationError && <MainPane/>;
}
