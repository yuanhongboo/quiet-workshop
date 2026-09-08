const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = {
  seasonId: 'rain-garden', sceneFamily: 'garden', revision: 1,
  room: { custom: true, wall: '#bfcfc4' },
};
const cameras = (lookY = 0.8) => ({
  desktop: {
    default: { distance: 8.2, height: 3.7, lookY, lookZ: -0.1 },
    tidy: { distance: 8.7, height: 4.1, lookY: 0.75, lookZ: 0.03 },
    finale: { distance: 7.7, height: 3.3, lookY, lookZ: -0.12 },
  },
  mobile: {
    default: { distance: 14.8, height: 5.8, lookY, lookZ: 0 },
    tidy: { distance: 15.8, height: 6.1, lookY: 0.75, lookZ: 0.1 },
    finale: { distance: 12.1, height: 4.8, lookY, lookZ: -0.05 },
  },
});
const item = (id, name, kind, start, slot, size, extra = {}) => ({
  id, name, kind, start, slot, size, mass: 0.24, collider: 'box',
  startRotation: FRONT, slotRotation: FRONT, dragHeight: 1.35,
  snapDistance: 0.48, placementLift: 0.22,
  marker: { position: [slot[0], slot[1] + 0.045, slot[2]], radius: 0.23 },
  ...extra,
});

export const GARDEN_SHELF = {
  ...common, id: 'garden-shelf', number: '04', name: '木制花架', icon: 'desk', color: '#ad9471',
  title: '一层木香，<br/>一层新绿。',
  description: '擦净木纹，接好榫卯。<br/>给高低不同的绿意安一个家。',
  tags: '翻面清洁 · 榫卯 · 木蜡油',
  steps: ['擦净花架', '接好层板与花盆', '木榫与木蜡油'],
  tidyTitle: '层板接好，<br/>绿意站稳。',
  tidyHint: '先把百叶层板接到中间的榫槽，再将两盆植物放进上下层的光圈。',
  actionTitle: '轻轻敲牢，<br/>慢慢润亮。',
  actionHint: '点一下左右两颗突出的木榫，再按住上油，看木纹恢复温润。',
  actionLabel: '留住木头的温度',
  runningTitle: '木纹温润，<br/>叶子安静。', runningHint: '每一道榫卯都贴合了，花盆有了稳稳的位置。',
  finishedTitle: '高低错落，<br/>刚刚好。',
  finishedDescription: '木榫贴平，层板稳妥。<br/>新绿在温润的木架上轻轻舒展。',
  caption: ['GRAIN & GREEN', 'THE JOINED PLANT SHELF'],
  operation: { kind: 'tasks', initial: 0, duration: 3.6, tasks: [
    { id: 'shelf-pin-left', name: '敲入左侧木榫', hint: '轻点花架左侧突出的圆木榫。', mode: 'tap', initial: 0, target: 1 },
    { id: 'shelf-pin-right', name: '敲入右侧木榫', hint: '轻点右侧木榫，让层板两端都稳稳贴合。', mode: 'tap', initial: 0, target: 1 },
    { id: 'shelf-oil', name: '涂一层木蜡油', buttonLabel: '慢慢上油', hint: '按住上油，直到木色均匀温润。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.26, requires: ['shelf-pin-left', 'shelf-pin-right'] },
  ] },
  surfaces: [
    { id: 'shelf-back', name: '花架背板', width: 2.1, height: 1.36, weight: 0.5, seed: 2401, completionThreshold: 0.85, material: 'wood', color: '#c3a477', position: [0, 1.04, -0.822], rotation: FRONT,
      camera: { distance: 8, height: 2.9, lookY: 1.04, lookZ: -0.79, angle: 0 } },
    { id: 'shelf-side', name: '右侧榫卯立板', width: 0.91, height: 1.56, weight: 0.3, seed: 2402, completionThreshold: 0.84, material: 'wood', color: '#b99768', position: [1.203, 0.96, -0.36], rotation: [0, Math.PI / 2, 0],
      camera: { distance: 8, height: 3.5, lookX: 0.5, lookY: 0.93, lookZ: -0.36, angle: 1.1 } },
    { id: 'shelf-apron', name: '下层木沿', width: 2.14, height: 0.2, weight: 0.2, seed: 2403, completionThreshold: 0.85, material: 'wood', color: '#c6a474', position: [0, 0.21, 0.191], rotation: FRONT,
      camera: { distance: 8, height: 2.9, lookY: 0.3, lookZ: 0.19, angle: 0 } },
  ],
  items: [
    item('shelf-slats', '百叶层板', 'shelf-slats', [0, 0.12, 0.83], [0, 0.98, -0.3], [2.18, 0.17, 0.8], { order: 1, hint: '把整片层板放入中间的左右榫槽。', marker: { position: [0, 0.98, 0.19], plane: 'front', radius: 0.31 } }),
    item('shelf-fern', '陶盆蕨类', 'shelf-fern', [-1.55, 0.2, 0.8], [-0.52, 1.216, -0.12], [0.58, 0.4, 0.58], { requires: ['shelf-slats'], hint: '蕨类放到中层左侧，盆底对齐光圈。', dragHeight: 1.65, marker: { position: [-0.52, 1.05, -0.12], radius: 0.25 } }),
    item('shelf-succulent', '青釉多肉', 'shelf-succulent', [1.6, 0.2, 0.8], [0.53, 0.545, -0.23], [0.54, 0.4, 0.54], { requires: ['shelf-slats'], hint: '多肉放在下层右侧，留出呼吸的空隙。', marker: { position: [0.53, 0.335, -0.23], radius: 0.23 } }),
  ],
  obstacles: [
    { half: [1.1, 0.055, 0.52], position: [0, 0.29, -0.34] },
    { half: [0.07, 0.96, 0.49], position: [-1.13, 1.04, -0.36] },
    { half: [0.07, 0.96, 0.49], position: [1.13, 1.04, -0.36] },
    { half: [1.08, 0.71, 0.025], position: [0, 1.04, -0.85] },
  ], cameras: {
    ...cameras(1.02),
    mobile: {
      ...cameras(1.02).mobile,
      finale: { distance: 12.4, height: 4.05, lookY: 1.1, lookZ: -0.05 },
    },
  },
};

export const GARDEN_GLASS = {
  ...common, id: 'garden-glass', number: '05', name: '玻璃栽培箱', icon: 'window', color: '#8bb3aa',
  title: '擦亮玻璃，<br/>住进一座小森林。',
  description: '清理水痕，铺入苔藓。<br/>让一片微小的森林呼吸。', tags: '透光 · 微景观 · 通风',
  steps: ['擦净玻璃与底盘', '安放小森林', '喷雾与通风'],
  tidyTitle: '把一座森林，<br/>轻轻安放。',
  tidyHint: '苔藓与蕨类先放入箱内，再把黄铜玻璃顶盖装到上方。',
  actionTitle: '一点水汽，<br/>一点清风。',
  actionHint: '按住喷雾润湿苔藓，再把通风窗调到 35°，最后扣好支撑扣。',
  actionLabel: '给小森林一个早晨',
  runningTitle: '水珠凝起，<br/>叶子舒开。', runningHint: '新鲜空气从开着的屋顶慢慢流过。',
  finishedTitle: '一眼望见，<br/>一片小森林。',
  finishedDescription: '清透的玻璃，湿润的苔藓。<br/>屋顶开了一条缝，刚够风进来。',
  caption: ['A FOREST UNDER GLASS', 'THE WARDIAN CASE'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'glass-mist', name: '轻轻喷雾', buttonLabel: '喷一层细雾', hint: '按住喷雾，看苔藓变得湿润。', mode: 'hold', sound: 'water', initial: 0, target: 1, rate: 0.3 },
    { id: 'glass-vent', name: '打开通风窗到 35°', hint: '调节开窗角度，让斜面顶窗抬起来。', mode: 'dial', initial: 0, min: 0, max: 60, target: 35, tolerance: 4, step: 1, unit: '°', label: '通风角度', requires: ['glass-mist'] },
    { id: 'glass-latch', name: '扣好支撑扣', hint: '轻点右侧黄铜扣，让顶窗保持通风。', mode: 'tap', initial: 0, target: 1, requires: ['glass-vent'] },
  ] },
  surfaces: [
    { id: 'case-front', name: '正面玻璃', width: 2.18, height: 0.95, weight: 0.5, seed: 2501, completionThreshold: 0.86, material: 'glass', color: '#dcece5', position: [-0.12, 0.797, 0.256], rotation: FRONT,
      camera: { distance: 8.2, height: 3.3, lookX: -0.12, lookY: 0.8, lookZ: 0.25, angle: 0 } },
    { id: 'case-right', name: '侧面玻璃', width: 0.91, height: 0.95, weight: 0.3, seed: 2502, completionThreshold: 0.85, material: 'glass', color: '#dcece5', position: [1.015, 0.797, -0.25], rotation: [0, Math.PI / 2, 0],
      camera: { distance: 8, height: 3.4, lookX: 0.5, lookY: 0.8, lookZ: -0.25, angle: 1.08 } },
    { id: 'case-base', name: '黄铜底盘', width: 2.31, height: 0.16, weight: 0.2, seed: 2503, completionThreshold: 0.84, material: 'metal', color: '#b69c66', position: [-0.12, 0.15, 0.318], rotation: FRONT,
      camera: { distance: 8, height: 3, lookY: 0.22, lookZ: 0.32, angle: 0 } },
  ],
  items: [
    item('case-moss', '苔藓石丘', 'case-moss', [1.56, 0.13, 0.6], [0.34, 0.31, -0.24], [0.69, 0.28, 0.65], { hint: '把苔藓石丘放入右侧的大圆圈。', marker: { position: [0.34, 0.31, -0.24], radius: 0.26 } }),
    item('case-fern', '小蕨丛', 'case-fern', [-1.65, 0.16, 0.54], [-0.63, 0.365, -0.23], [0.59, 0.15, 0.55], { hint: '把小蕨丛栽到左侧的土壤里。', marker: { position: [-0.63, 0.32, -0.23], radius: 0.24 } }),
    item('case-roof', '黄铜玻璃顶盖', 'case-roof', [-0.12, 0.11, 0.85], [-0.12, 1.49, -0.25], [2.34, 0.4, 1.06], { order: 3, requires: ['case-moss', 'case-fern'], hint: '最后把整片顶盖装回玻璃箱上沿。', dragHeight: 1.75, placementLift: 0.18, marker: { position: [-0.12, 1.315, -0.25], radius: 0.34 } }),
  ],
  obstacles: [{ half: [1.2, 0.12, 0.59], position: [-0.12, 0.13, -0.25] }],
  cameras: cameras(0.84),
};

export const GARDEN_FOUNTAIN = {
  ...common, id: 'garden-fountain', number: '06', name: '石钵流水', icon: 'tea', color: '#a1b4b1',
  title: '一钵清水，<br/>把心放慢。',
  description: '洗去青苔，接好竹管。<br/>听清水落进石钵的声音。', tags: '石材 · 水位 · 循环流水',
  steps: ['擦净石钵', '接好水景', '调水与循环'],
  tidyTitle: '竹管接上，<br/>水有了方向。',
  tidyHint: '竹管接到右侧支架上，把卵石和睡莲轻轻放入石钵。',
  actionTitle: '水慢慢满，<br/>心慢慢静。',
  actionHint: '先把水阀调到 40%，再按住注水。水位合适后点亮循环开关。',
  actionLabel: '听一会儿流水',
  runningTitle: '清水落下，<br/>涟漪散开。', runningHint: '一圈又一圈，水把喧闹留在了外面。',
  finishedTitle: '这一钵水，<br/>有了呼吸。',
  finishedDescription: '竹管细流，睡莲轻摇。<br/>花房里多了一段可以久听的声音。',
  caption: ['WATER FINDS ITS WAY', 'THE STONE WATER GARDEN'],
  operation: { kind: 'tasks', initial: 0, duration: 4.5, tasks: [
    { id: 'fountain-valve', name: '把水量调到 40%', hint: '调节水阀，留下轻缓稳定的水量。', mode: 'dial', initial: 0, min: 0, max: 100, target: 40, tolerance: 5, step: 1, unit: '%', label: '进水量' },
    { id: 'fountain-fill', name: '缓缓注水', buttonLabel: '让水慢慢注满', hint: '按住注水，水位会缓缓升到石钵内沿。', mode: 'hold', sound: 'water', initial: 0, target: 1, rate: 0.23, requires: ['fountain-valve'] },
    { id: 'fountain-flow', name: '开启循环流水', hint: '点一下绿色循环按钮，让细水长流。', mode: 'tap', initial: 0, target: 1, requires: ['fountain-fill'] },
  ] },
  surfaces: [
    { id: 'fountain-rim', name: '石钵宽沿', width: 2.18, height: 2.18, weight: 0.66, seed: 2601, completionThreshold: 0.86, mask: { kind: 'disc', hole: 0.343 }, material: 'stone', color: '#c1c1af', position: [-0.18, 0.641, -0.05], rotation: TOP,
      camera: { distance: 8.3, height: 6.2, lookX: -0.18, lookY: 0.5, lookZ: -0.05, angle: 0.15 } },
    { id: 'fountain-control', name: '青铜水阀面板', width: 0.43, height: 0.36, weight: 0.34, seed: 2602, completionThreshold: 0.86, material: 'metal', color: '#90a596', position: [1.6, 0.3, 0.168], rotation: FRONT,
      camera: { distance: 8, height: 3.1, lookX: 1.28, lookY: 0.35, lookZ: 0.18, angle: 0.35 } },
  ],
  items: [
    item('fountain-spout', '竹制出水管', 'fountain-spout', [-1.73, 0.1, 0.32], [0.79, 1.23, -0.24], [1.7, 0.19, 0.19], { startRotation: [0, Math.PI / 2, 0], hint: '把竹管右端接到支架顶端，出水口朝向石钵。', dragHeight: 1.6, marker: { position: [1.46, 1.23, -0.24], plane: 'front', radius: 0.21 } }),
    item('fountain-stones', '三枚卵石', 'fountain-stones', [1.76, 0.15, 0.68], [-0.65, 0.48, 0.15], [0.53, 0.29, 0.43], { hint: '卵石放在石钵左侧的浅台上。', marker: { position: [-0.65, 0.54, 0.15], radius: 0.23 } }),
    item('fountain-lily', '小小睡莲', 'fountain-lily', [0.8, 0.09, 1.1], [0.2, 0.54, 0.19], [0.52, 0.19, 0.48], { hint: '把睡莲放到右侧的圆圈，稍后它会随水浮起来。', marker: { position: [0.2, 0.52, 0.19], radius: 0.23 } }),
  ],
  obstacles: [
    { half: [0.82, 0.07, 0.82], position: [-0.18, 0.11, -0.05] },
    { half: [0.28, 0.27, 0.22], position: [1.6, 0.27, -0.05] },
    { half: [0.08, 0.58, 0.08], position: [1.5, 0.61, -0.24] },
  ], cameras: {
    ...cameras(0.67),
    mobile: {
      ...cameras(0.67).mobile,
      finale: { distance: 14.3, height: 5.15, lookX: 0.25, lookY: 0.67, lookZ: -0.05 },
    },
  },
};

export const GARDEN_MIDDLE_LEVELS = [GARDEN_SHELF, GARDEN_GLASS, GARDEN_FOUNTAIN];
