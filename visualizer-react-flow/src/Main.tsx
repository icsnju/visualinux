import { useContext, useEffect, useState } from "react";
import { GlobalStateContext } from "@app/context/Context";
import MainPane from "@app/panes/MainPane";

export default function Main() {
    const { stateDispatch } = useContext(GlobalStateContext);
    const [avoidHydrationError, setAvoidHydrationError] = useState(false);
    useEffect(() => {
        setAvoidHydrationError(true);
        const eventSource = new EventSource('/sse');
        eventSource.addEventListener('message', function(event) {
            const data = JSON.parse(event.data);
            console.log('sse receive:', data);
            if (Array.isArray(data)) {
                data.forEach(item => stateDispatch(item));
            } else {
                stateDispatch(data);
            }
        });
        eventSource.addEventListener('error', function(event) {
            if (event.eventPhase == EventSource.CLOSED) {
                console.error('sse closed');
                eventSource.close();
            } else {
                console.error('sse error: ', event);
            }
        }, false);
        return () => {
            eventSource.close();
        };
    }, [])
    return avoidHydrationError && <MainPane/>;
}
