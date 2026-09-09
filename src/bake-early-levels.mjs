const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = { seasonId: 'evening-bakery', sceneFamily: 'bake', inspection: true, revision: 1, room: { custom: true, wall: '#ece0d0' } };
const cameras = (lookY = 0.9) => ({
  desktop: { default: { distance: 8.8, height: 4.6, lookY, lookZ: 0 }, tidy: { distance: 9.2, height: 5.2, lookY, lookZ: 0.15 }, finale: { distance: 8.8, height: 4.6, lookY, lookZ: 0 } },
  mobile: { default: { distance: 18.8, height: 8.5, lookY, lookZ: 0 }, tidy: { distance: 20.3, height: 9.4, lookY, lookZ: 0.15 }, finale: { distance: 18.8, height: 8.5, lookY, lookZ: 0 } },
});
const item = (id, name, start, slot, size, extra = {}) => ({ id, name, kind: id, start, slot, size, mass: 0.22, collider: 'box', startRotation: FRONT, slotRotation: FRONT, dragHeight: 2.6, snapDistance: 0.52, placementLift: 0.18, marker: { position: [slot[0], slot[1] + 0.06, slot[2]], radius: 0.23 }, ...extra });
const hold = (id, name, requires, hint, extra = {}) => ({ id, name, mode: 'hold', initial: 0, target: 1, rate: 0.29, requires, buttonLabel: name, hint, sound: 'polish', ...extra });
export const BAKE_OVEN = {
  ...common, id: 'bake-oven', number: '01', name: '旧烤箱', icon: 'oven', color: '#bb8269',
  title: '留一盏灯，<br/>等面包出炉。', description: '擦净搪瓷与玻璃，装回烤架和木柄。<br/>给旧合页一点润滑，让暖灯重新亮起来。',
  tags: '奶油搪瓷 · 木柄炉门 · 暖色炉灯', steps: ['擦净烤箱', '装回烤架与把手', '润滑合页并点亮炉灯'],
  tidyTitle: '一副烤架，<br/>一只温润木柄。', tidyHint: '烤架沿门后的浅槽推入，木柄接在玻璃上方，绿色旋钮装到右上角。',
  actionTitle: '旧炉门，<br/>又轻轻合上了。', actionHint: '先润滑右侧合页，再合上炉门，最后轻触绿色旋钮，点亮暖色炉灯。', actionLabel: '为晚风留一盏暖灯',
  runningTitle: '玻璃后面，<br/>亮起一点暖色。', runningHint: '旧烤箱修好了，面包房的第一盏灯正等着晚归的人。',
  finishedTitle: '小小炉灯，<br/>照亮晚归的路。', finishedDescription: '搪瓷恢复了柔和的光泽，木柄稳稳贴合。<br/>合上的玻璃门后，暖灯安静地亮着。', caption: ['A WARM LIGHT IN THE EVENING', 'THE OLD BAKERY OVEN'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    hold('bake-oven-oil', '慢慢润滑炉门合页', [], '按住右侧黄铜合页，让干涩的小白痕逐渐消失。'),
    { id: 'bake-oven-close', name: '轻轻合上炉门', mode: 'tap', initial: 0, target: 1, requires: ['bake-oven-oil'], hint: '点一下木把手，让炉门稳稳合回门框。' },
    { id: 'bake-oven-light', name: '点亮烤箱暖灯', mode: 'tap', initial: 0, target: 1, requires: ['bake-oven-close'], hint: '点一下右上方绿色旋钮，看玻璃后面亮起暖色。' },
  ] },
  surfaces: [
    { id: 'bake-oven-enamel', name: '奶油搪瓷顶板', width: 1.98, height: 0.86, weight: 0.45, seed: 6101, completionThreshold: 0.84, material: 'ceramic', color: '#e6d9be', position: [0, 1.826, -0.07], rotation: TOP, camera: { distance: 8.8, height: 8.6, lookY: 1.4, lookZ: 0, angle: 0 } },
    { id: 'bake-oven-glass', name: '炉门玻璃', width: 1.47, height: 0.77, weight: 0.55, seed: 6102, completionThreshold: 0.84, material: 'ceramic', color: '#b4b6a5', position: [0, 0.91, 0.675], rotation: FRONT, camera: { distance: 8.8, height: 3.7, lookY: 0.9, lookZ: 0.8, angle: 0 } },
  ],
  items: [
    item('bake-oven-rack', '细杆烤架', [-1.80, 0.06, 0.24], [0, 0.74, 0], [1.60, 0.08, 0.85], { startRotation: [0, Math.PI / 2, 0], hint: '把烤架放进玻璃门后的两条浅槽。', marker: { position: [0, 0.75, 0.46], radius: 0.25 } }),
    item('bake-oven-handle', '山毛榉木把手', [0, 0.09, 1.25], [0, 1.51, 0.79], [1.17, 0.15, 0.23], { hint: '将木把手接到玻璃上方的两枚黄铜座。', marker: { position: [0, 1.51, 0.89], plane: 'front', radius: 0.23 } }),
    item('bake-oven-knob', '鼠尾草绿旋钮', [1.75, 0.12, 0.64], [0.78, 1.58, 0.624], [0.29, 0.29, 0.16], { startRotation: TOP, hint: '把绿色旋钮装到右上角的小圆轴。', marker: { position: [0.78, 1.58, 0.75], plane: 'front', radius: 0.20 } }),
  ], obstacles: [{ half: [1.08, 0.10, 0.65], position: [0, 0.19, -0.04] }, { half: [1.07, 0.76, 0.08], position: [0, 1.01, -0.59] }, ...[-1.01, 1.01].map(x => ({ half: [0.07, 0.77, 0.59], position: [x, 1.01, -0.02] })), { half: [1.08, 0.06, 0.62], position: [0, 1.76, -0.04] }], cameras: cameras(1.0),
};
export const BAKE_MILL = {
  ...common, id: 'bake-mill', number: '02', name: '手摇磨粉机', icon: 'mill', color: '#bf9d6f',
  title: '转动一圈，<br/>麦香近一点。', description: '擦净木箱与磨盘，接上漏斗和曲柄。<br/>缓缓摇动，细面粉会积进下方的小木盒。',
  tags: '松木磨粉机 · 手摇曲柄 · 麦粒变细粉', steps: ['擦净磨粉机', '装好漏斗与曲柄', '摇动磨盘并收好面粉'],
  tidyTitle: '一把麦粒，<br/>等一个慢动作。', tidyHint: '漏斗装进顶部圆口，曲柄套在前方圆轴，小木盒推入底下的方槽。',
  actionTitle: '麦粒落下，<br/>细粉慢慢积起。', actionHint: '按实磨盘扣，按住曲柄缓缓研磨，最后拉出盛着面粉的小木盒。', actionLabel: '收下这一盒麦香',
  runningTitle: '轻轻摇，<br/>一盒细粉刚刚好。', runningHint: '磨粉机重新转动起来，下一关用小秤把面粉分好。',
  finishedTitle: '木盒拉开，<br/>麦香留了下来。', finishedDescription: '漏斗里的麦粒慢慢少了，木盒里的细粉一点点堆高。<br/>握过的曲柄还带着手心的温度。', caption: ['A TURN OF THE HANDLE', 'THE HAND CRANK FLOUR MILL'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'bake-mill-latch', name: '按实磨盘黄铜扣', mode: 'tap', initial: 0, target: 1, hint: '点一下磨盘右侧的小铜扣，让磨盘稳稳咬合。' },
    hold('bake-mill-grind', '缓缓转动手摇曲柄', ['bake-mill-latch'], '按住曲柄，看麦粒减少，细粉沿小槽落进木盒。', { rate: 0.23 }),
    { id: 'bake-mill-drawer', name: '拉出盛粉的小木盒', mode: 'tap', initial: 0, target: 1, requires: ['bake-mill-grind'], hint: '点一下木盒前方的小圆钮，拉出刚磨好的面粉。' },
  ] },
  surfaces: [
    { id: 'bake-mill-wood', name: '松木箱前沿', width: 1.39, height: 0.19, weight: 0.45, seed: 6201, completionThreshold: 0.83, material: 'wood', color: '#c3a373', position: [0, 0.665, 0.598], rotation: FRONT, camera: { distance: 8.5, height: 3.7, lookY: 0.65, lookZ: 0.5, angle: 0 } },
    { id: 'bake-mill-plate', name: '磨盘奶油面板', width: 1.13, height: 0.74, weight: 0.55, seed: 6202, completionThreshold: 0.84, material: 'ceramic', color: '#e2d3b4', position: [0, 1.20, 0.471], rotation: FRONT, camera: { distance: 8.8, height: 3.8, lookY: 1.2, lookZ: 0.5, angle: 0 } },
  ],
  items: [
    item('bake-mill-hopper', '盛着麦粒的漏斗', [-1.65, 0.39, 0.23], [0, 1.94, -0.04], [0.91, 0.66, 0.91], { hint: '把漏斗细口放进磨粉机顶上的圆口。', marker: { position: [0, 1.69, -0.04], radius: 0.23 } }),
    item('bake-mill-crank', '圆头木曲柄', [1.71, 0.12, 0.19], [0, 1.20, 0.59], [0.96, 0.23, 0.25], { hint: '将曲柄左侧的铜轴套在磨盘中央。', marker: { position: [0, 1.20, 0.72], plane: 'front', radius: 0.23 } }),
    item('bake-mill-drawer', '盛粉的小木盒', [0.30, 0.16, 1.20], [0, 0.24, 0.29], [1.00, 0.28, 0.72], { hint: '把木盒推入松木箱底下的方形开口。' }),
  ], obstacles: [{ half: [0.79, 0.075, 0.67], position: [0, 0.075, -0.04] }, ...[-0.68, 0.68].map(x => ({ half: [0.075, 0.24, 0.54], position: [x, 0.39, -0.06] })), { half: [0.77, 0.10, 0.65], position: [0, 0.66, -0.06] }, { half: [0.59, 0.42, 0.45], position: [0, 1.19, -0.04] }], cameras: cameras(1.05),
};
export const BAKE_SCALE = {
  ...common, id: 'bake-scale', number: '03', name: '烘焙小秤', icon: 'scale', color: '#94a68b',
  title: '留一份刚好，<br/>给今晚的面包。', description: '擦净秤盘托与表面，放好铜砝码和纸袋。<br/>让指针归零，再装一份松软的面粉。',
  tags: '复古小秤 · 指针归零 · 面粉分装', steps: ['擦净小秤', '放好秤盘与纸袋', '归零、分装与轻轻收口'],
  tidyTitle: '小秤放稳，<br/>纸袋张开。', tidyHint: '宽秤盘放在顶部圆托，铜砝码放进左侧小窝，米白纸袋放在秤盘中央。',
  actionTitle: '指针停稳，<br/>刚刚好的一份。', actionHint: '轻轻转动归零钮，按住慢慢装粉，最后点一下纸袋把开口折好。', actionLabel: '收好面包房第一份面粉',
  runningTitle: '分好的一份，<br/>准备开始揉面。', runningHint: '烤箱、磨粉机和小秤都已修好。回面包房，看看第一章的变化。',
  finishedTitle: '不多不少，<br/>是安心的一份。', finishedDescription: '指针安稳停下，纸袋封口压出一条整齐折痕。<br/>这一份面粉，已经准备好变成柔软的面包。', caption: ['A LITTLE FLOUR, JUST ENOUGH', 'THE BAKERY BALANCE'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'bake-scale-zero', name: '让小秤指针归零', mode: 'dial', initial: -16, min: -24, max: 24, target: 0, step: 1, tolerance: 4, unit: '°', label: '归零旋钮', hint: '把旋钮缓缓转到 0°，指针会跟着回到中间。' },
    hold('bake-scale-fill', '慢慢装入一份面粉', ['bake-scale-zero'], '按住装粉，纸袋逐渐鼓起，指针也会跟着轻轻摆动。', { rate: 0.26 }),
    { id: 'bake-scale-fold', name: '折好纸袋的开口', mode: 'tap', initial: 0, target: 1, requires: ['bake-scale-fill'], hint: '点一下纸袋，将袋口折平，留住这一份细粉。' },
  ] },
  surfaces: [
    { id: 'bake-scale-face', name: '小秤米白表面', width: 1.00, height: 0.73, weight: 0.6, seed: 6301, completionThreshold: 0.84, material: 'ceramic', color: '#ede4d0', position: [0, 0.91, 0.442], rotation: FRONT, camera: { distance: 8.6, height: 3.5, lookY: 0.92, lookZ: 0.5, angle: 0 } },
    { id: 'bake-scale-plinth', name: '秤座前方托盘', width: 1.88, height: 0.25, weight: 0.4, seed: 6302, completionThreshold: 0.83, material: 'ceramic', color: '#8fa18b', position: [0, 0.17, 0.62], rotation: TOP, camera: { distance: 8.8, height: 7.2, lookY: 0.3, lookZ: 0.7, angle: 0 } },
  ],
  items: [
    item('bake-scale-pan', '浅口黄铜秤盘', [-1.78, 0.12, 0.22], [0, 1.58, -0.03], [1.47, 0.20, 1.08], { startRotation: [0, Math.PI / 2, 0], hint: '把秤盘放到机身顶部的圆托上。' }),
    item('bake-scale-weight', '黄铜小砝码', [2.18, 0.18, 0.23], [-0.76, 0.29, 0.50], [0.28, 0.29, 0.28], { hint: '把小砝码放进左侧的浅圆窝。' }),
    item('bake-scale-bag', '敞口面粉纸袋', [1.69, 0.34, 0.98], [0, 1.98, -0.04], [0.61, 0.66, 0.45], { requires: ['bake-scale-pan'], hint: '先装好秤盘，再把纸袋放在盘中央。', marker: { position: [0, 1.74, -0.04], radius: 0.22 } }),
  ], obstacles: [{ half: [1.02, 0.08, 0.71], position: [0, 0.08, 0.03] }, { half: [0.61, 0.56, 0.37], position: [0, 0.74, -0.01] }, { half: [0.095, 0.18, 0.095], position: [0, 1.41, -0.03] }], cameras: cameras(1.05),
};
export const BAKE_EARLY_LEVELS = [BAKE_OVEN, BAKE_MILL, BAKE_SCALE];
