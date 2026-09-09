const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = {
  seasonId: 'mountain-station', sceneFamily: 'station', inspection: true, revision: 1,
  room: { custom: true, wall: '#dde2d1' },
};
const cameras = (lookY = 1) => ({
  desktop: {
    default: { distance: 9.1, height: 4.5, lookY, lookZ: -0.1 },
    tidy: { distance: 9.4, height: 4.7, lookY, lookZ: 0 },
    finale: { distance: 8.5, height: 3.7, lookY, lookZ: -0.1 },
  },
  mobile: {
    default: { distance: 17.2, height: 6.5, lookY, lookZ: 0 },
    tidy: { distance: 17.9, height: 6.7, lookY, lookZ: 0.02 },
    finale: { distance: 16.1, height: 5.8, lookY, lookZ: -0.08 },
  },
});
const item = (id, name, start, slot, size, extra = {}) => ({
  id, name, kind: id, start, slot, size, mass: 0.25, collider: 'box',
  startRotation: FRONT, slotRotation: FRONT, dragHeight: 2,
  snapDistance: 0.55, placementLift: 0.25,
  marker: { position: [slot[0], slot[1] + 0.04, slot[2]], radius: 0.25 },
  ...extra,
});

export const STATION_BOARD = {
  ...common, id: 'station-board', number: '04', name: '翻页时刻牌', icon: 'desk', color: '#92a88d',
  title: '一页翻过，<br/>山谷等你。',
  description: '擦净木框，装回旧字片。<br/>让小站的时刻牌，重新说声慢慢来。',
  tags: '翻页字片 · 黄铜转轴 · 慢慢来',
  steps: ['擦净时刻牌', '装好字片与转柄', '翻出小站的问候'],
  tidyTitle: '字片入框，<br/>转柄归位。',
  tidyHint: '山谷字片装在上排，问候字片装在下排，转柄接到右边的圆轴。',
  actionTitle: '听字片，<br/>轻轻落定。',
  actionHint: '先将转轴偏差调到 0，再按住转柄让字片逐一翻落。最后扣好定位拨片。',
  actionLabel: '留住这一页问候',
  runningTitle: '下一站，<br/>是山谷。', runningHint: '这张时刻牌不催人出发，只把下一站的名字收拾清楚。',
  finishedTitle: '山谷很近，<br/>你慢慢来。',
  finishedDescription: '翻页字片排列整齐，转轴稳稳停住。<br/>小站有了清楚又温柔的问候。',
  caption: ['TAKE YOUR TIME', 'THE VALLEY BOARD'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'board-align', name: '对齐翻页转轴', hint: '把转轴偏差调到 0，让黄铜标线对上刻度。', mode: 'dial', initial: -24, min: -45, max: 45, target: 0, tolerance: 3, step: 1, unit: '格', label: '转轴偏差' },
    { id: 'board-flip', name: '翻出山谷与问候', buttonLabel: '慢慢转动字片', hint: '按住转柄，看字片一张一张翻过。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.22, requires: ['board-align'] },
    { id: 'board-lock', name: '扣好定位拨片', hint: '点一下木框下方的黄铜拨片，让这一页稳稳停住。', mode: 'tap', initial: 0, target: 1, requires: ['board-flip'] },
  ] },
  surfaces: [
    { id: 'board-top-rail', name: '木框上沿', width: 2.49, height: 0.19, weight: 0.4, seed: 4401, completionThreshold: 0.85, material: 'wood', color: '#c3a777', position: [0, 1.87, 0.053], rotation: FRONT,
      camera: { distance: 8.8, height: 3.5, lookY: 1.7, lookZ: 0.04, angle: 0 } },
    { id: 'board-side', name: '木框左侧', width: 0.54, height: 1.5, weight: 0.35, seed: 4402, completionThreshold: 0.85, material: 'wood', color: '#c3a777', position: [-1.406, 1.06, -0.3], rotation: [0, -Math.PI / 2, 0],
      camera: { distance: 8.9, height: 3.6, lookX: -0.6, lookY: 1.06, lookZ: -0.3, angle: -1.15 } },
    { id: 'board-base', name: '底座珐琅前沿', width: 2.65, height: 0.15, weight: 0.25, seed: 4403, completionThreshold: 0.84, material: 'ceramic', color: '#91a38a', position: [0, 0.16, 0.238], rotation: FRONT,
      camera: { distance: 8.8, height: 3.2, lookY: 0.32, lookZ: 0.22, angle: 0 } },
  ],
  items: [
    item('board-destination', '山谷字片', [-0.8, 0.065, 1.02], [0, 1.39, -0.012], [1.93, 0.53, 0.075], { order: 1, startRotation: TOP, hint: '把两枚山谷字片装进木框上排。', marker: { position: [0, 1.39, 0.04], plane: 'front', radius: 0.3 } }),
    item('board-greeting', '慢慢来字片', [1.21, 0.055, 1.03], [0, 0.84, -0.012], [1.96, 0.4, 0.075], { order: 2, startRotation: TOP, hint: '三枚问候字片放进下排的长方框。', marker: { position: [0, 0.84, 0.04], plane: 'front', radius: 0.28 } }),
    item('board-crank', '黄铜转柄', [1.97, 0.14, 0.17], [1.5, 1.13, -0.27], [0.25, 0.47, 0.37], { order: 3, hint: '转柄装到木框右边的圆轴。', marker: { position: [1.51, 1.15, -0.14], plane: 'front', radius: 0.22 } }),
  ],
  obstacles: [
    { half: [1.42, 0.1, 0.43], position: [0, 0.13, -0.2] },
    { half: [1.4, 0.81, 0.22], position: [0, 1.06, -0.36] },
  ], cameras: cameras(1.02),
};

export const STATION_LUGGAGE = {
  ...common, id: 'station-luggage', number: '05', name: '行李推车', icon: 'tea', color: '#a69a76',
  title: '把行李，<br/>稳稳放好。',
  description: '擦净车架，装回轮子与扶手。<br/>一只旧皮箱，也有自己的落脚处。',
  tags: '橡胶车轮 · 松木车板 · 皮箱束带',
  steps: ['擦净行李车', '装好轮子与扶手', '系好行李慢慢推'],
  tidyTitle: '轮子归位，<br/>行李安稳。',
  tidyHint: '把车轮装到右侧轴头，扶手插入后方双管，再将皮箱放上车板。',
  actionTitle: '束带收紧，<br/>车轮转动。',
  actionHint: '按住系紧皮箱的两条束带，再慢慢推动车子一小段。最后踩下驻车踏板。',
  actionLabel: '停稳这份行李',
  runningTitle: '走过一小段，<br/>停得刚刚好。', runningHint: '轮子轻轻转过，行李安稳落在车板中央。',
  finishedTitle: '一路行李，<br/>都有归处。',
  finishedDescription: '皮箱扣紧，车轮停稳。<br/>这辆小推车，准备接住旅人带来的故事。',
  caption: ['A PLACE FOR EVERY JOURNEY', 'THE LUGGAGE TROLLEY'],
  operation: { kind: 'tasks', initial: 0, duration: 4.0, tasks: [
    { id: 'luggage-strap', name: '系好皮箱束带', buttonLabel: '慢慢收紧束带', hint: '按住束带，看两条皮带绕过皮箱，稳稳扣好。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.25 },
    { id: 'luggage-roll', name: '轻推一小段', buttonLabel: '轻轻推动车子', hint: '按住扶手，车轮会缓缓转动，皮箱也一起前行。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.28, requires: ['luggage-strap'] },
    { id: 'luggage-brake', name: '踩下驻车踏板', hint: '点一下左轮旁的黄铜踏板，把车子稳稳停好。', mode: 'tap', initial: 0, target: 1, requires: ['luggage-roll'] },
  ] },
  surfaces: [
    { id: 'luggage-deck', name: '松木车板', width: 1.8, height: 0.78, weight: 0.5, seed: 4501, completionThreshold: 0.85, material: 'wood', color: '#cab184', position: [0, 0.507, -0.1], rotation: TOP,
      camera: { distance: 8.8, height: 6.4, lookY: 0.48, lookZ: -0.1, angle: 0 } },
    { id: 'luggage-front', name: '车架珐琅前沿', width: 1.97, height: 0.15, weight: 0.3, seed: 4502, completionThreshold: 0.85, material: 'ceramic', color: '#90a28b', position: [0, 0.365, 0.522], rotation: FRONT,
      camera: { distance: 8.9, height: 3.4, lookY: 0.42, lookZ: 0.52, angle: 0 } },
    { id: 'luggage-back', name: '车架背板', width: 1.9, height: 0.22, weight: 0.2, seed: 4503, completionThreshold: 0.84, material: 'ceramic', color: '#90a28b', position: [0, 0.74, -0.684], rotation: [0, Math.PI, 0],
      camera: { distance: 8.9, height: 3.8, lookY: 0.75, lookZ: -0.67, angle: Math.PI } },
  ],
  items: [
    item('luggage-wheel', '橡胶车轮', [-1.9, 0.1, 0.67], [1.08, 0.27, -0.1], [0.18, 0.54, 0.54], { order: 1, startRotation: [0, 0, Math.PI / 2], hint: '车轮扣到右侧的黄铜轴头。', marker: { position: [1.12, 0.27, 0.02], plane: 'front', radius: 0.23 } }),
    item('luggage-handle', '推车扶手', [0, 0.105, 1.03], [0, 1.41, -0.65], [1.97, 0.95, 0.16], { order: 2, startRotation: TOP, dragHeight: 2.3, hint: '扶手两端插进车板后方的双管。', marker: { position: [0, 1.38, -0.61], plane: 'front', radius: 0.28 } }),
    item('luggage-case', '旧皮箱', [1.83, 0.4, 0.52], [0, 0.882, -0.04], [1.36, 0.74, 0.8], { order: 3, startRotation: [0, Math.PI / 2, 0], hint: '最后把皮箱稳稳放在木制车板中央。', marker: { position: [0, 0.54, -0.04], radius: 0.29 } }),
  ],
  obstacles: [
    { half: [1.01, 0.12, 0.61], position: [0, 0.38, -0.1] },
    { half: [1.01, 0.2, 0.07], position: [0, 0.67, -0.6] },
  ], cameras: cameras(0.91),
};

export const STATION_SIGNAL = {
  ...common, id: 'station-signal', number: '06', name: '站台信号灯', icon: 'lamp', color: '#8eaa8f',
  title: '山色渐亮，<br/>小灯也醒来。',
  description: '擦亮护罩，装回镜片与拉杆。<br/>在虚构的小站，点亮一盏温柔的绿灯。',
  tags: '玻璃镜片 · 黄铜拉杆 · 安稳绿光',
  steps: ['擦净信号灯', '装回镜片与部件', '慢慢点亮绿灯'],
  tidyTitle: '镜片合上，<br/>灯帽落稳。',
  tidyHint: '镜片装在正面的圆框内，拉杆接到右下方，灯帽放回顶部。',
  actionTitle: '轻轻一拉，<br/>绿光亮起。',
  actionHint: '先抛亮镜片，再把遮光环转到 45°。最后拉下黄铜杆，看暖光慢慢变绿。',
  actionLabel: '让小站安心等待',
  runningTitle: '一盏绿光，<br/>照着山路。', runningHint: '这里没有催促的铃声，小灯只管安安静静地亮着。',
  finishedTitle: '前方有光，<br/>一路安稳。',
  finishedDescription: '护罩合拢，黄铜杆落定。<br/>一盏柔和的绿灯，成为小站新的光亮。',
  caption: ['A GENTLE LIGHT AHEAD', 'THE PLATFORM SIGNAL'],
  operation: { kind: 'tasks', initial: 0, duration: 4.2, tasks: [
    { id: 'signal-polish', name: '抛亮玻璃镜片', buttonLabel: '慢慢抛亮镜片', hint: '按住镜片，等玻璃里的暖光渐渐清楚。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.25 },
    { id: 'signal-align', name: '转动遮光环', hint: '把遮光环转到 45°，让指示线对齐绿色标记。', mode: 'dial', initial: -30, min: -90, max: 90, target: 45, tolerance: 5, step: 1, unit: '°', label: '遮光环角度', requires: ['signal-polish'] },
    { id: 'signal-pull', name: '拉下黄铜杆', hint: '点一下右下方拉杆，看暖光慢慢变成绿色。', mode: 'tap', initial: 0, target: 1, requires: ['signal-align'] },
  ] },
  surfaces: [
    { id: 'signal-window', name: '侧面玻璃护罩', width: 0.51, height: 0.74, weight: 0.4, seed: 4601, completionThreshold: 0.85, material: 'ceramic', color: '#b8c7ae', position: [-0.508, 1.65, -0.31], rotation: [0, -Math.PI / 2, 0],
      camera: { distance: 8.8, height: 3.5, lookX: -0.4, lookY: 1.65, lookZ: -0.31, angle: -1.18 } },
    { id: 'signal-top', name: '灯座黄铜上沿', width: 0.82, height: 0.53, weight: 0.3, seed: 4602, completionThreshold: 0.85, material: 'metal', color: '#baa37a', position: [0, 2.182, -0.31], rotation: TOP,
      camera: { distance: 8.8, height: 6, lookY: 1.9, lookZ: -0.31, angle: 0 } },
    { id: 'signal-base', name: '底座珐琅前沿', width: 1.33, height: 0.19, weight: 0.3, seed: 4603, completionThreshold: 0.84, material: 'ceramic', color: '#91a38a', position: [0, 0.16, 0.342], rotation: FRONT,
      camera: { distance: 8.9, height: 3.3, lookY: 0.36, lookZ: 0.34, angle: 0 } },
  ],
  items: [
    item('signal-lens', '玻璃镜片', [-1.51, 0.075, 0.72], [0, 1.66, 0.105], [0.81, 0.81, 0.105], { order: 1, startRotation: TOP, dragHeight: 2.25, hint: '把镜片放入正面的黄铜圆框。', marker: { position: [0, 1.66, 0.14], plane: 'front', radius: 0.3 } }),
    item('signal-lever', '黄铜拉杆', [0.11, 0.085, 1.0], [0.64, 0.63, -0.07], [0.24, 0.75, 0.23], { order: 2, startRotation: [0, 0, Math.PI / 2], hint: '拉杆装到灯柱右下方的小轴上。', marker: { position: [0.64, 0.48, 0.02], plane: 'front', radius: 0.23 } }),
    item('signal-cap', '珐琅灯帽', [1.55, 0.23, 0.62], [0, 2.31, -0.31], [1.14, 0.36, 0.94], { order: 3, dragHeight: 2.75, hint: '把灯帽盖到信号灯顶部。', marker: { position: [0, 2.22, -0.31], radius: 0.3 } }),
  ],
  obstacles: [
    { half: [0.73, 0.11, 0.48], position: [0, 0.15, -0.14] },
    { half: [0.13, 0.6, 0.13], position: [0, 0.74, -0.31] },
    { half: [0.495, 0.52, 0.35], position: [0, 1.66, -0.31] },
  ], cameras: cameras(1.15),
};

export const STATION_MIDDLE_LEVELS = [STATION_BOARD, STATION_LUGGAGE, STATION_SIGNAL];
