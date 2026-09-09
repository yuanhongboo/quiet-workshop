const flat = [-Math.PI / 2, 0, 0];
const base = { seasonId: 'mountain-station', sceneFamily: 'station', inspection: true, revision: 1, room: { custom: true, wall: '#d8ded0' } };
const cameras = {
  desktop: { default: { distance: 9.4, height: 4.4, lookY: 0.6, lookZ: 0 }, tidy: { distance: 10.8, height: 5, lookY: 0.65, lookZ: 0.1 }, finale: { distance: 8.8, height: 3.8, lookY: 0.7, lookZ: 0 } },
  mobile: { default: { distance: 16.8, height: 7.7, lookY: 0.6, lookZ: 0 }, tidy: { distance: 19.1, height: 8.3, lookY: 0.6, lookZ: 0.1 }, finale: { distance: 16.4, height: 6.7, lookY: 0.7, lookZ: 0 } },
};
export const STATION_TRACK = {
  ...base, id: 'station-track', number: '07', name: '林间轨道', icon: 'track', color: '#9a9c81',
  title: '顺着轨道，<br/>慢慢回家。',
  description: '林间的小轨道蒙上了尘土，岔道也有些生涩。<br/>接好钢轨、拧紧连接处，让回家的路重新连起来。',
  tags: '枕木清洁 · 钢轨拼接 · 岔道切换',
  steps: ['擦净枕木和钢轨', '接好轨道与手柄', '拧紧、润滑与转辙'],
  tidyTitle: '一段一段，<br/>把路接好。', tidyHint: '把两段钢轨接回空位，再装上圆头转辙手柄。',
  actionTitle: '轨道顺了，<br/>路也通了。', actionHint: '按住拧紧接头、润滑转轴，再转动手柄，让岔道慢慢合拢。', actionLabel: '轨道接好了',
  runningTitle: '咔哒一声，<br/>接上了远方。', runningHint: '两根钢轨平顺地接在一起，指示牌转向了山间小站。',
  finishedTitle: '回家的路，<br/>已经接好了。', finishedDescription: '干净的枕木、光亮的钢轨和顺滑的岔道。<br/>这段轨道会铺在小站门前，等一辆小火车回来。',
  caption: ['A PATH THROUGH THE PINES', 'THE WOODLAND TRACK'],
  operation: { kind: 'tasks', initial: 0, duration: 4.8, tasks: [
    { id: 'track-tighten', name: '拧紧轨道接头', hint: '按住黄铜扳手，把两段钢轨稳稳接好。', buttonLabel: '拧紧接头', mode: 'hold', initial: 0, target: 1, rate: 0.32 },
    { id: 'track-oil', name: '润滑转辙轴', sound: 'polish', hint: '给手柄底部的转轴添一点润滑油。', buttonLabel: '润滑转轴', mode: 'hold', initial: 0, target: 1, rate: 0.35, requires: ['track-tighten'] },
    { id: 'track-switch', name: '把岔道接向小站', hint: '转动手柄到 60° 附近，尖轨会慢慢靠向站台。', mode: 'dial', initial: 0, min: 0, max: 90, target: 60, tolerance: 5, step: 1, unit: '°', label: '转辙角度', requires: ['track-oil'] },
  ] },
  surfaces: [
    { id: 'track-timber', name: '枕木前沿', width: 2.78, height: 0.17, weight: 0.4, seed: 4701, completionThreshold: 0.85, material: 'wood', color: '#aa8d6a', position: [0.24, 0.105, 0.416], rotation: [0, 0, 0], camera: { distance: 8.8, height: 2.1, lookX: 0.24, lookY: 0.1, lookZ: 0.41 } },
    { id: 'track-steel', name: '钢轨侧面', width: 1.08, height: 0.15, weight: 0.35, seed: 4702, completionThreshold: 0.85, material: 'metal', color: '#aeb9ad', position: [-0.71, 0.275, 0.164], rotation: [0, 0, 0], camera: { distance: 8.5, height: 2.4, lookX: -0.71, lookY: 0.27, lookZ: 0.16 } },
    { id: 'track-housing', name: '转辙器外壳', width: 0.44, height: 0.25, weight: 0.25, seed: 4703, completionThreshold: 0.84, material: 'metal', color: '#718877', position: [-1.47, 0.285, 0.797], rotation: [0, 0, 0], camera: { distance: 8.2, height: 2.2, lookX: -1.47, lookY: 0.29, lookZ: 0.8 } },
  ],
  items: [
    { id: 'track-front-rail', kind: 'station-rail', name: '近侧钢轨', hint: '沿着前排枕木，把钢轨接到发光的空位。', mass: 0.24, size: [1.36, 0.16, 0.13], start: [-1.15, 0.13, 1.11], slot: [0.95, 0.275, 0.09], dragHeight: 0.85, collider: 'box', marker: { position: [0.95, 0.23, 0.09], radius: 0.29 }, slotRotation: [0, 0, 0] },
    { id: 'track-rear-rail', kind: 'station-rail', name: '远侧钢轨', hint: '前面的钢轨接好后，再把另一段平行放好。', mass: 0.24, size: [1.36, 0.16, 0.13], start: [1.2, 0.13, 1.11], slot: [0.95, 0.275, -0.49], dragHeight: 0.85, collider: 'box', requires: ['track-front-rail'], marker: { position: [0.95, 0.23, -0.49], radius: 0.29 }, slotRotation: [0, 0, 0] },
    { id: 'track-lever', kind: 'station-lever', name: '转辙手柄', hint: '把圆头手柄插进绿色转辙器的小圆座。', mass: 0.2, size: [0.22, 0.57, 0.22], start: [0.02, 0.15, 1.08], startRotation: flat, slot: [-1.47, 0.68, 0.62], dragHeight: 1.05, collider: 'box', marker: { position: [-1.47, 0.4, 0.62], radius: 0.17 }, slotRotation: [0, 0, 0] },
  ], obstacles: [{ half: [1.85, 0.1, 0.62], position: [0, 0.075, -0.2] }], cameras,
};
export const STATION_TRAIN = {
  ...base, id: 'station-train', number: '08', name: '山谷小火车', icon: 'train', color: '#7f9c86',
  title: '擦亮车头，<br/>听一声汽笛。',
  description: '圆圆的车头还记得穿过山谷的风。<br/>装回车轮、驾驶室和小铜笛，让它重新轻轻转动。',
  tags: '车身清洁 · 轮组拼装 · 轻柔试车',
  steps: ['擦净车头和车身', '装回轮组与驾驶室', '上油、转轮与试笛'],
  tidyTitle: '小小车轮，<br/>装回旅途。', tidyHint: '先装上靠近你的轮组，再放好驾驶室，最后把小铜笛装进车顶圆座。',
  actionTitle: '轮子轻转，<br/>山谷轻轻回应。', actionHint: '给轮轴上油，按住试转车轮，最后轻点车顶的铜笛。', actionLabel: '准备回到小站',
  runningTitle: '呜——<br/>小火车醒了。', runningHint: '车轮轻轻转动，暖白的蒸汽从烟囱慢慢飘起。',
  finishedTitle: '下一站，<br/>山间小站。', finishedDescription: '修好的小火车已经准备好了。<br/>它会沿着你接好的轨道，驶进你一点点收拾出来的小站。',
  caption: ['A LITTLE TRAIN COMES HOME', 'THE VALLEY LOCOMOTIVE'],
  operation: { kind: 'tasks', initial: 0, duration: 5.5, tasks: [
    { id: 'train-oil', sound: 'polish', name: '给车轮轴承上油', hint: '按住前轮旁的小油壶，润滑车轮连接处。', buttonLabel: '给轴承上油', mode: 'hold', initial: 0, target: 1, rate: 0.33 },
    { id: 'train-wheels', name: '慢慢试转车轮', hint: '按住车轮，让连接杆带着三只轮子一起转起来。', buttonLabel: '试转车轮', mode: 'hold', initial: 0, target: 1, rate: 0.25, requires: ['train-oil'] },
    { id: 'train-whistle', sound: 'whistle', name: '轻试一声汽笛', hint: '轻点车顶的铜笛，看暖白的蒸汽轻轻升起。', mode: 'tap', initial: 0, target: 1, requires: ['train-wheels'] },
  ] },
  surfaces: [
    { id: 'train-boiler', name: '锅炉检修盖', width: 1.28, height: 0.34, weight: 0.4, seed: 4801, completionThreshold: 0.86, material: 'metal', color: '#93a994', position: [0.35, 0.83, 0.435], rotation: [0, 0, 0], camera: { distance: 8.3, height: 2.6, lookX: 0.35, lookY: 0.85, lookZ: 0.44 } },
    { id: 'train-chassis', name: '奶油色车身', width: 2.32, height: 0.17, weight: 0.35, seed: 4802, completionThreshold: 0.86, material: 'metal', color: '#e4dcc4', position: [0, 0.465, 0.517], rotation: [0, 0, 0], camera: { distance: 8.5, height: 2.3, lookX: 0, lookY: 0.47, lookZ: 0.52 } },
    { id: 'train-front', name: '圆圆的车头', width: 0.62, height: 0.62, weight: 0.25, seed: 4803, completionThreshold: 0.85, material: 'metal', color: '#718a76', mask: { kind: 'disc' }, position: [1.209, 0.89, 0], rotation: [0, Math.PI / 2, 0], camera: { angle: 1.08, distance: 8.3, height: 2.5, lookX: 1.19, lookY: 0.89, lookZ: 0 } },
  ],
  items: [
    { id: 'train-wheelset', kind: 'station-wheels', name: '连杆轮组', hint: '把三只相连的车轮贴到车身靠近你的这一侧。', mass: 0.42, size: [2.0, 0.64, 0.18], start: [0.22, 0.15, 1.12], startRotation: flat, slot: [0, 0.34, 0.545], dragHeight: 1.1, collider: 'box', marker: { position: [0, 0.34, 0.56], radius: 0.28, plane: 'front' }, slotRotation: [0, 0, 0] },
    { id: 'train-cab', kind: 'station-cab', name: '驾驶室', hint: '轮组装好后，把小房子一样的驾驶室扣在车身后方。', mass: 0.35, size: [0.88, 1.12, 1.0], start: [-1.76, 0.56, 0.68], slot: [-0.86, 1.1, 0], dragHeight: 1.8, collider: 'box', requires: ['train-wheelset'], marker: { position: [-0.86, 0.55, 0], radius: 0.35 }, slotRotation: [0, 0, 0] },
    { id: 'train-whistle-part', kind: 'station-whistle', name: '小铜笛', hint: '轻轻放进驾驶室顶上的圆座。', mass: 0.12, size: [0.21, 0.34, 0.21], start: [1.91, 0.19, 0.88], slot: [-0.69, 1.83, 0.13], dragHeight: 2.1, collider: 'box', requires: ['train-cab'], marker: { position: [-0.69, 1.65, 0.13], radius: 0.14 }, slotRotation: [0, 0, 0] },
  ], obstacles: [{ half: [1.23, 0.27, 0.45], position: [0, 0.27, -0.04] }], cameras,
};
const phoneOverview = { distance: 23.6, height: 13, lookY: 0.8, lookZ: 0.05, lookX: 0 };
const desktopOverview = { distance: 12.6, height: 7.8, lookY: 0.8, lookZ: 0.05, lookX: 0 };
export const STATION_OPENING = {
  ...base, id: 'station-opening', number: '09', name: '山间小站', stationOverview: true, icon: 'station', color: '#8b9d7a',
  title: '车到站了，<br/>慢慢回来吧。',
  description: '站牌、长椅、车票和轨道，都已经收拾好了。<br/>拉开候车亭的窗板，让那辆修好的小火车回到这里。',
  tags: '全季成果 · 林间站台 · 列车归来',
  steps: ['八件修好的小事', '打开山间小站', '迎接小火车回家'],
  tidyTitle: '每一件，<br/>都在这里了。', tidyHint: '你亲手修好的八件物品，一起组成了这座山间小站。',
  actionTitle: '窗板打开，<br/>小站等你回来。', actionHint: '拉开窗板、点亮信号灯，按住迎接列车，看它缓缓停在站台前，最后轻敲到站铃。', actionLabel: '小站重新开门',
  runningTitle: '汽笛远了，<br/>脚步近了。', runningHint: '小火车安稳地停在站台边。树影轻轻晃动，所有收拾好的日常都回来了。',
  finishedTitle: '山间小站，<br/>有人等你回来。', finishedDescription: '从一块蒙尘的站牌，到一辆慢慢停下的小火车。<br/>你收拾出的每一件小事，终于有了彼此，也有了一个可以回来的地方。',
  caption: ['A PLACE TO COME HOME TO', 'MOUNTAIN STATION · SEASON 04'],
  operation: { kind: 'tasks', initial: 0, duration: 7, tasks: [
    { id: 'station-open-shutters', sound: 'curtain', name: '打开候车亭窗板', hint: '按住窗边的铜把手，让山里的光照进候车亭。', buttonLabel: '拉开窗板', mode: 'hold', initial: 0, target: 1, rate: 0.29 },
    { id: 'station-set-signal', name: '点亮进站信号', hint: '轻点站台右侧的信号灯，给小火车一个温柔的邀请。', mode: 'tap', initial: 0, target: 1, requires: ['station-open-shutters'] },
    { id: 'station-arrive-train', name: '迎接小火车进站', hint: '按住站台前的迎车手柄，小火车会沿着轨道驶来，并慢慢停下。', buttonLabel: '迎接小火车', mode: 'hold', initial: 0, target: 1, rate: 0.16, requires: ['station-set-signal'] },
    { id: 'station-arrival-bell', sound: 'bell', name: '轻敲到站铃', hint: '小火车停稳了。轻点候车亭前的铜铃，为这一季留下一声回响。', mode: 'tap', initial: 0, target: 1, requires: ['station-arrive-train'] },
  ] },
  surfaces: [], items: [], obstacles: [],
  cameras: { desktop: { default: desktopOverview, tidy: desktopOverview, finale: desktopOverview, overview: desktopOverview }, mobile: { default: phoneOverview, tidy: phoneOverview, finale: phoneOverview, overview: phoneOverview } },
};
export const STATION_FINALE_LEVELS = [STATION_TRACK, STATION_TRAIN, STATION_OPENING];
