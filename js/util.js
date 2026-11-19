/* Spartlle 共享工具：圆角矩形。挂到 window.SL 命名空间下。
   注意：用经典 <script> 引入（非 ES module），避免 file:// 下的 CORS 问题。 */
(function () {
  'use strict';
  window.SL = window.SL || {};

  // 在任意 2D 上下文 c 上绘制圆角矩形路径（不填充/描边，由调用方决定）
  function roundRectCtx(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  SL.roundRectCtx = roundRectCtx;
})();
