import * as THREE from 'three';
import { box, mat, mesh } from './season-scene-kit.mjs';
import { canvasTexture } from './materials.mjs';

export function buildBookEnvironment(view) {
  const root=new THREE.Group();root.name='book-environment';view.scene.add(root);
  view.scene.background=new THREE.Color('#e5dfd2');
  view.scene.fog=new THREE.Fog('#e5dfd2',36,59);
  view.scene.environmentIntensity=.7;view.renderer.toneMappingExposure=.95;
  const lights=view.scene.children.filter(object=>object.isLight).map(light=>({light,intensity:light.intensity}));
  const timber=mat('#b99d7a',{map:view.wood,roughness:.62,clearcoat:.16});
  const pale=mat('#d2b893',{map:view.wood,roughness:.55,clearcoat:.2});
  const cream=mat('#e4dac5',{roughness:.92,clearcoat:0});
  const sage=mat('#90a08b',{roughness:.68,clearcoat:.1});
  const backdrops=[],leaves=[];
  const sky=canvasTexture((ctx,w,h)=>{
    const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#d6e2dc');gradient.addColorStop(.6,'#ede4cb');gradient.addColorStop(1,'#b7c6a5');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f9e7b5';ctx.beginPath();ctx.arc(w*.7,h*.29,w*.046,0,Math.PI*2);ctx.fill();
    for(const [y,color,phase]of [[.64,'#c5d0b9',.6],[.77,'#aaba9b',1.4],[.92,'#97ac87',2]]){
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w+8;x+=8)ctx.lineTo(x,h*(y+.08*Math.sin(x/w*7+phase)+.035*Math.sin(x/w*13)));ctx.lineTo(w,h);ctx.closePath();ctx.fill();
    }
    ctx.strokeStyle='#f2e4c777';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(w*.73,h);ctx.bezierCurveTo(w*.55,h*.92,w*.85,h*.83,w*.65,h*.78);ctx.stroke();
  },1024,768);
  const horizon=mesh(new THREE.PlaneGeometry(24,15),new THREE.MeshBasicMaterial({map:sky}),root,[0,3.5,-10]);horizon.castShadow=false;backdrops.push(horizon);
  const land=mesh(new THREE.PlaneGeometry(25,25),mat('#b8bd9e',{roughness:1,clearcoat:0}),root,[0,-1.67,-7],[-Math.PI/2,0,0]);land.castShadow=false;
  if(!view.level.bookOverview){
    mesh(box(5.6,.22,3.3,.045),pale,root,[0,-.12,0]);
    for(const x of [-2.35,2.35])for(const z of [-1.2,1.2])mesh(box(.14,1.31,.14,.02),timber,root,[x,-.84,z]);
    mesh(box(8,.15,5.5,.06),mat('#cfbfa3',{roughness:.92,clearcoat:0}),root,[0,-1.56,-.2]);
    const window=new THREE.Group();window.position.z=-2.37;root.add(window);backdrops.push(window);
    for(const x of [-3.1,3.1])mesh(box(1,3.8,.16),cream,window,[x,.4,0]);
    mesh(box(5.25,.74,.16),cream,window,[0,-1.18,0]);
    for(const x of [-2.55,2.55])mesh(box(.12,2.57,.18,.025),timber,window,[x,.58,.04]);
    const arch=new THREE.EllipseCurve(0,1.86,2.55,.83,0,Math.PI,false,0);
    const arcPoints=arch.getPoints(40).map(p=>new THREE.Vector3(p.x,p.y,.04));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPoints),40,.065,8,false),timber,window);
    for(const x of [-1.27,0,1.27])mesh(box(.052,2.65,.07,.009),sage,window,[x,.59,.08]);
    for(const y of [-.69,.6,1.82])mesh(box(5.12,.055,.095,.01),sage,window,[0,y,.07]);
    mesh(box(5.48,.09,.4,.02),pale,window,[0,-.73,.18]);
    for(const x of [-2.25,2.25]){
      const curtain=mesh(box(.39,2.6,.12,.045),mat('#ceb9aa',{roughness:1,clearcoat:0}),window,[x,.59,.22]);curtain.name='library-linen-curtain';
      for(let i=0;i<4;i++)mesh(box(.023,2.51,.012,.004),mat('#e5d4bd',{roughness:1,clearcoat:0}),curtain,[-.135+i*.09,0,.066]);
    }
    const pot=new THREE.Group();pot.position.set(2.08,-.64,-2.02);root.add(pot);backdrops.push(pot);
    mesh(new THREE.CylinderGeometry(.19,.15,.31,20),mat('#c5b091',{roughness:.85}),pot,[0,.15,0]);
    for(let i=0;i<7;i++){
      const leaf=mesh(new THREE.SphereGeometry(1,12,8),mat(i%2?'#899c79':'#a6b090',{roughness:1,clearcoat:0}),pot,[Math.sin(i*2)*.14,.48+i*.047,Math.cos(i*2)*.06]);
      leaf.scale.set(.055,.24,.018);leaf.rotation.z=Math.sin(i*2)*.5;leaves.push({leaf,angle:leaf.rotation.z});
    }
  }else{
    mesh(box(8,.17,5.8,.06),mat('#c8baa0',{roughness:.92,clearcoat:0}),root,[0,-.22,.05]);
  }
  return {update(dt,time,{before=false}={}){
    for(const object of backdrops)object.visible=Math.cos(view.angle)>.12;
    for(let i=0;i<leaves.length;i++)leaves[i].leaf.rotation.z=leaves[i].angle+Math.sin(time*.5+i)*.025;
    const dim=before?0:Math.max(0,Math.min(1,view.state.taskValues[view.level.ambientDimTask]||0));
    for(const entry of lights)entry.light.intensity=entry.intensity*(1-dim*.45);
    horizon.material.color.setScalar(1-dim*.2);
  }};
}
