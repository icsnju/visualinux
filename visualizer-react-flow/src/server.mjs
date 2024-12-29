import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

const app = express();

// Configure body parser before other middleware
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// vite middleware
const vite = await createServer({
    appType: 'custom',
    configFile: 'vite.config.ts',
    server: {
        middlewareMode: true,
        // does not work; failed to fix.
        hmr: {
            host: 'localhost',
        },
    }
});
app.use(vite.middlewares);

// Update diagrams in real-time using SSE when a POST request is received

const MAX_SSE_CLIENTS = 99;
let sseClients = [];

app.post('/vcmd', express.json(), (req, res) => {
    const data = JSON.stringify(req.body);
    const event = `data: ${data}\n\n`;
    console.log('/vcmd received data');
    sseClients.forEach(client => {
        client.write(event);
    });
    res.sendStatus(200);
});

app.get('/sse', (request, respond) => {
    if (sseClients.length >= MAX_SSE_CLIENTS) {
        respond.status(403).send(`Maximum number (${MAX_SSE_CLIENTS}) of SSE client already connected for /vcmd`);
        return;
    }
    respond.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    respond.on('close', () => {
        sseClients = sseClients.filter(client => client !== respond);
    });
    sseClients.push(respond);
});

// localfs interaction (test)

app.post('/writelocal', function(request, respond) {
    let body = '';
    let filePath = path.resolve(__dirname, 'tmp', 'test.txt');
    console.log('recv writelocal', filePath);
    request.on('data', function(data) {
        body += data;
    });
    request.on('end', function() {
        fs.appendFile(filePath, body, function() {
            respond.end();
        });
    });
});

// general router

// ref: https://thenewstack.io/how-to-build-a-server-side-react-app-using-vite-and-express/
app.use('*', async (req, res) => {
    const url = req.originalUrl;
    try {
        const template = await vite.transformIndexHtml(url, fs.readFileSync('./src/index.html', 'utf-8'));
        // const { render } = await vite.ssrLoadModule('./src/ttk-entry-server.jsx');
        // const html = template.replace(`<!--outlet-->`, render);
        const html = template;
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
        res.status(500).end(error.toString());
    }
});

app.listen(vite.config.server.port, () => {
    console.log('visualinux front-end started on http://localhost:' + vite.config.server.port);
});
