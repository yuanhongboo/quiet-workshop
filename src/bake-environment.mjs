import * as THREE from 'three';
import { box, mat, mesh } from './season-scene-kit.mjs';
import { canvasTexture } from './materials.mjs';

export function buildBakeEnvironment(view) {
  const root=new THREE.Group();root.name='bake-environment';view.scene.add(root);
  view.scene.background=new THREE.Color('#ecdfca');view.scene.fog=new THREE.Fog('#ecdfca',35,59);
  view.scene.environmentIntensity=.66;view.renderer.toneMappingExposure=.94;
  const pine=mat('#d0ac7b',{map:view.wood,roughness:.61,clearcoat:.12});
  const wood=mat('#ad835d',{map:view.wood,roughness:.68,clearcoat:.08});
  const plaster=mat('#e3d3b6',{roughness:.96,clearcoat:0});
  const sage=mat('#93a185',{roughness:.76,clearcoat:.1});
  const brass=mat('#b4996b',{metalness:.58,roughness:.44,clearcoat:0});
  const backdrops=[],sprigs=[];
  const sky=canvasTexture((ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ddcbbd');g.addColorStop(.55,'#f2dcaf');g.addColorStop(1,'#b8bca0');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#fae8b9';ctx.beginPath();ctx.arc(w*.66,h*.47,w*.055,0,Math.PI*2);ctx.fill();
    for(const [y,color,phase]of [[.79,'#bdb89e',.5],[.9,'#a3af93',1.4]]){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w+8;x+=8)ctx.lineTo(x,h*(y+.06*Math.sin(x/w*7+phase)));ctx.lineTo(w,h);ctx.closePath();ctx.fill();}
    ctx.strokeStyle='#efddba66';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(w*.15,h);ctx.quadraticCurveTo(w*.4,h*.88,w*.54,h*.89);ctx.stroke();
  },1024,768);
  const horizon=mesh(new THREE.PlaneGeometry(24,15),new THREE.MeshBasicMaterial({map:sky}),root,[0,3.3,-10]);horizon.castShadow=false;backdrops.push(horizon);
  const land=mesh(new THREE.PlaneGeometry(30,24),mat('#c3baa0',{roughness:1,clearcoat:0}),root,[0,-1.67,-7],[-Math.PI/2,0,0]);land.castShadow=false;
  if(!view.level.bakeOverview){
    mesh(box(5.6,.23,3.3,.045),pine,root,[0,-.125,0]);
    for(const x of [-2.36,2.36])for(const z of [-1.23,1.23])mesh(box(.16,1.28,.16,.022),wood,root,[x,-.85,z]);
    mesh(box(7.9,.15,5.4,.06),mat('#cbb99c',{roughness:.95}),root,[0,-1.56,-.18]);
    const wall=new THREE.Group();wall.position.z=-2.4;root.add(wall);backdrops.push(wall);
    mesh(box(6.1,1.51,.13),plaster,wall,[0,.07,0]);
    const tileMaterials=['#eee1c7','#eadbc0','#ead9bc'].map(color=>mat(color,{roughness:.52,clearcoat:.27}));
    for(let row=0;row<3;row++)for(let col=0;col<10;col++)mesh(box(.584,.47,.027,.012),tileMaterials[(row+col)%3],wall,[-2.7+col*.6,-.4+row*.49,.083]);
    for(const x of [-3.0,3.0])mesh(box(.16,2.96,.19,.025),wood,wall,[x,.85,0]);
    for(const x of [-1.5,0,1.5])mesh(box(.052,1.42,.08,.009),sage,wall,[x,1.56,.055]);
    for(const y of [.84,2.29])mesh(box(6.08,.07,.13,.012),sage,wall,[0,y,.07]);
    mesh(box(6.2,.1,.35,.025),pine,wall,[0,.82,.16]);
    mesh(box(6.2,.32,.75,.025),plaster,wall,[0,2.5,-.15]);
    mesh(box(2.2,.055,.055,.01),brass,wall,[-1.4,2.1,.38]);
    for(const x of [-2.15,-1.42,-.69]){
      mesh(new THREE.TorusGeometry(.065,.012,8,16),brass,wall,[x,2.03,.39]);
      mesh(box(.038,.22,.028,.01),wood,wall,[x,1.87,.4]);
      const pan=mesh(new THREE.CylinderGeometry(.14,.14,.025,24),mat('#be976a',{metalness:.52,roughness:.49}),wall,[x,1.65,.42],[Math.PI/2,0,0]);pan.castShadow=false;
    }
    const pot=new THREE.Group();pot.position.set(2.36,.86,.16);wall.add(pot);
    mesh(new THREE.CylinderGeometry(.16,.12,.25,20),mat('#b88d70',{roughness:.9}),pot,[0,.125,0]);
    for(let i=0;i<6;i++){
      const leaf=mesh(new THREE.SphereGeometry(1,12,8),mat(i%2?'#8fa078':'#a6ad83',{roughness:1,clearcoat:0}),pot,[Math.sin(i*2)*.12,.35+i*.03,Math.cos(i*2)*.07]);leaf.scale.set(.065,.19,.015);leaf.rotation.z=Math.sin(i*2)*.7;sprigs.push({leaf,angle:leaf.rotation.z});
    }
  }else mesh(box(8.2,.17,5.8,.055),mat('#c8b391',{roughness:.95,clearcoat:0}),root,[0,-.22,.05]);
  return {update(dt,time){for(const object of backdrops)object.visible=Math.cos(view.angle)>.12;for(let i=0;i<sprigs.length;i++)sprigs[i].leaf.rotation.z=sprigs[i].angle+Math.sin(time*.45+i)*.022;}};
}
