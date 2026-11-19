/* 用本机 Edge + CDP 精确控制设备尺寸截图（--window-size 在旧版 headless 下不生效，
   所以走 DevTools 协议的 Emulation.setDeviceMetricsOverride）。

   用法：node tools/shot.js <url> <width> <height> <out.png> [--mobile] */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9500 + Math.floor(Math.random() * 400);

function getJson(pathname) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: pathname }, (res) => {
      let s = '';
      res.on('data', (d) => (s += d));
      res.on('end', () => {
        try { resolve(JSON.parse(s)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [, , url, wArg = '390', hArg = '844', out = 'shot.png', mode = ''] = process.argv;
  const width = parseInt(wArg, 10);
  const height = parseInt(hArg, 10);

  const profile = path.join(os.tmpdir(), 'edge-cdp-' + Date.now());
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await wait(200);
    try {
      const list = await getJson('/json/list');
      target = list.find((t) => t.type === 'page');
    } catch (e) { /* 还没起来 */ }
  }
  if (!target) { proc.kill(); throw new Error('Edge 未能在 12 秒内启动'); }

  // Node 22 自带 WebSocket 全局对象，无需第三方 ws
  const WebSocket = globalThis.WebSocket;
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 2, mobile: mode === '--mobile',
  });
  await send('Page.navigate', { url });
  await wait(3500);

  // 可选：截图前先点一下某个元素，用来验证交互后的布局
  const clickSel = process.argv[7];
  if (clickSel) {
    await send('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(clickSel)}).click()`,
    });
    await wait(700);
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('wrote ' + out + ' (' + width + 'x' + height + ', ' + fs.statSync(out).size + ' bytes)');

  ws.close();
  proc.kill();
  await wait(300);
  process.exit(0);
}

main().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
