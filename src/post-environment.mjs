import * as THREE from 'three';
import { box, mat, mesh, label } from './season-scene-kit.mjs';
import { canvasTexture } from './materials.mjs';

export function buildPostEnvironment(view) {
  const root = new THREE.Group(); view.scene.add(root);
  view.scene.background = new THREE.Color('#cfdee0');
  view.scene.fog = new THREE.Fog('#cfdee0', 40, 85);
  view.scene.environmentIntensity = .68;
  view.renderer.toneMappingExposure = .96;
  const timber=mat('#b29976',{map:view.wood,roughness:.6,clearcoat:.16});
  const pale=mat('#d2bd98',{map:view.wood,roughness:.48,clearcoat:.22});
  const cream=mat('#e8dfc8',{roughness:.8,clearcoat:0});
  const frame=mat('#8da9a6',{roughness:.58,clearcoat:.18});
  const metal=mat('#af9570',{metalness:.7,roughness:.38});
  const backdrops=[];
  const sky=canvasTexture((ctx,w,h)=>{
    const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#d5e2df');gradient.addColorStop(.47,'#e6e6d4');gradient.addColorStop(.49,'#b6d2d2');gradient.addColorStop(1,'#699ca8');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f4e6b4';ctx.beginPath();ctx.arc(w*.71,h*.33,w*.045,0,Math.PI*2);ctx.fill();
    for(let i=0;i<38;i++){const y=h*(.51+i*.013);ctx.strokeStyle=`rgba(244,247,224,${.08+(i%4)*.025})`;ctx.lineWidth=1+i*.018;ctx.beginPath();for(let x=0;x<=w;x+=8){const yy=y+Math.sin(x*.015+i*1.3)*(1+i*.08);x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}
    ctx.fillStyle='#8eafb055';ctx.beginPath();ctx.moveTo(0,h*.51);ctx.quadraticCurveTo(w*.16,h*.32,w*.32,h*.51);ctx.fill();
  },1024,768);
  const horizon=mesh(new THREE.PlaneGeometry(23,13),new THREE.MeshBasicMaterial({map:sky}),root,[0,3.2,-8.7]);horizon.castShadow=false;backdrops.push(horizon);
  const sea=mesh(new THREE.PlaneGeometry(22,20),mat('#94b9bb',{roughness:.35,metalness:.08,clearcoat:.4}),root,[0,-1.55,-8.2],[-Math.PI/2,0,0]);sea.castShadow=false;
  const waveMaterial=new THREE.MeshBasicMaterial({color:'#e8efdc',transparent:true,opacity:.16,depthWrite:false});
  const waves=[];
  for(let i=0;i<13;i++) {const wave=mesh(new THREE.PlaneGeometry(3+(i%4)*1.2,.015),waveMaterial,root,[-5.5+(i*2.13)%10,-1.539,-3.8-(i%7)*1.15],[-Math.PI/2,0,(i%3-.8)*.07]);wave.castShadow=false;waves.push(wave);}
  if (!view.level.postOverview) {
    mesh(box(5.55,.2,3.12,.04),pale,root,[0,-.11,0]);
    for(const x of [-2.36,2.36])for(const z of [-1.18,1.18])mesh(box(.13,1.2,.13),timber,root,[x,-.78,z]);
    mesh(box(7.6,.16,5.4,.06),mat('#d8d0b9',{roughness:.94}),root,[0,-1.48,-.38]);
    for(const x of [-3.26,3.26])backdrops.push(mesh(box(1.0,3.7,.13),cream,root,[x,.56,-2.15]));
    for(const y of [-.74,2.36])backdrops.push(mesh(box(5.64,.4,.14),cream,root,[0,y,-2.15]));
    for(const x of [-2.74,0,2.74])backdrops.push(mesh(box(.075,2.74,.09),frame,root,[x,.78,-2.12]));
    for(const y of [-.57,.66,2.14])backdrops.push(mesh(box(5.55,.065,.11),frame,root,[0,y,-2.08]));
    const pane=mesh(new THREE.PlaneGeometry(5.44,2.7),mat('#d8efeb',{transparent:true,opacity:.07,roughness:.1,depthWrite:false,side:THREE.DoubleSide}),root,[0,.77,-2.15]);pane.castShadow=false;backdrops.push(pane);
    backdrops.push(mesh(box(5.82,.085,.26),pale,root,[0,-.61,-2.02]));
    const plaque=mesh(box(1.12,.4,.06),timber,root,[-1.84,2.25,-1.98]);backdrops.push(plaque);
    const sign=mesh(new THREE.PlaneGeometry(1.04,.33),new THREE.MeshBasicMaterial({map:label('灯塔邮局','LETTERS FIND THEIR WAY','#4c6b64','#e3d5b6')}),root,[-1.84,2.25,-1.94]);sign.castShadow=false;backdrops.push(sign);
    const tower=new THREE.Group();root.add(tower);tower.position.set(-4.5,-1.4,-5.8);backdrops.push(tower);
    mesh(new THREE.CylinderGeometry(.24,.43,2.35,32),cream,tower,[0,1.17,0]);
    for(const y of [.65,1.38])mesh(new THREE.CylinderGeometry(.34-y*.04,.36-y*.04,.2,32),mat('#b47f6c',{roughness:.72}),tower,[0,y,0]);
    mesh(new THREE.CylinderGeometry(.39,.32,.13,32),metal,tower,[0,2.4,0]);
    mesh(new THREE.CylinderGeometry(.28,.28,.4,24),mat('#d5e0c3',{roughness:.2,clearcoat:.8}),tower,[0,2.66,0]);
    mesh(new THREE.ConeGeometry(.43,.29,32),mat('#7f9692'),tower,[0,2.99,0]);
    const rays=mesh(new THREE.SphereGeometry(.11,16,12),new THREE.MeshBasicMaterial({color:'#ffe2a0'}),tower,[0,2.66,.24]);rays.castShadow=false;
  } else {
    mesh(box(7.7,.2,5.2,.065),mat('#d4c8ab',{roughness:.93}),root,[0,-.22,.1]);
  }
  return {update(dt,time){
    const dx=Math.sin(view.angle),dz=Math.cos(view.angle);
    for(const object of backdrops)object.visible=object.position.x*dx+object.position.z*dz<.6;
    waveMaterial.opacity=.13+Math.sin(time*.42)*.025;
    for(let i=0;i<waves.length;i++)waves[i].position.x+=Math.sin(time*.22+i)*dt*.007;
  }};
}
