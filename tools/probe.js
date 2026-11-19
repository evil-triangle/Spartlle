/* 用 Edge + CDP 打开页面并求值，打印布局尺寸。
   用法：node tools/probe.js <url> <width> <height> [js表达式] */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9800 + Math.floor(Math.random() * 300);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(pathname) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: pathname }, (res) => {
      let s = '';
      res.on('data', (d) => (s += d));
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function main() {
  const [, , url, wArg = '390', hArg = '844', expr] = process.argv;
  const width = parseInt(wArg, 10), height = parseInt(hArg, 10);

  const profile = path.join(os.tmpdir(), 'edge-probe-' + Date.now());
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await wait(200);
    try { target = (await getJson('/json/list')).find((t) => t.type === 'page'); } catch (e) {}
  }
  if (!target) { proc.kill(); throw new Error('Edge 启动失败'); }

  const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url });
  await wait(3200);

  const script = expr || `(() => {
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height), w: Math.round(b.width) }; };
    return JSON.stringify({
      vp: [innerWidth, innerHeight],
      topbar: r('.topbar'), stage: r('.stage'), board: r('#board'),
      dock: r('#bottomPanel') || r('.bottom-bar'), hud: r('.hud'),
      rootVars: getComputedStyle(document.documentElement).cssText.slice(0,0) || {
        padTop: document.documentElement.style.getPropertyValue('--pad-top'),
        padBottom: document.documentElement.style.getPropertyValue('--pad-bottom'),
        dockH: document.documentElement.style.getPropertyValue('--dock-h'),
        boardSize: document.documentElement.style.getPropertyValue('--board-size'),
      },
    }, null, 1);
  })()`;

  const res = await send('Runtime.evaluate', { expression: script, returnByValue: true, awaitPromise: true });
  console.log(res.result && res.result.value !== undefined ? res.result.value : JSON.stringify(res, null, 1));

  ws.close(); proc.kill(); await wait(200); process.exit(0);
}

main().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
