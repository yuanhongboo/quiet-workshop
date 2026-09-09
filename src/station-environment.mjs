import * as THREE from 'three';
import { box, mat, mesh } from './season-scene-kit.mjs';
import { canvasTexture } from './materials.mjs';

// The workshop shares one quiet mountain platform. Decorative scenery stays
// behind the inspected object so turning a cleaning face never adds an obstacle.
export function buildStationEnvironment(view) {
  const root = new THREE.Group(); root.name = 'station-environment'; view.scene.add(root);
  view.scene.background = new THREE.Color('#dfe5d9');
  view.scene.fog = new THREE.Fog('#dfe5d9', 35, 59);
  view.scene.environmentIntensity = .67;
  view.renderer.toneMappingExposure = .95;
  const wood = mat('#bea17a', {map:view.wood,roughness:.62,clearcoat:.14});
  const pine = mat('#d5ba90', {map:view.wood,roughness:.56,clearcoat:.18});
  const sage = mat('#7f9680', {roughness:.62,clearcoat:.15});
  const cream = mat('#dedbc2', {roughness:.85,clearcoat:0});
  const backdrops = [], branches = [];
  const sky = canvasTexture((ctx,w,h) => {
    const gradient=ctx.createLinearGradient(0,0,0,h);
    gradient.addColorStop(0,'#dce7e1'); gradient.addColorStop(.62,'#e9e7cd'); gradient.addColorStop(1,'#a8bfa3');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f6e6b5';ctx.beginPath();ctx.arc(w*.67,h*.25,w*.04,0,Math.PI*2);ctx.fill();
    for(const [y,color,amp] of [[.55,'#bacabc',.13],[.66,'#a2b8a2',.17],[.78,'#88a487',.15]]){
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,h);
      for(let x=0;x<=w+8;x+=8){const ridge=y+Math.sin(x/w*8+.9)*amp+Math.sin(x/w*16+1.6)*amp*.3;ctx.lineTo(x,h*ridge);}
      ctx.lineTo(w,h);ctx.closePath();ctx.fill();
    }
    ctx.fillStyle='#f5eed933';ctx.fillRect(0,h*.71,w,h*.035);
  },1024,768);
  const horizon=mesh(new THREE.PlaneGeometry(25,16),new THREE.MeshBasicMaterial({map:sky}),root,[0,4,-10]);horizon.castShadow=false;backdrops.push(horizon);
  const land=mesh(new THREE.PlaneGeometry(36,30),mat('#9eaf8b',{roughness:1,clearcoat:0}),root,[0,-1.63,-7],[-Math.PI/2,0,0]);land.castShadow=false;
  function tree(x,z,scale,color) {
    const group=new THREE.Group();group.position.set(x,-1.6,z);group.scale.setScalar(scale);root.add(group);backdrops.push(group);
    mesh(new THREE.CylinderGeometry(.045,.065,1.75,8),wood,group,[0,.86,0]);
    const foliage=mat(color,{roughness:1,clearcoat:0});
    for(const [y,r,h] of [[1.1,.52,.9],[1.55,.42,.8],[1.94,.31,.73]])mesh(new THREE.ConeGeometry(r,h,12),foliage,group,[0,y,0]);
    branches.push(group);
  }
  tree(-4.4,-4.6,1.25,'#789578');tree(3.95,-4.7,1.45,'#8caa8c');tree(-6.6,-7.1,1.6,'#9eb397');tree(6.6,-7.7,1.9,'#a4b99a');
  if (!view.level.stationOverview) {
    mesh(box(5.6,.2,3.3,.04),pine,root,[0,-.11,0]);
    for(const x of [-2.35,2.35])for(const z of [-1.24,1.24])mesh(box(.15,1.3,.15),wood,root,[x,-.85,z]);
    mesh(box(7.9,.18,5.3,.06),cream,root,[0,-1.53,-.2]);
    const canopy=new THREE.Group();canopy.position.z=-2.15;root.add(canopy);backdrops.push(canopy);
    for(const x of [-2.86,2.86])mesh(box(.12,3.95,.12,.025),sage,canopy,[x,.35,0]);
    mesh(box(6,.16,.18,.03),pine,canopy,[0,2.36,0]);
    for(let i=0;i<8;i++)mesh(box(.64,.06,.48,.01),i%2?sage:cream,canopy,[-2.4+i*.68,2.5,0],[.16,0,0]);
    for(const x of [-2.56,2.56])mesh(box(.45,.065,.1,.012),wood,canopy,[x,2.1,0],[0,0,x<0?-.7:.7]);
    const breezeMat=new THREE.MeshBasicMaterial({color:'#e2dec0',transparent:true,opacity:.25,depthWrite:false});
    const breeze=mesh(new THREE.PlaneGeometry(.32,.48),breezeMat,canopy,[2.48,1.98,.11]);breeze.castShadow=false;
    branches.push(breeze);
  } else {
    const platform=mesh(box(8.2,.16,5.7,.06),mat('#c7c3a7',{roughness:.95,clearcoat:0}),root,[0,-.22,.05]);platform.name='station-ground';
  }
  return {update(dt,time) {
    const dx=Math.sin(view.angle),dz=Math.cos(view.angle);
    for(const object of backdrops)object.visible=object.position.x*dx+object.position.z*dz<.6;
    for(let i=0;i<branches.length;i++)branches[i].rotation.z=Math.sin(time*.56+i*.8)*.012;
  }};
}
