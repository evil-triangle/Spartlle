/* Spartlle 共享引擎：棋子名册 / 棋子选择条。
   依赖：util.js（圆角）、pieces.js（棋子的名称 / 费用 / 描述 / 血量）、icons.js（图标）。

   为什么要有这一层：
   1-1、1-2、game 三个页面各写了一套「棋子按钮」，结构和文案都不一致。
   这里统一成一份定义 + 一套渲染，谁要展示棋子，传一个 id 列表进来即可。

   本模块只管「好看、能点、有说明」，不含任何玩法逻辑：
   - 点击按钮只负责高亮 + 回调，真正的放置/扣费仍由各页面的引擎决定。
   - 关卡的开放阵容永远由页面自己用 id 白名单声明（见 AVAILABLE_PIECES）。

   名称与描述：一律直接使用 SL.PIECE_TYPES[id] 的 name / desc 原文，
   不另起别名、不改写文案，避免同一枚棋子在不同页面显示成两个名字。 */
(function () {
  'use strict';
  window.SL = window.SL || {};

  /* ---------------- 棋子名册 ---------------- */

  function get(id) {
    const d = (window.SL.PIECE_TYPES || {})[id];
    if (!d) return null;
    const cat = (window.SL.CATEGORIES || {})[d.category] || {};
    return {
      id: id,
      name: d.name,               // 原始名称，不改名
      cost: d.cost,
      maxHp: d.maxHp,
      desc: d.desc || '',         // 原始功能描述，不改写
      category: d.category,
      categoryName: cat.name || '',
      emoji: cat.emoji || '',
      def: d,
    };
  }

  /* ---------------- 棋子条 ---------------- */

  // 渲染一个按钮：图标 + 名称 + 费用。说明文字由各页面的说明条展示，
  // 按钮本身只带 data-desc（供提示条读取）与桌面端悬浮提示。
  function buildButton(id, opts) {
    opts = opts || {};
    const p = get(id);
    if (!p) return null;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ps-btn';
    btn.dataset.piece = id;
    btn.dataset.desc = p.desc;
    btn.title = p.name + '（' + p.cost + ' 陨石）\n' + p.desc;

    const cv = document.createElement('canvas');
    cv.className = 'ps-icon';
    btn.appendChild(cv);

    const text = document.createElement('div');
    text.className = 'ps-text';
    const nm = document.createElement('div');
    nm.className = 'ps-name';
    nm.textContent = p.name;
    const cost = document.createElement('div');
    cost.className = 'ps-cost';
    cost.textContent = String(p.cost);
    text.appendChild(nm);
    text.appendChild(cost);
    btn.appendChild(text);

    paintIcon(cv, id, opts.theme || 'player');
    return btn;
  }

  function paintIcon(cv, id, theme) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = 64;
    cv.width = box * dpr;
    cv.height = box * dpr;
    // 显示尺寸交给 CSS（.ps-icon），这里只给后备值，避免 canvas 自带 300×150 撑高按钮
    cv.style.width = '26px';
    cv.style.height = '26px';
    const c = cv.getContext('2d');
    if (!c) return;
    if (c.setTransform) c.setTransform(dpr, 0, 0, dpr, 0, 0);
    window.SL.paintPieceBody(c, box / 2, box / 2, 54, id, theme);
  }

  // 一次性重建整条棋子栏。返回按钮数组
  function renderSheet(container, ids, opts) {
    opts = opts || {};
    container.innerHTML = '';
    const buttons = [];
    for (const id of ids) {
      const btn = buildButton(id, opts);
      if (!btn) continue;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // 买不起 / 结算中时按钮显示为灰态，但仍然允许"点开看说明"。
        // 注意：不能用 disabled 属性，disabled 的按钮浏览器不会派发 click。
        if (btn.classList.contains('ps-poor') || btn.classList.contains('ps-locked')) {
          if (opts.onInspect) opts.onInspect(id, btn);
          return;
        }
        if (opts.onPick) opts.onPick(id, btn);
      });
      container.appendChild(btn);
      buttons.push(btn);
    }
    return buttons;
  }

  // 只在「可负担 / 禁用 / 选中」之间切换，不重建 DOM（重建会打断进行中的动画和焦点）
  function syncSheet(buttons, ctx) {
    for (const btn of buttons) {
      const p = get(btn.dataset.piece);
      const affordable = !ctx || ctx.meteors === undefined || ctx.meteors >= p.cost;
      const locked = !!(ctx && ctx.locked);
      btn.classList.toggle('ps-locked', locked);
      btn.classList.toggle('ps-poor', !affordable);
      btn.classList.toggle('active', !!(ctx && ctx.active === btn.dataset.piece));
      if (locked || !affordable) btn.setAttribute('aria-disabled', 'true');
      else btn.removeAttribute('aria-disabled');
    }
  }

  /* ---------------- 提示条 ---------------- */

  function describe(id) {
    const p = get(id);
    if (!p) return '';
    return p.name + ' · ' + p.categoryName + ' · ' + p.cost + ' 陨石 · ' + (p.maxHp || 0) + ' 血';
  }

  window.SL.piecesheet = {
    get, buildButton, paintIcon, renderSheet, syncSheet, describe,
  };
})();
