import { useContext, useEffect, useState } from 'react';
import { PanelsContext } from '@app/panes/model/PanelsContext';
import { KernSnapshotsContext } from '@app/visual/model/KernSnapshotsContext';
import MainPane from '@app/panes/MainPane';

export default function Main() {
    const { stateDispatch: panelsStateDispatch } = useContext(PanelsContext);
    const { stateDispatch: kernSnapshotsStateDispatch } = useContext(KernSnapshotsContext);
    const [avoidHydrationError, setAvoidHydrationError] = useState(false);
    useEffect(() => {
        setAvoidHydrationError(true);
        const eventSource = new EventSource('/sse');
        eventSource.addEventListener('message', function(event) {
            const data = JSON.parse(event.data);
            console.log('sse receive:', data);
            try {
                if (['NEWSTATE', 'UPDATE'].includes(data.command)) {
                    kernSnapshotsStateDispatch(data);
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
