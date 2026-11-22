import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const http404s = [];
const srv = http.createServer((req, res) => {
  const clean = (req.url || '/').split('?')[0];
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  fs.readFile(path.join(__dirname, rel), (e, d) => {
    if (e) {
      http404s.push(rel);
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(d);
  });
});

await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const dbg = 9450 + Math.floor(Math.random() * 200);
const udir = fs.mkdtempSync(path.join(os.tmpdir(), 'bad-verify-'));
const ch = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${dbg}`,
  `--user-data-dir=${udir}`,
  '--window-size=1360,900',
  'about:blank'
], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 40; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json();
    const p = l.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (p) { wsUrl = p.webSocketDebuggerUrl; break; }
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = new Map();
const errs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data.toString());
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
};
const send = (method, params = {}) => new Promise((r) => {
  const i = ++id;
  pend.set(i, r);
  ws.send(JSON.stringify({ id: i, method, params }));
});

try {
  await send('Page.enable');
  await send('Runtime.enable');

  // Desktop audit
  await send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await new Promise((r) => setTimeout(r, 1400));

  const desktopStats = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `({
      cards: document.querySelectorAll('.holo-card-scene').length,
      seals: document.querySelectorAll('.bad-holo-seal').length,
      brokenImgs: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length,
      synergy: document.getElementById('duel-synergy-pill')?.textContent || '',
      overflowX: document.documentElement.scrollWidth > window.innerWidth
    })`
  });

  // Trigger a live duel round & inspect modal
  await send('Runtime.evaluate', { expression: `document.getElementById('play-round-btn').click();` });
  await new Promise((r) => setTimeout(r, 200));

  // Mobile viewport audit (390x844)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await new Promise((r) => setTimeout(r, 400));
  const mobileOverflow = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `document.documentElement.scrollWidth > window.innerWidth`
  });

  console.log('AUDIT RESULT:', JSON.stringify({
    desktop: desktopStats.result.value,
    mobileOverflowX: mobileOverflow.result.value,
    jsErrors: errs,
    http404s
  }));
  if (errs.length || http404s.length || desktopStats.result.value.brokenImgs > 0) {
    process.exitCode = 1;
  }
} finally {
  ws.close();
  ch.kill();
  srv.close();
  setTimeout(() => { try { fs.rmSync(udir, { recursive: true, force: true }); } catch {} }, 400);
}
