const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = {
  seasonId: 'lighthouse-post', sceneFamily: 'post', inspection: true, revision: 1,
  room: { custom: true, wall: '#d2e0df' },
};
const cameras = (lookY = 0.9) => ({
  desktop: {
    default: { distance: 8.5, height: 3.7, lookY, lookZ: -0.1 },
    tidy: { distance: 8.8, height: 4.1, lookY: 0.8, lookZ: 0 },
    finale: { distance: 8, height: 3.3, lookY, lookZ: -0.08 },
  },
  mobile: {
    default: { distance: 16.6, height: 5.5, lookY, lookZ: 0 },
    tidy: { distance: 18, height: 6, lookY: 0.8, lookZ: 0.05 },
    finale: { distance: 14.3, height: 4.8, lookY, lookZ: 0 },
  },
});
const item = (id, name, start, slot, size, extra = {}) => ({
  id, name, kind: id, start, slot, size, mass: 0.22, collider: 'box',
  startRotation: FRONT, slotRotation: FRONT, dragHeight: 1.75,
  snapDistance: 0.48, placementLift: 0.2,
  marker: { position: [slot[0], slot[1] + 0.06, slot[2]], radius: 0.22 }, ...extra,
});

export const POST_BOX = {
  ...common, id: 'post-box', number: '01', name: '门前邮筒', icon: 'sign', color: '#77a99e',
  title: '海风吹过，<br/>等一封来信。',
  description: '擦去盐霜，装好投信盖。<br/>街角邮局，从门前的一点青绿醒来。',
  tags: '搪瓷 · 合页 · 投信小旗', steps: ['擦净邮筒', '装好投信盖与木牌', '让邮筒重新迎信'],
  tidyTitle: '一片盖子，<br/>一个名字。',
  tidyHint: '把青绿投信盖装回上方开口，再将木牌贴到正面的圆圈。',
  actionTitle: '合页转动，<br/>小旗升起。', actionHint: '按住润滑合页，拨开投信盖，再升起右侧小旗。',
  actionLabel: '邮局开始收信', runningTitle: '小旗向上，<br/>来信有了去处。', runningHint: '风从投信口轻轻穿过。它会一直守在邮局门口。',
  finishedTitle: '第一封问候，<br/>从这里开始。', finishedDescription: '青绿邮筒回到了门前。<br/>下一次回到邮局，你会看见小旗正迎着海风。',
  caption: ['LETTERS BY THE SEA', 'THE WELCOMING POST BOX'],
  operation: { kind: 'tasks', initial: 0, duration: 3.5, tasks: [
    { id: 'post-box-oil', name: '润滑黄铜合页', buttonLabel: '轻轻润滑', hint: '按住润滑，让两端合页恢复柔亮。', mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.3 },
    { id: 'post-box-open', name: '拨开投信盖', hint: '点一下上方的青绿投信盖，露出投信口。', mode: 'tap', initial: 0, target: 1, requires: ['post-box-oil'] },
    { id: 'post-box-flag', name: '升起收信小旗', hint: '点右侧的珊瑚色小旗，告诉路过的人可以投信了。', mode: 'tap', initial: 0, target: 1, requires: ['post-box-open'] },
  ] },
  surfaces: [
    { id: 'post-box-front', name: '青绿搪瓷门', width: 1.59, height: 1.03, weight: 0.55, seed: 3101, completionThreshold: 0.86, material: 'ceramic', color: '#76a49a', position: [0, 0.81, 0.093], rotation: FRONT,
      camera: { distance: 8.2, height: 3.1, lookY: 0.85, lookZ: 0.12, angle: 0 } },
    { id: 'post-box-side', name: '右侧搪瓷板', width: 0.69, height: 1.25, weight: 0.3, seed: 3102, completionThreshold: 0.84, material: 'ceramic', color: '#80aca1', position: [0.932, 0.93, -0.37], rotation: [0, Math.PI / 2, 0],
      camera: { distance: 8.2, height: 3.7, lookX: 0.38, lookY: 0.95, lookZ: -0.3, angle: 1.03 } },
    { id: 'post-box-lip', name: '黄铜投信口沿', width: 1.43, height: 0.11, weight: 0.15, seed: 3103, completionThreshold: 0.84, material: 'metal', color: '#c9ae72', position: [0, 1.80, 0.132], rotation: FRONT },
  ],
  items: [
    item('post-box-lid', '青绿投信盖', [0.13, 0.09, 0.89], [0, 1.505, 0.134], [1.34, 0.29, 0.065], { startRotation: TOP, hint: '上方长长的开口，正好容下这片青绿盖子。', marker: { position: [0, 1.51, 0.22], plane: 'front', radius: 0.26 } }),
    item('post-box-name', '海边邮局木牌', [-1.43, 0.075, 0.77], [0, 0.69, 0.135], [0.92, 0.32, 0.065], { startRotation: TOP, hint: '把写着海边邮局的木牌安在正面中间。', marker: { position: [0, 0.69, 0.18], plane: 'front', radius: 0.24 } }),
  ],
  obstacles: [{ half: [0.91, 0.86, 0.41], position: [0, 0.97, -0.34] }],
  cameras: cameras(1.04),
};

export const POST_SORTER = {
  ...common, id: 'post-sorter', number: '02', name: '分信格', icon: 'desk', color: '#b59e76',
  title: '一封一封，<br/>找到方向。', description: '擦净木格，分好三叠信。<br/>海湾、山间、街角，各自有了小小的位置。',
  tags: '木格 · 颜色归类 · 拉开抽屉', steps: ['擦净三个信格', '按颜色放好来信', '贴标签与整理抽屉'],
  tidyTitle: '三种颜色，<br/>三段旅程。', tidyHint: '青绿信件放左格，米白信件放中格，珊瑚信件放右格。每格都有同色小标记。',
  actionTitle: '贴好方向，<br/>抽屉也留白。', actionHint: '点好三张分区标签，再缓缓拉开下方抽屉。', actionLabel: '收好每一份惦念',
  runningTitle: '信件整齐，<br/>等一次启程。', runningHint: '分信柜会留在邮筒后面，把收到的问候一封封接住。',
  finishedTitle: '每一封信，<br/>都有自己的格子。', finishedDescription: '海湾、山间、街角，名字贴得端端正正。<br/>门前邮筒收到的问候，从这里找到方向。',
  caption: ['A PLACE FOR EVERY LETTER', 'THE THREE QUIET ROUTES'],
  operation: { kind: 'tasks', initial: 0, duration: 3.4, tasks: [
    { id: 'post-sorter-bay', name: '贴好海湾标签', hint: '点一下左侧青绿标签，让它端正贴合。', mode: 'tap', initial: 0, target: 1 },
    { id: 'post-sorter-hill', name: '贴好山间标签', hint: '点一下中间米白标签。', mode: 'tap', initial: 0, target: 1 },
    { id: 'post-sorter-street', name: '贴好街角标签', hint: '点一下右侧珊瑚标签。', mode: 'tap', initial: 0, target: 1 },
    { id: 'post-sorter-drawer', name: '缓缓拉开备用抽屉', buttonLabel: '拉开小抽屉', hint: '按住拉开抽屉，为下一批明信片留出位置。', mode: 'hold', initial: 0, target: 1, rate: 0.32, requires: ['post-sorter-bay', 'post-sorter-hill', 'post-sorter-street'] },
  ] },
  surfaces: [
    { id: 'post-sorter-left', name: '左格木背板', width: 0.69, height: 0.9, weight: 0.34, seed: 3201, completionThreshold: 0.85, material: 'wood', color: '#be9f72', position: [-0.86, 0.90, -0.794], rotation: FRONT, camera: { distance: 8.3, height: 3.35, lookX: -0.4, lookY: 0.95, lookZ: -0.55, angle: 0 } },
    { id: 'post-sorter-middle', name: '中格木背板', width: 0.69, height: 0.9, weight: 0.33, seed: 3202, completionThreshold: 0.85, material: 'wood', color: '#be9f72', position: [0, 0.90, -0.794], rotation: FRONT, camera: { distance: 8.3, height: 3.35, lookY: 0.95, lookZ: -0.55, angle: 0 } },
    { id: 'post-sorter-right', name: '右格木背板', width: 0.69, height: 0.9, weight: 0.33, seed: 3203, completionThreshold: 0.85, material: 'wood', color: '#be9f72', position: [0.86, 0.90, -0.794], rotation: FRONT, camera: { distance: 8.3, height: 3.35, lookX: 0.4, lookY: 0.95, lookZ: -0.55, angle: 0 } },
  ],
  items: [
    item('post-sorter-green', '青绿海湾来信', [-1.52, 0.11, 0.82], [-0.86, 0.445, -0.31], [0.65, 0.16, 0.48], { color: '#a1c0b6', hint: '青绿的一叠，放进最左边海湾格。', marker: { position: [-0.86, 0.38, -0.1], radius: 0.24 } }),
    item('post-sorter-ivory', '米白山间来信', [0, 0.11, 0.94], [0, 0.445, -0.31], [0.65, 0.16, 0.48], { color: '#eaddc0', hint: '米白的一叠，放进中间山间格。', marker: { position: [0, 0.38, -0.1], radius: 0.24 } }),
    item('post-sorter-coral', '珊瑚街角来信', [1.52, 0.11, 0.82], [0.86, 0.445, -0.31], [0.65, 0.16, 0.48], { color: '#dca38e', hint: '珊瑚色的一叠，放进最右边街角格。', marker: { position: [0.86, 0.38, -0.1], radius: 0.24 } }),
  ],
  obstacles: [
    { half: [1.37, 0.05, 0.45], position: [0, 0.31, -0.4] },
    { half: [1.36, 0.76, 0.035], position: [0, 1.0, -0.84] },
    ...[-1.34, -0.43, 0.43, 1.34].map(x => ({ half: [0.035, 0.68, 0.35], position: [x, 1.06, -0.44] })),
  ], cameras: cameras(1.0),
};

export const POST_STAMP = {
  ...common, id: 'post-stamp', number: '03', name: '邮戳工作台', icon: 'clock', color: '#b69d70',
  title: '轻轻一印，<br/>留下海边的日期。', description: '擦净黄铜与木沿，接好小邮戳。<br/>这一封问候，就从今天出发。',
  tags: '黄铜刻度 · 校准 · 圆形落印', steps: ['擦净邮戳工作台', '装好邮戳与信件', '校准并盖下第一枚邮戳'],
  tidyTitle: '底座放稳，<br/>印面接好。', tidyHint: '先将邮戳底座装进支架下方，再装上圆形日期环，最后把信封平放到底座上。',
  actionTitle: '转正日期，<br/>印下一声问候。', actionHint: '把日期环调到 30° 的黄铜刻度，再按住木柄。松开的印头下会留下圆形邮戳。', actionLabel: '寄出今天的温柔',
  runningTitle: '一圈邮戳，<br/>记得这一刻。', runningHint: '邮筒、分信柜和邮戳台都准备好了。我们回到邮局看看它们。',
  finishedTitle: '来自海边，<br/>第一封来信。', finishedDescription: '圆形邮戳落在柔软的纸上。<br/>门前收信，柜中分信，案上盖戳——邮局重新有了一个完整的早晨。',
  caption: ['A MARK OF THIS MORNING', 'THE FIRST SEASIDE POSTMARK'],
  operation: { kind: 'tasks', initial: 0, duration: 4, tasks: [
    { id: 'post-stamp-align', name: '把日期环校准到 30°', hint: '转动日期环，使黄铜指针到达 30° 刻度。', mode: 'dial', initial: 0, min: 0, max: 60, target: 30, tolerance: 4, step: 1, unit: '°', label: '印面角度' },
    { id: 'post-stamp-press', name: '慢慢按下邮戳', buttonLabel: '按下木柄盖戳', hint: '按住木柄到印迹完整，印头会抬起，露出海边邮局的圆形邮戳。', mode: 'hold', initial: 0, target: 1, rate: 0.28, requires: ['post-stamp-align'] },
  ] },
  surfaces: [
    { id: 'post-stamp-beam', name: '黄铜横梁', width: 1.35, height: 0.24, weight: 0.3, seed: 3301, completionThreshold: 0.84, material: 'metal', color: '#c0a474', position: [0.45, 1.5, -0.235], rotation: FRONT, camera: { distance: 8.2, height: 3.4, lookY: 1.1, lookZ: -0.2, angle: 0 } },
    { id: 'post-stamp-ink', name: '墨盒盖板', width: 0.88, height: 0.62, weight: 0.4, seed: 3302, completionThreshold: 0.85, material: 'metal', color: '#8fa99c', position: [-1.19, 0.260, -0.03], rotation: TOP, camera: { distance: 8.2, height: 5.6, lookX: -0.4, lookY: 0.45, lookZ: 0, angle: 0.12 } },
    { id: 'post-stamp-wood', name: '靠手木沿', width: 2.63, height: 0.14, weight: 0.3, seed: 3303, completionThreshold: 0.84, material: 'wood', color: '#ba9e76', position: [0, 0.085, 0.681], rotation: FRONT },
  ],
  items: [
    item('post-stamp-foot', '邮戳底座', [-1.40, 0.26, 1.02], [0.45, 0.235, -0.08], [1.18, 0.22, 0.86], { order: 1, hint: '先将沉稳的底座放到黄铜支架下。', marker: { position: [0.45, 0.17, 0.2], radius: 0.28 } }),
    item('post-stamp-ring', '圆形日期环', [-0.12, 0.1, 0.94], [0.45, 1.065, 0.115], [0.55, 0.55, 0.12], { requires: ['post-stamp-foot'], startRotation: TOP, hint: '圆环装在支架前面的圆轴上。', marker: { position: [0.45, 1.065, 0.22], plane: 'front', radius: 0.23 } }),
    item('post-stamp-letter', '等待盖戳的信封', [1.62, 0.06, 0.89], [0.45, 0.366, 0.21], [0.9, 0.035, 0.53], { requires: ['post-stamp-foot'], hint: '信封平放在底座前方的光圈里。', marker: { position: [0.45, 0.361, 0.21], radius: 0.23 } }),
  ],
  obstacles: [
    { half: [1.42, 0.06, 0.7], position: [0, 0.06, -0.03] },
    { half: [0.49, 0.07, 0.37], position: [-1.19, 0.19, -0.03] },
    ...[-0.06, 0.96].map(x => ({ half: [0.065, 0.68, 0.08], position: [x, 0.82, -0.36] })),
  ], cameras: cameras(0.93),
};

export const POST_EARLY_LEVELS = [POST_BOX, POST_SORTER, POST_STAMP];
