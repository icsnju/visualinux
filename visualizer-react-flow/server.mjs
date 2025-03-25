import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'vite';
import fs from 'fs';
import { exec } from 'child_process';

import './loadenv.mjs';

const __filename = fileURLToPath(import.meta.url);
const __rootdir = path.dirname(path.dirname(__filename));

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
        host: '0.0.0.0',
        port: +process.env.VISUALINUX_VISUALIZER_PORT || 3000,
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

app.post('/writelocal', (request, respond) => {
    let body = '';
    let filePath = path.resolve(__rootdir, 'tmp', 'test.txt');
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

app.post('/vcmd-debug', (request, respond) => {
    const scriptPath = path.resolve(__rootdir, 'scripts', 'resend-dump.py');
    const dumpDir = path.resolve(__rootdir, process.env.VISUALINUX_EXPORT_DIR || 'out');
    exec(`${scriptPath} ${dumpDir}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`/vcmd-debug: Error executing debug script: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`/vcmd-debug: Debug script stderr: ${stderr}`);
            return;
        }
        console.log(`/vcmd-debug: ${stdout}`);
    });
    respond.sendStatus(200);
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
