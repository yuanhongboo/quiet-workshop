import * as THREE from 'three';
import { mat, mesh, tube, label, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';
import { canvasTexture } from './materials.mjs';

const TOP = [-Math.PI / 2, 0, 0], FRONT = [Math.PI / 2, 0, 0];
const clamp = value => Math.max(0, Math.min(1, value));
const progress = (view, id, before = false) => before ? 0 : clamp(view.state.taskValues?.[id] || 0);
function group(parent, position = [0,0,0], name = '') { const root = new THREE.Group(); root.position.set(...position); root.name = name; parent.add(root); return root; }
const block = (parent, material, size, position = [0,0,0], rotation) => mesh(new THREE.BoxGeometry(...size), material, parent, position, rotation);
const cylinder = (parent, material, radius, height, position = [0,0,0], rotation, top = radius) => mesh(new THREE.CylinderGeometry(top, radius, height, 24), material, parent, position, rotation);
const ring = (parent, material, radius, width, position = [0,0,0], rotation) => mesh(new THREE.TorusGeometry(radius,width,6,32),material,parent,position,rotation);
const sphere = (parent, material, radius, position = [0,0,0]) => mesh(new THREE.SphereGeometry(radius,18,10),material,parent,position);
function palette(view) { return {
  cream:mat('#e9ddc5',{roughness:0.7}), wood:mat('#b79670',{map:view.wood,roughness:0.72}), darkWood:mat('#775e47',{map:view.wood,roughness:0.8}),
  sage:mat('#8fa88b',{roughness:0.52}), forest:mat('#516d58',{roughness:0.58}), brass:mat('#bb9d63',{metalness:0.72,roughness:0.32}), dark:mat('#40483f',{roughness:0.7}),
  rust:mat('#ba856d',{roughness:0.8}), paper:mat('#f1e8d5',{roughness:0.94}), glass:mat('#a9c7bd',{roughness:0.17,transparent:true,opacity:0.5,depthWrite:false,side:THREE.DoubleSide}),
}; }
function plaque(parent,text,small,size,position,background='#e9ddc5',color='#51644e') { return mesh(new THREE.PlaneGeometry(...size),mat('#ffffff',{map:label(text,small,color,background),roughness:0.85}),parent,position); }

// All picture shapes are drawn here: no external photographs, film art, or borrowed text.
export function storyTexture(story) {
  const texture = canvasTexture((ctx,w,h) => {
    const sky = ctx.createLinearGradient(0,0,0,h); sky.addColorStop(0,story==='lighthouse'?'#839ea0':'#b5c6ad'); sky.addColorStop(1,'#f1dfb5');
    ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f8edc8'; ctx.beginPath(); ctx.arc(w*.78,h*.2,h*.08,0,Math.PI*2); ctx.fill();
    const hill = (color,y,rise) => { ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,y);ctx.bezierCurveTo(w*.27,y-rise,w*.61,y+rise,w,y-rise*.3);ctx.lineTo(w,h);ctx.fill(); };
    hill('#a4b795',h*.71,h*.13); hill('#7d9a77',h*.87,h*.1);
    if(story==='greenhouse') {
      ctx.fillStyle='#d4e1c8';ctx.fillRect(w*.22,h*.43,w*.56,h*.38);
      ctx.beginPath();ctx.moveTo(w*.18,h*.43);ctx.lineTo(w*.5,h*.18);ctx.lineTo(w*.82,h*.43);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#f6ecd4';ctx.lineWidth=w*.025;ctx.strokeRect(w*.22,h*.43,w*.56,h*.38);
      ctx.beginPath();ctx.moveTo(w*.18,h*.43);ctx.lineTo(w*.5,h*.18);ctx.lineTo(w*.82,h*.43);ctx.moveTo(w*.5,h*.18);ctx.lineTo(w*.5,h*.8);ctx.moveTo(w*.22,h*.6);ctx.lineTo(w*.78,h*.6);ctx.stroke();
      for(let i=0;i<4;i++){const x=w*(.3+i*.135),y=h*(.69+(i%2)*.04);ctx.fillStyle='#b38262';ctx.fillRect(x-w*.033,y,w*.065,h*.09);ctx.strokeStyle='#5d8163';ctx.lineWidth=w*.009;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-h*.17);ctx.stroke();ctx.fillStyle='#729567';for(const s of[-1,1]){ctx.beginPath();ctx.ellipse(x+s*w*.023,y-h*.11,w*.026,h*.048,s*.7,0,Math.PI*2);ctx.fill();}}
      ctx.fillStyle='#e5c786';ctx.fillRect(w*.46,h*.63,w*.09,h*.18);
    } else if(story==='lighthouse') {
      ctx.fillStyle='#719599';ctx.fillRect(0,h*.71,w,h*.29);ctx.strokeStyle='#c8d8c5';ctx.lineWidth=h*.007;
      for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(w*(.03+i*.15),h*(.78+(i%2)*.08));ctx.lineTo(w*(.13+i*.15),h*(.78+(i%2)*.08));ctx.stroke();}
      ctx.fillStyle='#79917b';ctx.beginPath();ctx.moveTo(w*.08,h*.9);ctx.lineTo(w*.29,h*.67);ctx.lineTo(w*.8,h*.68);ctx.lineTo(w*.93,h*.91);ctx.fill();
      ctx.fillStyle='#f0e7ca';ctx.beginPath();ctx.moveTo(w*.41,h*.7);ctx.lineTo(w*.45,h*.28);ctx.lineTo(w*.59,h*.28);ctx.lineTo(w*.64,h*.7);ctx.closePath();ctx.fill();
      ctx.fillStyle='#b88669';ctx.fillRect(w*.445,h*.28,w*.15,h*.05);ctx.fillRect(w*.462,h*.47,w*.14,h*.05);
      ctx.fillStyle='#3f625b';ctx.fillRect(w*.447,h*.18,w*.15,h*.115);ctx.fillStyle='#f7df93';ctx.fillRect(w*.467,h*.202,w*.108,h*.065);
      ctx.fillStyle='#56776a';ctx.beginPath();ctx.moveTo(w*.415,h*.18);ctx.lineTo(w*.52,h*.09);ctx.lineTo(w*.625,h*.18);ctx.fill();
      ctx.fillStyle='#f9e7ac88';ctx.beginPath();ctx.moveTo(w*.48,h*.24);ctx.lineTo(w*.01,h*.05);ctx.lineTo(w*.01,h*.37);ctx.fill();
      ctx.fillStyle='#e5d5ac';ctx.fillRect(w*.23,h*.58,w*.18,h*.13);ctx.fillStyle='#b38067';ctx.beginPath();ctx.moveTo(w*.2,h*.58);ctx.lineTo(w*.32,h*.48);ctx.lineTo(w*.44,h*.58);ctx.fill();
    } else {
      ctx.strokeStyle='#b89d78';ctx.lineWidth=h*.04;ctx.beginPath();ctx.moveTo(0,h*.85);ctx.lineTo(w,h*.85);ctx.stroke();
      ctx.strokeStyle='#d5c7a8';ctx.lineWidth=w*.023;for(let i=0;i<11;i++){ctx.beginPath();ctx.moveTo(i*w*.1,h*.84);ctx.lineTo(i*w*.1+w*.04,h*.91);ctx.stroke();}
      for(let i=0;i<3;i++){ctx.fillStyle='#526c58';ctx.beginPath();ctx.moveTo(w*(.08+i*.37),h*.61);ctx.lineTo(w*(.17+i*.34),h*.18);ctx.lineTo(w*(.26+i*.31),h*.61);ctx.fill();}
      ctx.fillStyle='#b6c09b';ctx.fillRect(w*.2,h*.59,w*.27,h*.17);ctx.fillStyle='#f1dfb8';ctx.fillRect(w*.235,h*.61,w*.075,h*.075);ctx.fillRect(w*.343,h*.61,w*.075,h*.075);
      ctx.fillStyle='#739478';ctx.fillRect(w*.49,h*.56,w*.28,h*.2);ctx.fillRect(w*.48,h*.43,w*.14,h*.2);ctx.fillStyle='#e8d8b4';ctx.fillRect(w*.505,h*.46,w*.08,h*.09);ctx.fillStyle='#405d4c';ctx.fillRect(w*.46,h*.41,w*.18,h*.035);ctx.fillRect(w*.714,h*.48,w*.055,h*.13);
      ctx.fillStyle='#e6cf99';ctx.fillRect(w*.18,h*.74,w*.63,h*.045);ctx.fillStyle='#4b5b4d';for(const x of[.26,.4,.55,.69]){ctx.beginPath();ctx.arc(w*x,h*.79,h*.045,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#f5eccf';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(w*(.74-i*.08),h*(.4-i*.06),w*(.025+i*.008),h*.035,0,0,Math.PI*2);ctx.fill();}
    }
    ctx.strokeStyle='#f8ebcc88';ctx.lineWidth=w*.014;ctx.strokeRect(w*.025,h*.025,w*.95,h*.95);
  },768,640);
  texture.name=`original-story-${story}`; return texture;
}
function imagePanel(parent,story,size,position,name='') {
  const material = new THREE.MeshBasicMaterial({map:storyTexture(story),transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
  const image=mesh(new THREE.PlaneGeometry(...size),material,parent,position); image.name=name;image.castShadow=false;image.userData.story=story;return image;
}
function beam(parent,from,to,width=0.7) {
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=b.clone().sub(a);
  const material=new THREE.MeshBasicMaterial({color:'#ffdf9a',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const object=mesh(new THREE.CylinderGeometry(width,0.04,d.length(),24,1,true),material,parent,a.clone().add(b).multiplyScalar(.5).toArray());
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());object.castShadow=false;return object;
}
function lens(parent,c) {const root=group(parent);cylinder(root,c.brass,.255,.23);ring(root,c.dark,.208,.018,[0,.127,0],TOP);cylinder(root,c.glass,.197,.012,[0,.124,0]);return root;}
function projectorBody(parent,c,position=[0,0,0],name='') {
  const root=group(parent,position,name);block(root,c.wood,[2.36,.19,1.14],[0,.095,0]);
  block(root,c.cream,[1.58,.8,.86],[0,.64,-.06]);block(root,c.sage,[1.68,.085,.95],[0,1.08,-.06]);
  for(const x of[-.68,.68])for(const z of[-.35,.29])cylinder(root,c.dark,.058,.18,[x,.27,z]);
  for(let i=0;i<8;i++)block(root,c.dark,[.035,.3,.013],[.16+i*.07,.67,.378]);
  cylinder(root,c.dark,.27,.13,[0,.82,-.55],FRONT);cylinder(root,c.brass,.095,.02,[-.48,.67,.389],FRONT);
  plaque(root,'LUMIÈRE','STORY PROJECTOR',[.65,.18],[0,.94,.381]);
  const fan=group(root,[-.48,.67,.4],'book-projector-fan');for(let i=0;i<4;i++)block(fan,c.dark,[.035,.17,.012],[0,0,0],[0,0,i*Math.PI/2]);
  const focus=group(root,[.7,.92,.39],'book-projector-focus-wheel');cylinder(focus,c.brass,.11,.06,[0,0,0],FRONT);ring(focus,c.cream,.077,.014,[0,0,.038]);
  const button=cylinder(root,c.cream,.075,.045,[.42,.4,.407],FRONT);const pilot=sphere(root,mat('#f6d690',{emissive:'#ffcf7d',emissiveIntensity:0}),.035,[.6,.41,.407]);
  return{root,fan,focus,button,pilot};
}
// These loose glass parts use a stable, tabletop cleaning model until the tidy stage.
// WorkshopView copies Rapier poses before extra.update; switch only this explicit pair
// of representations here, leaving every other loose prop visible and untouched.
function cleaningRepresentation(view, itemIds, surfaceIds, samples) {
  const patches = view.dirtyMeshes.filter(object => surfaceIds.includes(object.userData.field?.spec.id || object.name));
  return (stage, before) => {
    const cleaning = before || stage === 'clean';
    for (const id of itemIds) view.items.get(id).visible = !cleaning;
    for (const object of [...samples, ...patches]) object.visible = cleaning;
  };
}
function projector(view) {
  const c=palette(view),body=projectorBody(view.scene,c,[-.45,0,0],'book-projector-model');
  const panel=group(view.scene,[.3,1.91,-1.18],'book-projector-screen');block(panel,c.wood,[3.45,1.55,.07]);
  block(panel,c.paper,[3.29,1.4,.012],[0,0,.044]);for(const x of[-1.45,1.45])block(panel,c.brass,[.032,1.13,.032],[x,-1.28,0]);
  const picture=imagePanel(panel,'greenhouse',[2.05,1.32],[0,0,.06],'book-projector-picture');
  const glow=beam(view.scene,[-.45,.84,-.78],[.3,1.91,-1.11],.74);glow.name='book-projector-light-beam';
  const lensRoot=new THREE.Group();lens(lensRoot,c);registerItem(view,view.level.items[0],lensRoot);
  const knob=new THREE.Group();cylinder(knob,c.brass,.122,.12);for(let i=0;i<8;i++)block(knob,c.cream,[.018,.13,.022],[Math.sin(i*Math.PI/4)*.105,0,Math.cos(i*Math.PI/4)*.105]);registerItem(view,view.level.items[1],knob);
  const tray=new THREE.Group();block(tray,c.dark,[.76,.07,.31]);for(const x of[-.35,.35])block(tray,c.brass,[.034,.16,.31],[x,.04,0]);registerItem(view,view.level.items[2],tray);
  registerAction(view,'projector-fan',knob);registerAction(view,'projector-focus',body.focus);registerAction(view,'projector-light',body.button);
  // A physical glass sample remains on the worktop while the loose lens is hidden in the cleaning stage.
  const glassSample = cylinder(view.scene,c.brass,.248,.035,[-1.35,.034,.96]);
  addSurfaces(view);
  const presentGlass = cleaningRepresentation(view, ['projector-lens'], ['projector-glass'], [glassSample]);
  return{update(dt,time,{before=false,stage=''}={}){
    presentGlass(stage, before);
    const air=progress(view,'projector-fan',before),focus=before?0:clamp((view.state.taskValues?.['projector-focus']||0)/45),lit=progress(view,'projector-light',before);
    body.fan.rotation.z=air*Math.PI*8+(lit?time*.7:0);body.focus.rotation.z=-focus*Math.PI*1.2;knob.rotation.y=air*Math.PI*4;
    picture.material.opacity=lit;picture.userData.focusAmount=focus;glow.material.opacity=lit*.055;body.pilot.material.emissiveIntensity=lit*2;
    panel.userData.pictureVisible=lit>0;panel.userData.focusAmount=focus;
  }};
}
function slide(parent,c,story,name='') {
  const root=group(parent,[0,0,0],name);block(root,c.wood,[.94,.105,.88]);block(root,c.dark,[.76,.011,.7],[0,.058,0]);
  const picture=imagePanel(root,story,[.71,.64],[0,.068,0]);picture.rotation.set(...TOP);picture.material.opacity=.15;
  for(const x of[-.41,.41])for(const z of[-.38,.38])cylinder(root,c.brass,.023,.013,[x,.065,z]);
  return{root,picture};
}
function slides(view) {
  const c=palette(view),root=group(view.scene,[0,0,0],'book-slides-model');
  block(root,c.wood,[3.48,.32,.8],[0,.17,-.03]);block(root,c.darkWood,[3.52,.09,.13],[0,.38,-.375]);
  for(const x of[-1.12,0,1.12]) {block(root,c.dark,[.93,.022,.65],[x,.342,-.03]);block(root,c.brass,[.89,.028,.03],[x,.36,.275]);}
  const models=[];for(const item of view.level.items){const outer=new THREE.Group(),model=slide(outer,c,item.story,`book-slide-${item.story}`);models.push({item,...model});registerItem(view,item,outer);}
  const press=group(root,[-1.7,.6,-.1],'book-slides-seal-handle');cylinder(press,c.brass,.038,.38,[0,0,0]);sphere(press,c.darkWood,.09,[0,.21,0]);registerAction(view,'slides-seal',press);
  const cloth=block(root,c.sage,[.4,.06,.3],[1.98,.08,.6],[0,.2,0]);registerAction(view,'slides-color',cloth);
  const slider=group(root,[0,.16,.6],'book-slides-sort-handle');cylinder(slider,c.brass,.034,.15,[0,0,0],FRONT);sphere(slider,c.darkWood,.11,[0,0,.09]);registerAction(view,'slides-sort',slider);
  const glassSamples = [-1.3,1.3].map(x => block(root,c.wood,[.86,.045,.8],[x,.045,.96]));
  addSurfaces(view);
  const presentGlass = cleaningRepresentation(view, ['slides-greenhouse', 'slides-train'], ['slides-left-glass', 'slides-right-glass'], glassSamples);
  return{update(dt,time,{before=false,stage=''}={}){
    presentGlass(stage, before);
    const sealed=progress(view,'slides-seal',before),color=progress(view,'slides-color',before),sorted=progress(view,'slides-sort',before);
    press.position.y=.6-sealed*.11;slider.position.z=.6-sorted*.15;cloth.rotation.y=.2+color*.12;
    for(const {item,root:frame,picture} of models){const placed=!before&&view.state.placed.has(item.id);frame.rotation.x=placed?sorted*Math.PI*.43:0;frame.position.y=placed?sorted*.3:0;picture.material.opacity=.15+color*.85;picture.userData.revealed=color;frame.userData.sorted=sorted;}
  }};
}
function book(parent,c,position=[0,0,0],rotation=0,cover=c.sage,size=[.57,.12,.78]) {
  const root=group(parent,position);root.rotation.y=rotation;block(root,c.paper,[size[0]-.045,size[1]-.036,size[2]-.025]);for(const side of[-1,1])block(root,cover,[size[0],.022,size[2]],[0,side*size[1]/2,0]);block(root,cover,[.035,size[1],size[2]],[-size[0]/2,0,0]);return root;
}
function table(parent,c,width=1,height=.66,depth=.65) {block(parent,c.wood,[width,.075,depth],[0,height,0]);for(const x of[-width*.4,width*.4])for(const z of[-depth*.36,depth*.36])block(parent,c.darkWood,[.055,height,.055],[x,height/2,z]);}
function miniProjector(parent,c) {const body=projectorBody(parent,c);body.root.scale.setScalar(.4);const lensRoot=lens(body.root,c);lensRoot.position.set(0,.82,-.69);lensRoot.rotation.x=Math.PI/2;return body;}
function miniBird(parent,c) {const root=group(parent,[0,.93,0],'book-overview-bird');const bird=sphere(root,c.sage,.105);bird.scale.set(1.3,.85,.8);sphere(root,c.cream,.069,[.095,.065,0]);sphere(root,c.dark,.012,[.143,.081,.044]);mesh(new THREE.ConeGeometry(.031,.09,12),c.brass,root,[.178,.055,0],[0,0,-Math.PI/2]);block(root,c.forest,[.13,.018,.075],[-.112,.012,0],[0,0,.35]);return root;}
export const BOOK_OVERVIEW_IDS=['book-cover','book-binding','book-press','book-catalog','book-globe','book-music','book-projector','book-slides'];
function overview(view) {
  const c=palette(view),root=group(view.scene,[0,0,0],'hillside-library-overview');
  block(root,c.wood,[5.75,.18,3.34],[0,-.07,0]);block(root,c.paper,[5.55,.034,3.16],[0,.04,0]);
  for(let i=0;i<11;i++)block(root,c.wood,[.008,.004,3.04],[-2.53+i*.5,.06,0]);
  block(root,c.cream,[5.64,2.85,.09],[0,1.47,-1.52]);block(root,c.darkWood,[5.72,.07,.14],[0,2.94,-1.51]);
  block(root,c.cream,[.085,2.45,1.18],[-2.79,1.26,-.87]);block(root,c.darkWood,[.13,.06,1.25],[-2.79,2.49,-.87]);
  const window=group(root,[-2.724,1.62,-.7]);window.rotation.y=Math.PI/2;
  block(window,c.darkWood,[1.05,1.35,.035]);block(window,c.glass,[.93,1.22,.04],[0,0,.014]);
  const curtains=group(window,[0,0,.051],'book-overview-curtains'),cloth=mat('#afab86',{roughness:.99,clearcoat:0}),panels=[];
  for(const side of[-1,1]){const panel=group(curtains,[side*.51,0,0]);panels.push(panel);for(let i=0;i<5;i++)cylinder(panel,cloth,.045,1.24,[(i-2)*.066,0,0]);}
  const curtainHandle=group(root,[-2.35,1.37,.45]);tube([[-.3,.66,-.32],[-.04,.4,0],[0,.05,0]],.012,c.brass,curtainHandle);ring(curtainHandle,c.darkWood,.087,.019);registerAction(view,'library-curtain',curtainHandle);
  const screen=group(root,[.12,2.03,-1.459],'book-overview-projection');block(screen,c.darkWood,[4.95,1.66,.052]);block(screen,c.paper,[4.82,1.53,.015],[0,0,.035]);
  const images=['greenhouse','lighthouse','train'].map((story,i)=>imagePanel(screen,story,[1.53,1.41],[(i-1)*1.59,0,.055],`book-overview-picture-${story}`));
  const haze=mesh(new THREE.PlaneGeometry(4.77,1.46),new THREE.MeshBasicMaterial({color:'#f3ddb0',transparent:true,opacity:0,depthWrite:false}),screen,[0,0,.059]);haze.name='book-overview-unfocused-light';haze.castShadow=false;
  // Eight readable silhouettes, with low furniture kept below the projection's bottom edge.
  const zones=[
    ['book-cover',[-1.84,.08,.94],[1.12,.71,.7]],['book-binding',[-1.74,.08,-.02],[1.15,.88,.68]],['book-press',[-1.8,.08,-.94],[1.1,1,.64]],
    ['book-catalog',[1.86,.08,-1.02],[1.11,1.15,.64]],['book-globe',[1.91,.08,-.02],[.83,1.18,.78]],['book-music',[1.68,.08,.99],[.83,1.04,.66]],
    ['book-projector',[-.2,.08,.3],[1.15,1.1,.85]],['book-slides',[.23,.08,-.7],[1.55,1,.54]],
  ],restored=new Map(),placeholders=new Map(),highlights=new Map();
  for(const[id,position,size]of zones){restored.set(id,group(root,position,`restored-${id}`));const ghost=group(root,position,`placeholder-${id}`);placeholders.set(id,ghost);const geometry=new THREE.BoxGeometry(...size),edges=new THREE.EdgesGeometry(geometry);geometry.dispose();const outline=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:'#9b9c83',transparent:true,opacity:.28}));outline.position.y=size[1]/2;ghost.add(outline);const halo=ring(root,new THREE.MeshBasicMaterial({color:'#e2b55e',transparent:true,opacity:0,depthWrite:false}),Math.min(.52,size[0]*.47),.015,[position[0],.071,position[2]],TOP);halo.name=`chapter-highlight-${id}`;halo.castShadow=false;highlights.set(id,halo);}
  const cover=restored.get('book-cover');table(cover,c,1.13,.55,.69);book(cover,c,[-.1,.64,0],.12,c.forest,[.63,.13,.48]);book(cover,c,[.13,.75,.02],-.08,c.rust,[.58,.08,.44]);
  // The repaired picture book opens as two cream pages with a small original plant motif.
  const page=group(cover,[.13,.805,.02],'book-overview-open-page');block(page,c.paper,[.55,.009,.43]);tube([[-.05,.015,.13],[0,.03,0],[.06,.016,-.12]],.008,c.forest,page);
  const bind=restored.get('book-binding');table(bind,c,1.13,.61,.64);book(bind,c,[-.14,.7,0],0,c.cream,[.66,.09,.47]);for(let i=0;i<5;i++)ring(bind,c.brass,.034,.007,[-.4+i*.12,.757,.12],[0,Math.PI/2,0]);cylinder(bind,c.rust,.063,.09,[.37,.72,.02]);
  const press=restored.get('book-press');table(press,c,1.09,.43,.63);block(press,c.wood,[.93,.055,.56],[0,.56,0]);for(const x of[-.35,.35])cylinder(press,c.brass,.029,.37,[x,.74,0]);block(press,c.darkWood,[.89,.07,.5],[0,.91,0]);book(press,c,[0,.66,0],0,c.sage,[.57,.15,.42]);for(const x of[-.35,.35]){cylinder(press,c.darkWood,.082,.04,[x,.974,0]);block(press,c.brass,[.19,.025,.025],[x,1.005,0]);}
  const catalog=restored.get('book-catalog');block(catalog,c.wood,[1.1,1.08,.59],[0,.55,0]);for(let row=0;row<3;row++)for(let col=0;col<3;col++){block(catalog,c.sage,[.31,.29,.039],[(col-1)*.345,.21+row*.33,.315]);block(catalog,c.paper,[.15,.055,.012],[(col-1)*.345,.235+row*.33,.341]);sphere(catalog,c.brass,.023,[(col-1)*.345,.167+row*.33,.349]);}
  const globe=restored.get('book-globe');table(globe,c,.8,.55,.7);cylinder(globe,c.wood,.24,.045,[0,.614,0]);const globeRoot=group(globe,[0,.94,0],'book-overview-globe');sphere(globeRoot,c.sage,.28);for(let i=0;i<4;i++)ring(globeRoot,c.cream,.282,.004,[0,0,0],[0,i*Math.PI/4,0]);ring(globeRoot,c.brass,.337,.018,[0,0,0],[0,0,-.3]);for(const [x,y,z,s]of[[-.1,.14,.2,.14],[.15,-.07,.17,.13],[-.04,-.19,.13,.09]]){const land=sphere(globeRoot,c.forest,s,[x,y,z]);land.scale.z=.25;}
  const music=restored.get('book-music');table(music,c,.85,.55,.65);cylinder(music,c.wood,.28,.17,[0,.7,0]);cylinder(music,c.brass,.25,.024,[0,.799,0]);const bird=miniBird(music,c);tube([[.29,.7,0],[.37,.7,0],[.37,.77,0]],.017,c.brass,music);sphere(music,c.rust,.04,[.37,.8,0]);
  const projectorRoot=restored.get('book-projector');table(projectorRoot,c,1.22,.58,.87);const device=miniProjector(projectorRoot,c);device.root.position.set(0,.63,-.03);
  const slideRoot=restored.get('book-slides');table(slideRoot,c,1.53,.75,.55);block(slideRoot,c.wood,[1.42,.055,.31],[0,.84,0]);
  const slideCards=[];for(const[i,story]of['greenhouse','lighthouse','train'].entries()){const model=slide(slideRoot,c,story);model.root.scale.setScalar(.41);model.root.rotation.x=Math.PI*.44;model.root.position.set((i-1)*.46,1.02,0);model.picture.material.opacity=1;slideCards.push(model.root);}
  // Controls are deliberately in the open foreground, away from the projector's body and other furniture.
  const load=group(root,[-.97,.79,.81],'book-overview-load-tray');block(load,c.wood,[.32,.13,.38]);for(let i=0;i<3;i++)block(load,c.cream,[.22,.025,.25],[0,.079+i*.025,0]);registerAction(view,'library-load',load);
  const focus=group(root,[.2,.77,.86],'book-overview-focus-control');cylinder(focus,c.brass,.117,.085,[0,0,0],FRONT);ring(focus,c.darkWood,.081,.015,[0,0,.052]);registerAction(view,'library-focus',focus);
  const storyHandle=group(root,[.8,.86,.89],'book-overview-story-control');cylinder(storyHandle,c.brass,.07,.04,[0,-.08,0],FRONT);block(storyHandle,c.brass,[.035,.21,.035],[0,.03,0]);sphere(storyHandle,c.darkWood,.088,[0,.15,0]);registerAction(view,'library-stories',storyHandle);
  const cone=beam(root,[-.2,1.04,-.09],[.12,2.03,-1.37],.95);cone.name='book-overview-projection-beam';
  const lamp=group(root,[-1.12,1.06,-1.12]);cylinder(lamp,c.brass,.026,.55);mesh(new THREE.ConeGeometry(.17,.18,24,1,true),c.sage,lamp,[0,.33,0]);const bulb=sphere(lamp,mat('#ffe5ac',{emissive:'#ffd993',emissiveIntensity:1.4}),.048,[0,.28,0]);const warm=new THREE.PointLight('#ffd59c',.6,4,1.8);warm.position.set(-1.12,1.34,-1.12);root.add(warm);
  return{update(dt,time,{before=false,stage='overview'}={}){
    const collection=view.state.seasonRestored||new Set(),chapter=view.state.chapterHighlights||new Set();
    for(const[id,object]of restored){object.visible=!before&&collection.has(id);placeholders.get(id).visible=!object.visible;const halo=highlights.get(id);halo.visible=object.visible&&chapter.has(id);halo.material.opacity=halo.visible?.46+Math.sin(time*1.6)*.08:0;}
    const preview=stage==='overview'||view.state.shopPreview===true,done=view.state.completed||stage==='done',ready=BOOK_OVERVIEW_IDS.every(id=>collection.has(id));
    const value=id=>before?0:done||(preview&&ready)?1:progress(view,id);
    const closed=value('library-curtain'),loaded=value('library-load'),focused=value('library-focus'),stories=value('library-stories');
    panels.forEach((panel,i)=>{panel.position.x=(i?1:-1)*(.51-closed*.25);panel.scale.x=1+closed*.56;});curtains.userData.closedAmount=closed;
    load.position.y=.79-loaded*.08;focus.rotation.z=-focused*Math.PI*2;storyHandle.rotation.z=-stories*Math.PI*.5;
    slideCards.forEach((card,i)=>{card.position.y=1.02-loaded*.1;card.userData.loaded=loaded>0;});
    const opacities=[focused,clamp(stories/.5),clamp((stories-.5)/.5)];
    images.forEach((image,i)=>{image.material.opacity=!before&&ready?opacities[i]:0;image.userData.revealed=image.material.opacity;});
    haze.material.opacity=ready?loaded*(1-focused)*.68:0;cone.material.opacity=ready?loaded*.045:0;
    screen.userData.focusAmount=focused;screen.userData.storyProgress=stories;screen.userData.pictureCount=images.filter(image=>image.material.opacity>.95).length;
    device.pilot.material.emissiveIntensity=loaded*2;device.fan.rotation.z=loaded?time*.75:0;bird.rotation.y=!before&&collection.has('book-music')?Math.sin(time*.65)*.18:0;
    page.rotation.z=!before&&collection.has('book-cover')?Math.sin(time*.5)*.015:0;globeRoot.rotation.y=!before&&collection.has('book-globe')?.15:0;
    warm.intensity=.65-closed*.38;bulb.material.emissiveIntensity=1.5-closed*.7;
  }};
}
export function buildBookFinaleScene(view) {
  if(view.level.id==='book-projector')return projector(view);
  if(view.level.id==='book-slides')return slides(view);
  if(view.level.id==='book-opening')return overview(view);
  throw new Error(`Unknown book finale level: ${view.level.id}`);
}
