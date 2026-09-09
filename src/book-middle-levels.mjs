const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = {
  seasonId: 'hillside-library', sceneFamily: 'book', inspection: true, revision: 1,
  room: { custom: true, wall: '#e6e4d6' },
};
const cameras = (lookY = 1) => ({
  desktop: {
    default: { distance: 9.1, height: 4.6, lookY, lookZ: -0.08 },
    tidy: { distance: 9.5, height: 4.9, lookY, lookZ: 0 },
    finale: { distance: 8.5, height: 4.2, lookY, lookZ: -0.1 },
  },
  mobile: {
    default: { distance: 18.2, height: 6.7, lookY, lookZ: 0 },
    tidy: { distance: 20.2, height: 7.0, lookY, lookZ: 0.02 },
    finale: { distance: 16.1, height: 6.1, lookY, lookZ: -0.1 },
  },
});
const item = (id, name, start, slot, size, extra = {}) => ({
  id, name, kind: id, start, slot, size, mass: 0.25, collider: 'box',
  startRotation: FRONT, slotRotation: FRONT, dragHeight: 2.3, snapDistance: 0.55, placementLift: 0.25,
  marker: { position: [slot[0], slot[1] + 0.04, slot[2]], radius: 0.25 }, ...extra,
});

export const BOOK_CATALOG = {
  ...common, id: 'book-catalog', number: '04', name: '借阅卡柜', icon: 'desk', color: '#9baa87',
  title: '每个故事，<br/>都有地址。',
  description: '擦净小木柜，把借阅卡分门别类。<br/>抽屉轻轻一拉，想读的书就有了线索。',
  tags: '分类借阅卡 · 黄铜拉手 · 松木抽屉',
  steps: ['擦净借阅卡柜', '把三类卡片放好', '让抽屉顺滑归位'],
  tidyTitle: '山野旅行，<br/>故事归位。',
  tidyHint: '按抽屉上的文字，把山野、旅行、故事三叠卡片放进各自的格子。',
  actionTitle: '拉开一格，<br/>找到远方。',
  actionHint: '先缓缓拉出旅行抽屉，把索引偏差调到 0，再把抽屉轻轻推回。',
  actionLabel: '留好这些阅读线索',
  runningTitle: '木头轻响，<br/>卡片整齐。', runningHint: '三只小抽屉，安放着许多还没开始的旅程。',
  finishedTitle: '翻书之前，<br/>先找到它。',
  finishedDescription: '卡片分好类，索引齐平。<br/>想读的故事，都有一个清楚的位置。',
  caption: ['EVERY STORY HAS A PLACE', 'THE LIBRARY CATALOG'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'catalog-pull', name: '拉出旅行抽屉', buttonLabel: '慢慢拉开抽屉', hint: '按住中间的黄铜拉手，让旅行卡片随抽屉一起出来。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.28 },
    { id: 'catalog-index', name: '对齐卡片索引', hint: '把索引偏差调到 0，让三张分隔卡的顶部齐平。', mode: 'dial', initial: -18, min: -30, max: 30, target: 0, tolerance: 2, step: 1, unit: '格', label: '索引偏差', requires: ['catalog-pull'] },
    { id: 'catalog-close', name: '推回旅行抽屉', buttonLabel: '轻轻推回抽屉', hint: '按住拉手，看旅行卡片和抽屉一起滑回木柜。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.3, requires: ['catalog-index'] },
  ] },
  surfaces: [
    { id: 'catalog-top', name: '松木顶板', width: 2.53, height: 0.9, weight: 0.4, seed: 5401, completionThreshold: 0.85, material: 'wood', color: '#c6ae85', position: [0, 1.345, -0.21], rotation: TOP,
      camera: { distance: 8.7, height: 6.4, lookY: 1.2, lookZ: -0.21, angle: 0 } },
    { id: 'catalog-side', name: '木柜左侧', width: 0.92, height: 1.03, weight: 0.35, seed: 5402, completionThreshold: 0.85, material: 'wood', color: '#c6ae85', position: [-1.371, 0.73, -0.21], rotation: [0, -Math.PI / 2, 0],
      camera: { distance: 8.8, height: 3.5, lookX: -0.6, lookY: 0.75, lookZ: -0.21, angle: -1.2 } },
    { id: 'catalog-base', name: '鼠尾草色底沿', width: 2.72, height: 0.15, weight: 0.25, seed: 5403, completionThreshold: 0.84, material: 'ceramic', color: '#9daa8a', position: [0, 0.18, 0.447], rotation: FRONT,
      camera: { distance: 8.8, height: 3.0, lookY: 0.3, lookZ: 0.43, angle: 0 } },
  ],
  items: [
    item('catalog-nature', '山野借阅卡', [-1.91, 0.25, 0.97], [-0.86, 0.8, -0.12], [0.67, 0.48, 0.56], { order: 1, hint: '写着山野的卡片，放在左边山野抽屉。', marker: { position: [-0.86, 0.97, 0.13], plane: 'front', radius: 0.23 } }),
    item('catalog-travel', '旅行借阅卡', [0, 0.25, 1.12], [0, 0.8, -0.12], [0.67, 0.48, 0.56], { order: 2, hint: '写着旅行的卡片，放在中间旅行抽屉。', marker: { position: [0, 0.97, 0.13], plane: 'front', radius: 0.23 } }),
    item('catalog-story', '故事借阅卡', [1.88, 0.25, 0.97], [0.86, 0.8, -0.12], [0.67, 0.48, 0.56], { order: 3, hint: '写着故事的卡片，放在右边故事抽屉。', marker: { position: [0.86, 0.97, 0.13], plane: 'front', radius: 0.23 } }),
  ],
  obstacles: [
    { half: [1.4, 0.11, 0.63], position: [0, 0.17, -0.19] },
    { half: [1.36, 0.53, 0.45], position: [0, 0.79, -0.21] },
  ], cameras: cameras(0.85),
};

export const BOOK_GLOBE = {
  ...common, id: 'book-globe', number: '05', name: '旅行地球仪', icon: 'plant', color: '#a5b4a2',
  title: '转过一圈，<br/>找到小岛。',
  description: '擦亮地图护板，合上松开的半球。<br/>沿着虚构的群岛，找一找风栖岛。',
  tags: '原创群岛地图 · 黄铜子午环 · 小岛浮标',
  steps: ['擦净护板与底座', '合好球面与转柄', '把小岛转到眼前'],
  tidyTitle: '半球合拢，<br/>经线成环。',
  tidyHint: '先合上北半球，再装好黄铜子午环，最后把小转柄接到右边。',
  actionTitle: '远方很大，<br/>慢慢找它。',
  actionHint: '先转动球轴，让群岛经过眼前。再把寻岛角度调到 35°，最后按下罗盘锁扣。',
  actionLabel: '记住风栖岛的方向',
  runningTitle: '风停一停，<br/>小岛在这里。', runningHint: '这些岛屿只存在于这本旅行故事里，你可以慢慢想象它们。',
  finishedTitle: '书页之外，<br/>还有远方。',
  finishedDescription: '球面合好，罗盘落定。<br/>一枚小小的浮标，指向故事里的风栖岛。',
  caption: ['AN ISLAND IN A STORY', 'THE TRAVEL GLOBE'],
  operation: { kind: 'tasks', initial: 0, duration: 4.0, tasks: [
    { id: 'globe-spin', name: '转动旅行地球仪', buttonLabel: '慢慢转动球轴', hint: '按住右边的小转柄，看上下半球一起缓缓转动。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.24 },
    { id: 'globe-island', name: '寻找风栖岛', hint: '把寻岛角度调到 35°，让金色浮标转到正面的小刻线。', mode: 'dial', initial: -40, min: -90, max: 90, target: 35, tolerance: 4, step: 1, unit: '°', label: '寻岛角度', requires: ['globe-spin'] },
    { id: 'globe-lock', name: '按下罗盘锁扣', hint: '点一下底座前面的罗盘，让指针和小岛一起稳稳停住。', mode: 'tap', initial: 0, target: 1, requires: ['globe-island'] },
  ] },
  surfaces: [
    { id: 'globe-plate', name: '地图护板', width: 1.7, height: 0.28, weight: 0.5, seed: 5501, completionThreshold: 0.85, material: 'ceramic', color: '#a6b5a2', position: [0, 0.3, 0.651], rotation: FRONT,
      camera: { distance: 8.8, height: 3.2, lookY: 0.4, lookZ: 0.62, angle: 0 } },
    { id: 'globe-side', name: '黄铜底座后沿', width: 1.7, height: 0.21, weight: 0.5, seed: 5502, completionThreshold: 0.85, material: 'metal', color: '#b7a177', position: [0, 0.16, -0.715], rotation: [0, Math.PI, 0],
      camera: { distance: 8.7, height: 3.0, lookY: 0.3, lookZ: -0.71, angle: Math.PI } },
  ],
  items: [
    item('globe-hemisphere', '旅行北半球', [-1.7, 0.4, 0.60], [0, 1.8, -0.25], [1.52, 0.76, 1.52], { order: 1, dragHeight: 2.7, hint: '把半球的平口对齐下半球，拼成完整的故事世界。', marker: { position: [0, 1.5, -0.25], radius: 0.43 } }),
    item('globe-meridian', '黄铜子午环', [1.68, 0.075, 0.40], [0, 1.42, -0.25], [1.95, 1.95, 0.11], { order: 2, startRotation: TOP, dragHeight: 2.7, requires: ['globe-hemisphere'], hint: '把大圆环竖起来，装在球面外侧的双轴上。', marker: { position: [0, 2.35, -0.25], plane: 'front', radius: 0.26 } }),
    item('globe-crank', '木柄转轴', [0.55, 0.12, 1.21], [1.075, 1.12, -0.25], [0.31, 0.43, 0.27], { order: 3, dragHeight: 2.5, requires: ['globe-meridian'], hint: '把木柄接在球仪右侧的小轴上。', marker: { position: [1.08, 1.12, -0.14], plane: 'front', radius: 0.23 } }),
  ],
  obstacles: [
    { half: [1.04, 0.13, 0.68], position: [0, 0.16, -0.04] },
    { half: [0.15, 0.28, 0.15], position: [0, 0.5, -0.25] },
    { half: [0.77, 0.39, 0.77], position: [0, 1.03, -0.25] },
  ], cameras: cameras(1.14),
};

export const BOOK_MUSIC = {
  ...common, id: 'book-music', number: '06', name: '木制音乐盒', icon: 'radio', color: '#ac8f82',
  title: '小鸟醒来，<br/>书页轻响。',
  description: '擦净亚麻木盒，把滚筒与小鸟装好。<br/>上好发条，看一段微小的机械舞蹈。',
  tags: '黄铜滚筒 · 发条钥匙 · 纸折小鸟',
  steps: ['擦净旧木盒', '装好滚筒与小鸟', '轻轻唤醒音乐盒'],
  tidyTitle: '齿轮相接，<br/>小鸟落稳。',
  tidyHint: '滚筒放在左边轴座，发条钥匙接到右侧，纸折小鸟站上小圆台。',
  actionTitle: '转动发条，<br/>掀开盒盖。',
  actionHint: '先慢慢拧紧发条，再抬起木盖。最后碰一下纸鸟，看滚筒和小翅膀一起活动。',
  actionLabel: '留住这段小小的舞蹈',
  runningTitle: '齿尖一动，<br/>小鸟点头。', runningHint: '滚筒拨过细齿，纸鸟轻轻转身，陪着原来的钢琴慢慢呼吸。',
  finishedTitle: '把安静，<br/>装进盒子。',
  finishedDescription: '黄铜滚筒慢慢转，纸折小鸟轻轻摆动。<br/>阅读的角落，多了一点温柔的陪伴。',
  caption: ['A SMALL MECHANICAL DANCE', 'THE WOODEN MUSIC BOX'],
  operation: { kind: 'tasks', initial: 0, duration: 4.3, tasks: [
    { id: 'music-wind', name: '慢慢拧紧发条', buttonLabel: '转动发条钥匙', hint: '按住右边的黄铜钥匙，看发条一点点收紧。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.23 },
    { id: 'music-lid', name: '抬起木制盒盖', buttonLabel: '轻轻抬起盒盖', hint: '按住木盖，让里面的小小机关完整露出来。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.27, requires: ['music-wind'] },
    { id: 'music-bird', name: '唤醒纸折小鸟', hint: '轻碰右边的小鸟，放开机关，看滚筒和翅膀动起来。', mode: 'tap', sound: 'bell', initial: 0, target: 1, requires: ['music-lid'] },
  ] },
  surfaces: [
    { id: 'music-lid-face', name: '松木盒盖', width: 2.15, height: 1.1, weight: 0.4, seed: 5601, completionThreshold: 0.85, material: 'wood', color: '#bda27d', position: [0, 0.737, -0.06], rotation: TOP,
      camera: { distance: 8.9, height: 6.6, lookY: 0.8, lookZ: -0.06, angle: 0 } },
    { id: 'music-front', name: '亚麻盒身前沿', width: 2.12, height: 0.25, weight: 0.35, seed: 5602, completionThreshold: 0.85, material: 'linen', color: '#ddd4bc', position: [0, 0.32, 0.581], rotation: FRONT,
      camera: { distance: 8.7, height: 3.1, lookY: 0.42, lookZ: 0.58, angle: 0 } },
    { id: 'music-side', name: '木盒左侧', width: 0.96, height: 0.41, weight: 0.25, seed: 5603, completionThreshold: 0.84, material: 'wood', color: '#bda27d', position: [-1.176, 0.35, -0.06], rotation: [0, -Math.PI / 2, 0],
      camera: { distance: 8.7, height: 3.3, lookX: -0.5, lookY: 0.43, lookZ: -0.06, angle: -1.15 } },
  ],
  items: [
    item('music-cylinder', '黄铜滚筒', [-1.91, 0.21, 0.8], [-0.4, 0.62, -0.12], [1.12, 0.39, 0.39], { order: 1, hint: '把横向滚筒放进左边的一对黄铜轴座。', marker: { position: [-0.4, 0.65, -0.1], radius: 0.28 } }),
    item('music-key', '发条钥匙', [1.72, 0.15, 0.86], [1.225, 0.46, -0.13], [0.31, 0.47, 0.3], { order: 2, startRotation: [0, 0, Math.PI / 2], requires: ['music-cylinder'], hint: '把钥匙的细轴接到木盒右侧的圆孔。', marker: { position: [1.26, 0.46, -0.02], plane: 'front', radius: 0.22 } }),
    item('music-paper-bird', '纸折小鸟', [0.1, 0.25, 1.13], [0.62, 0.84, -0.2], [0.51, 0.43, 0.36], { order: 3, requires: ['music-cylinder'], hint: '让纸折小鸟站在右边的小圆台上。', marker: { position: [0.62, 0.66, -0.2], radius: 0.25 } }),
  ],
  obstacles: [
    { half: [1.18, 0.3, 0.65], position: [0, 0.32, -0.06] },
  ], cameras: cameras(0.82),
};

export const BOOK_MIDDLE_LEVELS = [BOOK_CATALOG, BOOK_GLOBE, BOOK_MUSIC];
