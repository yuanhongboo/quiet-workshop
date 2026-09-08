const horizontal = [-Math.PI / 2, 0, 0];
const room = { custom: true, wall: '#bfcfc4' };
const base = { sceneFamily: 'garden', seasonId: 'rain-garden', revision: 1, room };
const cameras = {
  desktop: {
    default: { distance: 8.5, height: 3.6, lookY: 0.8, lookZ: 0.04 },
    tidy: { distance: 9.4, height: 4.5, lookY: 0.65, lookZ: 0.18 },
    finale: { distance: 7.7, height: 3.2, lookY: 0.85, lookZ: 0 },
  },
  mobile: {
    default: { distance: 13.2, height: 4.7, lookY: 0.75, lookZ: 0.05 },
    tidy: { distance: 18.8, height: 7.4, lookY: 0.64, lookZ: 0.18 },
    finale: { distance: 11.8, height: 4.1, lookY: 0.8, lookZ: 0 },
  },
};

export const GARDEN_LANTERN = {
  ...base,
  id: 'garden-lantern', number: '07', name: '玻璃风灯',
  title: '擦亮玻璃，<br/>留一盏暖光。',
  description: '擦透雨水留下的雾渍，装回烛芯和灯盖。<br/>试一试，光能有多温柔。',
  tags: '玻璃清洁 · 风灯装配 · 调光', color: '#b79b6b', icon: 'lantern',
  steps: ['擦透玻璃风灯', '装回灯芯与顶盖', '调好一盏暖光'],
  tidyTitle: '一小簇光，<br/>有了归处。',
  tidyHint: '将烛芯放进灯座中央，再把铜顶盖装到灯框上。',
  actionTitle: '慢慢调亮，<br/>刚刚好。',
  actionHint: '把亮度调到 65，按住试亮，再点一下开关，让暖光留在花房。',
  actionLabel: '留住这盏光',
  runningTitle: '玻璃透亮，<br/>光轻轻落下。', runningHint: '一圈暖光，照着雨后安静的花房。',
  finishedTitle: '有了暖光，<br/>夜晚也温柔。',
  finishedDescription: '从蒙尘的玻璃，到通透的暖光。<br/>这盏风灯会陪着花房的夜晚。',
  caption: ['A LIGHT TO KEEP', 'THE GLASS LANTERN'],
  operation: { kind: 'tasks', initial: 0, duration: 4, tasks: [
    { id: 'lantern-dim', name: '调到温柔的亮度', hint: '转动旋钮，让亮度停在 65 附近。', mode: 'dial', initial: 20, min: 0, max: 100, target: 65, tolerance: 6, step: 1, label: '暖光亮度', unit: '%' },
    { id: 'lantern-test', name: '按住试亮', buttonLabel: '试亮风灯', hint: '按住开关，看光慢慢透过玻璃。', mode: 'hold', initial: 0, target: 1, rate: 0.3, requires: ['lantern-dim'] },
    { id: 'lantern-light', name: '让暖光留下来', hint: '点一下铜色开关，风灯就会常亮。', mode: 'tap', initial: 0, target: 1, requires: ['lantern-test'] },
  ] },
  surfaces: [
    { id: 'lantern-glass', name: '风灯玻璃', width: 0.82, height: 0.94, weight: 0.5, seed: 2701, completionThreshold: 0.88, material: 'glass', color: '#cee3d9', position: [-0.35, 0.795, 0.237], rotation: [0, 0, 0], camera: { distance: 7.6, height: 2.25, lookX: -0.35, lookY: 0.8, lookZ: 0.23 } },
    { id: 'lantern-base', name: '铜色灯座', width: 1.05, height: 0.16, weight: 0.25, seed: 2702, completionThreshold: 0.86, material: 'metal', color: '#b99a65', position: [-0.35, 0.14, 0.326], rotation: [0, 0, 0], camera: { distance: 8.1, height: 2.2, lookX: -0.35, lookY: 0.17, lookZ: 0.3 } },
    { id: 'lantern-cloth', name: '棉麻工作垫', width: 0.91, height: 0.88, weight: 0.25, seed: 2703, completionThreshold: 0.85, material: 'linen', color: '#d5cfb7', position: [1.47, 0.011, -0.22], rotation: horizontal, camera: { distance: 8.2, height: 5.4, lookX: 1.44, lookY: 0.03, lookZ: -0.22 } },
  ],
  items: [
    { id: 'lantern-candle', kind: 'garden-candle', name: '暖光烛芯', hint: '放进灯座中央的圆形插座。', mass: 0.25, size: [0.35, 0.46, 0.35], start: [1.72, 0.27, 0.7], slot: [-0.35, 0.523, -0.2], dragHeight: 1.05, collider: 'box', marker: { position: [-0.35, 0.298, -0.2], radius: 0.19 }, slotRotation: [0, 0, 0] },
    { id: 'lantern-cap', kind: 'garden-lantern-cap', name: '铜制顶盖', hint: '烛芯装好后，盖到灯框顶部。', mass: 0.4, size: [1.02, 0.32, 0.89], start: [-1.67, 0.22, 0.67], slot: [-0.35, 1.42, -0.2], dragHeight: 1.75, collider: 'box', requires: ['lantern-candle'], marker: { position: [-0.35, 1.325, -0.2], radius: 0.32 }, slotRotation: [0, 0, 0] },
  ],
  obstacles: [{ half: [0.57, 0.12, 0.52], position: [-0.35, 0.12, -0.2] }], cameras,
};

export const GARDEN_BENCH = {
  ...base,
  id: 'garden-bench', number: '08', name: '花房长椅',
  title: '修好长椅，<br/>留一个位置。',
  description: '洗去木头上的雨痕，把松散的木条装回去。<br/>最后抚平坐垫，就能坐下看看花了。',
  tags: '木头清洁 · 木条拼装 · 坐垫整理', color: '#b59a79', icon: 'bench',
  steps: ['擦净长椅', '装好木条与坐垫', '拧紧与抚平'],
  tidyTitle: '一条木板，<br/>接住好时光。',
  tidyHint: '把长木板装进座面空隙，背板装回靠背，最后放好绿色坐垫。',
  actionTitle: '稳稳当当，<br/>软软乎乎。',
  actionHint: '拧紧两侧铜螺钉，再按住坐垫，把褶皱慢慢抚平。',
  actionLabel: '坐下歇一会儿',
  runningTitle: '长椅稳了，<br/>坐垫也松软了。', runningHint: '花房里，终于有了一个让人愿意停留的位置。',
  finishedTitle: '收拾好了。<br/>坐着看看花。',
  finishedDescription: '木条牢固，坐垫平整。<br/>忙碌到这里，可以安心歇一会儿。',
  caption: ['A PLACE TO PAUSE', 'THE GARDEN BENCH'],
  operation: { kind: 'tasks', initial: 0, duration: 4.5, tasks: [
    { id: 'bench-left-bolt', name: '拧紧左侧螺钉', hint: '点一下左侧扶手前端的铜螺钉。', mode: 'tap', initial: 0, target: 1 },
    { id: 'bench-right-bolt', name: '拧紧右侧螺钉', hint: '点一下右侧扶手前端的铜螺钉。', mode: 'tap', initial: 0, target: 1 },
    { id: 'bench-cushion', sound: 'polish', name: '抚平柔软坐垫', buttonLabel: '抚平坐垫', hint: '按住坐垫，褶皱会一点点舒展开。', mode: 'hold', initial: 0, target: 1, rate: 0.26, requires: ['bench-left-bolt', 'bench-right-bolt'] },
  ] },
  surfaces: [
    { id: 'bench-back', name: '靠背木板', width: 3.04, height: 0.24, weight: 0.42, seed: 2801, completionThreshold: 0.87, material: 'wood', color: '#c29c70', position: [0, 1.385, -0.532], rotation: [0, 0, 0], camera: { distance: 15.8, height: 4.2, lookY: 1.38, lookZ: -0.5 } },
    { id: 'bench-apron', name: '座面前沿', width: 3.02, height: 0.18, weight: 0.33, seed: 2802, completionThreshold: 0.87, material: 'wood', color: '#bb9266', position: [0, 0.455, 0.292], rotation: [0, 0, 0], camera: { distance: 15.6, height: 4.2, lookY: 0.45, lookZ: 0.28 } },
    { id: 'bench-arm', name: '左侧扶手', width: 0.2, height: 0.81, weight: 0.25, seed: 2803, completionThreshold: 0.85, material: 'wood', color: '#c29c70', position: [-1.66, 0.983, -0.1], rotation: horizontal, camera: { distance: 8.7, height: 5.2, lookX: -1.62, lookY: 0.94, lookZ: -0.1 } },
  ],
  items: [
    { id: 'bench-seat-slat', kind: 'garden-seat-slat', name: '座面长木条', hint: '顺着长椅中央的缝隙放入。', mass: 0.4, size: [3.04, 0.09, 0.24], start: [-0.25, 0.1, 1.05], slot: [0, 0.633, -0.1], dragHeight: 1.25, collider: 'box', marker: { position: [0, 0.643, -0.1], radius: 0.28 }, slotRotation: [0, 0, 0] },
    { id: 'bench-back-slat', kind: 'garden-back-slat', name: '靠背长木条', hint: '嵌入靠背中央的空位。', mass: 0.35, size: [3.04, 0.19, 0.07], start: [-0.2, 0.12, 0.62], slot: [0, 1.1, -0.57], startRotation: horizontal, dragHeight: 1.5, collider: 'box', marker: { position: [0, 1.1, -0.51], radius: 0.24, plane: 'front' }, slotRotation: [0, 0, 0] },
    { id: 'bench-seat-cushion', kind: 'garden-seat-cushion', name: '苔绿坐垫', hint: '木条装好后，放到座面右侧。', mass: 0.18, size: [0.76, 0.18, 0.63], start: [1.9, 0.17, 0.86], slot: [0.78, 0.774, -0.08], dragHeight: 1.3, collider: 'box', requires: ['bench-seat-slat', 'bench-back-slat'], marker: { position: [0.78, 0.697, -0.08], radius: 0.28 }, slotRotation: [0, 0, 0] },
  ],
  obstacles: [
    { half: [1.58, 0.275, 0.4], position: [0, 0.275, -0.1] },
    { half: [1.65, 0.3, 0.065], position: [0, 1.2, -0.6] },
  ], cameras: {
    desktop: { ...cameras.desktop, finale: { distance: 8.9, height: 3.2, lookY: 0.77, lookZ: -0.15 } },
    mobile: { ...cameras.mobile, default: { distance: 16.1, height: 5.6, lookY: 0.7, lookZ: 0 }, finale: { distance: 15.4, height: 4.9, lookY: 0.75, lookZ: -0.13 } },
  },
};

const overviewCamera = { distance: 20.8, height: 11.8, lookY: 0.85, lookZ: 0, lookX: 0 };
export const GARDEN_AWAKENING = {
  ...base,
  id: 'garden-awakening', number: '09', name: '花房苏醒', gardenOverview: true,
  ambientWaterTask: 'garden-start-water',
  title: '雨停了，<br/>花房醒了。',
  description: '八件亲手修好的小事，终于成为一座花房。<br/>打开顶窗，让风、流水与阳光进来。',
  tags: '全季成果 · 花房全景 · 雨后仪式', color: '#a7b691', icon: 'garden',
  steps: ['八处新生', '唤醒花房', '迎接雨后阳光'],
  tidyTitle: '每一件，<br/>都在这里。', tidyHint: '这座花房收着你在这一季完成的八处成果。',
  actionTitle: '给花房，<br/>一点生机。',
  actionHint: '打开顶窗、启动流水、点亮风灯，最后拉开遮阳帘。也可以点花房里的物件。',
  actionLabel: '迎接雨后阳光',
  runningTitle: '风进来了。<br/>阳光也来了。', runningHint: '水面轻轻荡漾，叶子跟着风摇动。花房慢慢苏醒。',
  finishedTitle: '雨后的花房，<br/>收拾好了。',
  finishedDescription: '从第一只泥泞花盆，到可以歇脚的一屋绿意。<br/>这一季的温柔，都留在这里。',
  caption: ['AFTER THE RAIN', 'THE GARDEN · SEASON 02'],
  operation: { kind: 'tasks', initial: 0, duration: 6, tasks: [
    { id: 'garden-open-roof', sound: 'curtain', name: '打开花房顶窗', hint: '按住顶窗把手，让雨后的空气进来。', buttonLabel: '打开顶窗', mode: 'hold', initial: 0, target: 1, rate: 0.32 },
    { id: 'garden-start-water', sound: 'water', name: '让流水响起来', hint: '点一下修好的喷泉，水就会再次流动。', mode: 'tap', initial: 0, target: 1 },
    { id: 'garden-light-lantern', name: '点亮玻璃风灯', hint: '让暖光映在花房的玻璃上。', mode: 'tap', initial: 0, target: 1 },
    { id: 'garden-open-shade', sound: 'curtain', name: '让阳光照进来', hint: '按住拉绳，把遮阳帘慢慢收起来。', buttonLabel: '拉开遮阳帘', mode: 'hold', initial: 0, target: 1, rate: 0.28, requires: ['garden-open-roof'] },
  ] },
  surfaces: [], items: [], obstacles: [],
  cameras: {
    desktop: { default: { distance: 10.8, height: 7.3, lookY: 0.8, lookZ: 0 }, tidy: { distance: 10.8, height: 7.3, lookY: 0.8, lookZ: 0 }, finale: { distance: 9.8, height: 6.7, lookY: 0.8, lookZ: 0 }, overview: { distance: 10.8, height: 7.3, lookY: 0.8, lookZ: 0 } },
    mobile: { default: overviewCamera, tidy: overviewCamera, finale: overviewCamera, overview: overviewCamera },
  },
};

export const GARDEN_FINALE_LEVELS = [GARDEN_LANTERN, GARDEN_BENCH, GARDEN_AWAKENING];
