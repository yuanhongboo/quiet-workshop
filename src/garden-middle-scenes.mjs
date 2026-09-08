import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import { box, mat, mesh, tube, label, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

const UP = new THREE.Vector3(0, 1, 0);
const TOP = [-Math.PI / 2, 0, 0];
const taskValue = (view, id, before, max = 1) => before ? 0 : clamp(view.state.taskValues?.[id] || 0, 0, max);
const named = (object, name) => { object.name = name; return object; };
const clearGlass = () => mat('#d9ece1', { transparent: true, opacity: 0.16, roughness: 0.09, clearcoat: 1, metalness: 0.08, side: THREE.DoubleSide, depthWrite: false });

function stoneTexture() {
  return canvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#c4c3b6'; ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 6000; i++) {
      const x = (i * 127.73) % width, y = (i * 67.31 + Math.sin(i * 2.17) * 43 + height) % height;
      ctx.fillStyle = i % 3 ? '#817f6b22' : '#fffbe936';
      ctx.fillRect(x, y, 0.5 + (i % 4) * 0.4, 0.5 + (i % 3) * 0.5);
    }
    ctx.strokeStyle = '#7b7d6b20'; ctx.lineWidth = 1;
    for (let i = 0; i < 13; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * 43);
      ctx.bezierCurveTo(width * 0.3, i * 43 - 16, width * 0.7, i * 43 + 18, width, i * 43 - 8); ctx.stroke();
    }
  }, 512, 512);
}

function leafGeometry() {
  const positions = [], indices = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, width = Math.sin(Math.PI * t) ** 0.8;
    positions.push(-width, t, Math.sin(t * Math.PI) * 0.11, 0, t, Math.sin(t * Math.PI) * 0.3, width, t, Math.sin(t * Math.PI) * 0.11);
    if (i < 10) for (let j = 0; j < 2; j++) { const k = i * 3 + j; indices.push(k, k + 3, k + 1, k + 1, k + 3, k + 4); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

// Each frond has one joined leaflet mesh, keeping the mobile scene inexpensive.
function fern(parent, scale = 1) {
  const root = new THREE.Group(); parent.add(root); root.scale.setScalar(scale);
  const leafMaterial = mat('#638a54', { roughness: 0.68, clearcoat: 0.22, side: THREE.DoubleSide });
  const stemMaterial = mat('#78935a', { roughness: 0.8 });
  for (let frond = 0; frond < 7; frond++) {
    const angle = frond * Math.PI * 2 / 7, length = 0.47 + (frond % 3) * 0.065;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const across = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    const center = t => direction.clone().multiplyScalar(t * t * length * 0.75).add(new THREE.Vector3(0, Math.sin(t * 1.66) * length, 0));
    tube([0, 0.25, 0.5, 0.75, 1].map(t => center(t).toArray()), 0.005, stemMaterial, root);
    const positions = [], indices = [];
    for (let row = 1; row <= 9; row++) {
      const t = row / 10, middle = center(t), spread = Math.sin(t * Math.PI) * 0.103;
      for (const side of [-1, 1]) {
        const tip = middle.clone().addScaledVector(across, side * spread).addScaledVector(direction, 0.04);
        const base = positions.length / 3;
        const p1 = middle.clone().addScaledVector(direction, -0.016), p2 = middle.clone().addScaledVector(direction, 0.026);
        const ridge = middle.clone().lerp(tip, 0.56).add(new THREE.Vector3(0, 0.012, 0));
        for (const p of [p1, ridge, tip, p2]) positions.push(...p.toArray());
        indices.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    mesh(geometry, leafMaterial, root);
  }
  return root;
}

function pot(group, color, succulent = false) {
  const ceramic = mat(color, { roughness: 0.28, clearcoat: 0.75 });
  const profile = [[0.13, -0.2], [0.2, -0.18], [0.255, 0.15], [0.259, 0.19], [0.23, 0.19], [0.22, 0.14], [0.17, -0.15]].map(p => new THREE.Vector2(...p));
  mesh(new THREE.LatheGeometry(profile, 48), ceramic, group);
  mesh(new THREE.TorusGeometry(0.245, 0.016, 10, 48), ceramic, group, [0, 0.183, 0], TOP);
  mesh(new THREE.CylinderGeometry(0.225, 0.2, 0.026, 40), mat('#514537', { roughness: 1, clearcoat: 0 }), group, [0, 0.137, 0]);
  const plant = new THREE.Group(); group.add(plant); plant.position.y = 0.153;
  if (!succulent) {
    fern(plant, 0.75);
    plant.name = 'shelf-fern-foliage';
    plant.rotation.x = 0.16;
  }
  else {
    const geometry = leafGeometry(), colors = ['#789c87', '#96b79a', '#b4c8a6'];
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7 + ring * 0.5, length = 0.29 - ring * 0.065;
      const leaf = mesh(geometry, mat(colors[ring], { side: THREE.DoubleSide, roughness: 0.55 }), plant);
      leaf.rotation.set(0.86 - ring * 0.28, a, 0); leaf.scale.set(length * 0.35, length, length * 0.4);
      leaf.position.set(Math.sin(a) * 0.02, ring * 0.034, Math.cos(a) * 0.02);
    }
  }
  return plant;
}

function shelf(view) {
  const oak = mat('#bd9e70', { map: view.wood, roughness: 0.72, clearcoat: 0.1 });
  const endgrain = mat('#a38459', { map: view.wood, roughness: 0.79, clearcoat: 0.08 });
  const frame = new THREE.Group(); view.scene.add(frame);
  for (const x of [-1.13, 1.13]) {
    mesh(box(0.14, 1.92, 0.98, 0.021), oak, frame, [x, 1.04, -0.36]);
    for (const z of [-0.7, 0]) mesh(box(0.19, 0.09, 0.17, 0.02), endgrain, frame, [x, 0.045, z]);
    // Dark mortises remain visible alongside the flush fitted layer board.
    mesh(box(0.096, 0.16, 0.012, 0.006), mat('#66543c'), frame, [x, 0.98, 0.137]);
  }
  const back = mesh(box(2.12, 1.42, 0.048, 0.008), oak, frame, [0, 1.04, -0.85]);
  named(mesh(box(2.42, 0.095, 1.04, 0.025), oak, frame, [0, 2, -0.36]), 'shelf-top-board');
  mesh(box(2.12, 0.25, 0.048, 0.008), oak, frame, [0, 1.845, -0.85]);
  mesh(box(2.22, 0.11, 1.04, 0.018), oak, frame, [0, 0.29, -0.34]);
  mesh(box(2.17, 0.2, 0.068, 0.012), oak, frame, [0, 0.21, 0.153]);
  for (const x of [-0.76, -0.25, 0.26, 0.77]) mesh(box(0.008, 1.36, 0.003, 0.001), endgrain, frame, [x, 1.04, -0.82]);
  registerAction(view, 'shelf-oil', back);
  const pins = [];
  for (const [id, x] of [['shelf-pin-left', -1.13], ['shelf-pin-right', 1.13]]) {
    const peg = named(mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.18, 24), endgrain, view.scene, [x, 0.98, 0.23], [Math.PI / 2, 0, 0]), id);
    registerAction(view, id, peg); pins.push({ id, peg });
  }
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.kind === 'shelf-slats') {
      for (const z of [-0.33, -0.165, 0, 0.165, 0.33]) mesh(box(2.16, 0.072, 0.145, 0.013), oak, group, [0, 0, z]);
      for (const x of [-0.8, 0.8]) mesh(box(0.11, 0.06, 0.78, 0.009), oak, group, [x, -0.055, 0]);
      for (const x of [-1.105, 1.105]) mesh(box(0.12, 0.048, 0.15, 0.005), endgrain, group, [x, -0.005, 0]);
    } else pot(group, item.kind === 'shelf-fern' ? '#c69577' : '#9cb4a1', item.kind === 'shelf-succulent');
    registerItem(view, item, group);
  }
  const oldOak = new THREE.Color('#bd9e70'), freshOak = new THREE.Color('#bc915e');
  return {
    update(dt, time, { before }) {
      const oil = taskValue(view, 'shelf-oil', before);
      oak.color.copy(oldOak).lerp(freshOak, oil); oak.roughness = 0.72 - oil * 0.42; oak.clearcoat = 0.1 + oil * 0.52;
      for (const { id, peg } of pins) peg.position.z = 0.23 - taskValue(view, id, before) * 0.08;
      for (const surface of view.dirtyMeshes) {
        const spec = surface.userData.field.spec;
        if (spec.material !== 'wood') continue;
        surface.material.color.set(spec.color).lerp(freshOak, oil * 0.48);
        surface.material.roughness = 0.56 - oil * 0.29; surface.material.clearcoat = 0.18 + oil * 0.44;
      }
    },
  };
}

function glassRoof(group, brass) {
  const roof = new THREE.Group(); group.add(roof); roof.position.y = -0.18;
  const ridgeY = 0.36, halfDepth = 0.535, pitch = Math.atan2(ridgeY, halfDepth), slope = Math.hypot(ridgeY, halfDepth);
  for (const z of [-halfDepth, halfDepth]) mesh(box(2.35, 0.026, 0.028, 0.005), brass, roof, [0, 0, z]);
  mesh(box(2.35, 0.026, 0.026, 0.006), brass, roof, [0, ridgeY, 0]);
  const vent = named(new THREE.Group(), 'case-opening-roof'); roof.add(vent); vent.position.set(0, ridgeY, 0);
  for (const side of [-1, 1]) {
    const parent = side === 1 ? vent : roof;
    const pane = new THREE.Group(); parent.add(pane);
    pane.position.set(0, side === 1 ? -ridgeY / 2 : ridgeY / 2, side * halfDepth / 2);
    pane.rotation.x = side * pitch;
    mesh(new THREE.PlaneGeometry(2.29, slope), clearGlass(), pane, [0, 0, 0], TOP);
    for (const x of [-1.16, 1.16]) mesh(box(0.028, 0.028, slope, 0.005), brass, pane, [x, 0, 0]);
    for (const z of [-slope / 2, slope / 2]) mesh(box(2.34, 0.028, 0.028, 0.005), brass, pane, [0, 0, z]);
  }
  return vent;
}

function terrarium(view) {
  const brass = mat('#b69c66', { metalness: 0.77, roughness: 0.28, clearcoat: 0.32 });
  const base = mesh(box(2.4, 0.22, 1.17, 0.045), brass, view.scene, [-0.12, 0.13, -0.25]);
  const soil = mesh(box(2.22, 0.05, 0.98, 0.018), mat('#71644d', { roughness: 1, clearcoat: 0 }), view.scene, [-0.12, 0.265, -0.25]);
  for (const x of [-1.26, 1.02]) for (const z of [-0.765, 0.265]) mesh(box(0.043, 1.04, 0.043, 0.009), brass, view.scene, [x, 0.8, z]);
  for (const y of [0.285, 1.31]) {
    for (const z of [-0.765, 0.265]) mesh(box(2.33, 0.035, 0.035, 0.006), brass, view.scene, [-0.12, y, z]);
    for (const x of [-1.26, 1.02]) mesh(box(0.035, 0.035, 1.06, 0.006), brass, view.scene, [x, y, -0.25]);
  }
  mesh(new THREE.PlaneGeometry(2.2, 0.95), clearGlass(), view.scene, [-0.12, 0.797, -0.758]);
  mesh(new THREE.PlaneGeometry(0.91, 0.95), clearGlass(), view.scene, [-1.254, 0.797, -0.25], [0, -Math.PI / 2, 0]);
  const gravel = mat('#baac8b', { roughness: 0.95 }), stone = mat('#979f8d', { map: stoneTexture(), roughness: 0.9 });
  const gravelGeo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 20; i++) {
    const pebble = mesh(gravelGeo, gravel, view.scene, [-1.14 + (i * 0.313) % 2.05, 0.302, -0.66 + (i * 0.173) % 0.81]);
    pebble.scale.set(0.033, 0.022, 0.028); pebble.rotation.y = i;
  }
  let vent, fernRoot, moss;
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.kind === 'case-roof') vent = glassRoof(group, brass);
    else if (item.kind === 'case-fern') {
      mesh(new THREE.SphereGeometry(1, 24, 12), mat('#66543d', { roughness: 1 }), group, [0, 0, 0]).scale.set(0.2, 0.075, 0.18);
      fernRoot = fern(group, 1.14); fernRoot.position.y = 0.03;
    } else {
      moss = named(new THREE.Group(), 'case-moss-bed'); group.add(moss);
      for (const [x, y, z, size] of [[0, 0.055, 0, 0.25], [-0.2, 0, 0.05, 0.14], [0.2, 0.02, -0.05, 0.17]]) {
        const rock = mesh(new THREE.SphereGeometry(1, 24, 14), stone, moss, [x, y, z]); rock.scale.set(size, size * 0.54, size * 0.82);
        const cap = mesh(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#849a52', { roughness: 0.98, clearcoat: 0 }), moss, [x, y + size * 0.13, z]);
        cap.scale.set(size * 1.02, size * 0.52, size * 0.84); cap.name = 'case-living-moss';
      }
    }
    registerItem(view, item, group);
  }
  registerAction(view, 'glass-mist', soil);
  registerAction(view, 'glass-vent', vent);
  const latch = named(new THREE.Group(), 'case-vent-latch'); latch.position.set(1.045, 1.29, 0.29); view.scene.add(latch);
  mesh(box(0.095, 0.035, 0.12, 0.009), brass, latch);
  mesh(box(0.028, 0.17, 0.026, 0.006), brass, latch, [0, 0.065, 0.048], [0.25, 0, 0]);
  registerAction(view, 'glass-latch', latch);
  const droplets = named(new THREE.Group(), 'case-condensation'); view.scene.add(droplets);
  const dropMaterial = mat('#e4f4e8', { transparent: true, opacity: 0.68, roughness: 0.07, clearcoat: 1, depthWrite: false });
  const dropGeo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 26; i++) {
    const drop = mesh(dropGeo, dropMaterial, droplets, [-1.14 + (i * 0.367) % 2.02, 0.4 + (i * 0.239) % 0.76, 0.262]);
    const radius = 0.007 + (i % 4) * 0.002; drop.scale.set(radius, radius * 1.4, radius * 0.35); drop.castShadow = false;
  }
  const mist = named(new THREE.Group(), 'case-mist-cloud'); view.scene.add(mist);
  const mistMaterial = new THREE.MeshBasicMaterial({ color: '#e9f6e6', transparent: true, opacity: 0.08, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const cloud = mesh(new THREE.SphereGeometry(1, 12, 8), mistMaterial, mist, [-0.96 + (i % 3) * 0.8, 0.58 + Math.floor(i / 3) * 0.21, -0.3]);
    cloud.scale.set(0.28, 0.14, 0.17); cloud.castShadow = false;
  }
  const drySoil = new THREE.Color('#71644d'), wetSoil = new THREE.Color('#3c4030');
  return {
    update(dt, time, { before, stage, actionId }) {
      const water = taskValue(view, 'glass-mist', before), angle = taskValue(view, 'glass-vent', before, 60);
      soil.material.color.copy(drySoil).lerp(wetSoil, water); soil.material.roughness = 1 - water * 0.2;
      vent.rotation.x = -angle * Math.PI / 180;
      latch.rotation.z = taskValue(view, 'glass-latch', before) * -Math.PI / 2;
      droplets.visible = water > 0; droplets.scale.setScalar(0.55 + water * 0.45);
      dropMaterial.opacity = water * (0.7 - angle / 60 * 0.25);
      mist.visible = !before && stage === 'operate' && actionId === 'glass-mist';
      mist.position.y = Math.sin(time * 1.5) * 0.02;
      fernRoot.scale.setScalar(1.14 * (1 + water * 0.06));
      moss.traverse(object => {
        if (object.name !== 'case-living-moss') return;
        object.material.color.set('#849a52').lerp(new THREE.Color('#4c763f'), water);
        object.material.roughness = 0.98 - water * 0.25;
      });
    },
  };
}

function fountain(view) {
  const stoneMap = stoneTexture(), stone = mat('#c1c1af', { map: stoneMap, roughness: 0.88, clearcoat: 0.02 });
  const bowlCenter = new THREE.Vector3(-0.18, 0, -0.05);
  const profile = [[0.02, 0.14], [0.62, 0.14], [0.7, 0.28], [0.735, 0.64], [1.09, 0.64], [1.145, 0.59], [1.13, 0.44], [0.99, 0.2], [0.75, 0.045], [0.2, 0.035]].map(p => new THREE.Vector2(...p));
  mesh(new THREE.LatheGeometry(profile, 96), stone, view.scene, bowlCenter.toArray());
  mesh(new THREE.CylinderGeometry(0.71, 0.71, 0.025, 64), mat('#9f9e88', { map: stoneMap, roughness: 0.98 }), view.scene, [-0.18, 0.155, -0.05]);
  for (const y of [0.25, 0.43]) mesh(new THREE.TorusGeometry(y === 0.25 ? 1.012 : 1.13, 0.005, 6, 96), mat('#888f7b', { roughness: 0.95 }), view.scene, [-0.18, y, -0.05], TOP);
  const bamboo = mat('#b5a477', { map: view.wood, roughness: 0.42, clearcoat: 0.38 });
  const bambooRings = mat('#897e50', { roughness: 0.6 });
  mesh(new THREE.CylinderGeometry(0.069, 0.082, 1.2, 32), bamboo, view.scene, [1.5, 0.63, -0.24]);
  for (const y of [0.23, 0.64, 1.05]) mesh(new THREE.TorusGeometry(0.073, 0.009, 8, 28), bambooRings, view.scene, [1.5, y, -0.24], TOP);
  mesh(box(0.56, 0.54, 0.43, 0.05), mat('#879e8e', { metalness: 0.42, roughness: 0.44 }), view.scene, [1.6, 0.27, -0.05]);
  const valve = named(new THREE.Group(), 'fountain-valve-wheel'); valve.position.set(1.6, 0.58, -0.05); view.scene.add(valve);
  const brass = mat('#ab9465', { metalness: 0.78, roughness: 0.31 });
  mesh(new THREE.TorusGeometry(0.126, 0.022, 12, 36), brass, valve, [0, 0, 0], TOP);
  for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) mesh(box(0.24, 0.017, 0.025, 0.008), brass, valve, [0, 0, 0], [0, angle, 0]);
  mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.085, 24), brass, valve);
  registerAction(view, 'fountain-valve', valve);
  const switchMaterial = mat('#467962', { roughness: 0.25, clearcoat: 0.8, emissive: '#82b883', emissiveIntensity: 0 });
  const switchButton = named(mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.042, 28), switchMaterial, view.scene, [1.6, 0.09, 0.189], [Math.PI / 2, 0, 0]), 'fountain-circulation-switch');
  registerAction(view, 'fountain-flow', switchButton);
  const waterMaterial = mat('#88b5ad', { transparent: true, opacity: 0.69, roughness: 0.06, clearcoat: 1, metalness: 0.2, depthWrite: false });
  const water = named(mesh(new THREE.CircleGeometry(0.709, 96), waterMaterial, view.scene, [-0.18, 0.2, -0.05], TOP), 'fountain-water-level');
  water.castShadow = false; registerAction(view, 'fountain-fill', water);
  let lily;
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.kind === 'fountain-spout') {
      mesh(new THREE.CylinderGeometry(0.083, 0.091, 1.68, 36, 1, true), bamboo, group, [0, 0, 0], [0, 0, Math.PI / 2]);
      mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.07, 28, 1, true), mat('#665d3c', { roughness: 0.92, side: THREE.DoubleSide }), group, [-0.81, 0, 0], [0, 0, Math.PI / 2]);
      for (const x of [-0.5, 0.12, 0.64]) mesh(new THREE.TorusGeometry(0.088, 0.012, 8, 32), bambooRings, group, [x, 0, 0], [0, Math.PI / 2, 0]);
      for (let i = 0; i < 5; i++) mesh(new THREE.TorusGeometry(0.095, 0.008, 6, 28), mat('#85734e', { roughness: 1 }), group, [0.67 + i * 0.018, 0, 0], [0, Math.PI / 2, 0]);
    } else if (item.kind === 'fountain-stones') {
      for (const [x, y, z, r, color] of [[-0.1, 0, -0.03, 0.17, '#a2a18e'], [0.12, -0.025, 0.06, 0.125, '#d0c7af'], [0.04, 0.1, -0.03, 0.1, '#8b9687']]) {
        const rock = mesh(new THREE.SphereGeometry(1, 28, 18), mat(color, { map: stoneMap, roughness: 0.6, clearcoat: 0.18 }), group, [x, y, z]);
        rock.scale.set(r * 1.1, r * 0.64, r * 0.84); rock.rotation.y = x * 8;
      }
    } else {
      lily = group;
      const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.absarc(0, 0, 0.23, 0.16, Math.PI * 2 - 0.16, false); leaf.lineTo(0, 0);
      mesh(new THREE.ShapeGeometry(leaf, 48), mat('#738f67', { roughness: 0.48, clearcoat: 0.55, side: THREE.DoubleSide }), group, [0, 0, 0], TOP);
      const petalGeometry = leafGeometry();
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 7; i++) {
        const petal = mesh(petalGeometry, mat(ring ? '#fff2d0' : '#e2c7bf', { side: THREE.DoubleSide, roughness: 0.58 }), group, [0, 0.015 + ring * 0.028, 0]);
        petal.rotation.set(0.95 - ring * 0.33, i * Math.PI * 2 / 7 + ring * 0.4, 0); petal.scale.set(0.03, 0.15 - ring * 0.035, 0.07);
      }
      mesh(new THREE.SphereGeometry(0.035, 20, 12), mat('#cbb66d'), group, [0, 0.096, 0]);
    }
    registerItem(view, item, group);
  }
  const stream = named(mesh(new THREE.CylinderGeometry(0.018, 0.025, 1, 14), waterMaterial, view.scene), 'fountain-running-water');
  stream.castShadow = false;
  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const ripple = mesh(new THREE.RingGeometry(0.09, 0.095, 64), new THREE.MeshBasicMaterial({ color: '#d9ebe0', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), view.scene, [-0.12, 0.5, -0.24], TOP);
    ripple.castShadow = false; ripples.push(ripple);
  }
  const tip = new THREE.Vector3(-0.065, 1.226, -0.24);
  return {
    update(dt, time, { before, stage, actionId }) {
      const filling = !before && stage === 'operate' && actionId === 'fountain-fill';
      const fill = taskValue(view, 'fountain-fill', before), flowing = taskValue(view, 'fountain-flow', before) > 0;
      valve.rotation.y = taskValue(view, 'fountain-valve', before, 100) / 100 * Math.PI * 1.5;
      water.visible = fill > 0; water.position.y = 0.19 + fill * 0.345;
      switchMaterial.emissiveIntensity = flowing ? 0.7 : 0;
      switchButton.position.z = flowing ? 0.176 : 0.189;
      stream.visible = !before && (filling || flowing) && view.state.placed.has('fountain-spout');
      const destination = new THREE.Vector3(tip.x, water.position.y + 0.004, tip.z), direction = tip.clone().sub(destination);
      stream.position.copy(tip).add(destination).multiplyScalar(0.5);
      stream.quaternion.setFromUnitVectors(UP, direction.normalize());
      stream.scale.set(1 + Math.sin(time * 17) * 0.08, tip.y - destination.y, 1);
      for (let i = 0; i < ripples.length; i++) {
        const age = (time * 0.7 + i / ripples.length) % 1, ripple = ripples[i];
        ripple.position.set(tip.x, water.position.y + 0.006, tip.z);
        ripple.scale.setScalar(0.45 + age * 4.2);
        ripple.material.opacity = stream.visible ? (1 - age) * 0.35 : 0;
      }
      if (!before && view.state.placed.has('fountain-lily')) {
        lily.position.y = 0.2 + fill * 0.341 + (flowing ? Math.sin(time * 1.3) * 0.004 : 0);
        lily.rotation.y = flowing ? Math.sin(time * 0.6) * 0.04 : 0;
      }
    },
    afterSurfaces() {
      const rim = view.dirtyMeshes.find(object => object.userData.field.spec.id === 'fountain-rim');
      // A real annular surface leaves the inner water basin visible after scrubbing.
      rim.geometry.dispose(); rim.geometry = new THREE.RingGeometry(0.748, 1.09, 96);
      const positions = rim.geometry.getAttribute('position'), uv = rim.geometry.getAttribute('uv');
      for (let i = 0; i < positions.count; i++) uv.setXY(i, positions.getX(i) / 2.18 + 0.5, positions.getY(i) / 2.18 + 0.5);
      rim.material.map = stoneMap; rim.material.roughness = 0.88; rim.material.clearcoat = 0.02; rim.material.needsUpdate = true;
    },
  };
}

function makeGlassCleanable(object) {
  const material = object.material, compileGrime = material.onBeforeCompile;
  material.transparent = true; material.opacity = 1; material.depthWrite = false;
  material.roughness = 0.085; material.clearcoat = 1; material.metalness = 0.08;
  material.side = THREE.DoubleSide;
  material.onBeforeCompile = (shader, renderer) => {
    compileGrime.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      'diffuseColor.rgb=mix(diffuseColor.rgb,dirtColor,dirt*.99);',
      'diffuseColor.rgb=mix(diffuseColor.rgb,dirtColor,dirt*.99); diffuseColor.a=mix(.13,.95,dirt);',
    );
  };
  material.needsUpdate = true;
}

export function buildGardenMiddleScene(view) {
  const build = { 'garden-shelf': shelf, 'garden-glass': terrarium, 'garden-fountain': fountain }[view.level.id];
  if (!build) throw new Error(`Unsupported middle garden level: ${view.level.id}`);
  const extra = build(view);
  addSurfaces(view);
  for (const object of view.dirtyMeshes) if (object.userData.field.spec.material === 'glass') makeGlassCleanable(object);
  extra.afterSurfaces?.();
  return extra;
}
