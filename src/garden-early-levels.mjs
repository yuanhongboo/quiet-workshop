const flat = [-Math.PI / 2, 0, 0];
const camera = (overrides = {}) => ({ distance: 8.2, height: 4.2, lookY: 0.65, lookZ: 0, ...overrides });
const cameras = (lookY = 0.65) => ({
  desktop: { default: camera({ lookY }), tidy: camera({ distance: 8.8, height: 5.3, lookY: 0.45 }), finale: camera({ distance: 7.3, height: 3.6, lookY }) },
  mobile: { default: camera({ distance: 12.8, height: 5.7, lookY }), tidy: camera({ distance: 14.9, height: 7.1, lookY: 0.4 }), finale: camera({ distance: 11.4, height: 4.7, lookY }) },
});
const common = { seasonId: 'rain-garden', sceneFamily: 'garden', revision: 1, room: { custom: true, wall: '#bfcfc4' } };
const item = (id, name, kind, start, slot, size, extra = {}) => ({
  id, name, kind, start, slot, size, mass: 0.24, collider: 'box', yaw: 0,
  dragHeight: 1.45, slotRotation: [0, 0, 0],
  marker: { position: [slot[0], 0.12, slot[2]], radius: 0.22 }, ...extra,
});
const surface = (id, name, width, height, position, extra = {}) => ({
  id, name, width, height, position, rotation: [0, 0, 0], weight: 1 / 3,
  seed: 2020, completionThreshold: 0.87, material: 'ceramic', color: '#c6d0b7',
  camera: camera(), ...extra,
});

export const GARDEN_EARLY_LEVELS = [
  {
    ...common, id: 'garden-pot', number: '01', name: '雨后花盆',
    title: '雨停了，<br/>给新绿一个家。', description: '翻看花盆，擦掉雨水留下的泥痕。<br/>放入幼苗，慢慢浇透一小壶水。',
    tags: '翻面 · 栽植 · 浇水', color: '#9db8a0', icon: 'plant',
    steps: ['擦净花盆两面', '给幼苗安个家', '压土与浇水'],
    tidyTitle: '小小一株，<br/>稳稳住下。', tidyHint: '把幼苗放进花盆，插好木牌，再把浇水壶放回右侧。',
    actionTitle: '把根护好，<br/>等叶子舒展。', actionHint: '轻轻压实盆土，再按住浇水。最后把木牌转正。',
    actionLabel: '留住这一片新绿', runningTitle: '水慢慢渗下，<br/>叶子轻轻展开。', runningHint: '泥痕擦净了。花房有了第一位新住客。',
    finishedTitle: '一只旧花盆。<br/>一个新开始。', finishedDescription: '温润的釉面映着天光，<br/>新叶安静地伸向窗边。', caption: ['AFTER THE RAIN', 'A NEW ROOT'],
    operation: { kind: 'tasks', initial: 0, duration: 3.5, tasks: [
      { id: 'pot-settle', sound: 'polish', name: '轻压盆土', buttonLabel: '压实盆土', hint: '按住盆土，让根团稳稳贴合。', mode: 'hold', initial: 0, target: 1, rate: 0.36 },
      { id: 'pot-water', sound: 'water', name: '慢慢浇透', buttonLabel: '浇水', hint: '按住浇水，土壤会逐渐变深。', mode: 'hold', initial: 0, target: 1, rate: 0.24, requires: ['pot-settle'] },
      { id: 'pot-label', name: '转正木牌', hint: '轻点盆边的小木牌，让它朝向你。', mode: 'tap', initial: 0, target: 1, requires: ['pot-water'] },
    ] },
    surfaces: [
      surface('garden-pot-front', '花盆正面', 1.38, 0.66, [-0.36, 0.45, 0.323], { seed: 2101, color: '#a9bfae', camera: camera({ distance: 7.8, height: 2.8, lookX: -0.36, lookY: 0.43, lookZ: 0.15 }) }),
      surface('garden-pot-back', '花盆背面', 1.38, 0.66, [-0.36, 0.45, -0.823], { seed: 2102, rotation: [0, Math.PI, 0], color: '#a9bfae', camera: camera({ angle: Math.PI, distance: 7.8, height: 2.8, lookX: -0.36, lookY: 0.43, lookZ: -0.55 }) }),
      surface('garden-pot-pad', '陶土工作垫', 0.85, 0.95, [-1.88, 0.025, -0.25], { seed: 2103, material: 'linen', color: '#ded5bd', rotation: flat, camera: camera({ distance: 8.5, height: 6.2, lookX: -1.6, lookY: 0.1, lookZ: -0.25 }) }),
    ],
    items: [
      item('garden-young-plant', '龟背竹幼苗', 'young-plant', [-1.78, 0.33, 0.83], [-0.36, 0.78, -0.24], [0.65, 0.48, 0.56], { hint: '把包着根团的幼苗放入花盆中央。', marker: { position: [-0.36, 0.83, -0.24], radius: 0.3 } }),
      item('garden-name-stake', '木制植物牌', 'plant-stake', [0.23, 0.11, 0.93], [0.14, 1.03, -0.4], [0.29, 0.62, 0.06], { hint: '将木牌插在幼苗右侧的小圈里。', startRotation: [-Math.PI / 2, 0, -0.4], slotRotation: [0, -0.5, -0.1], marker: { position: [0.14, 0.83, -0.4], radius: 0.13 } }),
      item('garden-water-jug', '黄铜浇水壶', 'water-jug', [1.5, 0.31, 0.74], [1.35, 0.29, -0.48], [0.9, 0.55, 0.53], { hint: '把浇水壶放在花盆右侧的圆垫上。', marker: { position: [1.35, 0.054, -0.48], radius: 0.31 } }),
    ],
    obstacles: [{ half: [0.82, 0.41, 0.58], position: [-0.36, 0.41, -0.25] }], cameras: cameras(0.83),
  },
  {
    ...common, id: 'garden-tools', number: '02', name: '园艺工具',
    title: '磨亮小工具，<br/>把日子理顺。', description: '擦净旧工具架，挂好常用器具。<br/>上油、磨亮，让每一件都顺手。',
    tags: '清洁 · 悬挂 · 修护', color: '#b7ac8b', icon: 'clock',
    steps: ['擦净工具架', '把工具挂回去', '给旧工具做保养'],
    tidyTitle: '一件一格，<br/>伸手就找到。', tidyHint: '把小铲、手耙、修枝剪分别挂到对应的铜钩上。',
    actionTitle: '一点保养，<br/>用起来顺手。', actionHint: '按住磨亮小铲、润滑剪轴，再扣好手耙的挂带。',
    actionLabel: '收好今天的工具', runningTitle: '锋刃有了光，<br/>剪轴不再涩。', runningHint: '木柄、铜钩和细亮的钢刃，整整齐齐地等着下一次使用。',
    finishedTitle: '小工具，<br/>也值得被照料。', finishedDescription: '手边需要的，都在熟悉的位置。<br/>下一次照料花草，会更轻松。', caption: ['A PLACE FOR EVERYTHING', 'THE GARDEN TOOLS'],
    operation: { kind: 'tasks', initial: 0, duration: 3.1, tasks: [
      { id: 'tools-sharpen', sound: 'polish', name: '磨亮小铲', buttonLabel: '磨亮刀面', hint: '按住磨亮，小铲的钢面会露出细细的光。', mode: 'hold', initial: 0, target: 1, rate: 0.31 },
      { id: 'tools-oil', sound: 'polish', name: '润滑剪轴', buttonLabel: '给剪轴上油', hint: '按住剪轴上油，剪刃会慢慢张开。', mode: 'hold', initial: 0, target: 1, rate: 0.29 },
      { id: 'tools-strap', name: '扣好挂带', hint: '点一下手耙上方的皮带扣。', mode: 'tap', initial: 0, target: 1, requires: ['tools-sharpen', 'tools-oil'] },
    ] },
    surfaces: [
      surface('garden-tool-board', '鼠尾草绿背板', 3.28, 1.12, [0, 0.8, -0.638], { weight: 0.52, seed: 2201, material: 'wood', color: '#a6b1a0', camera: camera({ distance: 8.4, height: 3.2, lookY: 0.85, lookZ: -0.6 }) }),
      surface('garden-tool-bench', '橡木工具垫', 3.6, 0.58, [0, 0.044, 0.83], { weight: 0.31, seed: 2202, material: 'wood', color: '#c7a982', rotation: flat, camera: camera({ distance: 9.6, height: 6.3, lookY: 0.1, lookZ: 0.83 }) }),
      surface('garden-oil-tin', '保养油盒盖', 0.46, 0.36, [2.05, 0.185, -0.28], { weight: 0.17, seed: 2203, material: 'metal', color: '#acb9aa', rotation: flat, camera: camera({ distance: 8.3, height: 5.5, lookX: 1.75, lookY: 0.2, lookZ: -0.28 }) }),
    ],
    items: [
      item('garden-hanging-trowel', '木柄小铲', 'hanging-trowel', [-1.25, 0.1, 0.86], [-1.02, 0.79, -0.53], [0.42, 0.98, 0.12], { hint: '小铲挂在工具架左侧。', startRotation: [-Math.PI / 2, 0, -0.45], marker: { position: [-1.02, 0.79, -0.49], plane: 'front', radius: 0.23 } }),
      item('garden-hanging-fork', '三齿手耙', 'hanging-fork', [0.1, 0.12, 0.8], [0, 0.79, -0.53], [0.44, 0.92, 0.12], { hint: '三齿手耙挂在正中间。', startRotation: [-Math.PI / 2, 0, 0.25], marker: { position: [0, 0.79, -0.49], plane: 'front', radius: 0.23 } }),
      item('garden-hanging-shears', '修枝剪', 'hanging-shears', [1.36, 0.1, 0.86], [1.02, 0.81, -0.52], [0.48, 0.81, 0.12], { hint: '修枝剪挂在右侧的铜钩上。', startRotation: [-Math.PI / 2, 0, -0.28], marker: { position: [1.02, 0.81, -0.48], plane: 'front', radius: 0.23 } }),
    ],
    obstacles: [{ half: [1.78, 0.73, 0.1], position: [0, 0.73, -0.75] }, { half: [0.28, 0.085, 0.23], position: [2.05, 0.085, -0.28] }], cameras: cameras(0.78),
  },
  {
    ...common, id: 'garden-seeds', number: '03', name: '育苗盒',
    title: '一格一颗，<br/>藏好春天。', description: '擦净育苗盒，把小土杯排成行。<br/>播下种子，再给它们一层细雨。',
    tags: '分格 · 播种 · 保湿', color: '#bba588', icon: 'tea',
    steps: ['擦净育苗盒', '排好六只土杯', '播种与保湿'],
    tidyTitle: '小小的格子，<br/>留给不同的新绿。', tidyHint: '把罗勒、薄荷和洋甘菊三组土杯，放回有木牌的位置。',
    actionTitle: '种子睡下，<br/>盖一层软土。', actionHint: '轻点播种，再按住覆土、喷雾。最后合上透明盖。',
    actionLabel: '等一个发芽的早晨', runningTitle: '细雨落下，<br/>安静等候。', runningHint: '每一格都湿润、整齐。把期待交给时间。',
    finishedTitle: '把春天，<br/>一格格种下。', finishedDescription: '六只小土杯，三种新的期待。<br/>透过干净的罩子，能看见细小的种子。', caption: ['SMALL BEGINNINGS', 'THE SEED NURSERY'],
    operation: { kind: 'tasks', initial: 0, duration: 3.3, tasks: [
      { id: 'seeds-sow', name: '把种子放进小窝', hint: '点一下土杯，六颗种子会各自落入小窝。', mode: 'tap', initial: 0, target: 1 },
      { id: 'seeds-cover', sound: 'polish', name: '盖一层细土', buttonLabel: '轻覆细土', hint: '按住覆土，轻轻把种子盖住。', mode: 'hold', initial: 0, target: 1, rate: 0.34, requires: ['seeds-sow'] },
      { id: 'seeds-mist', sound: 'water', name: '喷一层细雨', buttonLabel: '轻轻喷雾', hint: '按住喷雾，六格土壤会慢慢湿润。', mode: 'hold', initial: 0, target: 1, rate: 0.25, requires: ['seeds-cover'] },
      { id: 'seeds-close', name: '合上保湿罩', hint: '点一下罩子前沿的铜把手。', mode: 'tap', initial: 0, target: 1, requires: ['seeds-mist'] },
    ] },
    surfaces: [
      surface('garden-seed-tray', '育苗盒内底', 2.88, 1.14, [0, 0.096, -0.24], { seed: 2301, weight: 0.45, material: 'wood', color: '#c2a782', rotation: flat, camera: camera({ distance: 8.8, height: 6.4, lookY: 0.1, lookZ: -0.24 }) }),
      surface('garden-seed-lid', '透明罩内侧', 2.91, 1.12, [0, 1.13, -0.962], { seed: 2302, weight: 0.35, material: 'glass', color: '#d9e4db', camera: camera({ distance: 8.2, height: 3.3, lookY: 1.05, lookZ: -0.94 }) }),
      surface('garden-seed-rail', '木质前沿', 2.88, 0.2, [0, 0.17, 0.403], { seed: 2303, weight: 0.2, material: 'wood', color: '#c2a782', camera: camera({ distance: 8, height: 2.7, lookY: 0.18, lookZ: 0.35 }) }),
    ],
    items: [
      item('garden-basil-cells', '罗勒土杯', 'seed-cells', [-1.73, 0.18, 0.84], [-0.96, 0.2, -0.24], [0.73, 0.22, 1.02], { hint: '罗勒放在左边一列。', label: '罗勒', labelEn: 'BASIL', tint: '#92a77a', marker: { position: [-0.96, 0.118, -0.24], radius: 0.27 } }),
      item('garden-mint-cells', '薄荷土杯', 'seed-cells', [-0.02, 0.19, 0.94], [0, 0.2, -0.24], [0.73, 0.22, 1.02], { hint: '薄荷放在中间一列。', label: '薄荷', labelEn: 'MINT', tint: '#78a496', marker: { position: [0, 0.118, -0.24], radius: 0.27 } }),
      item('garden-chamomile-cells', '洋甘菊土杯', 'seed-cells', [1.68, 0.18, 0.86], [0.96, 0.2, -0.24], [0.73, 0.22, 1.02], { hint: '洋甘菊放在右边一列。', label: '洋甘菊', labelEn: 'CHAMOMILE', tint: '#cbb788', marker: { position: [0.96, 0.118, -0.24], radius: 0.27 } }),
    ],
    obstacles: [{ half: [1.54, 0.05, 0.65], position: [0, 0.045, -0.24] }, { half: [1.54, 0.62, 0.055], position: [0, 0.62, -1.025] }], cameras: cameras(0.5),
  },
];
