/* Spartlle 共享引擎：进度码（存档的文本化搬运格式）。
   依赖：可选 SL.save（只用来读章节/关卡数量，缺失时回退 4×12）。

   设计要点：
   - 位打包：4 bit 版本 + 关卡数×3 bit（easy/hard/x）+ 校验，48 关刚好 20 字节 → base64url 27 字符
   - 只做「备份/搬运」，不联网；localStorage 仍是唯一主存储
   - 导入一律取并集：旧码不可能把新进度抹掉 */
(function () {
  'use strict';
  window.SL = window.SL || {};

  const CODE_VERSION = 1;
  const CH = (window.SL.save && window.SL.save.CHAPTER_COUNT) || 4;
  const LV = (window.SL.save && window.SL.save.LEVELS_PER_CHAPTER) || 12;
  const LEVEL_BITS = CH * LV * 3;
  const DATA_BYTES = Math.ceil((4 + LEVEL_BITS) / 8); // 4 位版本之后补齐到整字节
  const TOTAL_BYTES = DATA_BYTES + 1;                  // 末尾 1 字节校验
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const FLAGS = ['easy', 'hard', 'x'];

  // 8 位滚动校验，足以挡住手抄错/漏字符，不承担防伪职责
  function checksum(bytes) {
    let h = 0x5a;
    for (let i = 0; i < bytes.length; i++) {
      h = ((h << 3) ^ (h >>> 5) ^ bytes[i]) & 0xff;
    }
    return h;
  }

  function toBase64Url(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < bytes.length ? bytes[i + 1] : null;
      const b2 = i + 2 < bytes.length ? bytes[i + 2] : null;
      out += B64[b0 >> 2];
      out += B64[((b0 & 3) << 4) | ((b1 === null ? 0 : b1) >> 4)];
      if (b1 === null) break;
      out += B64[((b1 & 15) << 2) | ((b2 === null ? 0 : b2) >> 6)];
      if (b2 === null) break;
      out += B64[b2 & 63];
    }
    return out;
  }

  function fromBase64Url(str) {
    const bytes = [];
    let buf = 0;
    let bits = 0;
    for (let i = 0; i < str.length; i++) {
      const v = B64.indexOf(str[i]);
      if (v < 0) return null;
      buf = ((buf << 6) | v) & 0xffff;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buf >> bits) & 0xff);
      }
    }
    return bytes;
  }

  function levelKey(ch, lv) { return 'c' + ch + '-l' + lv; }

  function encode(save) {
    const bits = [];
    const pushBits = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };

    pushBits(CODE_VERSION, 4);
    const progress = (save && save.progress) || {};
    for (let ch = 1; ch <= CH; ch++) {
      for (let lv = 1; lv <= LV; lv++) {
        const p = progress[levelKey(ch, lv)] || {};
        pushBits(p.easy ? 1 : 0, 1);
        pushBits(p.hard ? 1 : 0, 1);
        pushBits(p.x ? 1 : 0, 1);
      }
    }
    while (bits.length % 8 !== 0) bits.push(0);

    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      bytes.push(b);
    }
    const sum = checksum(bytes);
    bytes.push(sum);
    return toBase64Url(bytes);
  }

  // 允许直接粘贴：纯码 / 带 #p= 的备份链接 / 带 ?p= 的链接 / 中间有空格换行
  function normalize(input) {
    if (!input) return '';
    let s = String(input).trim();
    const m = /(?:^|[#?&])(?:p|code)=([A-Za-z0-9_-]+)/.exec(s);
    if (m) s = m[1];
    return s.replace(/[^A-Za-z0-9_-]/g, '');
  }

  function decode(input) {
    const code = normalize(input);
    if (!code) return { ok: false, reason: 'empty' };
    const bytes = fromBase64Url(code);
    if (!bytes || bytes.length !== TOTAL_BYTES) return { ok: false, reason: 'length' };
    const data = bytes.slice(0, DATA_BYTES);
    if (checksum(data) !== bytes[TOTAL_BYTES - 1]) return { ok: false, reason: 'checksum' };
    const version = data[0] >> 4;
    if (version !== CODE_VERSION) return { ok: false, reason: 'version' };

    const progress = {};
    let bit = 4;
    const readBit = () => {
      const b = (data[bit >> 3] >> (7 - (bit & 7))) & 1;
      bit++;
      return b;
    };
    for (let ch = 1; ch <= CH; ch++) {
      for (let lv = 1; lv <= LV; lv++) {
        progress[levelKey(ch, lv)] = { easy: !!readBit(), hard: !!readBit(), x: !!readBit() };
      }
    }
    return { ok: true, version, progress };
  }

  // 只升不降：本地已有的 true 不会被码里的 false 覆盖
  function merge(target, incoming) {
    let added = 0;
    for (const key of Object.keys(incoming || {})) {
      const src = incoming[key] || {};
      if (!target[key]) target[key] = { easy: false, hard: false, x: false };
      const cur = target[key];
      for (const f of FLAGS) {
        if (src[f] && !cur[f]) { cur[f] = true; added++; }
      }
    }
    return added;
  }

  function applyToSave(save, input) {
    const r = decode(input);
    if (!r.ok) return r;
    if (!save.progress) save.progress = {};
    const added = merge(save.progress, r.progress);
    return { ok: true, added, changed: added > 0 };
  }

  function readFromHash(hash) {
    const h = hash === undefined ? (typeof location !== 'undefined' ? location.hash : '') : hash;
    const m = /[#&]p=([A-Za-z0-9_-]+)/.exec(h || '');
    return m ? m[1] : null;
  }

  function stripHash() {
    try {
      if (typeof history === 'undefined' || !history.replaceState) return;
      if (!readFromHash()) return;
      history.replaceState(null, '', location.href.split('#')[0]);
    } catch (e) { /* file:// 等环境可能禁止改写 URL，忽略即可 */ }
  }

  // 线上地址：备份链接一律指向这里，而不是当前浏览器的 location。
  // 原因：在 file:// 或 localhost 下复制出来的链接别人打不开；而且玩家可能从
  // 1-1.html 带 ?c=&l= 参数进来，直接把当前 href 拼上去会带上无关参数。
  const SITE_BASE = 'https://evil-triangle.github.io/Spartlle/';
  const ENTRY_FILE = 'adventure.html';

  function isPublicHost() {
    if (typeof location === 'undefined') return false;
    if (!/^https?:$/.test(location.protocol)) return false;
    return !/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname || '');
  }

  // 备份链接的落点：真实站点上用当前目录（自动兼容 /Spartlle/ 这类子路径），
  // 本地调试时用固定的线上地址
  function backupBase() {
    if (isPublicHost()) {
      const dir = String(location.pathname).replace(/[^/]*$/, '');
      return location.origin + dir + ENTRY_FILE;
    }
    return SITE_BASE + ENTRY_FILE;
  }

  function backupURL(code) {
    return backupBase() + '#p=' + code;
  }

  SL.progressCode = {
    CODE_VERSION, CODE_LEN: Math.ceil(TOTAL_BYTES * 8 / 6), SITE_BASE,
    encode, decode, normalize, merge, applyToSave, readFromHash, stripHash,
    backupURL, backupBase,
  };
})();
