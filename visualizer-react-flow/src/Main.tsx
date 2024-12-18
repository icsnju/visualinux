import { useContext, useEffect, useState } from 'react';
import { PanelsContext } from '@app/panes/model/Context'; // TODO: viewsContext
import MainPane from '@app/panes/MainPane';

export default function Main() {
    const { stateDispatch } = useContext(PanelsContext);
    const [avoidHydrationError, setAvoidHydrationError] = useState(false);
    useEffect(() => {
        setAvoidHydrationError(true);
        const eventSource = new EventSource('/sse');
        eventSource.addEventListener('message', function(event) {
            const data = JSON.parse(event.data);
            console.log('sse receive:', data);
            stateDispatch(data);
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