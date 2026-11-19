/* Spartlle 共享引擎：棋子定义（名称 / 费用 / 血量 / 类别 / 描述 / 玩法字段）。
   依赖：无。挂到 window.SL。
   注意：这是 7 个页面棋子数据的唯一来源，改这里全站生效。 */
(function () {
  'use strict';
  window.SL = window.SL || {};

  // 类别主表：英文 id -> 中文显示名 / 图标 / 排序
  SL.CATEGORIES = {
    producer:  { name: '生产类', emoji: '★', order: 1 },
    shooter:   { name: '箭矢类', emoji: '➤', order: 2 },
    cannon:    { name: '星炮类', emoji: '☄', order: 3 },
    melee:     { name: '近战类', emoji: '⚔', order: 4 },
    defense:   { name: '防御类', emoji: '▣', order: 5 },
    summon:    { name: '生成类', emoji: '✦', order: 6 },
    structure: { name: '结构',   emoji: '⌂', order: 7 },
  };

  // 按 order 排序的类别 id 数组，便于构建分类栏 / 图鉴标签
  SL.CATEGORY_ORDER = Object.keys(SL.CATEGORIES)
    .sort((a, b) => SL.CATEGORIES[a].order - SL.CATEGORIES[b].order);

  // 棋子定义（英文 category 与 SL.CATEGORIES 对齐）
  SL.PIECE_TYPES = {
    star: {
      id: 'star', name: '星', category: 'producer',
      cost: 2, maxHp: 1, kind: 'producer', produce: 2,
      desc: '每回合开始给你创造2陨石。',
    },
    nova: {
      id: 'nova', name: '新星', category: 'producer',
      cost: 10, maxHp: 1, kind: 'producer', produce: 5,
      desc: '每回合开始给你带来5陨石。',
    },
    archer: {
      id: 'archer', name: '弓箭', category: 'shooter',
      cost: 12, maxHp: 2, kind: 'shooter',
      actions: ['shoot'],
      desc: '玩家可消耗一回合使弓箭沿一个方向发射一个【箭矢类】箭，击中第一个到达的目标，造成1伤害。',
    },
    cannon: {
      id: 'cannon', name: '星炮', category: 'cannon',
      cost: 99, maxHp: 3, kind: 'cannon',
      actions: ['shootCannon'],
      desc: '可发射【炮弹类】炮弹，碰到星核、信标、棋子、边界墙时爆炸，对爆炸中心造成7伤害，周围8格3【范围伤害】。hp = 3。',
    },
    warrior: {
      id: 'warrior', name: '勇士', category: 'melee',
      cost: 16, maxHp: 2, kind: 'melee',
      attackDamage: 2,
      moveRange: 3,                       // 守基地 / 护送关使用
      move: { dirs: 'ortho', range: 3 },  // 对战引擎使用
      actions: ['attack', 'move'],
      desc: '可控制他攻击周围8格中的一格，造成2点伤害。也可控制他向一个方向（上下左右）移动1~3格。',
    },
    ranger: {
      id: 'ranger', name: '游侠', category: 'melee',
      cost: 60, maxHp: 1, kind: 'melee',
      raidDamage: 1, raidRange: 2,
      actions: ['raid'],
      desc: '每次可移动到5*5范围内任意一格，并对到达点周围8格所有敌方单位造成1个伤害。hp=1。',
    },
    cavalry: {
      id: 'cavalry', name: '骑兵', category: 'melee',
      cost: 75, maxHp: 3, kind: 'cavalry',
      chargeRange: 3, chargeDamage: 2,
      actions: ['charge'],
      desc: 'hp = 3。一次可向上下左右中的一个方向移动1~3格，到达格不能有敌方棋子，但可以穿过敌方棋子（不可穿己方棋子），并对被穿过的棋子造成2伤害。',
    },
    drone: {
      id: 'drone', name: '无人机', category: 'cannon',
      cost: 85, maxHp: 2, kind: 'drone',
      moveOrthoRange: 3, moveDiagRange: 2,
      shellStyle: 'drone',
      shellCenterDamage: 4, shellAdjacentDamage: 1,
      actions: ['droneMove', 'droneShoot'],
      desc: 'hp = 2。一次可向上下左右中的一个方向移动1~3格，或斜向移动1~2格。可向八个方向中的一个发射【炮弹】（铁丝网防御对其生效）。炮弹（爆炸逻辑与星炮相同）可对命中目标造成4伤害，8个临格1伤害。',
    },
    mage: {
      id: 'mage', name: '普通法师', category: 'summon',
      cost: 75, maxHp: 2, kind: 'summon',
      move: { dirs: 'all8', range: 2 },
      spawnType: 'warrior',
      actions: ['spawn', 'move'],
      desc: '可控制他在周围八格中的一空格生成一个勇士。可控制移动。向8个方向中的一个移动1~2格。感受法师的力量！',
    },
    wall: {
      id: 'wall', name: '壁垒', category: 'defense',
      cost: 10, maxHp: 3, kind: 'wall',
      desc: '坚实的壁垒，hp = 3。用来阻挡敌人的箭矢与去路。',
    },
    ironwall: {
      id: 'ironwall', name: '加固的壁垒', category: 'defense',
      cost: 30, maxHp: 9, kind: 'wall',
      desc: '加固的壁垒，hp = 9。加固后是不是抗造多了？',
    },
    barbedwire: {
      id: 'barbedwire', name: '铁丝网', category: 'defense',
      cost: 20, maxHp: 2, kind: 'wire',
      desc: '箭矢无视它，炮弹打在上面失效。hp = 2。',
    },
    wallpack: {
      id: 'wallpack', name: '快速布墙', category: 'defense',
      cost: 50, maxHp: 0, kind: 'multiplace',
      placeType: 'wall', placeCount: 3,
      desc: '一次布置三个壁垒。',
    },
    base: { id: 'base', name: '大本营', category: 'structure', cost: 0, maxHp: 1, kind: 'base' },
    fort: { id: 'fort', name: '堡垒',   category: 'structure', cost: 0, maxHp: 3, kind: 'fort' },
  };
})();
