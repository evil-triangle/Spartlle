/* 1-2.html 棋子修复的交互验证（Edge + CDP）。
   直接调用页面暴露的 __l12 钩子驱动逻辑，断言状态变化。
   运行：node tools/test-12.js */
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9850 + Math.floor(Math.random() * 100);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = 'file:///' + path.resolve(__dirname, '..', '1-2.html').replace(/\\/g, '/');

function getJson(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
      let s = ''; res.on('data', (d) => (s += d));
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  const profile = path.join(os.tmpdir(), 'edge-t12-' + Date.now());
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--allow-file-access-from-files',
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
  const events = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      events.push(msg.params.args.map((a) => a.value).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      events.push('EXCEPTION ' + (msg.params.exceptionDetails.text || ''));
    }
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL });
  await wait(2500);

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(r.exceptionDetails.exception));
    return r.result && r.result.value;
  };

  // 注入断言工具
  await evalJs(`
    window.__assert = [];
    window.__ck = (name, cond, detail) => window.__assert.push({ name, ok: !!cond, detail: detail || '' });
  `);

  const report = await evalJs(`(() => {
    const L = window.__l12;
    if (!L) return { fatal: '__l12 未暴露' };
    const S = L.state, P = L.PIECES;
    const ck = window.__ck;

    // ---------- 0) 进页面教程：boot 时应自动弹出，点按钮可关闭 ----------
    const rules = document.getElementById('rulesOverlay');
    ck('教程进入页面时自动弹出', rules && rules.classList.contains('show'));
    const rulesBtn = document.getElementById('rulesCloseBtn');
    if (rulesBtn) rulesBtn.click();
    ck('教程点「开始部署」后关闭', rules && !rules.classList.contains('show'));
    ck('操作条 DOM 已加入底栏', !!document.getElementById('actionPanel'));
    ck('操作条不是浮层', (() => {
      const p = document.getElementById('actionPanel');
      return p && getComputedStyle(p).position !== 'fixed' && getComputedStyle(p).position !== 'absolute';
    })());

    // ---------- 1) wallpack：一次付费 + 放 3 面壁 ----------
    S.pieces.clear(); S.enemies.length = 0;
    S.meteors = 100; S.transportIndex = 0;
    const before = S.meteors;
    const started = L.startMultiPlace('wallpack');
    ck('wallpack 可启动连放', started && !!S.multiPlace);
    ck('wallpack 扣一次费 50', before - S.meteors === 50, '扣了 ' + (before - S.meteors));
    ck('wallpack 待放数=3', S.multiPlace && S.multiPlace.remaining === 3);

    // 用放置白名单里的合法格放三面墙（模拟 handleTap 的放置分支）
    const mp = S.multiPlace;
    const placeWall = (col, row) => {
      const k = col + ',' + row;
      const legal = L.getPlaceableCells().some(c => c.col === col && c.row === row);
      if (!legal || S.pieces.has(k)) return false;
      const def = P[mp.placeType];
      S.pieces.set(k, { type: mp.placeType, hp: def.maxHp, maxHp: def.maxHp });
      mp.placedKeys.push(k); mp.remaining--;
      return true;
    };
    // 运输舰在 (0,0)，其周围是可放置格
    let placed = 0;
    const cells = L.getPlaceableCells().slice(0, 3);
    for (const c of cells) if (placeWall(c.col, c.row)) placed++;
    ck('wallpack 连放 3 面', placed === 3, '实际放 ' + placed);
    const walls = [...S.pieces.values()].filter(p => p.type === 'wall');
    ck('放下的是 wall 而非 0 血空壳', walls.length === 3 && walls.every(w => w.hp === 3 && w.maxHp === 3),
       JSON.stringify(walls));
    ck('wallpack 无 wallpack 占位棋子', ![...S.pieces.values()].some(p => p.type === 'wallpack'));

    // 取消退款
    const m2 = S.meteors;
    L.cancelMultiPlace();
    ck('取消 wallpack 全额退款', S.meteors === m2 + 50, '退后 ' + S.meteors + ' 期望 ' + (m2 + 50));

    // ---------- 2) archer 射击 ----------
    S.pieces.clear(); S.enemies.length = 0; S.arrows.length = 0;
    S.pieces.set('4,4', { type: 'archer', hp: 2, maxHp: 2 });
    S.enemies.push({ type: 'mech', col: 6, row: 4, hp: 3, maxHp: 3 });
    const enemyHp0 = S.enemies[0].hp;
    const turns0 = S.completedTurns;
    L.doShoot(4, 4, 1, 0);   // 向右射，命中 (6,4)
    ck('archer 射击造成 1 伤害', S.enemies[0] && S.enemies[0].hp === enemyHp0 - 1,
       '敌人 hp=' + (S.enemies[0] && S.enemies[0].hp));
    ck('archer 射击产生箭矢', S.arrows.length === 1);
    ck('archer 射击消耗一回合', S.completedTurns === turns0 + 1);

    // ---------- 3) warrior 近战 + 移动 ----------
    S.pieces.clear(); S.enemies.length = 0; S.arrows.length = 0;
    S.pieces.set('4,4', { type: 'warrior', hp: 2, maxHp: 2 });
    S.enemies.push({ type: 'mech', col: 5, row: 4, hp: 3, maxHp: 3 });
    L.doMeleeAttack(4, 4, 5, 4);
    ck('warrior 近战造成 2 伤害', S.enemies[0] && S.enemies[0].hp === 1,
       '敌人 hp=' + (S.enemies[0] && S.enemies[0].hp));

    S.enemies.length = 0;
    const targets = L.getMoveTargets(4, 4);
    ck('warrior 有移动目标', targets.length > 0, '目标数 ' + targets.length);
    ck('warrior 移动目标含 (5,4)', targets.some(t => t.col === 5 && t.row === 4));
    L.doMove(4, 4, 5, 4);
    ck('warrior 移动后旧格清空', !S.pieces.has('4,4'));
    ck('warrior 移动后新格有棋子', S.pieces.has('5,4') && S.pieces.get('5,4').type === 'warrior');

    // ---------- 4) cannon 炮击：敌伤 + 友伤 + 爆炸特效 ----------
    S.pieces.clear(); S.enemies.length = 0; S.arrows.length = 0; S.explosions.length = 0;
    S.pieces.set('3,4', { type: 'cannon', hp: 3, maxHp: 3 });
    S.enemies.push({ type: 'mech', col: 5, row: 4, hp: 7, maxHp: 7 });       // 爆心敌人
    S.enemies.push({ type: 'flyer', col: 5, row: 5, hp: 7, maxHp: 7 });      // 邻格敌人
    // 己方棋子：爆心 1 个（hp7→0 被摧毁），邻格 1 个（hp5→2），验证友伤
    S.pieces.set('5,4', { type: 'wall', hp: 7, maxHp: 7 });
    S.pieces.set('5,5', { type: 'warrior', hp: 5, maxHp: 5 });
    L.doCannonShot(3, 4, 1, 0);
    ck('cannon 爆心造成 7 伤害', !S.enemies.some(e => e.col === 5 && e.row === 4), '爆心敌人应被击杀');
    const adj = S.enemies.find(e => e.col === 5 && e.row === 5);
    ck('cannon 邻格造成 3 伤害', adj && adj.hp === 4, '邻格 hp=' + (adj && adj.hp));
    ck('cannon 友伤：爆心己方棋子被摧毁', !S.pieces.has('5,4'), '爆心 wall 应被友伤摧毁');
    const friendly = S.pieces.get('5,5');
    ck('cannon 友伤：邻格己方棋子掉 3 血', friendly && friendly.hp === 2, '邻格 warrior hp=' + (friendly && friendly.hp));
    ck('cannon 产生爆炸特效', S.explosions.length === 1 && S.explosions[0].col === 5 && S.explosions[0].row === 4,
       'explosions=' + JSON.stringify(S.explosions));

    // ---------- 5) 操作条渲染 ----------
    S.pieces.clear(); S.enemies.length = 0;
    S.pieces.set('4,4', { type: 'warrior', hp: 2, maxHp: 2 });
    S.selected = { col: 4, row: 4 }; S.controlAction = null;
    L.renderActionPanel();
    const btns = [...document.querySelectorAll('#actionButtons .action-btn')].map(b => b.textContent);
    ck('warrior 操作条有攻击/移动/取消', btns.includes('攻击') && btns.includes('移动') && btns.includes('取消'),
       JSON.stringify(btns));
    ck('操作条展开', document.getElementById('actionPanel').classList.contains('show'));

    // ---------- 6) 生成区变普通格：箭矢/炮弹穿过，不被拦截 ----------
    S.pieces.clear(); S.enemies.length = 0; S.arrows.length = 0;
    S.transportIndex = 0;
    // spawnCell (0,6)、spawner (0,7)。射线沿逻辑 row 增大方向：(0,5)→(0,6) 空生成区→(0,7) 敌人
    S.pieces.set('0,5', { type: 'archer', hp: 2, maxHp: 2 });
    S.enemies.push({ type: 'mech', col: 0, row: 7, hp: 3, maxHp: 3 });
    const hitToSpawn = L.findShootTarget(0, 5, 0, 1);
    ck('射线穿过空生成区命中其后敌人',
       hitToSpawn && hitToSpawn.kind === 'enemy' && hitToSpawn.col === 0 && hitToSpawn.row === 7,
       'hit=' + JSON.stringify(hitToSpawn));

    // 生成区不再作为 spawner 阻挡：射向空的 (0,7) 时射线应飞出边界（返回 null），而非被生成区挡下
    S.enemies.length = 0;
    const hitEmptySpawn = L.findShootTarget(0, 5, 0, 1);
    ck('空生成区不拦截射线', hitEmptySpawn === null, 'hit=' + JSON.stringify(hitEmptySpawn));

    // ---------- 7) 运输舰冷却：准备结束即可移动，移动后才计冷却 ----------
    S.completedTurns = L.CFG.PREPARE_TURNS; // 准备期刚好结束
    S.transportCooldown = 0; S.gameOver = false; S.isProcessing = false;
    L.updateHUD();
    const mb = document.getElementById('moveTransportBtn');
    ck('准备期结束即可移动（无需等固定周期）', !mb.disabled && /就绪/.test(mb.textContent),
       'disabled=' + mb.disabled + ' text=' + mb.textContent);
    // 模拟「刚移动完」：冷却被设为 TRANSPORT_INTERVAL
    S.transportCooldown = L.CFG.TRANSPORT_INTERVAL;
    L.updateHUD();
    ck('移动后进入冷却且按钮禁用', mb.disabled && new RegExp('冷却 ' + L.CFG.TRANSPORT_INTERVAL).test(mb.textContent),
       'disabled=' + mb.disabled + ' text=' + mb.textContent);
    // 冷却递减一次
    S.transportCooldown--;
    L.updateHUD();
    ck('冷却未归零仍禁用', mb.disabled, 'text=' + mb.textContent);
    // 冷却归零
    S.transportCooldown = 0;
    L.updateHUD();
    ck('冷却归零后恢复可移动', !mb.disabled && /就绪/.test(mb.textContent),
       'disabled=' + mb.disabled);
    // 恢复回合数，避免污染后续端到端场景（否则敌人会进入战斗阶段并移动）
    S.completedTurns = 0;

    return window.__assert;
  })()`);

  // ===== 端到端：通过真实 pointer 事件走完整条 handleTap 分发链路 =====
  const e2e = await evalJs(`(() => {
    const L = window.__l12, S = L.state;
    const ck = window.__ck;
    const canvas = document.getElementById('board');
    const rect = canvas.getBoundingClientRect();
    const SIZE = L.CFG.N * L.CFG.CELL;

    // 格中心 → 屏幕坐标（cellRect 的 y 轴翻转：row0 在视觉底行）
    const pt = (col, row) => {
      const cx = col * L.CFG.CELL + L.CFG.CELL / 2;
      const cy = (L.CFG.N - 1 - row) * L.CFG.CELL + L.CFG.CELL / 2;
      return {
        clientX: rect.left + cx * rect.width / SIZE,
        clientY: rect.top + cy * rect.height / SIZE,
      };
    };
    const tap = (col, row) => {
      const p = pt(col, row);
      const init = Object.assign({ bubbles: true, pointerType: 'mouse', pointerId: 1, isPrimary: true }, p);
      canvas.dispatchEvent(new PointerEvent('pointerdown', init));
      canvas.dispatchEvent(new PointerEvent('pointerup', init));
    };

    // --- 真实点击：wallpack 连放 3 面 ---
    S.pieces.clear(); S.enemies.length = 0; S.arrows.length = 0;
    S.meteors = 200; S.transportIndex = 0; S.gameOver = false; S.isProcessing = false;
    S.selected = null; S.controlAction = null; S.multiPlace = null; S.placing = null; S.selling = false;
    L.updateHUD(); L.draw();

    // 点棋子条里的 wallpack 按钮启动连放
    const wpBtn = document.querySelector('.ps-btn[data-piece="wallpack"]');
    ck('wallpack 按钮存在', !!wpBtn);
    if (wpBtn) wpBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    ck('点按钮后进入连放态', !!S.multiPlace, 'multiPlace=' + JSON.stringify(S.multiPlace));

    // 连点 3 个合法格（运输舰 (0,0) 周围）
    const legal = L.getPlaceableCells().slice(0, 3);
    for (const c of legal) tap(c.col, c.row);
    const placedWalls = [...S.pieces.values()].filter(p => p.type === 'wall');
    ck('真实点击连放 3 面 wall', placedWalls.length === 3 && placedWalls.every(w => w.hp === 3),
       '实际 ' + placedWalls.length + ' 面');
    ck('放满后连放态结束', !S.multiPlace);

    // --- 真实点击：选中 archer → 操作条 → 点敌人方向射击 ---
    S.pieces.clear(); S.enemies.length = 0; S.arrows.length = 0;
    S.gameOver = false; S.isProcessing = false; S.selected = null; S.controlAction = null;
    S.completedTurns = 0; S.transportCooldown = 0;
    S.pieces.set('4,4', { type: 'archer', hp: 2, maxHp: 2 });
    S.enemies.push({ type: 'mech', col: 6, row: 4, hp: 3, maxHp: 3 });
    L.updateHUD(); L.draw();

    tap(4, 4);   // 选中弓箭
    ck('点击棋子后进入选中态', S.selected && S.selected.col === 4 && S.selected.row === 4,
       'selected=' + JSON.stringify(S.selected));
    const shootBtn = [...document.querySelectorAll('#actionButtons .action-btn')].find(b => b.textContent === '射击');
    ck('操作条出现射击按钮', !!shootBtn);
    if (shootBtn) shootBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    ck('点射击后进入射击态', S.controlAction === 'shoot', 'action=' + S.controlAction);

    tap(5, 4);   // 点相邻格指定方向（向右）
    const en = S.enemies.find(e => e.col === 6);
    ck('端到端射击命中敌人扣 1 血', en && en.hp === 2, '敌人 hp=' + (en && en.hp));
    ck('端到端射击后退出操作态', !S.controlAction && !S.selected);

    return window.__assert.slice(-13);
  })()`);

  const all = (report.fatal ? [report] : report).concat(e2e.fatal ? [e2e] : e2e);
  console.log('=== 1-2 棋子修复验证 ===');
  let pass = 0, fail = 0;
  for (const a of all) {
    if (a.fatal) { console.log('FATAL: ' + a.fatal); fail++; continue; }
    console.log((a.ok ? ' OK  ' : ' FAIL') + ' ' + a.name + (a.detail ? '  [' + a.detail + ']' : ''));
    a.ok ? pass++ : fail++;
  }
  console.log('--- ' + pass + ' passed, ' + fail + ' failed ---');
  const jsErrors = events.filter(e => e.startsWith('EXCEPTION'));
  if (jsErrors.length) console.log('JS 异常: ' + jsErrors.join(' | '));

  ws.close(); proc.kill(); await wait(200);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FAILED: ' + e.stack); process.exit(1); });
