const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = {
  seasonId: 'mountain-station', sceneFamily: 'station', inspection: true, revision: 1,
  room: { custom: true, wall: '#dce4d9' },
};
const cameras = (lookY = 0.9, extra = {}) => ({
  desktop: {
    default: { distance: 8.8, height: 4.0, lookY, lookZ: 0 },
    tidy: { distance: 9.0, height: 4.5, lookY: 0.8, lookZ: 0.1 },
    finale: { distance: 8.4, height: 3.6, lookY, lookZ: 0 },
  },
  mobile: {
    default: { distance: 16.8, height: 5.8, lookY, lookZ: 0 },
    tidy: { distance: 18.6, height: 6.4, lookY: 0.8, lookZ: 0.1 },
    finale: { distance: 16.2, height: 5.4, lookY, lookZ: 0 },
  }, ...extra,
});
const item = (id, name, start, slot, size, extra = {}) => ({
  id, name, kind: id, start, slot, size, mass: 0.22, collider: 'box',
  startRotation: FRONT, slotRotation: FRONT, dragHeight: 1.9,
  snapDistance: 0.5, placementLift: 0.22,
  marker: { position: [slot[0], slot[1] + 0.045, slot[2]], radius: 0.23 }, ...extra,
});

export const STATION_SIGN = {
  ...common, id: 'station-sign', number: '01', name: '山谷站牌', icon: 'sign', color: '#8da592',
  title: '山风停下，<br/>小站有了名字。',
  description: '擦亮米白搪瓷，装回站名与指路牌。<br/>穿过松林的人，一眼就能认出这里。',
  tags: '搪瓷 · 校正站名 · 转动路牌', steps: ['擦净站牌', '装回站名与路牌', '校正并指向站台'],
  tidyTitle: '一个名字，<br/>一条小路。', tidyHint: '将山谷小站铭牌放进上方的框，再把箭头路牌接到下方圆轴。',
  actionTitle: '名字放正，<br/>路也清楚了。', actionHint: '转正铭牌，按住拧紧铜螺丝，再轻触路牌指向站台。', actionLabel: '让小站迎接来客',
  runningTitle: '松林尽头，<br/>有一处停靠。', runningHint: '米白站牌与青绿箭头，将守在小站入口。',
  finishedTitle: '山谷小站，<br/>欢迎慢慢来。', finishedDescription: '名字端正了，螺丝也稳稳收紧。<br/>箭头轻轻转向站台，指给每一位走近的人。',
  caption: ['A NAME AMONG THE PINES', 'THE VALLEY STATION SIGN'],
  operation: { kind: 'tasks', initial: 0, duration: 3.6, tasks: [
    { id: 'station-sign-align', name: '把站名转到正中', mode: 'dial', initial: -18, min: -30, max: 30, target: 0, tolerance: 3, step: 1, unit: '°', label: '铭牌角度', hint: '缓缓转到 0°，让字沿着框线排齐。' },
    { id: 'station-sign-tighten', name: '拧紧两枚铜螺丝', mode: 'hold', initial: 0, target: 1, rate: 0.34, requires: ['station-sign-align'], buttonLabel: '拧紧铜螺丝', hint: '按住，让两枚螺丝慢慢贴合铭牌。', sound: 'polish' },
    { id: 'station-sign-point', name: '把箭头转向站台', mode: 'tap', initial: 0, target: 1, requires: ['station-sign-tighten'], hint: '点一下下方青绿箭头，路牌会转到朝向站台的位置。' },
  ] },
  surfaces: [
    { id: 'station-sign-enamel', name: '米白搪瓷面', width: 2.22, height: 0.66, weight: 0.72, seed: 4101, completionThreshold: 0.85, material: 'ceramic', color: '#eee8d7', position: [0, 1.76, -0.128], rotation: FRONT, camera: { distance: 8.8, height: 3.2, lookY: 1.58, lookZ: -0.1, angle: 0 } },
    { id: 'station-sign-plinth', name: '松木底座前沿', width: 2.53, height: 0.16, weight: 0.28, seed: 4102, completionThreshold: 0.83, material: 'wood', color: '#bca37a', position: [0, 0.105, 0.377], rotation: FRONT, camera: { distance: 8.6, height: 3.7, lookY: 0.55, lookZ: 0.3, angle: 0 } },
  ],
  items: [
    item('station-sign-name', '山谷小站铭牌', [-0.38, 0.07, 1.00], [0, 1.76, -0.087], [1.68, 0.43, 0.05], { startRotation: TOP, hint: '把铭牌安进米白框的正中央。', marker: { position: [0, 1.76, 0.01], plane: 'front', radius: 0.25 } }),
    item('station-sign-arrow', '青绿站台路牌', [1.12, 0.055, 0.84], [0.16, 0.94, 0.11], [1.38, 0.29, 0.055], { startRotation: TOP, hint: '路牌中央的孔，对准下面的小圆轴。', marker: { position: [0.16, 0.94, 0.16], plane: 'front', radius: 0.22 } }),
  ],
  obstacles: [
    { half: [1.36, 0.10, 0.4], position: [0, 0.10, -0.025] },
    ...[-0.91, 0.91].map(x => ({ half: [0.058, 0.9, 0.068], position: [x, 1.04, -0.32] })),
    { half: [1.18, 0.39, 0.08], position: [0, 1.76, -0.22] },
  ], cameras: cameras(1.10),
};

export const STATION_BENCH = {
  ...common, id: 'station-bench', number: '02', name: '候车长椅', icon: 'desk', color: '#bda47d',
  title: '留一张椅，<br/>等一阵山风。', description: '擦净木缝，补齐松木板。<br/>磨平毛刺，再让木油慢慢浸进去。',
  tags: '松木 · 补齐木板 · 打磨上油', steps: ['擦净座面与靠背', '补齐木板与扶手', '锁紧、打磨与上油'],
  tidyTitle: '一块一块，<br/>接住片刻歇息。', tidyHint: '细木板装进靠背下方，宽木板填平后侧座面，最后接上右边扶手。',
  actionTitle: '顺着木纹，<br/>慢慢变温润。', actionHint: '先锁紧右扶手，再打磨木面，最后涂上薄薄一层木油。', actionLabel: '留一处安心歇脚',
  runningTitle: '木纹亮了，<br/>等待也柔软。', runningHint: '长椅会留在站牌旁，让旅人坐下听一会儿松涛。',
  finishedTitle: '坐一会儿，<br/>下一程不着急。', finishedDescription: '毛刺消失，木纹在薄油下浮了出来。<br/>现在，可以把行李暂时放下，靠在这张稳稳的长椅上。',
  caption: ['A PAUSE BETWEEN JOURNEYS', 'THE PINE WAITING BENCH'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'station-bench-fasten', name: '锁紧右侧扶手', mode: 'tap', initial: 0, target: 1, hint: '点一下扶手前端的铜螺帽，让扶手稳稳贴合。' },
    { id: 'station-bench-sand', name: '顺着木纹磨平毛刺', mode: 'hold', initial: 0, target: 1, rate: 0.29, sound: 'polish', requires: ['station-bench-fasten'], buttonLabel: '顺着木纹打磨', hint: '按住打磨，细小的毛刺与白痕会慢慢消失。' },
    { id: 'station-bench-oil', name: '薄薄涂上一层木油', mode: 'hold', initial: 0, target: 1, rate: 0.29, sound: 'polish', requires: ['station-bench-sand'], buttonLabel: '慢慢涂上木油', hint: '按住上油，看浅淡松木逐渐恢复温润的金色。' },
  ] },
  surfaces: [
    { id: 'station-bench-back', name: '靠背上木板', width: 2.62, height: 0.26, weight: 0.47, seed: 4201, completionThreshold: 0.85, material: 'wood', color: '#c4ad87', position: [0, 1.115, -0.307], rotation: FRONT, camera: { distance: 8.8, height: 3.5, lookY: 0.96, lookZ: -0.2, angle: 0 } },
    { id: 'station-bench-seat', name: '座面前木板', width: 2.63, height: 0.30, weight: 0.53, seed: 4202, completionThreshold: 0.85, material: 'wood', color: '#c4ad87', position: [0, 0.595, 0.21], rotation: TOP, camera: { distance: 8.8, height: 6.8, lookY: 0.65, lookZ: 0.15, angle: 0 } },
  ],
  items: [
    item('station-bench-back-slat', '细靠背木板', [0, 0.075, 0.79], [0, 0.81, -0.35], [2.65, 0.22, 0.07], { startRotation: TOP, hint: '细木板横着补进靠背下方的空格。', marker: { position: [0, 0.81, -0.23], plane: 'front', radius: 0.23 } }),
    item('station-bench-seat-slat', '宽座面木板', [0, 0.052, 1.14], [0, 0.55, -0.14], [2.65, 0.08, 0.30], { hint: '宽木板填在后侧座面，让座椅完整接起来。', marker: { position: [0, 0.60, -0.14], radius: 0.23 } }),
    item('station-bench-arm', '右侧扶手', [-1.95, 0.08, 0.45], [1.46, 0.88, -0.02], [0.15, 0.13, 0.86], { hint: '把扶手架到右侧两根绿色支柱上。', marker: { position: [1.46, 0.96, 0.02], radius: 0.20 } }),
  ],
  obstacles: [
    ...[-1.32, 1.32].flatMap(x => [
      { half: [0.075, 0.29, 0.07], position: [x, 0.29, 0.22] },
      { half: [0.075, 0.64, 0.07], position: [x, 0.64, -0.39] },
    ]),
    { half: [1.35, 0.04, 0.16], position: [0, 0.55, 0.21] },
    { half: [1.35, 0.15, 0.04], position: [0, 1.115, -0.35] },
  ], cameras: cameras(0.72),
};

export const STATION_TICKET = {
  ...common, id: 'station-ticket', number: '03', name: '车票工作台', icon: 'clock', color: '#91a99a',
  title: '一张车票，<br/>留住出发的心情。', description: '擦亮旧出票器，接上纸卷和压柄。<br/>走一段纸，打一个孔，旅程便有了小小凭证。',
  tags: '机械走纸 · 压柄打孔 · 山间车票', steps: ['擦净出票器', '装好纸卷与压柄', '走纸、打孔与取票'],
  tidyTitle: '纸卷就位，<br/>压柄接上。', tidyHint: '纸卷装到左侧圆轴，木柄接到右侧铰座，再把铜字模安进正面的小槽。',
  actionTitle: '走一段纸，<br/>听一声轻响。', actionHint: '按住走纸，轻轻压下木柄打孔，再把车票送到前方票托。', actionLabel: '收好第一张车票',
  runningTitle: '小小圆孔，<br/>记下一次启程。', runningHint: '站牌、长椅与车票台已经齐了。回到小站，看看这一章留下的变化。',
  finishedTitle: '下一站，<br/>等你慢慢出发。', finishedDescription: '票纸上印着山谷小站，边角留下两枚圆孔。<br/>它安静躺在票托上，等一位准备出发的人。',
  caption: ['A SMALL TICKET TO THE HILLS', 'THE FIRST VALLEY DEPARTURE'],
  operation: { kind: 'tasks', initial: 0, duration: 4, tasks: [
    { id: 'station-ticket-feed', name: '缓缓送出一张票纸', mode: 'hold', initial: 0, target: 1, rate: 0.30, buttonLabel: '转动走纸轮', hint: '按住走纸轮，看米白票纸从出票口慢慢伸出。' },
    { id: 'station-ticket-punch', name: '压下木柄打孔', mode: 'hold', initial: 0, target: 1, rate: 0.34, requires: ['station-ticket-feed'], buttonLabel: '轻轻压下木柄', hint: '按住木柄，两个小冲头落下，再抬起露出真正的圆孔。' },
    { id: 'station-ticket-present', name: '把车票送到票托', mode: 'tap', initial: 0, target: 1, requires: ['station-ticket-punch'], hint: '点一下票纸，将打好孔的车票滑到前方票托。' },
  ] },
  surfaces: [
    { id: 'station-ticket-body', name: '青绿出票器前板', width: 0.92, height: 0.54, weight: 0.45, seed: 4301, completionThreshold: 0.84, material: 'ceramic', color: '#88a496', position: [-0.1, 1.05, 0.003], rotation: FRONT, camera: { distance: 8.6, height: 3.6, lookY: 0.95, lookZ: 0, angle: 0 } },
    { id: 'station-ticket-tray', name: '黄铜票托', width: 1.35, height: 0.48, weight: 0.32, seed: 4302, completionThreshold: 0.84, material: 'metal', color: '#c4ac79', position: [-0.1, 0.201, 0.82], rotation: TOP, camera: { distance: 8.8, height: 6.4, lookY: 0.35, lookZ: 0.6, angle: 0 } },
    { id: 'station-ticket-apron', name: '松木工作板前沿', width: 2.36, height: 0.13, weight: 0.23, seed: 4303, completionThreshold: 0.83, material: 'wood', color: '#bba17a', position: [0, 0.075, 1.203], rotation: FRONT, camera: { distance: 8.8, height: 3.4, lookY: 0.4, lookZ: 0.8, angle: 0 } },
  ],
  items: [
    item('station-ticket-roll', '米白车票纸卷', [-1.60, 0.37, 0.28], [-1.05, 1.08, -0.12], [0.67, 0.67, 0.26], { hint: '把纸卷中间的小孔套进左侧圆轴。', marker: { position: [-1.05, 1.08, 0.10], plane: 'front', radius: 0.23 } }),
    item('station-ticket-handle', '打孔木压柄', [1.70, 0.085, 0.30], [1.00, 1.05, 0.13], [0.94, 0.16, 0.16], { hint: '把压柄左端接到出票器右侧的圆形铰座。', marker: { position: [0.63, 1.05, 0.23], plane: 'front', radius: 0.23 } }),
    item('station-ticket-type', '山谷小站铜字模', [1.66, 0.057, 0.90], [-0.1, 1.05, 0.046], [0.68, 0.25, 0.067], { startRotation: TOP, hint: '将铜字模放进前板正中的小槽。', marker: { position: [-0.1, 1.05, 0.12], plane: 'front', radius: 0.21 } }),
  ],
  obstacles: [
    { half: [1.28, 0.07, 0.88], position: [0, 0.07, 0.30] },
    { half: [0.53, 0.58, 0.30], position: [-0.1, 0.84, -0.31] },
    { half: [0.74, 0.024, 0.32], position: [-0.1, 0.17, 0.82] },
  ], cameras: cameras(0.86),
};

export const STATION_EARLY_LEVELS = [STATION_SIGN, STATION_BENCH, STATION_TICKET];
