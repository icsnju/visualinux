const express = require('express');
const bodyParser = require('body-parser'); 
const next = require('next');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });
dotenv.config({ path: '../.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.VISUALINUX_VISUALIZER_PORT) || 3000;

app.prepare().then(() => {
    const server = express();
    server.use(bodyParser.json({ limit: '50mb' }));
    const MAX_SSE_CLIENTS = 10;
    let sseClients = [];
    server.post('/vcmd', express.json(), (req, res) => {
        const data = JSON.stringify(req.body);
        const event = `data: ${data}\n\n`;
        console.log('/vcmd received data');
        sseClients.forEach(client => {
            client.write(event);
        });
        res.sendStatus(200);
    });
    server.get('/sse', (req, res) => {
        if (sseClients.length >= MAX_SSE_CLIENTS) {
            res.status(403).send(`Maximum number (${MAX_SSE_CLIENTS}) of SSE client already connected for /vcmd`);
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.on('close', () => {
            sseClients = sseClients.filter(client => client !== res);
        });
        sseClients.push(res);
    });
    server.all('*', (req, res) => {
        return handle(req, res);
    });
    server.listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
