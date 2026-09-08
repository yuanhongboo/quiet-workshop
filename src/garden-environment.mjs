import * as THREE from 'three';
import { box, mat, mesh } from './season-scene-kit.mjs';
import { cleanProgress } from './core.mjs';

// One open greenhouse surrounds every workbench. Its frame stays thin enough to
// inspect the reverse side without placing an opaque wall between camera and work.
export function buildGardenEnvironment(view) {
  const root = new THREE.Group();
  view.scene.add(root);
  view.scene.background = new THREE.Color('#c9dbd0');
  view.scene.fog = new THREE.Fog('#d5e2d7', 28, 48);
  const timber = mat('#a18a65', { map: view.wood, roughness: 0.62, clearcoat: 0.12 });
  const paleWood = mat('#c8b899', { map: view.wood, roughness: 0.42, clearcoat: 0.3 });
  const frame = mat('#789284', { metalness: 0.55, roughness: 0.42 });
  const glass = mat('#d9eee4', { transparent: true, opacity: 0.1, roughness: 0.08, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  if (!view.level.gardenOverview) {
    mesh(box(5.5, 0.19, 3.05, 0.045), paleWood, root, [0, -0.11, 0]);
    for (const x of [-2.34, 2.34]) for (const z of [-1.12, 1.12])
      mesh(box(0.12, 1.13, 0.12), timber, root, [x, -0.73, z]);
    for (const x of [-2.34, 2.34]) mesh(box(0.085, 0.11, 2.5), timber, root, [x, -0.92, 0]);
  }
  mesh(box(8.8, 0.18, 7.5, 0.08), mat('#bac2ab', { roughness: 0.9 }), root, [0, -1.41, -0.25]);
  if (view.level.gardenOverview) {
    root.children.at(-1).position.y = -0.25;
    return { update() {} };
  }
  const grout = mat('#829780', { roughness: 0.98 });
  for (let x = -4; x <= 4; x += 0.8)
    mesh(new THREE.BoxGeometry(0.009, 0.008, 7.25), grout, root, [x, -1.312, -0.25]);
  for (let z = -3.8; z <= 3.3; z += 0.8)
    mesh(new THREE.BoxGeometry(8.65, 0.008, 0.009), grout, root, [0, -1.312, z]);
  for (const x of [-3.55, 3.55]) {
    for (const z of [-2.85, -0.4, 2.3])
      mesh(box(0.055, 4.4, 0.055, 0.009), frame, root, [x, 0.9, z]);
    for (const y of [-0.4, 1.7, 3.1])
      mesh(box(0.055, 0.055, 5.2, 0.009), frame, root, [x, y, -0.3]);
    const pane = mesh(new THREE.PlaneGeometry(5.15, 4.35), glass, root, [x, 0.9, -0.28], [0, Math.PI / 2, 0]);
    pane.castShadow = false;
  }
  for (const x of [-3.55, -1.77, 0, 1.77, 3.55]) {
    mesh(box(0.055, 4.4, 0.055, 0.009), frame, root, [x, 0.9, -2.85]);
    const rafter = mesh(box(3.84, 0.055, 0.055, 0.008), frame, root, [x < 0 ? -1.77 : 1.77, 3.8, x * 0.7], [0, 0, x < 0 ? 0.36 : -0.36]);
    rafter.castShadow = true;
  }
  for (const y of [-0.4, 1.7, 3.1]) mesh(box(7.1, 0.055, 0.055), frame, root, [0, y, -2.85]);
  const back = mesh(new THREE.PlaneGeometry(7.1, 4.35), glass, root, [0, 0.9, -2.84]);
  back.castShadow = false;
  mesh(box(0.055, 0.06, 5.25), frame, root, [0, 4.48, -0.25]);

  // Instancing keeps surrounding foliage inexpensive on phone GPUs.
  const foliage = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat('#608164', { roughness: 0.65, clearcoat: 0.08 }), 126);
  const transform = new THREE.Object3D();
  let leafIndex = 0;
  const pots = [[-3,-1.12,-2], [2.93,-1.12,-2], [-3.12,-1.12,1.72], [3.08,-1.12,1.8],[-2.3,-1.12,-2.4],[2.2,-1.12,-2.4]];
  for (const [i, [x, y, z]] of pots.entries()) {
    mesh(new THREE.CylinderGeometry(0.27,0.2,0.48,32), mat(i % 2 ? '#a99b79' : '#ad866b', { roughness: 0.83 }), root, [x,y,z]);
    mesh(new THREE.CylinderGeometry(0.246,0.246,0.014,32), mat('#5d6248', { roughness: 1 }), root, [x,y+0.245,z]);
    for (let j=0;j<21;j++) {
      const a=j*2.399+i, t=j/21;
      transform.position.set(x+Math.cos(a)*(0.1+t*0.25),y+0.4+t*1.25,z+Math.sin(a)*(0.1+t*0.25));
      transform.rotation.set(Math.sin(a)*0.6,a,0.35+Math.cos(a)*0.5);
      transform.scale.set(0.1+Math.sin(t*Math.PI)*0.055,0.26,0.025);
      transform.updateMatrix();foliage.setMatrixAt(leafIndex++,transform.matrix);
    }
  }
  foliage.castShadow=foliage.receiveShadow=true;root.add(foliage);
  const droplets = new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6), mat('#edfdf7', { transparent:true,opacity:0.52,roughness:0.04,metalness:0.12,depthWrite:false }), 36);
  for(let i=0;i<36;i++) {
    transform.position.set(Math.sin(i*14.13)*3.3,0.1+((i*0.731)%2.75),-2.80);
    transform.rotation.set(0,0,0);transform.scale.set(0.012,0.02+(i%3)*0.009,0.008);transform.updateMatrix();droplets.setMatrixAt(i,transform.matrix);
  }
  root.add(droplets);
  const warmth = new THREE.PointLight('#ffe9ba', 0, 6, 2);warmth.position.set(1.5,2.5,0);root.add(warmth);
  return {
    update(dt,time,{before}) {
      const progress=before?0:cleanProgress(view.state);
      warmth.intensity=0.18+progress*0.5;
      foliage.rotation.y=Math.sin(time*0.22)*0.002;
      const direction = new THREE.Vector2(Math.sin(view.angle), Math.cos(view.angle));
      for (const object of root.children) {
        if (object.material !== frame && object.material !== glass) continue;
        object.visible = object.position.x * direction.x + object.position.z * direction.y < 0.7;
      }
    },
  };
}
