/* Spartlle 共享引擎：星空背景。
   依赖：无。挂到 window.SL。
   统一替换 6 个页面里各自拷贝的 resizeStars/initStars/drawStars。

   用法：
     SL.initStarfield(canvasEl, {
       count: 200,            // 星星数量
       mode: 'layered',       // 'layered'（带分层/微闪）或 'simple'（1-1/1-2/codex 用的快坠星）
       twinkle: false,        // layered 下是否闪烁
       shooting: false,       // 是否生成流星（仅 index 用）
       hue: false,            // 是否给部分星星上色（仅 index 用）
       layerMid: 0.7,         // 分层阈值（index 用 0.85 多一点大星）
       bg: 'vignette',        // 'vignette' 深空径向渐变，或任意纯色（simple 用 '#05050d'）
     });
   返回控制器 { resize, restart, stop }，并自动接管 requestAnimationFrame 与窗口缩放。 */
(function () {
  'use strict';
  window.SL = window.SL || {};

  const VIGNETTE = ['#0a0a1f', '#070712', '#030308'];

  function makeStar(mode, W, H, opts) {
    if (mode === 'simple') {
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 20 + 5,
        alpha: Math.random() * 0.5 + 0.4,
      };
    }
    // layered：分层尺寸 / 速度 + 闪烁相位
    const mid = (opts.layerMid != null) ? opts.layerMid : 0.7;
    const layer = Math.random() < 0.5 ? 0 : Math.random() < mid ? 1 : 2;
    const size = layer === 0 ? 0.3 + Math.random() * 0.5
               : layer === 1 ? 0.6 + Math.random() * 0.9
               : 1.2 + Math.random() * 1.5;
    const speed = layer === 0 ? 5 + Math.random() * 6
                : layer === 1 ? 12 + Math.random() * 10
                : 22 + Math.random() * 16;
    const star = {
      x: Math.random() * W, y: Math.random() * H,
      r: size, vy: speed,
      vx: speed * 0.08 * (Math.random() < 0.5 ? -1 : 1),
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.015 + Math.random() * 0.04,
      baseAlpha: 0.4 + Math.random() * 0.5,
    };
    if (opts.hue) star.hue = Math.random() < 0.2 ? (Math.random() < 0.5 ? 210 : 45) : null;
    return star;
  }

  SL.initStarfield = function (canvas, options) {
    const opts = options || {};
    const mode = opts.mode || 'layered';
    const count = (opts.count != null) ? opts.count : 200;
    const twinkle = !!opts.twinkle;
    const shooting = !!opts.shooting;
    const hue = !!opts.hue;
    const layerMid = opts.layerMid;
    const bgColor = (opts.bg === 'vignette' || opts.bg == null) ? null : opts.bg;

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    const stars = [];
    const shootingStars = [];
    let lastTime = performance.now();
    let shootingTimer = 0;
    let nextShootingAt = 3 + Math.random() * 5;
    let rafId = null;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function initStars() {
      stars.length = 0;
      for (let i = 0; i < count; i++) stars.push(makeStar(mode, W, H, { layerMid: layerMid, hue: hue }));
    }

    function spawnShootingStar() {
      const fromLeft = Math.random() < 0.5;
      shootingStars.push({
        x: fromLeft ? -50 : W + 50, y: Math.random() * H * 0.6,
        vx: fromLeft ? 500 + Math.random() * 300 : -500 - Math.random() * 300,
        vy: 200 + Math.random() * 150, life: 0, maxLife: 1.2, len: 80 + Math.random() * 60,
      });
    }

    function draw(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (bgColor) {
        ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H);
      } else {
        const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.85);
        bg.addColorStop(0, VIGNETTE[0]); bg.addColorStop(0.5, VIGNETTE[1]); bg.addColorStop(1, VIGNETTE[2]);
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      }

      for (const s of stars) {
        if (mode === 'layered' && twinkle) s.twinkle += s.twinkleSpeed * 60 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }
        if (s.x > W + 5) s.x = -5;
        if (s.x < -5) s.x = W + 5;

        const alpha = (mode === 'layered' && twinkle)
          ? s.baseAlpha * (0.75 + 0.25 * Math.sin(s.twinkle))
          : (s.alpha != null ? s.alpha : s.baseAlpha);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = (hue && s.hue) ? `hsl(${s.hue}, 70%, 85%)` : '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (shooting) {
        shootingTimer += dt;
        if (shootingTimer > nextShootingAt) {
          spawnShootingStar(); shootingTimer = 0; nextShootingAt = 4 + Math.random() * 7;
        }
        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const ss = shootingStars[i];
          ss.life += dt; ss.x += ss.vx * dt; ss.y += ss.vy * dt;
          if (ss.life > ss.maxLife) { shootingStars.splice(i, 1); continue; }
          const p = ss.life / ss.maxLife, a = Math.sin(p * Math.PI) * 0.9;
          const dir = Math.hypot(ss.vx, ss.vy), nx = -ss.vx / dir, ny = -ss.vy / dir;
          const tailX = ss.x + nx * ss.len, tailY = ss.y + ny * ss.len;
          const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
          grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, `rgba(255,255,255,${a})`);
          ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(ss.x, ss.y); ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    function onResize() { resize(); initStars(); }

    resize(); initStars();
    rafId = requestAnimationFrame(draw);
    window.addEventListener('resize', onResize);

    return {
      resize: resize,
      restart: function () { cancelAnimationFrame(rafId); resize(); initStars(); rafId = requestAnimationFrame(draw); },
      stop: function () { cancelAnimationFrame(rafId); window.removeEventListener('resize', onResize); },
    };
  };
})();
