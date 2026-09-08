const flat = [-Math.PI / 2, 0, 0];
const base = { sceneFamily: 'post', seasonId: 'lighthouse-post', inspection: true, revision: 1, room: { custom: true, wall: '#d2e0df' } };
const cameras = {
  desktop: {
    default: { distance: 9.4, height: 3.7, lookY: 0.85, lookZ: 0 },
    tidy: { distance: 10.5, height: 4.8, lookY: 0.8, lookZ: 0.1 },
    finale: { distance: 8.7, height: 3.4, lookY: 0.9, lookZ: 0 },
  },
  mobile: {
    default: { distance: 15.9, height: 5.8, lookY: 0.83, lookZ: 0 },
    tidy: { distance: 18.9, height: 7.8, lookY: 0.75, lookZ: 0.15 },
    finale: { distance: 15.3, height: 5.3, lookY: 0.88, lookZ: 0 },
  },
};

export const POST_BICYCLE = {
  ...base, id: 'post-bicycle', number: '07', name: '邮差自行车', icon: 'bicycle', color: '#75988a',
  title: '擦亮车架，<br/>再去看海。',
  description: '盐霜落在老邮车上，车轮已经很久没转了。<br/>装好前轮、篮筐和车铃，让它再次轻快起来。',
  tags: '盐霜清洁 · 车轮装配 · 脚踏传动',
  steps: ['擦净邮差车', '装回前轮与车篮', '上油、转动与响铃'],
  tidyTitle: '一只车轮，<br/>接上一段旅途。',
  tidyHint: '先把前轮送到车叉，再装上藤篮和铜车铃。物件会轻轻吸入正确的位置。',
  actionTitle: '链条顺了，<br/>车铃也响了。',
  actionHint: '按住给链条上油，转动脚踏，最后轻点车铃。',
  actionLabel: '准备出发',
  runningTitle: '风转着车轮，<br/>信在篮子里。', runningHint: '邮车已经收拾好了。下一次出发，会沿着海岸慢慢骑。',
  finishedTitle: '叮铃。<br/>下一站，海边。',
  finishedDescription: '光亮的车架、轻快的链条和一只新装好的藤篮。<br/>这辆邮差车，会停在邮局门前。',
  caption: ['LETTERS ON TWO WHEELS', 'THE POST BICYCLE'],
  operation: { kind: 'tasks', initial: 0, duration: 4.8, tasks: [
    { id: 'bicycle-oil', name: '给链条上油', sound: 'polish', hint: '按住链条旁的油壶，让连接处重新顺滑。', buttonLabel: '给链条上油', mode: 'hold', initial: 0, target: 1, rate: 0.32 },
    { id: 'bicycle-pedal', name: '慢慢转动脚踏', hint: '按住脚踏，让车轮轻快地转起来。', buttonLabel: '转动脚踏', mode: 'hold', initial: 0, target: 1, rate: 0.26, requires: ['bicycle-oil'] },
    { id: 'bicycle-bell', name: '试响铜车铃', hint: '轻点车把上的铜铃，准备出发。', mode: 'tap', initial: 0, target: 1, requires: ['bicycle-pedal'] },
  ] },
  surfaces: [
    { id: 'bicycle-frame', name: '薄荷绿车架', width: 1.05, height: 0.23, weight: 0.4, seed: 3701, completionThreshold: 0.86, material: 'metal', color: '#71958a', position: [-0.18, 1.05, 0.115], rotation: [0, 0, 0], camera: { distance: 9.2, height: 2.5, lookX: -0.18, lookY: 1.05, lookZ: 0.1 } },
    { id: 'bicycle-fender', name: '后轮挡泥板', width: 0.98, height: 0.18, weight: 0.3, seed: 3702, completionThreshold: 0.85, material: 'metal', color: '#ded9c1', position: [-1.04, 1.035, 0.126], rotation: [0, 0, 0], camera: { distance: 9.3, height: 2.7, lookX: -1.04, lookY: 1.02, lookZ: 0.12 } },
    { id: 'bicycle-rack', name: '后架邮袋挡板', width: 0.78, height: 0.3, weight: 0.3, seed: 3703, completionThreshold: 0.86, material: 'wood', color: '#b89b6f', position: [-1.06, 1.355, 0.137], rotation: [0, 0, 0], camera: { distance: 9, height: 3.0, lookX: -1.06, lookY: 1.34, lookZ: 0.14 } },
  ],
  items: [
    { id: 'bicycle-wheel', kind: 'post-wheel', name: '前轮', hint: '把车轴放进前叉的圆形空位。', mass: 0.45, size: [1.16, 1.16, 0.16], start: [-1.74, 0.12, 0.85], startRotation: flat, slot: [1.03, 0.59, -0.06], dragHeight: 1.45, collider: 'box', marker: { position: [1.03, 0.59, 0.065], radius: 0.23, plane: 'front' }, slotRotation: [0, 0, 0] },
    { id: 'bicycle-basket', kind: 'post-basket', name: '藤编车篮', hint: '前轮装稳后，把车篮挂到车把下方。', mass: 0.24, size: [0.7, 0.52, 0.52], start: [1.91, 0.3, 0.9], slot: [1.03, 1.405, -0.02], dragHeight: 1.8, collider: 'box', requires: ['bicycle-wheel'], marker: { position: [1.03, 1.145, -0.02], radius: 0.25 }, slotRotation: [0, 0, 0] },
    { id: 'bicycle-bell-part', kind: 'post-bell', name: '铜车铃', hint: '装到车把右侧的小圆座上。', mass: 0.12, size: [0.2, 0.18, 0.2], start: [0.4, 0.13, 1.0], slot: [0.69, 1.67, 0.245], dragHeight: 1.94, collider: 'box', marker: { position: [0.69, 1.59, 0.245], radius: 0.12 }, slotRotation: [0, 0, 0] },
  ],
  obstacles: [], cameras,
};

export const POST_BEACON = {
  ...base, id: 'post-beacon', number: '08', name: '灯塔透镜', icon: 'beacon', color: '#b49d68',
  title: '擦透玻璃，<br/>把光送远。',
  description: '海雾在灯塔透镜上留下了细细的盐痕。<br/>装好灯芯、铜环和齿轮，让一束暖光重新转起来。',
  tags: '玻璃透光 · 铜环拼装 · 灯束旋转',
  steps: ['擦净透镜与铜框', '装回灯芯与齿轮', '调整灯束方向'],
  tidyTitle: '一枚齿轮，<br/>唤回一束光。',
  tidyHint: '先把灯芯装入灯室，再扣好透镜铜环，最后嵌入底座右侧的小齿轮。',
  actionTitle: '光慢慢转，<br/>海就在前方。',
  actionHint: '把方向调到 35°，按住试转齿轮，再点亮灯芯。',
  actionLabel: '让灯塔亮起来',
  runningTitle: '灯束划过，<br/>宁静的海。', runningHint: '透镜一点点转动，一束暖光穿过干净的玻璃。',
  finishedTitle: '远处的灯，<br/>又亮起来了。',
  finishedDescription: '每一圈光都有了清楚的方向。<br/>这枚透镜，会在邮局旁的灯塔里慢慢转动。',
  caption: ['A LIGHT ACROSS THE WATER', 'THE LIGHTHOUSE LENS'],
  operation: { kind: 'tasks', initial: 0, duration: 5.3, tasks: [
    { id: 'beacon-angle', name: '调好灯束方向', hint: '转动黄铜旋钮，让方向停在 35° 附近。', mode: 'dial', initial: 0, min: 0, max: 90, target: 35, tolerance: 5, step: 1, unit: '°', label: '灯束方向' },
    { id: 'beacon-turn', name: '试转传动齿轮', hint: '按住齿轮手柄，让透镜缓缓转过一圈。', buttonLabel: '试转透镜', mode: 'hold', initial: 0, target: 1, rate: 0.27, requires: ['beacon-angle'] },
    { id: 'beacon-light', name: '点亮灯芯', hint: '点一下底座开关，让暖光穿过玻璃。', mode: 'tap', initial: 0, target: 1, requires: ['beacon-turn'] },
  ] },
  surfaces: [
    { id: 'beacon-glass', name: '正面透镜', width: 1.08, height: 1.08, weight: 0.45, seed: 3801, completionThreshold: 0.88, material: 'glass', color: '#cce2dc', position: [-0.28, 1.13, 0.368], rotation: [0, 0, 0], mask: { kind: 'disc' }, camera: { distance: 8.2, height: 2.6, lookX: -0.28, lookY: 1.13, lookZ: 0.35 } },
    { id: 'beacon-side', name: '侧面玻璃', width: 0.51, height: 0.69, weight: 0.3, seed: 3802, completionThreshold: 0.86, material: 'glass', color: '#cce2dc', position: [0.274, 1.13, -0.03], rotation: [0, Math.PI / 2, 0], camera: { angle: 1.02, distance: 8.1, height: 2.9, lookX: 0.22, lookY: 1.12, lookZ: -0.03 } },
    { id: 'beacon-base', name: '黄铜底座', width: 1.38, height: 0.21, weight: 0.25, seed: 3803, completionThreshold: 0.86, material: 'metal', color: '#b69b64', position: [-0.28, 0.205, 0.412], rotation: [0, 0, 0], camera: { distance: 8.8, height: 2.6, lookX: -0.28, lookY: 0.23, lookZ: 0.39 } },
  ],
  items: [
    { id: 'beacon-wick', kind: 'post-wick', name: '暖光灯芯', hint: '竖直放进灯室中央的小圆座。', mass: 0.22, size: [0.3, 0.5, 0.3], start: [1.67, 0.3, 0.6], slot: [-0.28, 1.02, -0.02], dragHeight: 1.62, collider: 'box', marker: { position: [-0.28, 0.77, -0.02], radius: 0.19 }, slotRotation: [0, 0, 0] },
    { id: 'beacon-lens-ring', kind: 'post-lens-ring', name: '透镜黄铜环', hint: '灯芯装好后，扣在正面圆形透镜外沿。', mass: 0.4, size: [1.31, 1.31, 0.11], start: [-1.7, 0.12, 0.7], startRotation: flat, slot: [-0.28, 1.13, 0.425], dragHeight: 1.9, collider: 'box', requires: ['beacon-wick'], marker: { position: [-0.28, 1.13, 0.445], radius: 0.58, plane: 'front' }, slotRotation: [0, 0, 0] },
    { id: 'beacon-gear', kind: 'post-beacon-gear', name: '传动齿轮', hint: '嵌到灯座右侧露出的传动轴。', mass: 0.16, size: [0.45, 0.45, 0.1], start: [0.57, 0.09, 1.07], startRotation: flat, slot: [0.64, 0.47, 0.18], dragHeight: 1.15, collider: 'box', marker: { position: [0.64, 0.47, 0.21], radius: 0.2, plane: 'front' }, slotRotation: [0, 0, 0] },
  ],
  obstacles: [{ half: [0.73, 0.15, 0.45], position: [-0.28, 0.15, -0.04] }], cameras,
};

const phoneOverview = { distance: 23.2, height: 12.6, lookY: 0.83, lookZ: 0, lookX: 0 };
const desktopOverview = { distance: 12.7, height: 7.7, lookY: 0.85, lookZ: 0, lookX: 0 };
export const POST_OPENING = {
  ...base, id: 'post-opening', number: '09', name: '灯塔邮局', postOverview: true, icon: 'post', color: '#7faaa2',
  title: '一封来信，<br/>有了抵达的地方。',
  description: '从第一只邮筒，到海边重新亮起的灯塔。<br/>亲手修好的八件小事，终于成为一间邮局。',
  tags: '全季成果 · 海边邮局 · 开门仪式',
  steps: ['八件修好的小事', '让邮局重新开门', '收下一封海边来信'],
  tidyTitle: '每一件，<br/>都留下来了。', tidyHint: '这里收着这一季每一次清洗、拼装和修复的成果。',
  actionTitle: '窗帘打开，<br/>灯塔亮起来。',
  actionHint: '拉开窗帘、点亮灯塔，把桌上那封游戏里的信放进邮筒，最后挂上营业牌。',
  actionLabel: '邮局开门了',
  runningTitle: '海风进来了，<br/>来信也到了。', runningHint: '收音机的指针微微亮着，窗帘轻轻晃动。邮局又有了日常的声音。',
  finishedTitle: '海边来信，<br/>好好收到了。',
  finishedDescription: '你擦亮的邮筒，分好的信格，修好的邮车和灯塔。<br/>它们一起，把一间旧邮局变回了让人愿意停留的地方。',
  caption: ['LETTERS FROM THE SHORE', 'THE LIGHTHOUSE POST · SEASON 03'],
  operation: { kind: 'tasks', initial: 0, duration: 7, tasks: [
    { id: 'post-open-curtain', sound: 'curtain', name: '拉开海景窗帘', hint: '按住窗边的拉绳，让海风和光一起进来。', buttonLabel: '拉开窗帘', mode: 'hold', initial: 0, target: 1, rate: 0.28 },
    { id: 'post-light-beacon', name: '点亮灯塔', hint: '点一下右侧的小灯塔，让灯束重新旋转。', mode: 'tap', initial: 0, target: 1, requires: ['post-open-curtain'] },
    { id: 'post-send-letter', name: '把这封信放进邮筒', hint: '按住桌上的信封，看它落进已经擦亮的邮筒。', buttonLabel: '投进邮筒', mode: 'hold', initial: 0, target: 1, rate: 0.3, requires: ['post-light-beacon'] },
    { id: 'post-open-sign', name: '挂上营业木牌', hint: '点一下柜台上的木牌，邮局就正式开门了。', mode: 'tap', initial: 0, target: 1, requires: ['post-send-letter'] },
  ] },
  surfaces: [], items: [], obstacles: [],
  cameras: { desktop: { default: desktopOverview, tidy: desktopOverview, finale: desktopOverview, overview: desktopOverview }, mobile: { default: phoneOverview, tidy: phoneOverview, finale: phoneOverview, overview: phoneOverview } },
};

export const POST_FINALE_LEVELS = [POST_BICYCLE, POST_BEACON, POST_OPENING];
