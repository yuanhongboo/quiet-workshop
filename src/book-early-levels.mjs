const FRONT = [0, 0, 0];
const TOP = [-Math.PI / 2, 0, 0];
const common = { seasonId: 'hillside-library', sceneFamily: 'book', inspection: true, revision: 1, room: { custom: true, wall: '#e8e6da' } };
const cameras = (lookY = 0.65, height = 6.4) => ({
  desktop: { default: { distance: 8.2, height, lookY, lookZ: 0 }, tidy: { distance: 8.8, height: 6.5, lookY, lookZ: 0 }, finale: { distance: 8.2, height, lookY, lookZ: 0 } },
  mobile: { default: { distance: 16.8, height: height + 3, lookY, lookZ: 0 }, tidy: { distance: 18.2, height: 10.2, lookY, lookZ: 0 }, finale: { distance: 17.2, height: height + 3, lookY, lookZ: 0 } },
});
const item = (id, name, start, slot, size, extra = {}) => ({ id, name, kind: id, start, slot, size, mass: 0.2, collider: 'box', startRotation: FRONT, slotRotation: FRONT, dragHeight: 2.4, snapDistance: 0.5, placementLift: 0.2, marker: { position: [slot[0], slot[1] + 0.07, slot[2]], radius: 0.22 }, ...extra });
const hold = (id, name, requires, hint, extra = {}) => ({ id, name, mode: 'hold', initial: 0, target: 1, rate: 0.30, requires, buttonLabel: name, hint, sound: 'polish', ...extra });
export const BOOK_COVER = {
  ...common, id: 'book-cover', number: '01', name: '旧绘本', icon: 'book', color: '#899e86',
  title: '翻开一页，<br/>山风住了进来。', description: '擦去布面上的薄灰，补好磨损的书角。<br/>摊平一道折痕，再翻开这本旧绘本。',
  tags: '布面书封 · 修补书角 · 轻轻翻开', steps: ['擦净书封与书口', '补回书角与书签', '抚平折痕并翻开'],
  tidyTitle: '一枚书角，<br/>一张旧书签。', tidyHint: '铜书角贴在封面的右前角，米白书签放进封面的浅框里。',
  actionTitle: '一道折痕，<br/>慢慢平了。', actionHint: '先按实修补的书角，再沿布面抚平折痕，最后轻轻翻开封面。', actionLabel: '翻开山风里的故事',
  runningTitle: '一页山丘，<br/>一页晴天。', runningHint: '绘本已经修好，稍后会放在阅览室的书架上。',
  finishedTitle: '故事还在，<br/>等你接着读。', finishedDescription: '松开的书角重新贴合，布面的折痕也柔和了。<br/>翻开的第一页，是一条通往山上阅览室的小路。', caption: ['WHEN THE WIND OPENS A PAGE', 'THE OLD PICTURE BOOK'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    { id: 'book-cover-corner', name: '按实修补的书角', mode: 'tap', initial: 0, target: 1, hint: '点一下右前角的黄铜书角，让它稳稳贴住封面。' },
    hold('book-cover-smooth', '顺着布面抚平折痕', ['book-cover-corner'], '按住慢慢抚平，浅白的折痕会沿着布纹消失。'),
    { id: 'book-cover-open', name: '轻轻翻开封面', mode: 'tap', initial: 0, target: 1, requires: ['book-cover-smooth'], hint: '点一下修好的封面，看第一页的山丘露出来。' },
  ] },
  surfaces: [
    { id: 'book-cover-cloth', name: '鼠尾草布面书封', width: 1.74, height: 1.84, weight: 0.73, seed: 5101, completionThreshold: 0.85, material: 'linen', color: '#91a188', position: [0.22, 0.357, -0.03], rotation: TOP, camera: { distance: 8.2, height: 8.6, lookY: 0.25, lookZ: -0.03, angle: 0 } },
    { id: 'book-cover-edge', name: '米白书口', width: 1.72, height: 0.17, weight: 0.27, seed: 5102, completionThreshold: 0.83, material: 'linen', color: '#e9dfc7', position: [0.22, 0.217, 0.898], rotation: FRONT, camera: { distance: 8.4, height: 3.4, lookY: 0.20, lookZ: 0.7, angle: 0 } },
  ],
  items: [
    item('book-cover-brass', '黄铜护书角', [1.65, 0.045, 0.63], [1.015, 0.376, 0.80], [0.27, 0.045, 0.27], { hint: '将护书角贴到封面的右前角。' }),
    item('book-cover-label', '山风绘本书签', [-1.56, 0.038, 0.45], [0.23, 0.378, -0.22], [0.78, 0.035, 0.68], { hint: '把米白书签放进书封中央偏上的浅框。' }),
  ], obstacles: [{ half: [0.93, 0.17, 0.98], position: [0.22, 0.17, -0.03] }], cameras: cameras(0.45, 7.2),
};
export const BOOK_BINDING = {
  ...common, id: 'book-binding', number: '02', name: '装订工作台', icon: 'desk', color: '#ad837a',
  title: '散开的页，<br/>又有了依靠。', description: '擦净亚麻垫，放好书帖与线轴。<br/>用一根细线，把松散的纸页连起来。',
  tags: '亚麻工作垫 · 穿线装订 · 收好线结', steps: ['擦净工作台', '放好书帖与装订工具', '穿线、收尾与打结'],
  tidyTitle: '纸页排齐，<br/>细线就位。', tidyHint: '书帖放进中间的浅槽，线轴套在左后方短轴，木夹装到右侧。',
  actionTitle: '一针一线，<br/>连成一本书。', actionHint: '按住穿线，看赭红细线逐孔连起来，剪齐线尾，再慢慢收紧线结。', actionLabel: '收好这一册书页',
  runningTitle: '细线收紧，<br/>纸页安稳。', runningHint: '这册装好的书页，将接着送到木制压书机里。',
  finishedTitle: '一页接一页，<br/>故事连起来了。', finishedDescription: '赭红的细线穿过书脊，留下整齐的针脚。<br/>松散的纸张，现在可以一起翻动了。', caption: ['A THREAD BETWEEN THE PAGES', 'THE BINDING WORKBENCH'],
  operation: { kind: 'tasks', initial: 0, duration: 3.8, tasks: [
    hold('book-binding-stitch', '沿书脊慢慢穿线', [], '按住穿线，看六段赭红针脚依次穿过小孔。', { rate: 0.25 }),
    { id: 'book-binding-trim', name: '剪齐多余的线尾', mode: 'tap', initial: 0, target: 1, requires: ['book-binding-stitch'], hint: '点一下书脊前端的长线尾，让多余的细线整齐落下。' },
    hold('book-binding-knot', '慢慢收紧线结', ['book-binding-trim'], '按住收线，看小线圈逐渐收成一个稳妥的结。'),
  ] },
  surfaces: [
    { id: 'book-binding-linen', name: '后侧亚麻垫', width: 2.04, height: 0.27, weight: 0.58, seed: 5201, completionThreshold: 0.83, material: 'linen', color: '#dad2bb', position: [0, 0.167, -0.66], rotation: TOP, camera: { distance: 8.4, height: 9, lookY: 0.16, lookZ: -0.4, angle: 0 } },
    { id: 'book-binding-front', name: '工作板前沿', width: 2.27, height: 0.14, weight: 0.42, seed: 5202, completionThreshold: 0.83, material: 'wood', color: '#ba9f79', position: [0, 0.081, 0.814], rotation: FRONT, camera: { distance: 8.4, height: 3.4, lookY: 0.3, lookZ: 0.6, angle: 0 } },
  ],
  items: [
    item('book-binding-pages', '待装订书帖', [-1.70, 0.12, 0.1], [0, 0.275, 0.06], [1.26, 0.19, 1.12], { hint: '将书帖放进工作垫中央的浅槽。' }),
    item('book-binding-spool', '赭红装订线轴', [1.72, 0.18, 0.05], [-0.91, 0.36, -0.43], [0.33, 0.37, 0.33], { hint: '把线轴套在左后方的黄铜短轴上。' }),
    item('book-binding-clamp', '黄铜头木夹', [1.54, 0.10, 0.96], [0.90, 0.27, 0.24], [0.33, 0.19, 0.79], { hint: '把木夹放到书帖右侧，压稳纸页边缘。' }),
  ], obstacles: [{ half: [1.18, 0.075, 0.83], position: [0, 0.075, -0.02] }], cameras: cameras(0.42, 7.5),
};
export const BOOK_PRESS = {
  ...common, id: 'book-press', number: '03', name: '木制压书机', icon: 'press', color: '#b59d78',
  title: '让纸页，<br/>安静地平整。', description: '擦净旧木架，装回压板与横柄。<br/>轻轻转动螺杆，把卷起的纸页慢慢压平。',
  tags: '木制螺旋压机 · 抚平卷页 · 松开取书', steps: ['擦净压书机', '装好压板、书册与横柄', '转动螺杆并压平纸页'],
  tidyTitle: '一本书，<br/>躺在木架中。', tidyHint: '厚木压板接到中间螺杆，待压书册放在底座，再装上顶部的横柄。',
  actionTitle: '缓缓向下，<br/>纸页平展。', actionHint: '转到半圈，让螺杆啮合，再按住横柄慢慢压平，最后松开取出书册。', actionLabel: '把书送回阅览室',
  runningTitle: '木架松开，<br/>纸页有了秩序。', runningHint: '绘本、针脚与压书机已经修好。回阅览室，看看这一章留下的变化。',
  finishedTitle: '平整的一册，<br/>等下一次翻阅。', finishedDescription: '卷起的纸角缓缓伏下，松开的压板露出整齐书口。<br/>这本修好的小书，已经准备好回到书架。', caption: ['A QUIET PRESS FOR CURLING PAGES', 'THE WOODEN BOOK PRESS'],
  operation: { kind: 'tasks', initial: 0, duration: 4, tasks: [
    { id: 'book-press-turn', name: '转动横柄半圈', mode: 'dial', initial: 0, min: 0, max: 180, target: 180, step: 3, tolerance: 6, unit: '°', label: '横柄角度', hint: '把横柄缓缓转到 180°，让螺杆咬合木架。' },
    hold('book-press-flatten', '慢慢压平卷起的纸页', ['book-press-turn'], '按住横柄，看木压板下降，书页弯起的边缘逐渐伏平。', { rate: 0.25 }),
    { id: 'book-press-release', name: '松开木压板', mode: 'tap', initial: 0, target: 1, requires: ['book-press-flatten'], hint: '点一下顶部横柄，抬起压板，露出平整的小书。' },
  ] },
  surfaces: [
    { id: 'book-press-beam', name: '上横梁前沿', width: 2.13, height: 0.23, weight: 0.55, seed: 5301, completionThreshold: 0.84, material: 'wood', color: '#b99a6f', position: [0, 1.76, 0.026], rotation: FRONT, camera: { distance: 8.6, height: 4, lookY: 1.65, lookZ: 0, angle: 0 } },
    { id: 'book-press-base', name: '木底座前沿', width: 2.28, height: 0.19, weight: 0.45, seed: 5302, completionThreshold: 0.83, material: 'wood', color: '#b99a6f', position: [0, 0.12, 0.752], rotation: FRONT, camera: { distance: 8.6, height: 3.8, lookY: 0.3, lookZ: 0.7, angle: 0 } },
  ],
  items: [
    item('book-press-platen', '厚木压板', [-1.84, 0.12, -0.16], [0, 1.12, -0.05], [1.42, 0.18, 1.13], { startRotation: [0, Math.PI / 2, 0], hint: '把厚木压板接到中间螺杆的下端。' }),
    item('book-press-pages', '卷角的小书', [-1.50, 0.12, 1.00], [0, 0.33, 0.09], [1.24, 0.15, 1.04], { hint: '将小书平放在木底座正中。' }),
    item('book-press-handle', '圆头木横柄', [1.93, 0.10, 0.18], [0, 2.06, -0.20], [1.51, 0.16, 0.16], { startRotation: [0, Math.PI / 2, 0], hint: '把木横柄穿过螺杆顶部的圆孔。', marker: { position: [0, 2.1, -0.10], plane: 'front', radius: 0.24 } }),
  ], obstacles: [{ half: [1.2, 0.12, 0.79], position: [0, 0.12, -0.04] }, ...[-0.98, 0.98].map(x => ({ half: [0.095, 0.84, 0.1], position: [x, 1.01, -0.22] })), { half: [1.14, 0.14, 0.24], position: [0, 1.76, -0.22] }], cameras: cameras(1.05, 4.7),
};
BOOK_COVER.cameras.mobile.default.lookX = -0.55;
BOOK_COVER.cameras.mobile.finale.lookX = -0.55;
BOOK_COVER.cameras.desktop.finale.lookX = -0.55;
BOOK_PRESS.cameras.mobile.default = { distance: 20.5, height: 11.7, lookY: 1.05, lookZ: 0 };
BOOK_PRESS.cameras.mobile.tidy = { distance: 20.5, height: 11.7, lookY: 1.05, lookZ: 0 };
export const BOOK_EARLY_LEVELS = [BOOK_COVER, BOOK_BINDING, BOOK_PRESS];
