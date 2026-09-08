const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = {
  seasonId: 'lighthouse-post', sceneFamily: 'post', inspection: true, revision: 1,
  room: { custom: true, wall: '#d2e0df' },
};
const cameras = (lookY = 0.85) => ({
  desktop: {
    default: { distance: 8.7, height: 4.3, lookY, lookZ: -0.05 },
    tidy: { distance: 9.1, height: 4.4, lookY, lookZ: 0 },
    finale: { distance: 8.2, height: 3.6, lookY, lookZ: -0.08 },
  },
  mobile: {
    default: { distance: 16.6, height: 6.4, lookY, lookZ: 0 },
    tidy: { distance: 17.1, height: 6.6, lookY, lookZ: 0.05 },
    finale: { distance: 15.5, height: 5.6, lookY, lookZ: -0.06 },
  },
});
const item = (id, name, start, slot, size, extra = {}) => ({
  id, name, kind: id, start, slot, size, mass: 0.22, collider: 'box',
  startRotation: FRONT, slotRotation: FRONT, dragHeight: 1.65,
  snapDistance: 0.5, placementLift: 0.25,
  marker: { position: [slot[0], slot[1] + 0.04, slot[2]], radius: 0.22 },
  ...extra,
});

export const POST_TYPEWRITER = {
  ...common, id: 'post-typewriter', number: '04', name: '旧打字机', icon: 'desk', color: '#83aaa4',
  title: '旧键帽下，<br/>藏着新的问候。',
  description: '擦亮珐琅，装好纸与色带。<br/>让一句温柔的话，出现在信纸上。',
  tags: '送纸滚筒 · 活字 · 回车',
  steps: ['擦净旧打字机', '装回纸与零件', '打出一封问候'],
  tidyTitle: '一张信纸，<br/>一卷新色带。',
  tidyHint: '信纸插入后方滚筒，色带装到双轴上，再接回左侧的回车杆。',
  actionTitle: '让好消息，<br/>慢慢抵达。',
  actionHint: '转动滚筒送纸，再按住键盘打出问候。最后轻推回车杆，把这一行收好。',
  actionLabel: '留下一行问候',
  runningTitle: '字迹落定，<br/>问候有了形状。', runningHint: '愿好消息抵达你。信纸会带着它去往下一站。',
  finishedTitle: '一行字，<br/>一个惦念。',
  finishedDescription: '滚筒咬住信纸，字锤留下墨迹。<br/>这封问候，会和包裹一起继续旅行。',
  caption: ['WORDS FIND A WAY', 'THE LETTER MACHINE'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'type-feed', name: '转动滚筒送纸', hint: '把送纸滚筒转到 180°，纸张会缓缓升起。', mode: 'dial', initial: 0, min: 0, max: 360, target: 180, tolerance: 12, step: 1, unit: '°', label: '送纸角度' },
    { id: 'type-words', name: '打出一行问候', buttonLabel: '慢慢打字', hint: '按住键盘，看键帽与字锤一下一下落下。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.2, requires: ['type-feed'] },
    { id: 'type-return', name: '轻推回车杆', hint: '点一下左侧回车杆，让纸架回到起点。', mode: 'tap', initial: 0, target: 1, requires: ['type-words'] },
  ] },
  surfaces: [
    { id: 'type-enamel', name: '青绿珐琅机罩', width: 1.92, height: 0.24, weight: 0.45, seed: 3401, completionThreshold: 0.85, material: 'ceramic', color: '#87aaa0', position: [0, 0.72, -0.084], rotation: FRONT,
      camera: { distance: 8.4, height: 3.1, lookY: 0.72, lookZ: -0.08, angle: 0 } },
    { id: 'type-apron', name: '键盘前沿', width: 1.98, height: 0.17, weight: 0.3, seed: 3402, completionThreshold: 0.85, material: 'ceramic', color: '#87aaa0', position: [0, 0.235, 0.622], rotation: FRONT,
      camera: { distance: 8.4, height: 3, lookY: 0.35, lookZ: 0.62, angle: 0 } },
    { id: 'type-side', name: '右侧机身', width: 0.6, height: 0.25, weight: 0.25, seed: 3403, completionThreshold: 0.84, material: 'ceramic', color: '#87aaa0', position: [1.067, 0.69, -0.42], rotation: [0, Math.PI / 2, 0],
      camera: { distance: 8.7, height: 3.6, lookX: 0.45, lookY: 0.69, lookZ: -0.42, angle: 1.12 } },
  ],
  items: [
    item('type-paper', '一张信纸', [0, 0.04, 1.03], [0, 1.39, -0.61], [1.32, 0.82, 0.026], { order: 1, startRotation: TOP, dragHeight: 1.85, marker: { position: [0, 1.39, -0.58], plane: 'front', radius: 0.25 }, hint: '把信纸插入后方滚筒中央的光圈。' }),
    item('type-ribbon', '双轴色带', [1.84, 0.09, 0.4], [0, 0.935, -0.14], [1.42, 0.13, 0.32], { order: 2, startRotation: [0, Math.PI / 2, 0], hint: '把整副色带扣到滚筒前方的双轴上。', marker: { position: [0, 0.98, -0.13], radius: 0.27 } }),
    item('type-lever', '回车杆', [-1.79, 0.09, 0.54], [-1.19, 1.1, -0.43], [0.48, 0.13, 0.47], { order: 3, hint: '回车杆接在滚筒左端。', marker: { position: [-1.19, 1.12, -0.4], plane: 'front', radius: 0.21 } }),
  ],
  obstacles: [
    { half: [1.08, 0.17, 0.68], position: [0, 0.23, -0.06] },
    { half: [1.06, 0.28, 0.34], position: [0, 0.69, -0.43] },
  ], cameras: cameras(0.94),
};

export const POST_PARCEL = {
  ...common, id: 'post-parcel', number: '05', name: '包裹工作台', icon: 'tea', color: '#b9a581',
  title: '把惦念，<br/>仔细包起来。',
  description: '擦净台面，校准旧秤。<br/>一份小小的礼物，也值得认真寄出。',
  tags: '机械秤 · 十字细绳 · 邮票',
  steps: ['擦净包装工作台', '摆好包裹与纸带', '称重打结与贴票'],
  tidyTitle: '每样东西，<br/>各就各位。',
  tidyHint: '把礼物放上左侧秤盘，纸带与邮票放回右侧的小托盘。',
  actionTitle: '指针对齐，<br/>细绳收紧。',
  actionHint: '先把秤针偏差调到 0，再按住封包绕好细绳。最后贴上灯塔邮票。',
  actionLabel: '寄出一份惦念',
  runningTitle: '绳结稳稳，<br/>去向清楚。', runningHint: '纸带贴平了，邮票盖住封口。包裹准备好与信件同行。',
  finishedTitle: '轻轻一包，<br/>满满心意。',
  finishedDescription: '秤针归正，十字绳结系好。<br/>这份礼物将和上一封问候，一起抵达海的另一边。',
  caption: ['HANDLE WITH KINDNESS', 'THE PARCEL BENCH'],
  operation: { kind: 'tasks', initial: 0, duration: 4, tasks: [
    { id: 'parcel-balance', name: '校准秤针', hint: '把指针偏差调到 0，让白色刻度与黄铜指针对齐。', mode: 'dial', initial: -18, min: -30, max: 30, target: 0, tolerance: 2, step: 1, unit: '格', label: '秤针偏差' },
    { id: 'parcel-wrap', name: '绕绳并封好纸带', buttonLabel: '慢慢封包', hint: '按住封包，看细绳绕过四边，在上方交叉成结。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.24, requires: ['parcel-balance'] },
    { id: 'parcel-stamp', name: '贴上灯塔邮票', hint: '点一下右侧的邮票，把它平整贴在包裹封口上。', mode: 'tap', initial: 0, target: 1, requires: ['parcel-wrap'] },
  ] },
  surfaces: [
    { id: 'parcel-mat', name: '木制包装台前沿', width: 1.73, height: 0.4, weight: 0.55, seed: 3501, completionThreshold: 0.86, material: 'wood', color: '#c3a880', position: [1.01, 0.056, 0.1], rotation: TOP,
      camera: { distance: 8.8, height: 5.8, lookX: 0.8, lookY: 0.25, lookZ: 0.1, angle: 1.08 } },
    { id: 'parcel-scale-front', name: '旧秤前沿', width: 0.96, height: 0.14, weight: 0.25, seed: 3502, completionThreshold: 0.84, material: 'ceramic', color: '#a7b9a7', position: [-1, 0.2, 0.316], rotation: FRONT,
      camera: { distance: 8.6, height: 3.2, lookX: -0.7, lookY: 0.35, lookZ: 0.31, angle: 0 } },
    { id: 'parcel-scale-side', name: '秤身右侧', width: 0.53, height: 0.44, weight: 0.2, seed: 3503, completionThreshold: 0.84, material: 'ceramic', color: '#a7b9a7', position: [-0.447, 0.48, -0.05], rotation: [0, Math.PI / 2, 0],
      camera: { distance: 8.6, height: 3.9, lookX: -0.55, lookY: 0.48, lookZ: -0.05, angle: 1.08 } },
  ],
  items: [
    item('parcel-gift', '包好纸的礼物', [0.82, 0.32, 0.86], [-1, 1.24, -0.05], [1.06, 0.62, 0.78], { hint: '礼物稳稳放在左侧的大秤盘上。', marker: { position: [-1, 0.96, -0.05], radius: 0.3 }, dragHeight: 1.7 }),
    item('parcel-tape', '牛皮纸带卷', [-1.73, 0.16, 0.83], [0.73, 0.18, -0.43], [0.42, 0.27, 0.42], { hint: '把纸带卷放回右侧台面的圆形托座。', marker: { position: [0.73, 0.09, -0.43], radius: 0.23 } }),
    item('parcel-postage', '一叠灯塔邮票', [1.99, 0.06, 0.53], [1.49, 0.08, -0.43], [0.46, 0.09, 0.55], { hint: '把邮票放到纸带旁边的长方托盘里。', marker: { position: [1.49, 0.1, -0.43], radius: 0.23 } }),
  ],
  obstacles: [
    { half: [0.65, 0.06, 0.48], position: [-1, 0.09, -0.05] },
    { half: [0.55, 0.38, 0.36], position: [-1, 0.44, -0.05] },
    { half: [0.66, 0.05, 0.48], position: [-1, 0.88, -0.05] },
  ], cameras: cameras(0.77),
};

export const POST_RADIO = {
  ...common, id: 'post-radio', number: '06', name: '海事电台', icon: 'record', color: '#829c9b',
  title: '拂去灰尘，<br/>等一声平安。',
  description: '装好天线，轻轻转动旋钮。<br/>在这座虚构海岸，接住归航的消息。',
  tags: '调频刻度 · 指示灯 · 归航讯息',
  steps: ['擦净旧电台', '接好电台部件', '调好归航频道'],
  tidyTitle: '天线竖起，<br/>听筒归位。',
  tidyHint: '天线插到电台左上角，调频旋钮装回正面，听筒挂到右侧支架。',
  actionTitle: '调到海岸，<br/>听见归航。',
  actionHint: '把刻度调到 62，再将音量调到 4。按住接收，等指示灯与信号条稳定。',
  actionLabel: '收下一声平安',
  runningTitle: '海面平静，<br/>船正归航。', runningHint: '灯塔湾传来消息：邮船明早抵港，信件与包裹已经可以启程。',
  finishedTitle: '消息抵达，<br/>心也安定。',
  finishedDescription: '指示灯亮着，刻度停得刚刚好。<br/>海岸频道收到了归航的讯息，下一章可以出发了。',
  caption: ['A SIGNAL FROM HOME', 'THE COAST RECEIVER'],
  operation: { kind: 'tasks', initial: 0, duration: 4.1, tasks: [
    { id: 'radio-tune', name: '调到灯塔湾频道', hint: '把旋钮调到 62，刻度针会移向蓝绿色的海岸标记。', mode: 'dial', initial: 12, min: 0, max: 100, target: 62, tolerance: 3, step: 1, unit: '格', label: '海岸刻度' },
    { id: 'radio-volume', name: '把音量调到 4', hint: '转动左边的小旋钮，留下清楚又轻柔的音量。', mode: 'dial', initial: 0, min: 0, max: 10, target: 4, tolerance: 0.5, step: 0.5, label: '接收音量', requires: ['radio-tune'] },
    { id: 'radio-receive', name: '收好归航讯息', buttonLabel: '静静接收', hint: '按住接收按钮，等信号条稳定亮起。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.27, requires: ['radio-volume'] },
  ] },
  surfaces: [
    { id: 'radio-top', name: '电台木壳上盖', width: 2.01, height: 0.57, weight: 0.45, seed: 3601, completionThreshold: 0.85, material: 'wood', color: '#a58966', position: [0, 1.333, -0.36], rotation: TOP,
      mask: { rects: [[0, 0.33, 0.13, 0.64]] }, camera: { distance: 8.7, height: 5.7, lookY: 1.24, lookZ: -0.36, angle: 0.25 } },
    { id: 'radio-front', name: '珐琅下沿', width: 2.02, height: 0.13, weight: 0.3, seed: 3602, completionThreshold: 0.85, material: 'ceramic', color: '#b8c4b8', position: [0, 0.185, 0.022], rotation: FRONT,
      camera: { distance: 8.5, height: 3.3, lookY: 0.38, lookZ: 0.02, angle: 0 } },
    { id: 'radio-side', name: '左侧木壳', width: 0.57, height: 1.06, weight: 0.25, seed: 3603, completionThreshold: 0.85, material: 'wood', color: '#a58966', position: [-1.113, 0.72, -0.36], rotation: [0, -Math.PI / 2, 0],
      camera: { distance: 8.7, height: 3.7, lookX: -0.5, lookY: 0.7, lookZ: -0.36, angle: -1.16 } },
  ],
  items: [
    item('radio-antenna', '伸缩天线', [0, 0.09, 1.07], [-0.88, 1.69, -0.4], [0.16, 0.76, 0.16], { startRotation: TOP, dragHeight: 2.02, hint: '把天线插入左上角的黄铜插座。', marker: { position: [-0.88, 1.39, -0.4], radius: 0.2 } }),
    item('radio-knob', '调频旋钮', [1.98, 0.12, 0.7], [0.52, 0.51, 0.09], [0.37, 0.37, 0.16], { startRotation: TOP, hint: '旋钮装回正面右下方的圆轴。', marker: { position: [0.52, 0.51, 0.1], plane: 'front', radius: 0.23 } }),
    item('radio-handset', '海岸听筒', [-1.65, 0.18, 0.83], [1.41, 0.79, -0.24], [0.28, 0.81, 0.29], { startRotation: [0, 0, Math.PI / 2], hint: '听筒竖着挂上电台右侧的支架。', marker: { position: [1.41, 0.79, -0.1], plane: 'front', radius: 0.23 } }),
  ],
  obstacles: [
    { half: [1.11, 0.63, 0.36], position: [0, 0.7, -0.36] },
    { half: [0.12, 0.04, 0.22], position: [1.4, 0.39, -0.3] },
  ], cameras: cameras(0.99),
};

export const POST_MIDDLE_LEVELS = [POST_TYPEWRITER, POST_PARCEL, POST_RADIO];
