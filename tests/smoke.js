/* Spartlle 回归冒烟测试（无浏览器，纯 jsdom）
   用途：改完 js/ 共享引擎后，快速确认 7 个页面仍能跑通、无运行时报错，
        且各页棋子面板 / 图鉴数量未因引擎变动而走形。

   运行：node tests/smoke.js
   依赖：jsdom。若本地未装，设置 JSDOM_PATH 指向已安装的 node_modules/jsdom。 */

const fs = require('fs');
const path = require('path');

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
  const fallback = process.env.JSDOM_PATH || 'C:/Users/22217/.workbuddy/binaries/node/workspace/node_modules/jsdom';
  ({ JSDOM, VirtualConsole } = require(fallback));
}

const ROOT = path.resolve(__dirname, '..');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 用一个临时 http 服务托管项目目录：让页面跑在 http(s) origin 下，
// 这样 history.replaceState 才与线上（github.io）一致（file:// 会被 jsdom 拒绝）。
const http = require('http');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
function serveRoot() {
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}

/* ---------------- 通用 canvas 2D 桩 ---------------- */
const STYLE_PROPS = new Set([
  'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'lineDashOffset',
  'font', 'textAlign', 'textBaseline', 'textRendering', 'direction', 'globalAlpha',
  'globalCompositeOperation', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY',
  'imageSmoothingEnabled', 'imageSmoothingQuality', 'filter', 'letterSpacing', 'wordSpacing',
]);
function makeCtx(canvas) {
  const grad = { addColorStop() {} };
  const store = new Map();
  const base = {
    canvas,
    measureText: () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createConicGradient: () => grad,
    createPattern: () => ({}),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)) }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)) }),
    getLineDash: () => [],
    isPointInPath: () => false,
    isPointInStroke: () => false,
  };
  return new Proxy(base, {
    get(t, k) {
      if (k in t) return t[k];
      if (STYLE_PROPS.has(k)) return store.has(k) ? store.get(k) : '';
      return function () {};
    },
    set(t, k, v) { store.set(k, v); return true; },
    has() { return true; },
  });
}

function installStubs(window, errors, seed) {
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (!this.__ctx) this.__ctx = makeCtx(this);
    return this.__ctx;
  };
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
  const store = new Map(seed ? Object.entries(seed) : []);
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: (i) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
    },
  });
  window.matchMedia = () => ({
    matches: false, media: '', addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  });
  window.scrollTo = () => {};
  window.alert = () => {};
  window.onerror = (msg, src, line, col, err) =>
    errors.push('[onerror] ' + msg + (err && err.stack ? '\n' + err.stack.split('\n').slice(0, 2).join('\n') : ''));
  window.addEventListener('unhandledrejection', (e) => errors.push('[rejection] ' + e.reason));
}

/* ---------------- 阶段一：页面冒烟 ---------------- */// expect.palette：1-2 这类"关卡自带固定阵容"的页面，必须与设计一致
const PAGES = [
  { file: 'index.html' },
  { file: 'story.html' },
  { file: 'adventure.html', expect: (p) => p.levels === 12 || `关卡数应为 12，实际 ${p.levels}` },
  { file: 'codex.html', expect: (p) => p.cards === 15 || `图鉴卡片应为 15，实际 ${p.cards}` },
  { file: '1-1.html', expect: (p) => p.pieceBtns === 3 || `1-1 应只有 3 个建造按钮，实际 ${p.pieceBtns}` },
  {
    file: '1-2.html',
    expect: (p) => {
      const want = ['star', 'archer', 'warrior', 'wall', 'wallpack', 'cannon'];
      const got = p.palette || [];
      return (got.length === 6 && want.every((id, i) => got[i] === id))
        || `1-2 阵容应为 ${want.join('/')}，实际 ${got.join('/') || '(空)'}`;
    },
  },
  {
    file: 'game.html',
    expect: (p) => (p.hasGameGlobal ? true : 'game.html 未暴露 __game'),
  },
];

async function smokePage(cfg) {
  const abs = path.join(ROOT, cfg.file);
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    const m = e.message || String(e);
    // 忽略网络资源类噪音（字体、外链 CSS）
    if (/Could not load link|Could not parse CSS|resource|Not implemented/i.test(m)) return;
    errors.push('[jsdomError] ' + m);
  });
  virtualConsole.on('error', (...a) => errors.push('[console.error] ' + a.join(' ')));

  const dom = new JSDOM(fs.readFileSync(abs, 'utf8'), {
    url: 'file:///' + abs.replace(/\\/g, '/'),
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse: (w) => installStubs(w, errors),
  });
  const w = dom.window;
  await wait(1800);

  const d = w.document;
  const q = (sel) => d.querySelectorAll(sel);
  // 棋子按钮统一由 SL.piecesheet 渲染成 .ps-btn（1-1 / 1-2 / game 共用一套）
  const PIECE_BTN = '.ps-btn, .piece-btn';
  const probes = { SL: !!(w.SL && w.SL.PIECE_TYPES), pieces: w.SL ? Object.keys(w.SL.PIECE_TYPES).length : 0 };
  if (q(PIECE_BTN).length) probes.pieceBtns = q(PIECE_BTN).length;
  if (q('#pieceContainer ' + PIECE_BTN).length) probes.palette = [...q('#pieceContainer ' + PIECE_BTN)].map((b) => b.dataset.piece);
  if (q('.codex-card, .card').length) probes.cards = q('.codex-card, .card').length;
  if (q('.level-node, .level-card, .level').length) probes.levels = q('.level-node, .level-card, .level').length;
  probes.hasGameGlobal = !!w.__game;

  const problems = [...errors];
  if (!probes.SL) problems.push('共享引擎 window.SL 未加载');
  if (cfg.expect) {
    const r = cfg.expect(probes);
    if (r !== true) problems.push(r);
  }
  w.close();
  return { file: cfg.file, problems, probes };
}

/* ---------------- 阶段二：引擎单元测试 ---------------- */
async function engineTest() {
  const problems = [];
  const dom = new JSDOM('<canvas id="c" width="64" height="64"></canvas>', {
    url: 'file:///x/', pretendToBeVisual: true, runScripts: 'outside-only',
  });
  const w = dom.window;
  installStubs(w, problems);
  for (const f of ['util.js', 'icons.js', 'pieces.js', 'save.js', 'progresscode.js', 'starfield.js']) {
    try {
      w.eval(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'));
    } catch (e) {
      problems.push(`${f} 加载失败: ${e.message}`);
    }
  }
  const SL = w.SL;
  if (!SL) { w.close(); return { problems: problems.concat('SL 未定义') }; }

  const ctx = w.document.getElementById('c').getContext('2d');
  const types = Object.keys(SL.PIECE_TYPES);
  const themes = [1, 2, 'player', 'monster', 'mech', 'flyer', 'transport', 'enemy'];
  let painted = 0;
  for (const t of types) {
    for (const th of themes) {
      for (const size of [54, 120]) {
        try { SL.paintPieceBody(ctx, 32, 32, size, t, th, { shadow: size > 60 }); painted++; }
        catch (e) { problems.push(`paintPieceBody(${t},${th},${size}): ${e.message}`); }
      }
    }
  }
  try { SL.paintPieceBody(ctx, 32, 32, 54, 'not_a_piece', 'player'); }
  catch (e) { problems.push('未知棋子类型应安全降级: ' + e.message); }
  for (const [name, fn] of Object.entries(SL.ICONS || {})) {
    try { fn(ctx, 20); } catch (e) { problems.push(`icon ${name}: ${e.message}`); }
  }

  // 存档回路：easy 通关解锁下一关；整章 easy 通关解锁下一章；持久化可往返
  const S = SL.save;
  const save = S.load();
  S.completeLevel(save, 1, 1, 'easy');
  if (!S.isLevelUnlocked(save, 1, 2)) problems.push('1-1 easy 通关后 1-2 未解锁');
  if (S.isChapterUnlocked(save, 2)) problems.push('第 1 章未全清却解锁了第 2 章');
  for (let lv = 1; lv <= S.LEVELS_PER_CHAPTER; lv++) S.completeLevel(save, 1, lv, 'easy');
  if (!S.isChapterUnlocked(save, 2)) problems.push('第 1 章全清后第 2 章未解锁');
  if (S.countChapterCleared(save, 1) !== S.LEVELS_PER_CHAPTER) problems.push('countChapterCleared 计数错误');
  S.persist(save);
  if (JSON.stringify(S.load()) !== JSON.stringify(save)) problems.push('存档持久化往返不一致');

  // 进度码：往返 / 长度 / 并集合并 / 拒绝坏码
  let sampleCode = '';
  const PC = SL.progressCode;
  if (!PC) {
    problems.push('SL.progressCode 未加载');
  } else {
    const empty = { version: 1, progress: {} };
    const emptyCode = PC.encode(empty);
    if (emptyCode.length !== 27) problems.push(`空存档进度码应为 27 字符，实际 ${emptyCode.length}`);
    if (!PC.decode(emptyCode).ok) problems.push('空存档进度码解码失败');

    const full = { version: 1, progress: {} };
    for (let ch = 1; ch <= 4; ch++) {
      for (let lv = 1; lv <= 12; lv++) full.progress[`c${ch}-l${lv}`] = { easy: true, hard: true, x: true };
    }
    const fullDec = PC.decode(PC.encode(full));
    if (!fullDec.ok) problems.push('全清进度码解码失败: ' + fullDec.reason);
    else if (JSON.stringify(fullDec.progress) !== JSON.stringify(full.progress)) problems.push('全清进度码往返不一致');

    // 并集：本地已有 hard，旧码只带 easy，不能被降级
    const local = { version: 1, progress: { 'c1-l1': { easy: true, hard: true, x: false } } };
    const older = { version: 1, progress: { 'c1-l1': { easy: true, hard: false, x: false }, 'c1-l2': { easy: true } } };
    const merged = PC.applyToSave(local, PC.encode(older));
    if (!merged.ok) problems.push('导入旧码失败: ' + merged.reason);
    if (!local.progress['c1-l1'].hard) problems.push('导入旧码把本地已通关的 hard 抹掉了');
    if (!local.progress['c1-l2'] || !local.progress['c1-l2'].easy) problems.push('导入未补齐缺失关卡');
    if (merged.added !== 1) problems.push(`合并新增计数应为 1，实际 ${merged.added}`);

    // 坏码：改一个字符（校验失败）、长度不对、垃圾输入
    const good = PC.encode(full);
    const tampered = good.slice(0, 10) + (good[10] === 'A' ? 'B' : 'A') + good.slice(11);
    if (PC.decode(tampered).ok) problems.push('篡改后的进度码未被校验拦下');
    if (PC.decode('shortcode').ok) problems.push('长度错误的进度码未被拦下');
    if (PC.applyToSave({ version: 1, progress: {} }, '!!!???').ok) problems.push('垃圾输入未被拒绝');

    // 链接形态可被识别
    const url = 'https://x.github.io/spartlle/#p=' + good;
    if (!PC.decode(url).ok) problems.push('带 #p= 的备份链接解析失败');
    if (PC.readFromHash('#p=' + good) !== good) problems.push('readFromHash 解析失败');

    // 备份链接必须指向线上地址（本地 file:// 下复制出来的链接别人打不开）
    const bu = PC.backupURL(good);
    if (!bu.endsWith('#p=' + good)) problems.push('备份链接未带上进度码');
    if (!/^https:\/\/evil-triangle\.github\.io\/Spartlle\/adventure\.html#p=/.test(bu)) {
      problems.push('file:// 下的备份链接未指向线上地址，实际 ' + bu);
    }

    // 给后面的"带码进入页面"用例准备一个只清了 1-1 easy 的码
    sampleCode = PC.encode({ version: 1, progress: { 'c1-l1': { easy: true, hard: false, x: false } } });
  }

  w.close();
  return {
    problems,
    sampleCode,
    probes: { types: types.length, themes: themes.length, painted, icons: Object.keys(SL.ICONS || {}).length },
  };
}

/* ---------------- 阶段三：旧存档兼容 ---------------- */
// 线上玩家的存档是旧版 adventure.html 写的：键名 spartlle_adventure_v1、version 1、
// 每关 {easy|hard|x}。这里用一份"旧存档"灌进去，确认新版既不丢键、也不丢标记。
async function legacySaveTest() {
  const problems = [];
  const legacy = {
    version: 1,
    progress: {
      'c1-l1': { easy: true, hard: true, x: false },
      'c1-l2': { easy: true },                       // 旧记录可能缺字段
      'c1-l3': { easy: true, hard: false, x: false },
      'c9-l9': { easy: true, hard: false, x: false }, // 未知/未来关卡键，不允许被清掉
    },
  };
  const abs = path.join(ROOT, 'adventure.html');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    const m = e.message || String(e);
    if (/Could not load link|Could not parse CSS|resource|Not implemented/i.test(m)) return;
    errors.push('[jsdomError] ' + m);
  });
  const dom = new JSDOM(fs.readFileSync(abs, 'utf8'), {
    url: 'file:///' + abs.replace(/\\/g, '/'),
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse: (w) => installStubs(w, errors, { spartlle_adventure_v1: JSON.stringify(legacy) }),
  });
  const w = dom.window;
  await wait(1600);

  const S = w.SL && w.SL.save;
  if (!S) {
    problems.push('SL.save 未加载');
  } else {
    const loaded = S.load();
    const keys = Object.keys(loaded.progress);
    if (keys.length !== 4) problems.push('旧存档键丢失，只剩: ' + keys.join(','));
    if (!loaded.progress['c1-l2'] || !loaded.progress['c1-l2'].easy) problems.push('旧存档 easy 标记丢失');
    if (!S.isLevelUnlocked(loaded, 1, 4)) problems.push('读旧存档后 1-4 应已解锁');
    // 写一次新进度，确认是合并而不是整体覆盖
    S.completeLevel(loaded, 1, 3, 'hard');
    S.persist(loaded);
    const again = S.load();
    if (!again.progress['c9-l9']) problems.push('写入新进度时清掉了未知关卡键');
    if (!again.progress['c1-l3'] || !again.progress['c1-l3'].hard) problems.push('新难度未写入');
    if (!again.progress['c1-l1'] || !again.progress['c1-l1'].hard) problems.push('旧进度 c1-l1.hard 被覆盖');
  }
  const nodes = w.document.querySelectorAll('.level-node, .level-card, .level').length;
  if (nodes !== 12) problems.push(`星图未正常渲染，关卡节点 ${nodes}`);
  problems.push(...errors);
  w.close();
  return { problems, probes: { nodes } };
}

/* ---------------- 阶段四：带进度码进入页面 ---------------- */
// 模拟玩家点开备份链接：本地是空档，URL 带 #p=，应自动合并、落盘、清掉 hash。
async function hashImportTest(code) {
  const problems = [];
  if (!code) return { problems: ['缺少样本进度码'], probes: {} };

  const abs = path.join(ROOT, 'adventure.html');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    const m = e.message || String(e);
    if (/Could not load link|Could not parse CSS|resource|Not implemented/i.test(m)) return;
    errors.push('[jsdomError] ' + m);
  });
  const server = await serveRoot();
  const port = server.address().port;
  const dom = new JSDOM(fs.readFileSync(abs, 'utf8'), {
    url: `http://127.0.0.1:${port}/adventure.html#p=${code}`,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse: (w) => installStubs(w, errors),
  });
  const w = dom.window;
  await wait(1600);

  let stored = null;
  try { stored = JSON.parse(w.localStorage.getItem('spartlle_adventure_v1')); } catch (e) {}
  if (!stored || !stored.progress) problems.push('带码进入后存档未落盘');
  else if (!stored.progress['c1-l1'] || !stored.progress['c1-l1'].easy) problems.push('带码进入后进度未写入');

  const doneNode = w.document.querySelector('.level-node.done-easy');
  if (!doneNode) problems.push('带码进入后星图未标记已通关节点');

  const value = (w.document.getElementById('progressValue') || {}).textContent || '';
  if (!/^1\s*\/\s*48/.test(value.trim())) problems.push(`顶栏 CLEARED 计数未更新，实际 "${value.trim()}"`);

  if (!w.document.getElementById('syncBtn')) problems.push('顶栏缺少存档码入口');
  if (!w.document.getElementById('codeOverlay')) problems.push('缺少存档码弹窗');

  // 弹窗交互：打开后展示的码应与当前存档一致；重复导入应为幂等；坏码要被拒绝
  const adv = w.__adventure;
  let codeShown = '';
  if (!adv) {
    problems.push('调试接口 __adventure 缺失');
  } else {
    adv.openCodeModal();
    codeShown = (w.document.getElementById('codeOut') || {}).value || '';
    if (codeShown !== adv.encodeCode()) problems.push('弹窗展示的进度码与当前存档不一致');
    if (codeShown.length !== 27) problems.push(`弹窗进度码长度应为 27，实际 ${codeShown.length}`);
    const again = adv.importCode(codeShown);
    if (!again.ok) problems.push('重复导入同一进度码失败');
    else if (again.added !== 0) problems.push(`重复导入应为幂等，实际新增 ${again.added} 项`);
    if (adv.importCode('!!!').ok) problems.push('弹窗导入坏码未被拒绝');
    if (!w.document.getElementById('codeOverlay').classList.contains('show')) problems.push('弹窗未显示');
  }

  problems.push(...errors);
  const hashLeft = w.location.hash;
  if (hashLeft) problems.push('导入后没有清掉 URL 里的 #p=（会重复导入），实际 "' + hashLeft + '"');

  w.close();
  server.close();
  return { problems, probes: { hash: hashLeft || '(已清)', cleared: value.trim(), code: codeShown.slice(0, 6) + '…' } };
}

/* ---------------- 阶段五：棋子说明 / 移动端布局 ---------------- */
// 1-1、1-2 的棋子按钮要"点了能看到功能说明"，且说明不能盖住棋盘（不能是浮层）。
// 同时确认棋盘尺寸会随视口变化（不再是写死的像素）。
async function mobileLayoutTest() {
  const problems = [];
  const cases = [
    { file: '1-1.html', first: 'star' },
    { file: '1-2.html', first: 'star' },
  ];
  const server = await serveRoot();
  const port = server.address().port;

  for (const c of cases) {
    const abs = path.join(ROOT, c.file);
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (e) => {
      const m = e.message || String(e);
      if (/Could not load link|Could not parse CSS|resource|Not implemented/i.test(m)) return;
      errors.push('[jsdomError] ' + m);
    });
    const dom = new JSDOM(fs.readFileSync(abs, 'utf8'), {
      url: `http://127.0.0.1:${port}/${c.file}`,
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      virtualConsole,
      beforeParse: (w) => installStubs(w, errors),
    });
    const w = dom.window;
    await wait(1500);
    const d = w.document;

    // 1) 每个棋子的 desc 都应写进了按钮，说明文字不是空的
    const btns = [...d.querySelectorAll('#pieceContainer .ps-btn')];
    if (!btns.length) problems.push(`${c.file}: 棋子条没有渲染出按钮`);
    for (const b of btns) {
      const p = w.SL.piecesheet.get(b.dataset.piece);
      if (!p || !p.desc) problems.push(`${c.file}: 棋子 ${b.dataset.piece} 缺少功能描述`);
      if (!b.dataset.desc) problems.push(`${c.file}: 按钮 ${b.dataset.piece} 未带 data-desc`);
    }

    // 2) 点一下按钮：说明条要展开并写入内容，且它是底栏的一部分（position 不是 fixed/absolute）
    const target = btns.find((b) => b.dataset.piece === c.first) || btns[0];
    target.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(60);
    const box = d.getElementById('pieceDesc');
    if (!box) problems.push(`${c.file}: 缺少棋子说明容器 #pieceDesc`);
    else {
      if (!box.classList.contains('show')) problems.push(`${c.file}: 点击棋子后说明条未展开`);
      const txt = (d.getElementById('descText') || {}).textContent || '';
      const want = w.SL.piecesheet.get(target.dataset.piece).desc;
      if (!txt.trim()) problems.push(`${c.file}: 说明条没有文字`);
      else if (txt.trim() !== want.trim()) problems.push(`${c.file}: 说明文字与引擎 desc 不一致`);
      const pos = w.getComputedStyle(box).position;
      if (pos === 'fixed' || pos === 'absolute') problems.push(`${c.file}: 说明条是浮层（${pos}），会遮挡棋盘`);
    }

    // 3) 买不起的棋子也要能点开看说明（灰态不等于不可点）
    const poor = btns.find((b) => b.classList.contains('ps-poor'));
    if (poor) {
      const before = (d.getElementById('descText') || {}).textContent || '';
      poor.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      await wait(60);
      const after = (d.getElementById('descText') || {}).textContent || '';
      const wantPoor = w.SL.piecesheet.get(poor.dataset.piece).desc;
      if (after.trim() !== wantPoor.trim()) {
        problems.push(`${c.file}: 点击买不起的棋子未能显示说明（"${after.slice(0, 12)}"）`);
      }
      if (after === before && before) problems.push(`${c.file}: 点击不同棋子说明没变化`);
    }

    // 4) 说明展开后，棋盘仍要落在上下两条面板之间（不重叠）
    const board = d.getElementById('board');
    const top = d.querySelector('.topbar').getBoundingClientRect();
    const bottom = d.getElementById('bottomPanel').getBoundingClientRect();
    const br = board.getBoundingClientRect();
    if (br.height > 0 && bottom.height > 0) {
      const EPS = 2;
      if (br.bottom > bottom.top + EPS) {
        problems.push(`${c.file}: 棋盘下沿 ${Math.round(br.bottom)} 超过了底栏上沿 ${Math.round(bottom.top)}（被遮挡）`);
      }
      if (br.top < top.bottom - EPS) {
        problems.push(`${c.file}: 棋盘上沿 ${Math.round(br.top)} 被顶栏压住 ${Math.round(top.bottom)}`);
      }
    }

    // 4) 场地尺寸变量应已写入（说明 fitCanvas 跑过）
    const padTop = d.documentElement.style.getPropertyValue('--pad-top');
    const padBottom = d.documentElement.style.getPropertyValue('--pad-bottom');
    if (!padTop || !padBottom) problems.push(`${c.file}: 未写入 --pad-top/--pad-bottom，自适应没生效`);

    if (errors.length) problems.push(...errors.slice(0, 3));
    w.close();
  }

  // 5) game.html：棋盘应有 fitCanvas，且对不同视口算出不同边长
  {
    const abs = path.join(ROOT, 'game.html');
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (e) => {
      const m = e.message || String(e);
      if (/Could not load link|Could not parse CSS|resource|Not implemented/i.test(m)) return;
      errors.push('[jsdomError] ' + m);
    });
    const dom = new JSDOM(fs.readFileSync(abs, 'utf8'), {
      url: `http://127.0.0.1:${port}/game.html`,
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      virtualConsole,
      beforeParse: (w) => installStubs(w, errors),
    });
    const w = dom.window;
    await wait(1500);
    const g = w.__game;
    if (!g || typeof g.fitCanvas !== 'function') {
      problems.push('game.html 缺少 fitCanvas（棋盘无法自适应）');
    } else {
      const canvas = w.document.getElementById('board');
      g.fitCanvas();
      const w1 = parseInt(canvas.style.width, 10);
      // 模拟一个更矮的视口，边长应随之变小
      Object.defineProperty(w, 'innerHeight', { configurable: true, value: 500 });
      g.fitCanvas();
      const w2 = parseInt(canvas.style.width, 10);
      if (!(w1 > 0) || !(w2 > 0)) problems.push('game.html 棋盘边长为 0');
      else if (w2 >= w1 && w1 > 500) problems.push(`game.html 缩小视口后棋盘未跟着变小（${w1} → ${w2}）`);
    }
    if (errors.length) problems.push(...errors.slice(0, 3));
    w.close();
  }

  server.close();
  return { problems, probes: {} };
}

/* ---------------- 汇总 ---------------- */
(async () => {
  let failed = 0;
  for (const cfg of PAGES) {
    const r = await smokePage(cfg);
    if (r.problems.length) failed++;
    console.log(`${r.problems.length ? 'FAIL' : ' OK '}  ${r.file.padEnd(15)}  ${JSON.stringify(r.probes)}`);
    r.problems.slice(0, 4).forEach((p) => console.log('        ↳ ' + p));
  }
  const e = await engineTest();
  if (e.problems.length) failed++;
  console.log(`${e.problems.length ? 'FAIL' : ' OK '}  js/engine       ${JSON.stringify(e.probes)}`);
  e.problems.slice(0, 6).forEach((p) => console.log('        ↳ ' + p));

  const c = await legacySaveTest();
  if (c.problems.length) failed++;
  console.log(`${c.problems.length ? 'FAIL' : ' OK '}  legacy-save     ${JSON.stringify(c.probes)}`);
  c.problems.slice(0, 6).forEach((p) => console.log('        ↳ ' + p));

  const h = await hashImportTest(e.sampleCode);
  if (h.problems.length) failed++;
  console.log(`${h.problems.length ? 'FAIL' : ' OK '}  code-import     ${JSON.stringify(h.probes)}`);
  h.problems.slice(0, 6).forEach((p) => console.log('        ↳ ' + p));

  const m = await mobileLayoutTest();
  if (m.problems.length) failed++;
  console.log(`${m.problems.length ? 'FAIL' : ' OK '}  layout          ${JSON.stringify(m.probes)}`);
  m.problems.slice(0, 8).forEach((p) => console.log('        ↳ ' + p));

  console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
  process.exitCode = failed ? 1 : 0;
  setTimeout(() => process.exit(failed ? 1 : 0), 100);
})();
