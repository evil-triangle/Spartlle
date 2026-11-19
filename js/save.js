/* Spartlle 共享引擎：关卡存档。
   依赖：无。挂到 window.SL.save。
   统一替换 adventure 的完整存档逻辑 与 1-1 / 1-2 的零散写入。

   存档结构：{ version: 1, progress: { 'c1-l1': { easy, hard, x }, ... } }
   键名使用 SL.save.lvKey(ch, lv) => 'c{ch}-l{lv}'。 */
(function () {
  'use strict';
  window.SL = window.SL || {};

  const SAVE_KEY = 'spartlle_adventure_v1';
  const CHAPTER_COUNT = 4;
  const LEVELS_PER_CHAPTER = 12;

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { version: 1, progress: {} };
      const data = JSON.parse(raw);
      if (data.version !== 1) return { version: 1, progress: {} };
      if (!data.progress) data.progress = {};
      return data;
    } catch (e) {
      console.warn('存档损坏，已重置', e);
      return { version: 1, progress: {} };
    }
  }

  function persist(save) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function lvKey(ch, lv) { return `c${ch}-l${lv}`; }

  function getProgress(save, ch, lv) {
    return save.progress[lvKey(ch, lv)] || { easy: false, hard: false, x: false };
  }

  // 至少 easy 通关才解锁下一关 / 下一章
  function isLevelUnlocked(save, ch, lv) {
    if (ch === 1 && lv === 1) return true;
    if (lv > 1) return getProgress(save, ch, lv - 1).easy;
    if (lv === 1 && ch > 1) return getProgress(save, ch - 1, LEVELS_PER_CHAPTER).easy;
    return false;
  }

  function isChapterUnlocked(save, ch) {
    if (ch === 1) return true;
    return getProgress(save, ch - 1, LEVELS_PER_CHAPTER).easy;
  }

  function countChapterCleared(save, ch) {
    let n = 0;
    for (let lv = 1; lv <= LEVELS_PER_CHAPTER; lv++) if (getProgress(save, ch, lv).easy) n++;
    return n;
  }

  // 关卡胜利：标记某难度完成。mode ∈ 'easy' | 'hard' | 'x'
  function completeLevel(save, ch, lv, mode) {
    const k = lvKey(ch, lv);
    const p = save.progress[k] || { easy: false, hard: false, x: false };
    if (mode === 'easy' || mode === 'hard' || mode === 'x') p[mode] = true;
    save.progress[k] = p;
    return save;
  }

  SL.save = {
    SAVE_KEY, CHAPTER_COUNT, LEVELS_PER_CHAPTER,
    load, persist, lvKey, getProgress, isLevelUnlocked, isChapterUnlocked, countChapterCleared, completeLevel,
  };
})();
