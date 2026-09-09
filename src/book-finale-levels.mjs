const flat = [-Math.PI / 2, 0, 0];
const base = { seasonId: 'hillside-library', sceneFamily: 'book', inspection: true, revision: 1, room: { custom: true } };
const cameras = {
  desktop: { default: { distance: 10.4, height: 5.1, lookY: 0.8, lookZ: 0 }, tidy: { distance: 11.3, height: 5.4, lookY: 0.8, lookZ: 0 }, finale: { distance: 10.3, height: 4.8, lookY: 0.9, lookZ: 0 } },
  mobile: { default: { distance: 19.2, height: 9, lookY: 0.8, lookZ: 0 }, tidy: { distance: 20.2, height: 9.3, lookY: 0.8, lookZ: 0 }, finale: { distance: 19.1, height: 8.8, lookY: 0.9, lookZ: 0 } },
};
export const BOOK_PROJECTOR = {
  ...base, id: 'book-projector', number: '07', name: '幻灯放映机', icon: 'projector', color: '#b29d7c',
  title: '一道光，<br/>唤醒旧故事。', description: '放映机安静地等了很久。<br/>擦亮机身和透镜，装回小零件，让墙上重新出现一束温暖的光。',
  tags: '透镜清洁 · 零件归位 · 柔光对焦', steps: ['擦亮机身和玻璃', '装回透镜与画片托', '通风、对焦与点亮'],
  tidyTitle: '小小零件，<br/>各归其位。', tidyHint: '把透镜、通风旋钮和画片托轻轻装回去。',
  actionTitle: '转一转，<br/>让轮廓清晰。', actionHint: '先试转风扇，再把焦距调到 45，最后点亮放映灯。', actionLabel: '看看第一束光',
  runningTitle: '微小的光，<br/>照见一间花房。', runningHint: '镜头投出温暖的影像，窗里的绿叶重新舒展开来。',
  finishedTitle: '故事的光，<br/>又亮起来了。', finishedDescription: '修好的放映机会摆在书屋中央。<br/>它等着那几张旧画片，讲一个你曾经走过的故事。', caption: ['STORIES IN A BEAM OF LIGHT', 'THE SLIDE PROJECTOR'],
  operation: { kind: 'tasks', initial: 0, duration: 4.5, tasks: [
    { id: 'projector-fan', name: '轻轻试转风扇', hint: '按住机身前侧的通风旋钮，让小风扇慢慢顺起来。', buttonLabel: '试转风扇', mode: 'hold', initial: 0, target: 1, rate: 0.31 },
    { id: 'projector-focus', name: '把画面调清楚', hint: '转动镜头旁的调焦轮，让刻度停在 45 附近。', mode: 'dial', initial: 0, min: 0, max: 90, target: 45, tolerance: 5, step: 1, unit: '', label: '焦距', requires: ['projector-fan'] },
    { id: 'projector-light', name: '点亮放映灯', hint: '轻点米白色开关，看花房的轮廓落在小幕布上。', mode: 'tap', initial: 0, target: 1, requires: ['projector-focus'] },
  ] },
  surfaces: [
    { id: 'projector-case', name: '米白色机身', width: 1.48, height: 0.5, weight: 0.45, seed: 5701, completionThreshold: 0.85, material: 'metal', color: '#dad0b8', position: [-0.45, 0.66, 0.38], rotation: [0,0,0], camera: { distance: 8.8, height: 2.6, lookX: -0.45, lookY: 0.66, lookZ: 0.38 } },
    { id: 'projector-glass', name: '透镜玻璃', width: 0.43, height: 0.43, weight: 0.3, seed: 5702, completionThreshold: 0.84, material: 'ceramic', color: '#abc3ba', mask: { kind: 'disc' }, position: [-1.35, 0.075, 0.96], rotation: flat, camera: { distance: 8.5, height: 6.6, lookX: -1.35, lookY: 0.075, lookZ: 0.96 } },
    { id: 'projector-base', name: '木制底座前沿', width: 2.25, height: 0.14, weight: 0.25, seed: 5703, completionThreshold: 0.85, material: 'wood', color: '#b99c77', position: [-0.45, 0.105, 0.578], rotation: [0,0,0], camera: { distance: 8.8, height: 2.1, lookX: -0.45, lookY: 0.1, lookZ: 0.58 } },
  ],
  items: [
    { id: 'projector-lens', kind: 'book-lens', name: '黄铜透镜', hint: '把黄铜透镜扣到机身靠幕布的一端。', mass: 0.25, size: [0.51,0.25,0.51], start: [-1.35,0.16,0.98], slot: [-0.45,0.82,-0.67], slotRotation: [Math.PI/2,0,0], dragHeight: 1.4, collider: 'box', marker: { position: [-0.45,0.82,-0.68], radius: 0.24, plane: 'front' } },
    { id: 'projector-knob', kind: 'book-fan-knob', name: '通风旋钮', hint: '把旋钮嵌进机身前面的小圆座。', mass: 0.13, size: [0.25,0.15,0.25], start: [0.15,0.12,1.08], slot: [-0.93,0.67,0.46], slotRotation: [Math.PI/2,0,0], dragHeight: 1.1, collider: 'box', requires: ['projector-lens'], marker: { position: [-0.93,0.67,0.49], radius: 0.17, plane: 'front' } },
    { id: 'projector-tray', kind: 'book-slide-tray', name: '画片托', hint: '把长方形画片托放进机身顶端。', mass: 0.15, size: [0.76,0.16,0.31], start: [1.28,0.11,1.04], slot: [-0.45,1.14,-0.19], dragHeight: 1.5, collider: 'box', requires: ['projector-knob'], marker: { position: [-0.45,1.14,-0.19], radius: 0.23 } },
  ], obstacles: [{ half:[1.18,0.095,0.57],position:[-0.45,0.095,0] },{half:[0.8,0.43,0.42],position:[-0.45,0.63,-0.06]}], cameras,
};
export const BOOK_SLIDES = {
  ...base, id: 'book-slides', number: '08', name: '故事画片', icon: 'slides', color: '#a6b8a0',
  title: '旧时光，<br/>一张张透亮。', description: '花房、灯塔，还有一辆回家的小火车。<br/>把画片擦亮、装框、排好，曾经修好的小事又在这里相遇。',
  tags: '玻璃擦拭 · 画片装框 · 故事排序', steps: ['擦净玻璃和木框', '把三张画片装好', '修整、显色与排好'],
  tidyTitle: '一张画片，<br/>一段旅途。', tidyHint: '从左到右，把花房、灯塔和小火车装进各自的框位。',
  actionTitle: '透过光，<br/>看见来时的路。', actionHint: '按住压紧画框，再慢慢擦亮色彩，最后把三张画片推入木架。', actionLabel: '让故事排好队',
  runningTitle: '花房与灯塔，<br/>都还记得你。', runningHint: '三张画片在木架里依次站好，小火车载着故事驶向书屋。',
  finishedTitle: '走过的地方，<br/>都变成了故事。', finishedDescription: '雨后的绿叶、海上的灯，还有山间的小站。<br/>把这些画片带回书屋，让修好的放映机把故事接起来。', caption: ['PLACES WE HAVE CARED FOR', 'THREE LITTLE STORY SLIDES'],
  operation: { kind: 'tasks', initial: 0, duration: 5, tasks: [
    { id: 'slides-seal', name: '把画框轻轻压紧', hint: '按住木制压片柄，让玻璃稳稳留在框里。', buttonLabel: '压紧画框', mode: 'hold', initial: 0, target: 1, rate: 0.32 },
    { id: 'slides-color', name: '让旧画片重新透亮', hint: '按住小软布，画片里的色彩会一点点显出来。', buttonLabel: '擦亮色彩', mode: 'hold', initial: 0, target: 1, rate: 0.25, requires: ['slides-seal'] },
    { id: 'slides-sort', name: '把故事推入木架', hint: '按住木架前的圆头滑块，三张画片会慢慢竖起来排好。', buttonLabel: '排好三张画片', mode: 'hold', initial: 0, target: 1, rate: 0.27, requires: ['slides-color'] },
  ] },
  surfaces: [
    { id: 'slides-left-glass', name: '花房画片玻璃', width:0.6,height:0.55,weight:0.3,seed:5801,completionThreshold:0.84,material:'ceramic',color:'#b9cebd',position:[-1.3,0.086,0.96],rotation:flat,camera:{distance:8.8,height:6.9,lookX:-1.3,lookY:0.086,lookZ:0.96} },
    { id: 'slides-right-glass', name: '小火车画片玻璃', width:0.6,height:0.55,weight:0.3,seed:5802,completionThreshold:0.84,material:'ceramic',color:'#bdc7b7',position:[1.3,0.086,0.96],rotation:flat,camera:{distance:8.8,height:6.9,lookX:1.3,lookY:0.086,lookZ:0.96} },
    { id: 'slides-holder', name: '木架前沿',width:3.32,height:0.18,weight:0.4,seed:5803,completionThreshold:0.86,material:'wood',color:'#b99b76',position:[0,0.21,0.388],rotation:[0,0,0],camera:{distance:8.9,height:2.3,lookX:0,lookY:0.21,lookZ:0.388} },
  ],
  items: ['greenhouse','lighthouse','train'].map((story,i) => ({id:`slides-${story}`,kind:'book-story-slide',story,name:['花房画片','灯塔画片','小火车画片'][i],hint:'沿着发光的框位，把画片轻轻放好。',mass:0.13,size:[0.94,0.13,0.88],start:[(i-1)*1.3,0.11,0.96],slot:[(i-1)*1.12,0.39,-0.04],dragHeight:1.2,collider:'box',requires:i?[`slides-${['greenhouse','lighthouse'][i-1]}`]:[],marker:{position:[(i-1)*1.12,0.39,-0.04],radius:0.29},slotRotation:[0,0,0]})),
  obstacles:[{half:[1.74,0.17,0.4],position:[0,0.17,-0.03]}], cameras,
};
const desktop = {distance:12.9,height:7.7,lookY:0.95,lookZ:0,lookX:0};
const mobile = {distance:25,height:13,lookY:0.95,lookZ:0,lookX:0};
export const BOOK_OPENING = {
  ...base,id:'book-opening',number:'09',name:'山坡书屋',icon:'library',bookOverview:true,ambientDimTask:'library-curtain',color:'#b9aa8b',
  title:'把灯调暗，<br/>故事就亮了。',description:'每一本修好的书，每一个归位的小物件，都已经回到书屋。<br/>拉拢窗帘，让那束光把花房、灯塔和小站连成一个温柔的夜晚。',
  tags:'全季成果 · 故事放映 · 书屋重开',steps:['八件修好的日常','准备一场小放映','让故事在这里相遇'],
  tidyTitle:'走过的故事，<br/>终于坐在一起。',tidyHint:'你亲手修好的八件物品，都在这间山坡书屋里。',
  actionTitle:'窗帘轻合，<br/>留一盏暖灯。',actionHint:'拉拢窗帘、装入画片，按住缓慢对焦，最后转动故事轮，看三段旧时光在墙上相遇。',actionLabel:'书屋今晚开门',
  runningTitle:'你收拾的世界，<br/>在光里相遇。',runningHint:'花房里有叶子，灯塔边有海，小火车带着一盏灯回家。小鸟轻轻摇着，书页留在温暖的光里。',
  finishedTitle:'风吹书页，<br/>故事还会继续。',finishedDescription:'那些修好的小事，并没有停在各自的季节。<br/>它们变成了你走过的故事，今晚，在这间小书屋里一起亮起来。',caption:['ALL OUR LITTLE STORIES TOGETHER','HILLSIDE LIBRARY · SEASON 05'],
  operation:{kind:'tasks',initial:0,duration:8,tasks:[
    {id:'library-curtain',sound:'curtain',name:'拉拢柔软的窗帘',hint:'按住窗边的木环，把晚风轻轻留在帘外。',buttonLabel:'拉拢窗帘',mode:'hold',initial:0,target:1,rate:0.28},
    {id:'library-load',name:'放入三张故事画片',hint:'轻点放映机旁的画片托，把排好的故事装进去。',mode:'tap',initial:0,target:1,requires:['library-curtain']},
    {id:'library-focus',name:'让墙上的画面清晰',hint:'按住桌前的调焦轮，模糊的光会渐渐变成花房。',buttonLabel:'慢慢对焦',mode:'hold',initial:0,target:1,rate:0.2,requires:['library-load']},
    {id:'library-stories',name:'把三个故事连起来',hint:'按住圆头故事柄，灯塔和小火车会依次出现在花房旁边。',buttonLabel:'翻到下一段故事',mode:'hold',initial:0,target:1,rate:0.16,requires:['library-focus']},
  ]},surfaces:[],items:[],obstacles:[],cameras:{desktop:{default:desktop,tidy:desktop,finale:desktop,overview:desktop},mobile:{default:mobile,tidy:mobile,finale:mobile,overview:mobile}},
};
export const BOOK_FINALE_LEVELS=[BOOK_PROJECTOR,BOOK_SLIDES,BOOK_OPENING];
