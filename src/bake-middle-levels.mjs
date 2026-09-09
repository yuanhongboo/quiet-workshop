const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = { seasonId: 'evening-bakery', sceneFamily: 'bake', inspection: true, revision: 1, room: { custom: true, wall: '#e7ddc9' } };
const cameras = (lookY = 0.9) => ({
  desktop: { default: { distance: 9.2, height: 4.8, lookY, lookZ: 0 }, tidy: { distance: 9.6, height: 5, lookY, lookZ: 0 }, finale: { distance: 8.6, height: 4.7, lookY, lookZ: 0 } },
  mobile: { default: { distance: 18.5, height: 7.1, lookY, lookZ: 0 }, tidy: { distance: 20.1, height: 7.4, lookY, lookZ: 0 }, finale: { distance: 16.3, height: 6.8, lookY, lookZ: 0 } },
});
const item = (id, name, start, slot, size, extra = {}) => ({ id, name, kind: id, start, slot, size, mass: 0.25, collider: 'box', startRotation: FRONT, slotRotation: FRONT, dragHeight: 2.55, snapDistance: 0.6, placementLift: 0.26, marker: { position: [slot[0], slot[1] + 0.04, slot[2]], radius: 0.24 }, ...extra });
const hold = (id, name, buttonLabel, hint, requires = []) => ({ id, name, buttonLabel, hint, mode: 'hold', sound: 'polish', initial: 0, target: 1, rate: 0.3, requires });

export const BAKE_MIXER = {
  ...common, id: 'bake-mixer', number: '04', name: '揉面搅拌机', icon: 'coffee', color: '#b6bba0',
  title: '慢慢搅拌，<br/>揉进晚风。', description: '擦净奶油色机身，把搅拌碗和揉面钩装好。<br/>面团缓缓卷起，变得柔软又光滑。', tags: '搪瓷机身 · 开放金属碗 · 软软面团',
  steps: ['擦净旧搅拌机', '把碗和揉面钩装好', '揉出柔软的面团'], tidyTitle: '小碗落稳，<br/>木柄相接。', tidyHint: '金属碗放到底座圆座，揉面钩接在机头下方，木柄装到左侧转轴。',
  actionTitle: '一圈一圈，<br/>慢慢柔软。', actionHint: '按住旋钮慢慢搅拌，再轻轻折叠碗里的面团，最后松开机臂。', actionLabel: '收好这一团柔软',
  runningTitle: '小小面团，<br/>安静歇一歇。', runningHint: '机臂轻轻抬起，碗里的面团光滑柔软。', finishedTitle: '把温柔，<br/>揉进面团。', finishedDescription: '小碗稳了，面团顺了。<br/>晚风面包房的第一团面，已经准备好。', caption: ['SLOWLY INTO SOMETHING SOFT', 'THE DOUGH MIXER'],
  operation: { kind: 'tasks', initial: 0, duration: 3.7, tasks: [
    hold('mixer-turn', '慢慢转动搅拌机', '慢慢搅拌', '按住左边的绿色旋钮，看揉面钩和软面团一起转动。'),
    hold('mixer-fold', '把面团轻轻折叠', '轻轻折叠', '按住碗里的面团，让边缘慢慢收拢，表面变得平滑。', ['mixer-turn']),
    { id: 'mixer-release', name: '抬起搅拌机臂', hint: '碰一下机臂前面的黄铜扣，让揉面钩离开小碗。', mode: 'tap', initial: 0, target: 1, requires: ['mixer-fold'] },
  ] },
  surfaces: [
    { id: 'mixer-foot', name: '奶油色底座', width: 1.93, height: 0.17, weight: 0.4, seed: 6401, completionThreshold: 0.84, material: 'ceramic', color: '#e8dec7', position: [0, 0.19, 0.678], rotation: FRONT, camera: { distance: 8.9, height: 3.2, lookY: 0.3, lookZ: 0.66, angle: 0 } },
    { id: 'mixer-side', name: '搪瓷机身左侧', width: 0.62, height: 1.1, weight: 0.35, seed: 6402, completionThreshold: 0.84, material: 'ceramic', color: '#e8dec7', position: [-1.027, 1.13, -0.2], rotation: [0, -Math.PI / 2, 0], camera: { distance: 8.8, height: 3.8, lookX: -0.75, lookY: 1.1, lookZ: -0.2, angle: -1.5 } },
    { id: 'mixer-arm-top', name: '机臂顶面', width: 1.47, height: 0.56, weight: 0.25, seed: 6403, completionThreshold: 0.85, material: 'ceramic', color: '#b3b99c', position: [-0.07, 2.076, -0.2], rotation: TOP, camera: { distance: 8.9, height: 7.1, lookY: 1.85, lookZ: -0.2, angle: 0 } },
  ],
  items: [
    item('mixer-bowl', '金属搅拌碗', [1.88, 0.35, 0.73], [0.32, 0.6, -0.05], [1.18, 0.66, 1.18], { order: 1, hint: '把小碗放进底座右边的圆座。', marker: { position: [0.32, 0.39, -0.05], radius: 0.34 } }),
    item('mixer-hook', '黄铜揉面钩', [-1.83, 0.13, 0.76], [0.32, 1.3, -0.05], [0.46, 0.92, 0.31], { order: 2, startRotation: [Math.PI / 2, 0, 0], requires: ['mixer-bowl'], hint: '把细轴接在机头下方的圆孔。', marker: { position: [0.32, 1.61, 0.02], plane: 'front', radius: 0.23 } }),
    item('mixer-crank', '木柄转轴', [-0.06, 0.14, 1.17], [-1.13, 1.15, 0.03], [0.27, 0.47, 0.32], { order: 3, startRotation: [0, 0, Math.PI / 2], hint: '把木柄接到机身左侧的小圆轴。', marker: { position: [-1.13, 1.15, 0.16], plane: 'front', radius: 0.23 } }),
  ],
  obstacles: [{ half: [1.03, 0.12, 0.68], position: [0, 0.17, -0.02] }, { half: [0.23, 0.82, 0.34], position: [-0.79, 1.03, -0.2] }], cameras: cameras(1.05),
};

export const BAKE_DOUGH = {
  ...common, id: 'bake-dough', number: '05', name: '面团工作台', icon: 'desk', color: '#c0a584',
  title: '折起一角，<br/>留下柔软。', description: '擦净木板上的旧粉痕，把小工具摆好。<br/>轻轻折叠、收圆，让面团在掌心慢慢舒展。', tags: '松木面板 · 木制擀杖 · 柔软面团',
  steps: ['擦净面团工作台', '把工具和面团放好', '折叠收圆再舒展'], tidyTitle: '木板干净，<br/>面团落稳。', tidyHint: '刮板靠在左边小架，擀杖放到后面的托座，面团轻轻放在中间。',
  actionTitle: '柔软的事，<br/>慢慢就好。', actionHint: '先把一角折进来，再收成圆圆一团，最后轻轻推开，让面团舒展开。', actionLabel: '留住这份柔软',
  runningTitle: '手心松开，<br/>面团舒展。', runningHint: '没有需要赶上的时间，面团会等你慢慢把它收好。', finishedTitle: '一点力气，<br/>一团温柔。', finishedDescription: '面团折起又舒展，工具各有位置。<br/>木板上留下一份柔软的秩序。', caption: ['FOLD ROUND AND REST', 'THE DOUGH WORKTABLE'],
  operation: { kind: 'tasks', initial: 0, duration: 3.9, tasks: [
    hold('dough-fold', '把面团一角折进来', '轻轻折叠', '按住左边的小刮板，看面团柔软的边缘向内翻起。'),
    hold('dough-round', '收成圆圆一团', '慢慢收圆', '继续轻轻收拢，让折痕慢慢变浅。', ['dough-fold']),
    hold('dough-stretch', '让面团轻轻舒展', '慢慢舒展', '按住后面的擀杖，让圆面团慢慢舒展成柔软的椭圆。', ['dough-round']),
  ] },
  surfaces: [
    { id: 'dough-board', name: '松木面团板', width: 2.68, height: 1.51, weight: 0.65, seed: 6501, completionThreshold: 0.85, material: 'wood', color: '#c9ad80', position: [0, 0.251, -0.08], rotation: TOP, camera: { distance: 8.8, height: 8.4, lookY: 0.3, lookZ: -0.08, angle: 0 } },
    { id: 'dough-apron', name: '木板前沿', width: 2.7, height: 0.14, weight: 0.35, seed: 6502, completionThreshold: 0.84, material: 'wood', color: '#c9ad80', position: [0, 0.155, 0.754], rotation: FRONT, camera: { distance: 8.9, height: 3.3, lookY: 0.3, lookZ: 0.73, angle: 0 } },
  ],
  items: [
    item('dough-scraper', '木柄刮板', [-1.93, 0.12, 0.66], [-1.08, 0.48, 0.18], [0.55, 0.49, 0.09], { order: 1, startRotation: TOP, hint: '让小刮板立在木板左边的托架。', marker: { position: [-1.08, 0.39, 0.3], plane: 'front', radius: 0.23 } }),
    item('dough-roller', '木制擀杖', [1.95, 0.14, 0.45], [0, 0.43, -0.69], [1.38, 0.25, 0.25], { order: 2, startRotation: [0, Math.PI / 2, 0], hint: '把擀杖横放在木板后边的一对托座上。', marker: { position: [0, 0.43, -0.67], radius: 0.27 } }),
    item('dough-piece', '柔软面团', [-1.94, 0.23, -0.48], [0.13, 0.48, 0.03], [0.83, 0.46, 0.69], { order: 3, hint: '把软软的面团放到木板中央。', marker: { position: [0.13, 0.27, 0.03], radius: 0.3 } }),
  ],
  obstacles: [{ half: [1.4, 0.11, 0.81], position: [0, 0.13, -0.08] }], cameras: cameras(0.65),
};

export const BAKE_PROOF = {
  ...common, id: 'bake-proof', number: '06', name: '发酵藤篮', icon: 'plant', color: '#bba279',
  title: '盖一层布，<br/>藏一团期待。', description: '擦净小藤篮，铺好亚麻布。<br/>陪面团鼓起来，再揭开一份蓬松的惊喜。', tags: '手编藤篮 · 亚麻盖布 · 鼓起来的面团',
  steps: ['擦净藤篮与布沿', '把衬布面团放好', '盖好再轻轻揭开'], tidyTitle: '亚麻铺好，<br/>面团安睡。', tidyHint: '亚麻布放到藤篮后沿，面团放在篮子中央，小木牌挂在右前方。',
  actionTitle: '软软盖上，<br/>轻轻长大。', actionHint: '先盖好亚麻布，按住藤篮前沿陪面团鼓起，再慢慢揭开盖布。', actionLabel: '收好这一篮期待',
  runningTitle: '布角掀起，<br/>期待鼓起。', runningHint: '面团把亚麻布轻轻顶起，现在变得蓬松又饱满。', finishedTitle: '小小藤篮，<br/>装满期待。', finishedDescription: '亚麻布掀开，圆面团鼓得刚刚好。<br/>下一章，晚风会捎来面包的香气。', caption: ['A BASKET FULL OF EXPECTATION', 'THE PROOFING BASKET'],
  operation: { kind: 'tasks', initial: 0, duration: 4, tasks: [
    hold('proof-cover', '盖好亚麻布', '轻轻盖好', '按住篮子后沿的亚麻布，让它轻轻落在面团上。'),
    hold('proof-grow', '陪面团慢慢鼓起', '陪面团鼓起', '按住藤篮前面的木牌，看亚麻布被面团一点点顶起。', ['proof-cover']),
    hold('proof-uncover', '揭开蓬松的惊喜', '慢慢揭开', '轻轻掀起亚麻布，看圆面团蓬松地留在篮子里。', ['proof-grow']),
  ] },
  surfaces: [
    { id: 'proof-wicker', name: '藤篮前沿', width: 1.75, height: 0.34, weight: 0.6, seed: 6601, completionThreshold: 0.85, material: 'bamboo', color: '#ba9a67', position: [0, 0.42, 0.692], rotation: FRONT, camera: { distance: 8.8, height: 3.7, lookY: 0.6, lookZ: 0.66, angle: 0 } },
    { id: 'proof-linen', name: '亚麻布篮沿', width: 1.76, height: 0.24, weight: 0.4, seed: 6602, completionThreshold: 0.85, material: 'linen', color: '#e3dcc8', position: [0, 0.681, -0.59], rotation: TOP, camera: { distance: 8.9, height: 7.8, lookY: 0.6, lookZ: -0.59, angle: 0 } },
  ],
  items: [
    item('proof-cloth', '亚麻盖布', [-1.86, 0.12, 0.65], [0, 0.73, -0.59], [0.74, 0.12, 0.68], { order: 1, hint: '把叠好的亚麻布放到藤篮后沿。', marker: { position: [0, 0.72, -0.57], radius: 0.26 } }),
    item('proof-dough', '圆面团', [0, 0.23, 1.17], [0, 0.54, -0.04], [0.82, 0.44, 0.72], { order: 2, requires: ['proof-cloth'], hint: '把面团轻轻放进铺好衬布的篮子。', marker: { position: [0, 0.37, -0.04], radius: 0.3 } }),
    item('proof-tag', '小木牌', [1.87, 0.06, 0.82], [0.78, 0.36, 0.71], [0.36, 0.27, 0.07], { order: 3, startRotation: TOP, hint: '把写着期待的小木牌挂在藤篮右前方。', marker: { position: [0.78, 0.36, 0.74], plane: 'front', radius: 0.2 } }),
  ],
  obstacles: [{ half: [1.04, 0.11, 0.78], position: [0, 0.13, -0.04] }, { half: [0.97, 0.2, 0.06], position: [0, 0.43, 0.59] }, { half: [0.97, 0.2, 0.06], position: [0, 0.43, -0.68] }], cameras: cameras(0.73),
};
export const BAKE_MIDDLE_LEVELS = [BAKE_MIXER, BAKE_DOUGH, BAKE_PROOF];
