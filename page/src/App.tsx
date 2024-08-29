import './App.css';

export default function App() {
    const TTYD_PORT       = import.meta.env.VISUALINUX_TTYD_PORT;
    const VISUALIZER_PORT = import.meta.env.VISUALINUX_VISUALIZER_PORT;
    // const BASE_URL        = "http://localhost";
    // const TTYD_URL        = `${BASE_URL}:${TTYD_PORT}`;
    // const VISUALIZER_URL  = `${BASE_URL}:${VISUALIZER_PORT}`;
    const LOCALHOST_IP    = import.meta.env.VISUALINUX_LOCALHOST_IP;
    const TTYD_URL        = `http://${LOCALHOST_IP}:${TTYD_PORT}`;
    const VISUALIZER_URL  = `http://${LOCALHOST_IP}:${VISUALIZER_PORT}`;
    return (
        <div id="app">
            <iframe src={TTYD_URL}       width="99.8%" height="640px" title="TmuxWindow"></iframe>
            <iframe src={VISUALIZER_URL} width="99.8%" height="640px" title="Visualizer"></iframe>
        </div>
    )
}
