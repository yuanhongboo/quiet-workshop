const flat = [-Math.PI / 2, 0, 0];
const base = { seasonId: 'evening-bakery', sceneFamily: 'bake', inspection: true, revision: 1, room: { custom: true } };
const cameras = {
  desktop: { default: { distance: 10.2, height: 5.5, lookY: 0.65, lookZ: 0 }, tidy: { distance: 11.1, height: 5.9, lookY: 0.65, lookZ: 0 }, finale: { distance: 10.2, height: 5.5, lookY: 0.65, lookZ: 0 } },
  mobile: { default: { distance: 19.8, height: 10.3, lookY: 0.65, lookZ: 0 }, tidy: { distance: 20.7, height: 10.6, lookY: 0.65, lookZ: 0 }, finale: { distance: 19.8, height: 10.3, lookY: 0.65, lookZ: 0 } },
};
export const BAKE_PEEL = {
  ...base, id: 'bake-peel', number: '07', name: '入炉木铲', icon: 'peel', color: '#bb946c',
  title: '留几道纹，<br/>等一炉香。', description: '木铲还带着上一炉留下的面粉。<br/>擦净木面、装好工具，让松软的面团带着几道浅浅的纹路，准备入炉。',
  tags: '木面清洁 · 工具归位 · 面团割纹', steps: ['擦净木铲和刀柄', '装好木柄与面团', '撒粉、割纹与接住'],
  tidyTitle: '顺手的工具，<br/>回到手边。', tidyHint: '先接上木铲长柄，再装好割纹刀，把面团放到案板上。',
  actionTitle: '轻轻划过，<br/>留下生长的纹。', actionHint: '撒一点薄粉，按住割纹刀划出浅纹，再让面团轻轻滑上木铲。', actionLabel: '准备下一炉面包',
  runningTitle: '一道道纹，<br/>藏着蓬松的明天。', runningHint: '面团稳稳留在木铲上，晚风里的烤箱已经准备好了。',
  finishedTitle: '木铲接住了，<br/>一小团期待。', finishedDescription: '浅浅的纹路会在烘烤时舒展开。<br/>把木铲带回面包房，让新的一炉香气从这里开始。', caption: ['A LITTLE ROOM TO RISE', 'THE BREAD PEEL'],
  operation: { kind: 'tasks', initial: 0, duration: 5, tasks: [
    { id: 'peel-flour', name: '撒一层薄薄的面粉', hint: '轻点右边的小筛，让面团披上一层薄粉。', mode: 'tap', initial: 0, target: 1 },
    { id: 'peel-score', name: '留下三道浅浅的纹', hint: '按住案板右侧的割纹刀，三道纹路会缓缓展开。', buttonLabel: '轻轻划出面包纹', mode: 'hold', initial: 0, target: 1, rate: 0.24, requires: ['peel-flour'] },
    { id: 'peel-load', name: '让木铲接住面团', hint: '按住木铲长柄，面团会慢慢滑到铲面中央。', buttonLabel: '把面团移上木铲', mode: 'hold', initial: 0, target: 1, rate: 0.28, requires: ['peel-score'] },
  ] },
  surfaces: [
    { id: 'peel-wood', name: '木铲铲面', width: 1.3, height: 1.08, weight: 0.65, seed: 6701, completionThreshold: 0.85, material: 'wood', color: '#c5a16e', position: [-0.96, 0.196, -0.2], rotation: flat, camera: { distance: 8.8, height: 6.6, lookX: -0.96, lookY: 0.2, lookZ: -0.2 } },
    { id: 'peel-grip', name: '割纹刀木柄', width: 0.74, height: 0.17, weight: 0.35, seed: 6702, completionThreshold: 0.84, material: 'wood', color: '#9f7456', position: [1.21, 0.19, 0.08], rotation: flat, camera: { distance: 8.5, height: 6.9, lookX: 1.21, lookY: 0.19, lookZ: 0.08 } },
  ],
  items: [
    { id: 'peel-handle', kind: 'bake-peel-handle', name: '木铲长柄', hint: '把长柄接到木铲靠近你的圆孔。', mass: 0.19, size: [0.19, 0.13, 0.92], start: [-1.88, 0.11, 0.83], slot: [-0.96, 0.16, 0.74], dragHeight: 1.3, collider: 'box', marker: { position: [-0.96, 0.19, 0.74], radius: 0.19 } },
    { id: 'peel-blade', kind: 'bake-scoring-blade', name: '割纹刀片', hint: '把银色刀片装到右边的木柄末端。', mass: 0.11, size: [0.45, 0.11, 0.22], start: [-0.12, 0.1, 1.13], slot: [0.75, 0.2, 0.08], dragHeight: 1.25, collider: 'box', requires: ['peel-handle'], marker: { position: [0.75, 0.24, 0.08], radius: 0.2 } },
    { id: 'peel-dough', kind: 'bake-scored-loaf', name: '醒好的面团', hint: '把面团放到案板中间的圆形粉印上。', mass: 0.23, size: [0.9, 0.42, 0.62], start: [1.16, 0.25, 1.03], slot: [0.27, 0.31, -0.44], dragHeight: 1.3, collider: 'box', requires: ['peel-blade'], marker: { position: [0.27, 0.16, -0.44], radius: 0.31 } },
  ], obstacles: [{ half: [1.8, 0.045, 0.77], position: [0, 0.045, -0.27] }], cameras,
};
export const BAKE_DISPLAY = {
  ...base, id: 'bake-display', number: '08', name: '面包陈列柜', icon: 'display', color: '#b7a378',
  title: '擦亮玻璃，<br/>给香气留个位置。', description: '小柜子空了好些天。<br/>擦净玻璃和木边，把隔板与藤篮放好，等待面包一个个住进来。',
  tags: '玻璃清洁 · 陈列归位 · 开门摆放', steps: ['擦净玻璃和柜沿', '装上柜门和隔板', '抛光、调合页与陈列'],
  tidyTitle: '每一层，<br/>都留着期待。', tidyHint: '竖起左侧的玻璃门，装好木隔板，再把藤篮放到前面。',
  actionTitle: '门轻轻开，<br/>面包排好队。', actionHint: '抛光把手、把合页调到 30，再慢慢打开柜门，让面包住进来。', actionLabel: '看看晚风里的陈列',
  runningTitle: '柔软与酥脆，<br/>都找到了位置。', runningHint: '小圆包和长面包依次摆好，透明的玻璃把晚霞也收了进来。',
  finishedTitle: '一眼望过去，<br/>都是好好做的小事。', finishedDescription: '陈列柜准备好了。<br/>今晚新烤的第一炉面包，会从烤箱一路来到这里。', caption: ['A WARM PLACE FOR EVERY LOAF', 'THE BREAD DISPLAY'],
  operation: { kind: 'tasks', initial: 0, duration: 5, tasks: [
    { id: 'display-polish', name: '擦亮圆圆的把手', hint: '按住前面的软布，把玻璃门把手擦得温润发亮。', buttonLabel: '慢慢抛光把手', mode: 'hold', initial: 0, target: 1, rate: 0.3 },
    { id: 'display-hinge', name: '让合页转得顺畅', hint: '转动右侧的合页旋钮，把刻度调到 30 附近。', mode: 'dial', initial: 0, min: 0, max: 60, target: 30, tolerance: 4, step: 1, unit: '', label: '合页', requires: ['display-polish'] },
    { id: 'display-arrange', name: '打开柜门，摆好面包', hint: '按住左边的玻璃门把手，面包会依次摆上隔板和藤篮。', buttonLabel: '慢慢开门摆好面包', mode: 'hold', initial: 0, target: 1, rate: 0.22, requires: ['display-hinge'] },
  ] },
  surfaces: [
    { id: 'display-glass', name: '右侧玻璃', width: 1.06, height: 0.83, weight: 0.58, seed: 6801, completionThreshold: 0.84, material: 'ceramic', color: '#c2cfbd', position: [0.62, 0.86, 0.38], rotation: [0,0,0], camera: { distance: 8.8, height: 3.5, lookX: 0.62, lookY: 0.86, lookZ: 0.38 } },
    { id: 'display-wood', name: '木柜前沿', width: 2.7, height: 0.18, weight: 0.42, seed: 6802, completionThreshold: 0.86, material: 'wood', color: '#b18a60', position: [0, 0.18, 0.437], rotation: [0,0,0], camera: { distance: 8.8, height: 2.1, lookX: 0, lookY: 0.18, lookZ: 0.44 } },
  ],
  items: [
    { id: 'display-door', kind: 'bake-glass-door', name: '玻璃柜门', hint: '把玻璃柜门竖起来，嵌进左半边的木框。', mass: 0.22, size: [1.12, 0.1, 0.97], start: [-1.47, 0.12, 1.08], slot: [-0.63, 0.89, 0.41], slotRotation: [Math.PI/2,0,0], dragHeight: 1.5, collider: 'box', marker: { position: [-0.63, 0.88, 0.46], radius: 0.33, plane: 'front' } },
    { id: 'display-shelf', kind: 'bake-display-shelf', name: '木隔板', hint: '把窄窄的隔板推进柜子中层。', mass: 0.2, size: [1.03, 0.12, 0.62], start: [0.05, 0.12, 1.08], slot: [0.59, 0.68, -0.13], dragHeight: 1.4, collider: 'box', requires: ['display-door'], marker: { position: [0.59, 0.72, -0.13], radius: 0.26 } },
    { id: 'display-basket', kind: 'bake-display-basket', name: '小藤篮', hint: '把藤篮安稳放到柜子前面右侧。', mass: 0.16, size: [0.85, 0.28, 0.62], start: [1.57, 0.18, 1.08], slot: [1.69, 0.18, 0.27], dragHeight: 1.2, collider: 'box', requires: ['display-shelf'], marker: { position: [1.69, 0.13, 0.27], radius: 0.25 } },
  ], obstacles: [{ half: [1.39, 0.13, 0.63], position: [0, 0.13, -0.2] }], cameras,
};
const desktop = { distance: 12.9, height: 7.8, lookY: 0.93, lookZ: 0 };
const mobile = { distance: 25.2, height: 13.3, lookY: 0.93, lookZ: 0 };
export const BAKE_OPENING = {
  ...base, id: 'bake-opening', number: '09', name: '晚风面包房', icon: 'bakery', bakeOverview: true, color: '#bb966f',
  title: '晚风进门，<br/>第一炉刚刚好。', description: '磨好的面粉、醒好的面团，还有等着开门的玻璃柜。<br/>你修好的八件日常，在这间小小面包房里，一起完成今晚的第一炉。',
  tags: '全季成果 · 面包烘焙 · 面包房开门', steps: ['八件修好的日常', '一起烤好第一炉', '让香气走进晚风'],
  tidyTitle: '每一次用心，<br/>都有香气回应。', tidyHint: '八件亲手修好的工具，都已经回到面包房。',
  actionTitle: '送进去，<br/>慢慢变金黄。', actionHint: '把面团送入烤箱，按住让它蓬松上色，再把热面包移到柜前，翻过门牌。', actionLabel: '今晚开始营业',
  runningTitle: '面包刚刚好，<br/>晚风也刚刚好。', runningHint: '第一炉面包冒着轻轻的热气，暖灯照着玻璃柜，门前的小牌子终于翻到了开门的一面。',
  finishedTitle: '你收拾的日常，<br/>变成了温暖的一餐。', finishedDescription: '从一粒麦子，到一炉面包。<br/>每一件被好好照顾的东西，都参与了这个有香气的傍晚。', caption: ['A LITTLE WARMTH TO SHARE', 'EVENING BAKERY · SEASON 06'],
  operation: { kind: 'tasks', initial: 0, duration: 8, tasks: [
    { id: 'bakery-load', name: '把面团轻轻送入烤箱', hint: '按住烤箱前的木铲长柄，让面团滑进暖暖的炉膛。', buttonLabel: '送入第一炉面团', mode: 'hold', initial: 0, target: 1, rate: 0.28 },
    { id: 'bakery-bake', name: '让面包慢慢蓬松金黄', hint: '按住烤箱前的暖色旋钮，面包会鼓起来、裂开纹路，慢慢变成金黄。', buttonLabel: '慢慢烤到金黄', mode: 'hold', initial: 0, target: 1, rate: 0.17, requires: ['bakery-load'] },
    { id: 'bakery-serve', name: '把热面包送到柜前', hint: '按住前台的小托盘，木铲会把面包送到玻璃柜前的藤篮里。', buttonLabel: '把面包送到前台', mode: 'hold', initial: 0, target: 1, rate: 0.23, requires: ['bakery-bake'] },
    { id: 'bakery-open', sound: 'bell', name: '翻过开门的小牌子', hint: '轻点前面的门牌，让晚风知道面包房开门了。', mode: 'tap', initial: 0, target: 1, requires: ['bakery-serve'] },
  ] }, surfaces: [], items: [], obstacles: [], cameras: { desktop: { default: desktop, tidy: desktop, finale: desktop, overview: desktop }, mobile: { default: mobile, tidy: mobile, finale: mobile, overview: mobile } },
};
export const BAKE_FINALE_LEVELS = [BAKE_PEEL, BAKE_DISPLAY, BAKE_OPENING];
