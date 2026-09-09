import * as THREE from 'three';
import { mat, mesh, tube, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';
import { canvasTexture } from './materials.mjs';

const TOP = [-Math.PI / 2, 0, 0], FRONT = [Math.PI / 2, 0, 0];
const clamp = value => Math.max(0, Math.min(1, value));
const progress = (view, id, before = false) => before ? 0 : clamp(view.state.taskValues?.[id] || 0);
function group(parent, position = [0,0,0], name = '') { const root = new THREE.Group(); root.position.set(...position); root.name = name; parent?.add(root); return root; }
const block = (parent, material, size, position = [0,0,0], rotation) => mesh(new THREE.BoxGeometry(...size), material, parent, position, rotation);
const cylinder = (parent, material, radius, height, position = [0,0,0], rotation, top = radius) => mesh(new THREE.CylinderGeometry(top, radius, height, 20), material, parent, position, rotation);
const ring = (parent, material, radius, width, position = [0,0,0], rotation) => mesh(new THREE.TorusGeometry(radius,width,6,24),material,parent,position,rotation);
const sphere = (parent, material, radius, position = [0,0,0]) => mesh(new THREE.SphereGeometry(radius,20,12),material,parent,position);
function palette(view) { return {
  wood: mat('#b18b61',{map:view.wood,roughness:.8}), paleWood: mat('#c7aa7c',{map:view.wood,roughness:.84}), darkWood: mat('#765440',{map:view.wood,roughness:.8}),
  cream: mat('#ede0c5',{roughness:.88}), sage: mat('#8b9e84',{roughness:.65}), terracotta: mat('#b66f50',{roughness:.9}), iron: mat('#424a42',{roughness:.64,metalness:.2}),
  brass: mat('#bb975e',{roughness:.38,metalness:.65}), steel: mat('#b8b9a6',{roughness:.35,metalness:.75}), dark: mat('#443b31',{roughness:.98}),
  glass: mat('#cad7c9',{roughness:.14,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}), flour: mat('#f0e3c8',{roughness:1,clearcoat:0}),
}; }
function plaque(parent,text,small,size,position,background='#ede0c5',color='#392d22') {
  // Match each board's aspect ratio and prioritize full-size Chinese lettering on small signs.
  const chinese=/[\u3400-\u9fff]/u.test(text),secondary=chinese?'':small;
  const texture=canvasTexture((ctx,w,h)=>{
    ctx.fillStyle=background;ctx.fillRect(0,0,w,h);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
    const units=[...text].reduce((sum,char)=>sum+(/[\u3400-\u9fff]/u.test(char)?1:.65),0);
    const fontSize=Math.floor(Math.min(h*(secondary?.53:.76),w*.89/Math.max(1,units)));
    ctx.font=`600 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;ctx.fillText(text,w/2,h*(secondary?.43:.51));
    if(secondary){ctx.font=`500 ${Math.floor(h*.14)}px sans-serif`;ctx.fillText(secondary,w/2,h*.82);}
  },768,Math.round(768*size[1]/size[0]));
  const object=mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),parent,position);
  object.userData.readable=true;object.castShadow=false;object.receiveShadow=false;return object;
}
function crustTexture() {
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#e7d0a5';ctx.fillRect(0,0,w,h);
    let seed=17;for(let i=0;i<1600;i++){seed=(seed*1664525+1013904223)>>>0;const x=(seed%997)/997*w;seed=(seed*1664525+1013904223)>>>0;const y=(seed%991)/991*h;ctx.fillStyle=i%4?'#fff4dc48':'#8e654132';ctx.beginPath();ctx.arc(x,y,i%3*.4+.35,0,Math.PI*2);ctx.fill();}
  },256,256);
}
function loaf(parent, position=[0,0,0], name='') {
  const root=group(parent,position,name),texture=crustTexture(),crust=mat('#f0dfbc',{map:texture,bumpMap:texture,bumpScale:.014,roughness:.96,clearcoat:0});
  const body=sphere(root,crust,1);body.scale.set(.46,.215,.30);
  const cuts=[];for(let i=0;i<3;i++){
    const x=(i-1)*.22,cut=tube([[x-.065,.154,-.18],[x-.025,.219,0],[x+.035,.166,.18]],.013,mat('#926343',{roughness:1,clearcoat:0}),root);cut.name=`${name}-score-${i}`;cuts.push(cut);
    const lip=tube([[x-.045,.16,-.17],[x-.005,.223,0],[x+.055,.171,.17]],.007,mat('#f7e5be',{roughness:1,clearcoat:0}),root);lip.name=`${name}-lip-${i}`;cuts.push(lip);
  }
  return {root,body,cuts,set({gold=0,scored=0,rise=0,flour=0}={}){
    crust.color.set('#f0dfbc').lerp(new THREE.Color('#bd7137'),gold);body.scale.y=.215+rise*.075;
    cuts.forEach((cut,index)=>{const amount=clamp(scored*3-Math.floor(index/2));cut.visible=amount>0;cut.scale.z=Math.max(.001,amount);cut.position.y=rise*.072;});
    root.userData.gold=gold;root.userData.scored=scored;root.userData.rise=rise;crust.roughness=.94+flour*.05;
  }};
}
function basket(parent,c,position=[0,0,0],size=[.85,.26,.62]) {
  const root=group(parent,position);block(root,c.paleWood,[size[0],.045,size[2]],[0,-size[1]/2+.025,0]);
  for(const x of[-1,1])block(root,c.wood,[.046,size[1],size[2]],[x*size[0]/2,0,0]);
  for(const z of[-1,1])for(let i=0;i<3;i++)block(root,c.paleWood,[size[0],.045,.043],[0,-size[1]/2+.05+i*.072,z*size[2]/2]);
  for(let i=0;i<7;i++)for(const z of[-1,1])block(root,c.wood,[.018,size[1],.014],[(i-3)*size[0]/7,0,z*(size[2]/2+.024)]);
  return root;
}
function table(parent,c,width=1,height=.6,depth=.7) {block(parent,c.paleWood,[width,.08,depth],[0,height,0]);for(const x of[-width*.4,width*.4])for(const z of[-depth*.34,depth*.34])block(parent,c.darkWood,[.065,height,.065],[x,height/2,z]);}
function peel(view) {
  const c=palette(view),root=group(view.scene,[0,0,0],'bake-peel-workstation');
  block(root,c.darkWood,[3.6,.09,1.54],[0,.045,-.27]);block(root,c.paleWood,[1.39,.09,1.16],[-.96,.145,-.2]);
  block(root,c.darkWood,[.78,.095,.2],[1.21,.134,.08]);cylinder(root,c.brass,.033,.105,[1.52,.142,.08]);
  const sieve=group(root,[1.87,.17,.39],'bake-peel-sieve');cylinder(sieve,c.flour,.22,.045);ring(sieve,c.wood,.22,.026,[0,.035,0],TOP);block(sieve,c.wood,[.31,.06,.07],[.33,0,0]);registerAction(view,'peel-flour',sieve);
  const handle=group();block(handle,c.paleWood,[.18,.12,.92]);ring(handle,c.darkWood,.033,.007,[0,.062,.33],TOP);registerItem(view,view.level.items[0],handle);registerAction(view,'peel-load',handle);
  const blade=group();block(blade,c.steel,[.43,.055,.18],[0,0,0],[0,.1,0]);cylinder(blade,c.brass,.023,.07,[.14,.015,0]);registerItem(view,view.level.items[1],blade);
  const gripAction=group(root,[1.70,.18,.085],'bake-score-control');cylinder(gripAction,c.darkWood,.079,.2,[0,0,0],[0,0,Math.PI/2]);registerAction(view,'peel-score',gripAction);
  const doughOuter=group(),dough=loaf(doughOuter,[0,0,0],'bake-peel-loaf');registerItem(view,view.level.items[2],doughOuter);
  const dust=group(root,[.27,.11,-.44],'bake-peel-flour');for(let i=0;i<13;i++)cylinder(dust,c.flour,.012+(i%3)*.006,.002,[Math.sin(i*2.3)*.49,.003,Math.cos(i*2.3)*.31]);
  addSurfaces(view);
  return {update(dt,time,{before=false,stage=''}={}){
    const floured=progress(view,'peel-flour',before),scored=progress(view,'peel-score',before),loaded=progress(view,'peel-load',before),placed=!before&&view.state.placed.has('peel-dough');
    dough.root.position.set(placed?-1.23*loaded:0,placed?.09*loaded:0,placed?.24*loaded:0);dough.set({scored,flour:floured});dust.visible=floured>0;
    gripAction.rotation.y=-scored*.2;sieve.rotation.z=floured*.08;root.userData.loaded=loaded;
    // The permanent cleaning patches belong to fixed wood faces and remain truthful in comparison.
    for(const object of view.dirtyMeshes)object.visible=before||stage==='clean';
  }};
}
function showcase(parent,c,{width=2.78,height=1.39,depth=1.26}={}) {
  const root=group(parent),front=depth/2;
  block(root,c.wood,[width,.24,depth],[0,.13,0]);block(root,c.paleWood,[width+.06,.095,depth+.02],[0,height,0]);
  for(const x of[-width/2+.045,0,width/2-.045])block(root,c.wood,[.075,height-.2,.07],[x,(height+.2)/2,front-.04]);
  for(const x of[-width/2+.045,width/2-.045]){block(root,c.wood,[.075,height-.2,.07],[x,(height+.2)/2,-front+.04]);block(root,c.glass,[.03,height-.29,depth-.12],[x,(height+.2)/2,0]);}
  block(root,c.glass,[width-.16,height-.29,.025],[0,(height+.2)/2,-front+.015]);
  return root;
}
function glassDoor(parent,c) {
  const hinge=group(parent,[-.56,0,0],'bake-display-door-hinge'),panel=group(hinge,[.56,0,0]);
  block(panel,c.glass,[1.04,.025,.87]);for(const x of[-.55,.55])block(panel,c.paleWood,[.045,.075,.97],[x,0,0]);for(const z of[-.465,.465])block(panel,c.paleWood,[1.12,.075,.045],[0,0,z]);
  cylinder(panel,c.brass,.055,.09,[.36,.08,0]);return{hinge,panel};
}
function display(view) {
  const c=palette(view),root=group(view.scene,[0,0,-.2],'bake-display-workstation');showcase(root,c);
  const fixedGlass=block(root,c.glass,[1.07,.86,.025],[.62,.86,.563]);
  const doorOuter=group(),door=glassDoor(doorOuter,c);registerItem(view,view.level.items[0],doorOuter);registerAction(view,'display-arrange',door.panel);
  const shelf=group();block(shelf,c.paleWood,[1.03,.09,.62]);registerItem(view,view.level.items[1],shelf);
  const woven=group();basket(woven,c);registerItem(view,view.level.items[2],woven);
  const cloth=block(view.scene,c.sage,[.41,.07,.28],[-1.93,.085,.28],[0,.13,0]);registerAction(view,'display-polish',cloth);
  const hingeKnob=group(view.scene,[1.52,.67,.49],'bake-display-hinge-knob');cylinder(hingeKnob,c.brass,.092,.065,[0,0,0],FRONT);block(hingeKnob,c.darkWood,[.10,.018,.025],[0,0,.044]);registerAction(view,'display-hinge',hingeKnob);
  const breads=[];for(const[i,position]of [[-.6,.46,-.3],[.6,.9,-.15],[1.69,.42,.27]].entries()){
    const bread=loaf(view.scene,position,`bake-display-loaf-${i}`);bread.root.scale.setScalar(i===2?.75:.83);bread.set({gold:1,scored:1,rise:1});breads.push(bread);
  }
  const price=plaque(root,'每日新烤','FRESHLY BAKED',[.72,.18],[0,1.397,.649]);price.name='bake-display-label';
  addSurfaces(view);
  return{update(dt,time,{before=false,stage=''}={}){
    const polished=progress(view,'display-polish',before),hinge=before?0:clamp((view.state.taskValues?.['display-hinge']||0)/30),arranged=progress(view,'display-arrange',before);
    door.hinge.rotation.z=arranged*.95;cloth.rotation.y=.13+polished*.15;hingeKnob.rotation.z=-hinge*Math.PI;
    breads.forEach((bread,i)=>{const amount=clamp(arranged*3-i);bread.root.visible=amount>0;bread.root.scale.setScalar((i===2?.75:.83)*Math.max(.01,amount));});
    fixedGlass.material.opacity=.24+polished*.015;root.userData.arranged=arranged;
    for(const object of view.dirtyMeshes)object.visible=before||stage==='clean';
  }};
}
function miniOven(parent,c) {
  const root=group(parent,[0,0,0]);block(root,c.terracotta,[1.23,.2,1.05],[0,.13,0]);block(root,c.terracotta,[1.25,.22,1.05],[0,1.22,0]);
  for(const x of[-.55,.55])block(root,c.terracotta,[.14,.99,1.05],[x,.69,0]);block(root,c.dark,[1,.85,.055],[0,.72,-.48]);
  block(root,c.iron,[.96,.05,.9],[0,.43,0]);block(root,c.iron,[1.13,.08,.26],[0,.34,.58]);
  const lamp=block(root,mat('#f1ad59',{emissive:'#f6a147',emissiveIntensity:0}),[.79,.035,.61],[0,.45,.04]);lamp.name='bake-oven-hearth';
  for(let i=0;i<6;i++)block(root,c.paleWood,[.165,.045,.032],[-.455+i*.18,1.16,.543]);
  plaque(root,'BAKE','',[.57,.14],[0,1.27,.537]);return{root,lamp};
}
function miniMill(parent,c){table(parent,c,.78,.59,.62);cylinder(parent,c.iron,.26,.28,[0,.77,0]);cylinder(parent,c.paleWood,.29,.32,[0,1.03,0],undefined,.38);cylinder(parent,c.cream,.245,.015,[0,1.195,0]);tube([[.27,.84,0],[.43,.84,0],[.43,.98,0]],.025,c.brass,parent);sphere(parent,c.darkWood,.066,[.43,1,0]);block(parent,c.cream,[.23,.15,.21],[0,.71,.26]);}
function miniScale(parent,c){table(parent,c,.74,.57,.62);block(parent,c.sage,[.55,.19,.43],[0,.70,0]);cylinder(parent,c.cream,.15,.045,[0,.76,.23],FRONT);block(parent,c.darkWood,[.018,.12,.02],[0,.78,.261],[0,0,-.5]);cylinder(parent,c.brass,.026,.25,[0,.88,0]);cylinder(parent,c.steel,.31,.055,[0,1.025,0]);}
function miniMixer(parent,c){table(parent,c,.76,.56,.68);block(parent,c.sage,[.69,.1,.57],[0,.66,0]);block(parent,c.sage,[.18,.58,.28],[-.24,.94,-.13]);block(parent,c.sage,[.62,.19,.33],[-.02,1.21,-.05]);cylinder(parent,c.steel,.24,.24,[.13,.82,.09],undefined,.3);cylinder(parent,c.cream,.235,.02,[.13,.946,.09]);cylinder(parent,c.brass,.024,.24,[.13,1.05,.09]);}
export const BAKE_OVERVIEW_IDS=['bake-oven','bake-mill','bake-scale','bake-mixer','bake-dough','bake-proof','bake-peel','bake-display'];
function overview(view) {
  const c=palette(view),root=group(view.scene,[0,0,0],'evening-bakery-overview');
  block(root,c.darkWood,[5.77,.18,3.42],[0,-.075,0]);block(root,c.paleWood,[5.59,.034,3.25],[0,.038,0]);for(let i=0;i<12;i++)block(root,c.darkWood,[.008,.004,3.16],[-2.59+i*.47,.061,0]);
  block(root,c.cream,[5.65,2.6,.1],[0,1.36,-1.61]);block(root,c.darkWood,[5.73,.08,.16],[0,2.7,-1.6]);
  const window=group(root,[.36,1.99,-1.547],'bake-bakery-window');block(window,c.paleWood,[2.28,1.06,.08]);
  block(window,mat('#efc497',{roughness:1}),[2.12,.90,.013],[0,0,.048]);block(window,c.paleWood,[.05,.94,.045],[0,0,.072]);block(window,c.paleWood,[2.14,.045,.045],[0,0,.071]);
  cylinder(window,mat('#ffdfaa',{emissive:'#edbd77',emissiveIntensity:.35}),.17,.018,[.72,.2,.068],FRONT);
  for(const x of[-1.3,1.3]){block(root,c.sage,[.15,.8,.12],[x+.36,1.99,-1.49]);block(root,c.paleWood,[.55,.08,.22],[x+.36,1.46,-1.46]);}
  plaque(root,'晚风面包房','A LITTLE WARMTH TO SHARE',[1.06,.31],[-1.9,2.24,-1.544]);
  const zones=[['bake-oven',[-1.87,.075,-.91],[1.25,1.37,1.1]],['bake-mill',[-.52,.075,-1.08],[.88,1.26,.66]],['bake-scale',[.52,.075,-1.02],[.78,1.13,.68]],['bake-mixer',[1.82,.075,-1.03],[.92,1.36,.75]],['bake-dough',[-1.94,.075,.71],[1.08,.79,.72]],['bake-proof',[-.69,.075,.29],[.98,.92,.78]],['bake-peel',[.18,.075,.91],[.67,.66,.62]],['bake-display',[1.63,.075,.48],[1.62,1.17,1.06]]];
  const restored=new Map(),placeholders=new Map(),highlights=new Map();
  for(const[id,position,size]of zones){restored.set(id,group(root,position,`restored-${id}`));const ghost=group(root,position,`placeholder-${id}`),geometry=new THREE.BoxGeometry(...size),edges=new THREE.EdgesGeometry(geometry);geometry.dispose();const outline=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:'#ac977b',transparent:true,opacity:.3}));outline.position.y=size[1]/2;ghost.add(outline);placeholders.set(id,ghost);const halo=ring(root,new THREE.MeshBasicMaterial({color:'#dfb166',transparent:true,opacity:.5,depthWrite:false}),Math.min(.52,size[0]*.46),.015,[position[0],.067,position[2]],TOP);halo.name=`chapter-highlight-${id}`;halo.castShadow=false;highlights.set(id,halo);}
  const oven=miniOven(restored.get('bake-oven'),c);miniMill(restored.get('bake-mill'),c);miniScale(restored.get('bake-scale'),c);miniMixer(restored.get('bake-mixer'),c);
  const dough=restored.get('bake-dough');table(dough,c,1.09,.6,.74);block(dough,c.paleWood,[.86,.045,.53],[0,.674,0]);const rolling=cylinder(dough,c.darkWood,.061,.55,[0,.75,-.04],[0,0,Math.PI/2]);for(const x of[-.36,.36])cylinder(dough,c.paleWood,.03,.2,[x,.75,-.04],[0,0,Math.PI/2]);
  const proof=restored.get('bake-proof');table(proof,c,.98,.58,.74);basket(proof,c,[0,.77,0],[.76,.25,.58]);const cloth=block(proof,c.cream,[.67,.045,.56],[0,.91,0],[0,.05,0]);
  const peelStand=restored.get('bake-peel');cylinder(peelStand,c.terracotta,.19,.46,[0,.25,0]);block(peelStand,c.paleWood,[.07,.70,.065],[0,.67,0],[0,0,-.16]);block(peelStand,c.paleWood,[.43,.49,.04],[.06,1.15,0],[0,0,-.16]);
  const displayRoot=restored.get('bake-display'),casework=showcase(displayRoot,c,{width:1.62,height:1.04,depth:.93});block(displayRoot,c.paleWood,[1.44,.045,.7],[0,.63,0]);
  for(const[i,x]of[-.45,.05,.5].entries()){const bread=loaf(displayRoot,[x,.82,0],`bake-overview-display-loaf-${i}`);bread.root.scale.setScalar(.48);bread.set({gold:1,scored:1,rise:1});}
  plaque(displayRoot,'FRESH','',[.65,.16],[0,.17,.482]);
  const serving=group(root,[.94,.075,1.27],'bake-final-serving-table');table(serving,c,1.34,.49,.55);basket(serving,c,[0,.68,0],[1.12,.27,.61]);
  const bread=loaf(root,[-1.87,.82,.33],'bake-final-loaf');bread.root.scale.setScalar(.94);
  const movingPeel=group(root,[-1.87,.64,.33],'bake-final-moving-peel');block(movingPeel,c.paleWood,[1.04,.045,.7]);block(movingPeel,c.darkWood,[.12,.045,.72],[0,0,.63]);
  const loadHandle=group(root,[-2.59,.70,.62],'bake-final-load-control');block(loadHandle,c.paleWood,[.16,.11,.65]);ring(loadHandle,c.darkWood,.031,.008,[0,.063,.23],TOP);registerAction(view,'bakery-load',loadHandle);
  const heatKnob=group(root,[-1.34,.55,.44],'bake-final-heat-control');cylinder(heatKnob,c.terracotta,.13,.10,[0,0,0],FRONT);block(heatKnob,c.cream,[.025,.15,.015],[0,0,.064]);registerAction(view,'bakery-bake',heatKnob);
  const tray=group(root,[.32,.24,1.54],'bake-final-serve-control');block(tray,c.paleWood,[.37,.065,.19]);block(tray,c.brass,[.29,.04,.032],[0,.05,.08]);registerAction(view,'bakery-serve',tray);
  const sign=group(root,[2.38,.71,1.30],'bake-final-sign');for(const x of[-.3,.3])block(sign,c.darkWood,[.035,.76,.055],[x,-.27,-.02]);const signBoard=block(sign,c.sage,[.65,.40,.045]);
  const closed=plaque(sign,'准备中','TAKING CARE',[.61,.36],[0,0,.027]);closed.name='bake-sign-closed';const open=plaque(sign,'开门啦','FRESH & WARM',[.61,.36],[0,0,.03]);open.name='bake-sign-open';registerAction(view,'bakery-open',sign);
  const steam=group(root,[.94,1,1.27],'bake-final-steam');for(let i=0;i<5;i++){const puff=sphere(steam,new THREE.MeshBasicMaterial({color:'#fff0d7',transparent:true,opacity:0,depthWrite:false}),.055,[Math.sin(i*2)*.26,i*.07,Math.cos(i*2)*.08]);puff.castShadow=false;}
  const light=new THREE.PointLight('#ffd49b',.55,5,1.8);light.position.set(-1.8,1.7,-.3);root.add(light);
  return{update(dt,time,{before=false,stage='overview'}={}){
    const collection=view.state.seasonRestored||new Set(),chapter=view.state.chapterHighlights||new Set();for(const[id,object]of restored){object.visible=!before&&collection.has(id);placeholders.get(id).visible=!object.visible;const halo=highlights.get(id);halo.visible=object.visible&&chapter.has(id);halo.material.opacity=.45+Math.sin(time*1.6)*.07;}
    const ready=BAKE_OVERVIEW_IDS.every(id=>collection.has(id)),preview=stage==='overview'||view.state.shopPreview===true,done=view.state.completed||stage==='done';
    const value=id=>before||!ready?0:(done||preview)?1:progress(view,id);
    const loaded=value('bakery-load'),baked=value('bakery-bake'),served=value('bakery-serve'),opened=value('bakery-open');
    const x=THREE.MathUtils.lerp(-1.87,.94,served),z=THREE.MathUtils.lerp(.33-loaded*1.2,1.27,served),y=THREE.MathUtils.lerp(.82-loaded*.10,.83,served)+Math.sin(served*Math.PI)*.27;
    bread.root.position.set(x,y,z);bread.set({gold:baked,scored:1,rise:baked,flour:1});bread.root.visible=!before&&ready;
    movingPeel.position.set(x,y-.195,z);movingPeel.visible=!before&&ready&&served<.999;
    root.userData.loaded=loaded;root.userData.baked=baked;root.userData.served=served;root.userData.opened=opened;
    heatKnob.rotation.z=-baked*Math.PI*.8;oven.lamp.material.emissiveIntensity=baked*.9;light.intensity=.45+baked*.22;
    tray.position.z=1.54-served*.05;closed.visible=opened<.5;open.visible=opened>=.5;signBoard.material.color.set(opened?'#879e7a':'#ad9a76');
    steam.visible=!before&&served>.7;steam.children.forEach((puff,i)=>{const t=(time*.23+i*.17)%1;puff.position.y=t*.42;puff.position.x=Math.sin(i*2+t)*.25;puff.scale.setScalar(.55+t*.9);puff.material.opacity=(1-t)*.17*clamp((served-.7)/.3);});
    cloth.rotation.z=!before&&collection.has('bake-proof')?.015:0;rolling.rotation.x=!before&&collection.has('bake-dough')?.13:0;
    loadHandle.visible=heatKnob.visible=tray.visible=sign.visible=!before&&ready;serving.visible=!before&&collection.has('bake-display');
  }};
}
export function buildBakeFinaleScene(view) {
  if(view.level.id==='bake-peel')return peel(view);
  if(view.level.id==='bake-display')return display(view);
  if(view.level.id==='bake-opening')return overview(view);
  throw new Error(`Unknown bake finale level: ${view.level.id}`);
}
