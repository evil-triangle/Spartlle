/* Spartlle 共享引擎：棋子图标 + 棋子本体绘制。
   依赖 util.js（SL.roundRectCtx）。挂到 window.SL。 */
(function () {
  'use strict';
  window.SL = window.SL || {};

  /* ==================== 各棋子图标（纯路径绘制） ==================== */
  function iconStar(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s : s * 0.42;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath(); c.fill();
  }

  function iconNova(c, s) {
    c.save();
    c.shadowColor = '#fef3c7'; c.shadowBlur = 10;
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? s : s * 0.26;
      const a = -Math.PI / 2 + i * Math.PI / 4;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath(); c.fill();
    c.restore();
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.arc(0, 0, s * 0.18, 0, Math.PI * 2); c.fill();
  }

  function iconArcher(c, s) {
    c.lineCap = 'round';
    c.strokeStyle = '#fff';
    c.lineWidth = s * 0.14;
    c.beginPath(); c.arc(0, 0, s * 0.72, -Math.PI * 0.5, Math.PI * 0.5, true); c.stroke();
    c.lineWidth = s * 0.08;
    c.beginPath(); c.moveTo(0, -s * 0.72); c.lineTo(0, s * 0.72); c.stroke();
    c.lineWidth = s * 0.11;
    c.beginPath(); c.moveTo(-s * 0.55, 0); c.lineTo(s * 0.5, 0); c.stroke();
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(s * 0.85, 0); c.lineTo(s * 0.42, -s * 0.28); c.lineTo(s * 0.42, s * 0.28); c.closePath(); c.fill();
  }

  function iconCannon(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(-s * 0.22, s * 0.30); c.lineTo(-s * 0.22, -s * 0.60);
    c.lineTo(-s * 0.34, -s * 0.60); c.lineTo(-s * 0.34, -s * 0.98);
    c.lineTo(s * 0.34, -s * 0.98); c.lineTo(s * 0.34, -s * 0.60);
    c.lineTo(s * 0.22, -s * 0.60); c.lineTo(s * 0.22, s * 0.30);
    c.closePath(); c.fill();
    c.beginPath(); c.arc(0, s * 0.38, s * 0.58, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.42)';
    c.beginPath(); c.arc(0, s * 0.38, s * 0.20, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.arc(0, -s * 0.80, s * 0.09, 0, Math.PI * 2); c.fill();
  }

  function iconWarrior(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(0, -s); c.lineTo(s * 0.16, -s * 0.55); c.lineTo(s * 0.16, s * 0.15);
    c.lineTo(-s * 0.16, s * 0.15); c.lineTo(-s * 0.16, -s * 0.55);
    c.closePath(); c.fill();
    c.fillRect(-s * 0.5, s * 0.15, s * 1.0, s * 0.16);
    c.fillRect(-s * 0.09, s * 0.31, s * 0.18, s * 0.5);
    c.beginPath(); c.arc(0, s * 0.9, s * 0.13, 0, Math.PI * 2); c.fill();
  }

  function iconRanger(c, s) {
    function dagger() {
      c.beginPath();
      c.moveTo(0, -s); c.lineTo(s * 0.13, -s * 0.40); c.lineTo(s * 0.13, s * 0.25);
      c.lineTo(-s * 0.13, s * 0.25); c.lineTo(-s * 0.13, -s * 0.40);
      c.closePath(); c.fill();
      c.fillRect(-s * 0.42, s * 0.25, s * 0.84, s * 0.14);
      c.fillRect(-s * 0.08, s * 0.39, s * 0.16, s * 0.34);
      c.beginPath(); c.arc(0, s * 0.79, s * 0.11, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#fff';
    c.save(); c.rotate(-Math.PI / 4); dagger(); c.restore();
    c.save(); c.rotate(Math.PI / 4); dagger(); c.restore();
  }

  function iconCavalry(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(s * 0.85, s * 0.15); c.lineTo(s * 0.55, s * 0.55);
    c.lineTo(s * 0.05, s * 0.65); c.lineTo(-s * 0.5, s * 0.5);
    c.lineTo(-s * 0.75, s * 0.0); c.lineTo(-s * 0.5, -s * 0.4);
    c.lineTo(-s * 0.6, -s * 0.85); c.lineTo(-s * 0.15, -s * 0.5);
    c.lineTo(s * 0.05, -s * 0.85); c.lineTo(s * 0.2, -s * 0.5);
    c.lineTo(s * 0.6, -s * 0.3); c.lineTo(s * 0.9, -s * 0.1);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.arc(s * 0.35, -s * 0.05, s * 0.09, 0, Math.PI * 2); c.fill();
  }

  function iconDrone(c, s) {
    const rotors = [[-s * 0.6, -s * 0.6], [s * 0.6, -s * 0.6], [-s * 0.6, s * 0.6], [s * 0.6, s * 0.6]];
    c.strokeStyle = '#fff'; c.lineWidth = s * 0.13; c.lineCap = 'round';
    for (const [rx, ry] of rotors) { c.beginPath(); c.moveTo(0, 0); c.lineTo(rx, ry); c.stroke(); }
    c.fillStyle = '#fff';
    for (const [rx, ry] of rotors) { c.beginPath(); c.arc(rx, ry, s * 0.26, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.arc(0, 0, s * 0.35, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath(); c.arc(0, 0, s * 0.15, 0, Math.PI * 2); c.fill();
  }

  function iconMage(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(s * 0.10, -s * 0.95);
    c.quadraticCurveTo(-s * 0.30, -s * 0.45, -s * 0.50, s * 0.00);
    c.lineTo(s * 0.50, s * 0.00);
    c.quadraticCurveTo(s * 0.35, -s * 0.45, s * 0.10, -s * 0.95);
    c.closePath(); c.fill();
    c.beginPath(); c.ellipse(0, s * 0.10, s * 0.85, s * 0.16, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.10, -s * 0.95, s * 0.13, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.42)';
    c.beginPath(); c.arc(-s * 0.02, -s * 0.38, s * 0.10, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.28, -s * 0.22, s * 0.06, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-s * 0.30, -s * 0.18, s * 0.05, 0, Math.PI * 2); c.fill();
  }

  function iconWall(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(-s * 0.85, s * 0.75); c.lineTo(-s * 0.85, -s * 0.45);
    c.lineTo(-s * 0.85, -s * 0.80); c.lineTo(-s * 0.55, -s * 0.80); c.lineTo(-s * 0.55, -s * 0.45);
    c.lineTo(-s * 0.20, -s * 0.45); c.lineTo(-s * 0.20, -s * 0.80); c.lineTo(s * 0.20, -s * 0.80);
    c.lineTo(s * 0.20, -s * 0.45); c.lineTo(s * 0.55, -s * 0.45); c.lineTo(s * 0.55, -s * 0.80);
    c.lineTo(s * 0.85, -s * 0.80); c.lineTo(s * 0.85, s * 0.75);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(-s * 0.85, s * 0.10, s * 1.7, s * 0.08);
    c.fillRect(-s * 0.85, s * 0.45, s * 1.7, s * 0.08);
  }

  function iconIronWall(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(-s * 0.95, s * 0.80); c.lineTo(-s * 0.95, -s * 0.35);
    c.lineTo(-s * 0.95, -s * 0.82); c.lineTo(-s * 0.60, -s * 0.82); c.lineTo(-s * 0.60, -s * 0.35);
    c.lineTo(-s * 0.20, -s * 0.35); c.lineTo(-s * 0.20, -s * 0.82); c.lineTo(s * 0.20, -s * 0.82);
    c.lineTo(s * 0.20, -s * 0.35); c.lineTo(s * 0.60, -s * 0.35); c.lineTo(s * 0.60, -s * 0.82);
    c.lineTo(s * 0.95, -s * 0.82); c.lineTo(s * 0.95, s * 0.80);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.40)';
    c.fillRect(-s * 0.95, s * 0.15, s * 1.9, s * 0.16);
    c.fillRect(-s * 0.95, s * 0.52, s * 1.9, s * 0.16);
    c.fillStyle = '#fff';
    for (const x of [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75]) {
      c.beginPath(); c.arc(s * x, s * 0.23, s * 0.05, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(s * x, s * 0.60, s * 0.05, 0, Math.PI * 2); c.fill();
    }
  }

  function iconBarbedWire(c, s) {
    c.save();
    c.beginPath();
    c.moveTo(0, -s * 0.9); c.lineTo(s * 0.9, 0); c.lineTo(0, s * 0.9); c.lineTo(-s * 0.9, 0);
    c.closePath(); c.clip();
    c.strokeStyle = '#fff'; c.lineWidth = s * 0.10; c.lineCap = 'round';
    for (let i = -3; i <= 3; i++) {
      const offset = i * s * 0.35;
      c.beginPath(); c.moveTo(-s * 1.5 + offset, -s * 1.5); c.lineTo(s * 1.5 + offset, s * 1.5); c.stroke();
      c.beginPath(); c.moveTo(s * 1.5 + offset, -s * 1.5); c.lineTo(-s * 1.5 + offset, s * 1.5); c.stroke();
    }
    c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = s * 0.14; c.lineJoin = 'miter';
    c.beginPath();
    c.moveTo(0, -s * 0.9); c.lineTo(s * 0.9, 0); c.lineTo(0, s * 0.9); c.lineTo(-s * 0.9, 0);
    c.closePath(); c.stroke();
    c.fillStyle = '#fff';
    const spikes = [{ x: 0, y: -s * 0.9 }, { x: s * 0.9, y: 0 }, { x: 0, y: s * 0.9 }, { x: -s * 0.9, y: 0 }];
    for (const p of spikes) { c.beginPath(); c.arc(p.x, p.y, s * 0.12, 0, Math.PI * 2); c.fill(); }
  }

  function iconWallPack(c, s) {
    function miniWall(dx, dy, scale) {
      const w = s * 0.55 * scale, h = s * 0.85 * scale, merlonW = w / 3;
      c.beginPath();
      c.moveTo(dx - w / 2, dy + h / 2); c.lineTo(dx - w / 2, dy - h / 2);
      c.lineTo(dx - w / 2, dy - h / 2 - merlonW * 0.4); c.lineTo(dx - w / 2 + merlonW, dy - h / 2 - merlonW * 0.4);
      c.lineTo(dx - w / 2 + merlonW, dy - h / 2); c.lineTo(dx - w / 2 + merlonW * 1.5, dy - h / 2);
      c.lineTo(dx - w / 2 + merlonW * 1.5, dy - h / 2 - merlonW * 0.4); c.lineTo(dx - w / 2 + merlonW * 2, dy - h / 2 - merlonW * 0.4);
      c.lineTo(dx - w / 2 + merlonW * 2, dy - h / 2); c.lineTo(dx + w / 2, dy - h / 2);
      c.lineTo(dx + w / 2, dy + h / 2); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.4)';
      c.fillRect(dx - w / 2, dy + h * 0.1, w, s * 0.06);
      c.fillRect(dx - w / 2, dy + h * 0.35, w, s * 0.06);
      c.fillStyle = '#fff';
    }
    c.fillStyle = '#fff';
    miniWall(-s * 0.55, s * 0.15, 0.8);
    miniWall(0, -s * 0.05, 1.0);
    miniWall(s * 0.55, s * 0.15, 0.8);
  }

  function iconBase(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(-s * 0.75, s * 0.55); c.lineTo(-s * 0.75, -s * 0.15);
    c.lineTo(-s * 0.35, s * 0.1); c.lineTo(0, -s * 0.6);
    c.lineTo(s * 0.35, s * 0.1); c.lineTo(s * 0.75, -s * 0.15);
    c.lineTo(s * 0.75, s * 0.55);
    c.closePath(); c.fill();
    c.fillRect(-s * 0.75, s * 0.5, s * 1.5, s * 0.18);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath(); c.arc(-s * 0.5, s * 0.32, s * 0.08, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, s * 0.32, s * 0.08, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.5, s * 0.32, s * 0.08, 0, Math.PI * 2); c.fill();
  }

  function iconFort(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(0, -s * 0.75); c.lineTo(s * 0.68, -s * 0.48); c.lineTo(s * 0.68, s * 0.08);
    c.quadraticCurveTo(s * 0.68, s * 0.62, 0, s * 0.8);
    c.quadraticCurveTo(-s * 0.68, s * 0.62, -s * 0.68, s * 0.08);
    c.lineTo(-s * 0.68, -s * 0.48);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(-s * 0.09, -s * 0.45, s * 0.18, s * 0.9);
    c.fillRect(-s * 0.38, -s * 0.18, s * 0.76, s * 0.18);
  }

  /* ===== 敌方 / 中立单位（仅对战 / 护送关出现） ===== */
  function iconMonster(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 2;
      const x = Math.cos(a) * s * 0.9, y = Math.sin(a) * s * 0.9;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.arc(0, 0, s * 0.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fca5a5';
    c.beginPath(); c.arc(-s * 0.2, -s * 0.05, s * 0.13, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.2, -s * 0.05, s * 0.13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-s * 0.2, -s * 0.08, s * 0.05, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.2, -s * 0.08, s * 0.05, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = s * 0.08;
    c.beginPath(); c.arc(0, s * 0.15, s * 0.25, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-s * 0.04, -s * 0.95, s * 0.08, s * 0.15);
    c.beginPath(); c.arc(0, -s * 0.95, s * 0.1, 0, Math.PI * 2); c.fill();
  }

  function iconMech(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 2;
      const x = Math.cos(a) * s, y = Math.sin(a) * s;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.arc(0, 0, s * 0.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fca5a5';
    c.beginPath(); c.arc(-s * 0.2, -s * 0.05, s * 0.13, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.2, -s * 0.05, s * 0.13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-s * 0.2, -s * 0.08, s * 0.05, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.2, -s * 0.08, s * 0.05, 0, Math.PI * 2); c.fill();
  }

  function iconFlyer(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(0, -s * 0.8); c.lineTo(s * 0.8, 0); c.lineTo(s * 0.3, s * 0.3);
    c.lineTo(s * 0.4, s * 0.8); c.lineTo(0, s * 0.5); c.lineTo(-s * 0.4, s * 0.8);
    c.lineTo(-s * 0.3, s * 0.3); c.lineTo(-s * 0.8, 0);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.beginPath(); c.ellipse(0, 0, s * 0.3, s * 0.15, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c4b5fd';
    c.beginPath(); c.arc(0, 0, s * 0.1, 0, Math.PI * 2); c.fill();
  }

  function iconTransport(c, s) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(-s * 0.7, s * 0.4); c.lineTo(s * 0.7, s * 0.4); c.lineTo(s * 0.6, -s * 0.4);
    c.lineTo(-s * 0.6, -s * 0.4);
    c.closePath(); c.fill();
    c.fillStyle = '#22d3ee';
    c.beginPath();
    c.moveTo(-s * 0.5, s * 0.2); c.lineTo(s * 0.5, s * 0.2); c.lineTo(s * 0.45, -s * 0.2);
    c.lineTo(-s * 0.45, -s * 0.2);
    c.closePath(); c.fill();
  }

  const ICONS = {
    star: iconStar, nova: iconNova,
    archer: iconArcher, cannon: iconCannon,
    warrior: iconWarrior, ranger: iconRanger,
    cavalry: iconCavalry, drone: iconDrone,
    mage: iconMage,
    wall: iconWall, ironwall: iconIronWall,
    barbedwire: iconBarbedWire,
    wallpack: iconWallPack,
    base: iconBase, fort: iconFort,
    monster: iconMonster, mech: iconMech, flyer: iconFlyer, transport: iconTransport,
  };
  SL.ICONS = ICONS;

  /* ==================== 主题配色 ==================== */
  const THEMES = {
    p1:        { main: '#3b82f6', dark: '#1e40af', light: '#93c5fd' },
    p2:        { main: '#ef4444', dark: '#991b1b', light: '#fca5a5' },
    monster:   { main: '#7f1d1d', dark: '#450a0a', light: '#f87171' },
    flyer:     { main: '#4c1d95', dark: '#2e1065', light: '#c4b5fd' },
    transport: { main: '#0ea5e9', dark: '#0369a1', light: '#7dd3fc' },
  };

  function themeColors(theme) {
    if (theme === 1) return THEMES.p1;
    if (theme === 2) return THEMES.p2;
    switch (theme) {
      case 'player': case undefined: case null: return THEMES.p1;
      case 'monster': case 'mech': return THEMES.monster;
      case 'flyer': return THEMES.flyer;
      case 'transport': return THEMES.transport;
      case 'enemy': case 'p2': return THEMES.p2;
      default: return THEMES.p1;
    }
  }

  /* ==================== 绘制棋子本体 ====================
     统一签名：(ctx, cx, cy, size, type, theme, opts)
     - theme: 1|2（玩家编号）或 'player'|'monster'|'mech'|'flyer'|'transport'|'enemy' 等
     - opts: { shadow: true } —— 设为 false 可跳过阴影（透明卡片预览时用） */
  function paintPieceBody(c, cx, cy, size, type, theme, opts) {
    opts = opts || {};
    const col = themeColors(theme);
    const radius = size * 0.22;

    if (opts.shadow !== false) {
      c.fillStyle = 'rgba(0,0,0,0.55)';
      SL.roundRectCtx(c, cx - size / 2, cy - size / 2 + 2, size, size, radius);
      c.fill();
    }
    const g = c.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    g.addColorStop(0, col.light);
    g.addColorStop(0.45, col.main);
    g.addColorStop(1, col.dark);
    c.fillStyle = g;
    SL.roundRectCtx(c, cx - size / 2, cy - size / 2, size, size, radius);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    SL.roundRectCtx(c, cx - size / 2, cy - size / 2, size, size, radius);
    c.stroke();

    if (type === 'base') {
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 1.5;
      SL.roundRectCtx(c, cx - size / 2 + 3.5, cy - size / 2 + 3.5, size - 7, size - 7, radius - 2);
      c.stroke();
    }

    const iconFn = ICONS[type];
    if (iconFn) {
      c.save();
      c.translate(cx, cy - 1);
      c.shadowColor = 'rgba(0,0,0,0.6)';
      c.shadowBlur = 4;
      iconFn(c, size * 0.30);
      c.restore();
    }
  }
  SL.paintPieceBody = paintPieceBody;

  /* ==================== 图鉴卡片图标 ====================
     在 64px 画布上以 player 主题绘制棋子本体（供 codex 直接复用）。 */
  function drawCodexIcon(canvasEl, type) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 64;
    canvasEl.width = size * dpr; canvasEl.height = size * dpr;
    canvasEl.style.width = size + 'px'; canvasEl.style.height = size + 'px';
    const c = canvasEl.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;
    const bodySize = size - 8, half = bodySize / 2, radius = bodySize * 0.22;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    SL.roundRectCtx(c, cx - half, cy - half + 2, bodySize, bodySize, radius); c.fill();
    const g = c.createLinearGradient(0, cy - half, 0, cy + half);
    g.addColorStop(0, THEMES.p1.light); g.addColorStop(0.45, THEMES.p1.main); g.addColorStop(1, THEMES.p1.dark);
    c.fillStyle = g;
    SL.roundRectCtx(c, cx - half, cy - half, bodySize, bodySize, radius); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2;
    SL.roundRectCtx(c, cx - half, cy - half, bodySize, bodySize, radius); c.stroke();

    if (type === 'base') {
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5;
      SL.roundRectCtx(c, cx - half + 3.5, cy - half + 3.5, bodySize - 7, bodySize - 7, radius - 2); c.stroke();
    }

    const iconFn = ICONS[type];
    if (iconFn) {
      c.save(); c.translate(cx, cy - 1); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 4;
      iconFn(c, bodySize * 0.30); c.restore();
    }
  }
  SL.drawCodexIcon = drawCodexIcon;
})();
