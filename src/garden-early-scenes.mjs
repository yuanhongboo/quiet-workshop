import * as THREE from 'three';
import { clamp, random } from './core.mjs';
import { box, mat, mesh, tube, label, registerItem, addSurfaces, registerAction } from './season-scene-kit.mjs';

const UP = new THREE.Vector3(0, 1, 0);
const flat = [-Math.PI / 2, 0, 0];
const value = (view, id, before) => before ? 0 : clamp(view.state.taskValues?.[id] || 0, 0, 1);
const group = (parent, position = [0, 0, 0]) => {
  const result = new THREE.Group();
  result.position.set(...position);
  parent.add(result);
  return result;
};
function tag(parent, text, small, position, size = [0.34, 0.15], rotation) {
  const plate = mesh(new THREE.PlaneGeometry(...size), mat('#ffffff', {
    map: label(text, small, '#3d5544', '#eee3c7'), roughness: 0.75,
  }), parent, position, rotation);
  plate.castShadow = false;
  return plate;
}
function grain(parent, center, width, depth, material, seed, count = 34) {
  const rng = random(seed), geometry = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < count; i++) {
    const stone = mesh(geometry, material, parent,
      [center[0] + (rng() - 0.5) * width, center[1] + rng() * 0.015, center[2] + (rng() - 0.5) * depth]);
    const s = 0.012 + rng() * 0.021;
    stone.scale.set(s, s * 0.42, s * 0.7);
    stone.rotation.y = rng() * 6.28;
  }
}
function leaf(parent, width, length, material, position, rotation = [0, 0, 0]) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -length * 0.48);
  shape.bezierCurveTo(-width * 0.63, -length * 0.22, -width * 0.51, length * 0.25, 0, length * 0.52);
  shape.bezierCurveTo(width * 0.47, length * 0.2, width * 0.6, -length * 0.2, 0, -length * 0.48);
  const object = group(parent, position);
  object.rotation.set(...rotation);
  mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.012, bevelThickness: 0.015, curveSegments: 14 }), material, object);
  const vein = mat('#a0b57b', { roughness: 0.75 });
  tube([[0, -length * 0.46, 0.025], [0, 0, 0.032], [0, length * 0.48, 0.025]], 0.006, vein, object);
  for (const t of [-0.22, -0.04, 0.14]) for (const direction of [-1, 1])
    tube([[0, t * length, 0.03], [direction * width * 0.21, (t + 0.09) * length, 0.027], [direction * width * 0.36, (t + 0.16) * length, 0.019]], 0.0022, vein, object);
  return object;
}
function jug(parent, view) {
  const object = group(parent), metal = mat('#b99565', { metalness: 0.72, roughness: 0.32, clearcoat: 0.35 });
  const points = [[0, -0.25], [0.21, -0.25], [0.255, -0.2], [0.255, 0.13], [0.21, 0.22], [0.2, 0.245], [0.179, 0.245], [0.179, 0.217], [0.222, 0.115], [0.222, -0.19], [0, -0.19]].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(new THREE.LatheGeometry(points, 56), metal, object);
  mesh(new THREE.TorusGeometry(0.2, 0.014, 10, 64), view.brass, object, [0, 0.235, 0], flat);
  tube([[0.2, 0.17, 0], [0.45, 0.12, 0], [0.45, -0.17, 0], [0.2, -0.17, 0]], 0.027, metal, object);
  tube([[-0.21, -0.17, 0], [-0.43, -0.05, 0], [-0.6, 0.22, 0]], 0.041, metal, object);
  const rose = mesh(new THREE.CylinderGeometry(0.10, 0.065, 0.065, 32), view.brass, object, [-0.603, 0.22, 0], [0, 0, 0.53]);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    mesh(new THREE.SphereGeometry(0.008, 6, 4), mat('#64563d'), rose, [Math.cos(a) * 0.07, 0.034, Math.sin(a) * 0.07]);
  }
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 48), mat('#5b6e5d', { roughness: 0.15, clearcoat: 1 }), object, [0, 0.15, 0]);
  return object;
}
function potScene(view) {
  const ceramic = mat('#a9bfae', { roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  const clay = mat('#c4ac8c', { roughness: 0.92, clearcoat: 0 });
  const soilMaterial = mat('#8b7252', { roughness: 1, clearcoat: 0 });
  // Four thick ceramic walls create an actual open pot; front and rear cleaning
  // planes sit 3 mm outside their matching flat faces, with no hidden cap.
  for (const z of [0.275, -0.775]) mesh(box(1.64, 0.82, 0.09, 0.035), ceramic, view.scene, [-0.36, 0.44, z]);
  for (const x of [-1.135, 0.415]) mesh(box(0.09, 0.82, 1.02, 0.033), ceramic, view.scene, [x, 0.44, -0.25]);
  mesh(box(1.47, 0.07, 0.94, 0.04), clay, view.scene, [-0.36, 0.045, -0.25]);
  for (const z of [0.286, -0.786]) mesh(box(1.7, 0.075, 0.1, 0.03), ceramic, view.scene, [-0.36, 0.854, z]);
  for (const x of [-1.158, 0.438]) mesh(box(0.105, 0.075, 1.07, 0.028), ceramic, view.scene, [x, 0.854, -0.25]);
  const soil = mesh(box(1.44, 0.05, 0.94, 0.03), soilMaterial, view.scene, [-0.36, 0.786, -0.25]);
  const soilGrains = group(view.scene);
  grain(soilGrains, [-0.36, 0.818, -0.25], 1.36, 0.85, mat('#b19a77', { roughness: 1 }), 122);
  mesh(box(0.92, 0.032, 1.03, 0.06), mat('#c2bba2', { roughness: 0.95 }), view.scene, [-1.88, 0.006, -0.25]);
  mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.045, 56), mat('#c3ad89', { map: view.wood, roughness: 0.72 }), view.scene, [1.35, 0.018, -0.48]);
  const leaves = [];
  for (const item of view.level.items) {
    let model;
    if (item.kind === 'young-plant') {
      model = new THREE.Group();
      const rootBall = mesh(new THREE.SphereGeometry(0.225, 32, 20), mat('#756448', { roughness: 1 }), model);
      rootBall.scale.set(1, 0.86, 0.92);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399, length = 0.46 + (i % 3) * 0.06;
        const p = [Math.sin(a) * 0.35, 0.42 + i * 0.087, Math.cos(a) * 0.17];
        tube([[0, 0.1, 0], [p[0] * 0.6, p[1] * 0.68, p[2]], [p[0], p[1], p[2]]], 0.012, mat('#597b44', { roughness: 0.8 }), model);
        const object = leaf(model, 0.31 + (i % 2) * 0.055, length, mat(i % 2 ? '#7d9e58' : '#4f784f', { roughness: 0.53, clearcoat: 0.36 }), p, [-0.23, Math.sin(a) * 0.43, -Math.sin(a) * 0.82]);
        leaves.push({ object, rotation: object.rotation.clone(), phase: a });
      }
    } else if (item.kind === 'plant-stake') {
      model = new THREE.Group();
      const wood = mat('#ddc497', { map: view.wood, roughness: 0.7 });
      mesh(box(0.29, 0.21, 0.033, 0.028), wood, model, [0, 0.15, 0]);
      mesh(box(0.055, 0.54, 0.027, 0.016), wood, model, [0, -0.065, -0.014]);
      tag(model, '新绿', 'A NEW ROOT', [0, 0.16, 0.019], [0.25, 0.16]);
    } else model = jug(new THREE.Group(), view);
    registerItem(view, item, model);
  }
  registerAction(view, 'pot-settle', soil);
  registerAction(view, 'pot-water', view.items.get('garden-water-jug'));
  registerAction(view, 'pot-label', view.items.get('garden-name-stake'));
  const waterMaterial = mat('#d0e7da', { transparent: true, opacity: 0.72, roughness: 0.12, clearcoat: 1 });
  const stream = mesh(new THREE.CylinderGeometry(0.016, 0.025, 1, 12), waterMaterial, view.scene);
  stream.visible = false;
  stream.castShadow = false;
  const ripple = mesh(new THREE.RingGeometry(0.06, 0.075, 48), new THREE.MeshBasicMaterial({ color: '#d9e7d0', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), view.scene, [-0.55, 0.815, 0.05], flat);
  const dry = new THREE.Color('#8b7252'), wet = new THREE.Color('#493b2a');
  return { update(dt, time, { before, stage, actionId }) {
    const settle = value(view, 'pot-settle', before), water = value(view, 'pot-water', before), straight = value(view, 'pot-label', before);
    soil.position.y = 0.786 - settle * 0.016;
    soilGrains.position.y = -settle * 0.016;
    soilMaterial.color.copy(dry).lerp(wet, water);
    soilMaterial.roughness = 1 - water * 0.29;
    for (const entry of leaves) {
      entry.object.rotation.copy(entry.rotation);
      entry.object.rotation.x -= water * 0.25;
      entry.object.rotation.z *= 1 - water * 0.14;
      if (!before) entry.object.rotation.y += Math.sin(time * 0.68 + entry.phase) * 0.017 * water;
    }
    const stake = view.items.get('garden-name-stake');
    if (!before && view.state.placed.has('garden-name-stake')) { stake.rotation.y = -0.5 * (1 - straight); stake.rotation.z = -0.1 * (1 - straight); }
    const can = view.items.get('garden-water-jug'), active = !before && stage === 'operate' && actionId === 'pot-water';
    stream.visible = active;
    if (active) {
      can.position.set(0.08, 1.56, 0.07);
      can.rotation.set(0, 0, 0.4);
      can.updateWorldMatrix(true, false);
      const tip = can.localToWorld(new THREE.Vector3(-0.63, 0.25, 0)), destination = new THREE.Vector3(-0.55, 0.8, 0.05), direction = tip.clone().sub(destination);
      stream.position.copy(tip).add(destination).multiplyScalar(0.5);
      stream.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
      stream.scale.set(1 + Math.sin(time * 24) * 0.12, direction.length(), 1);
    }
    ripple.material.opacity = active ? 0.28 : 0;
    ripple.scale.setScalar(0.7 + (time * 1.7 % 1) * 1.2);
  } };
}

function handle(parent, view, material, height = 0.36) {
  mesh(new THREE.CapsuleGeometry(0.055, height, 6, 18), material, parent, [0, 0.23, 0]);
  mesh(new THREE.CylinderGeometry(0.061, 0.061, 0.06, 24), view.brass, parent, [0, 0.025, 0]);
  mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 24), view.brass, parent, [0, 0.38, 0.055]);
}
function trowelShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.09, 0.01);
  shape.bezierCurveTo(-0.22, -0.13, -0.19, -0.34, 0, -0.47);
  shape.bezierCurveTo(0.19, -0.34, 0.22, -0.13, 0.09, 0.01);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.024, bevelEnabled: true, bevelSize: 0.011, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 16 });
}
function toolsScene(view) {
  const wood = mat('#c7ac86', { map: view.wood, roughness: 0.67 }), backing = mat('#a6b1a0', { roughness: 0.7 });
  const iron = mat('#7e8c87', { metalness: 0.82, roughness: 0.63 });
  const steel = mat('#b5c1bc', { metalness: 0.9, roughness: 0.3 });
  mesh(box(3.55, 1.44, 0.19, 0.04), wood, view.scene, [0, 0.76, -0.75]);
  mesh(box(3.31, 1.17, 0.028, 0.013), backing, view.scene, [0, 0.8, -0.658]);
  for (const x of [-1.74, 1.74]) mesh(box(0.082, 1.48, 0.08, 0.016), wood, view.scene, [x, 0.77, -0.612]);
  for (const y of [0.06, 1.46]) mesh(box(3.52, 0.09, 0.10, 0.02), wood, view.scene, [0, y, -0.61]);
  for (const x of [-1.02, 0, 1.02]) {
    mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.024, 24), view.brass, view.scene, [x, 1.17, -0.612], [Math.PI / 2, 0, 0]);
    tube([[x, 1.17, -0.603], [x, 1.13, -0.49], [x, 1.18, -0.43]], 0.018, view.brass, view.scene);
  }
  mesh(box(3.71, 0.07, 0.66, 0.028), wood, view.scene, [0, 0.006, 0.83]);
  const oilCase = mesh(box(0.54, 0.18, 0.46, 0.043), mat('#95a58e', { metalness: 0.44, roughness: 0.36 }), view.scene, [2.05, 0.09, -0.28]);
  mesh(box(0.15, 0.022, 0.08, 0.014), view.brass, oilCase, [0, 0.092, -0.08]);
  const shearsBlades = [], trowelMaterial = iron;
  for (const item of view.level.items) {
    const model = new THREE.Group();
    if (item.kind === 'hanging-trowel') {
      handle(model, view, wood);
      mesh(trowelShape(), trowelMaterial, model, [0, -0.02, 0.02]);
      tube([[0, 0.012, 0.055], [0, -0.2, 0.066], [0, -0.39, 0.05]], 0.014, steel, model);
      registerAction(view, 'tools-sharpen', model);
    } else if (item.kind === 'hanging-fork') {
      handle(model, view, wood);
      tube([[0, 0.025, 0], [0, -0.13, 0], [0, -0.18, 0]], 0.029, steel, model);
      mesh(box(0.35, 0.074, 0.064, 0.02), steel, model, [0, -0.18, 0]);
      for (const x of [-0.14, 0, 0.14]) tube([[x, -0.16, 0], [x, -0.34, 0.03], [x, -0.46, 0.105]], 0.023, steel, model);
    } else {
      const green = mat('#6d8b71', { roughness: 0.46, clearcoat: 0.36 });
      for (const sign of [-1, 1]) {
        const half = group(model);
        const ring = mesh(new THREE.TorusGeometry(0.105, 0.029, 12, 36), green, half, [sign * 0.12, 0.235, 0]);
        ring.scale.set(0.76, 1.35, 1);
        tube([[sign * 0.11, 0.13, 0], [sign * 0.045, 0.055, 0], [0, 0, 0]], 0.029, green, half);
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.025); shape.quadraticCurveTo(sign * 0.16, -0.09, sign * 0.13, -0.38); shape.quadraticCurveTo(sign * -0.015, -0.3, 0, 0.025);
        mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.008, bevelThickness: 0.008, curveSegments: 18 }), steel, half, [0, 0, sign * 0.018]);
        shearsBlades.push({ half, sign });
      }
      mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.085, 32), view.brass, model, [0, 0, 0.01], [Math.PI / 2, 0, 0]);
      mesh(box(0.047, 0.009, 0.005, 0.002), mat('#6a6250'), model, [0, 0, 0.055], [0, 0, 0.35]);
      registerAction(view, 'tools-oil', model);
    }
    registerItem(view, item, model);
  }
  const strap = group(view.scene, [0, 1.175, -0.463]);
  mesh(box(0.095, 0.29, 0.026, 0.026), mat('#9c7350', { roughness: 0.93 }), strap, [0, -0.11, 0]);
  mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 24), view.brass, strap, [0, -0.13, 0.019]);
  registerAction(view, 'tools-strap', strap);
  const stone = mesh(box(0.22, 0.10, 0.065, 0.019), mat('#c2baa4', { roughness: 0.94 }), view.scene, [-1.02, 0.59, -0.405]);
  stone.visible = false;
  const drop = mesh(new THREE.SphereGeometry(0.038, 20, 14), mat('#b79e4f', { transparent: true, opacity: 0.8, roughness: 0.1, clearcoat: 1 }), view.scene);
  drop.visible = false;
  const polished = new THREE.Color('#c2cdc6'), dull = new THREE.Color('#7e8c87');
  return { update(dt, time, { before, stage, actionId }) {
    const sharp = value(view, 'tools-sharpen', before), oil = value(view, 'tools-oil', before), fastened = value(view, 'tools-strap', before);
    trowelMaterial.color.copy(dull).lerp(polished, sharp);
    trowelMaterial.roughness = 0.63 - sharp * 0.42;
    for (const { half, sign } of shearsBlades) half.rotation.z = sign * oil * (0.16 + (before ? 0 : Math.sin(time * 1.8) * 0.055));
    strap.rotation.x = (1 - fastened) * -0.94;
    stone.visible = !before && stage === 'operate' && actionId === 'tools-sharpen';
    if (stone.visible) stone.position.y = 0.57 + Math.sin(time * 8) * 0.11;
    drop.visible = !before && stage === 'operate' && actionId === 'tools-oil';
    if (drop.visible) drop.position.set(1.02, 1.14 - (time * 0.6 % 0.3), -0.445);
  } };
}

function sprayer(parent, view) {
  const object = group(parent);
  const glass = mat('#b4c9bc', { transparent: true, opacity: 0.65, metalness: 0.05, roughness: 0.16, clearcoat: 1 });
  const bottle = mesh(new THREE.CylinderGeometry(0.13, 0.165, 0.42, 40), glass, object, [0, 0.22, 0]);
  mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.25, 32), mat('#90b4a9', { roughness: 0.12, clearcoat: 1 }), bottle, [0, -0.07, 0]);
  mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 32), view.brass, object, [0, 0.47, 0]);
  mesh(box(0.21, 0.07, 0.075, 0.025), view.brass, object, [-0.065, 0.52, 0]);
  mesh(box(0.035, 0.1, 0.04, 0.015), view.brass, object, [-0.015, 0.44, 0.035], [0, 0, -0.3]);
  tag(object, 'MIST', 'A LITTLE RAIN', [0, 0.23, 0.15], [0.21, 0.12]);
  return object;
}
function seedsScene(view) {
  const wood = mat('#c2a782', { map: view.wood, roughness: 0.66 }), clay = mat('#b79674', { roughness: 0.94 });
  mesh(box(3.08, 0.10, 1.30, 0.04), wood, view.scene, [0, 0.043, -0.24]);
  for (const x of [-1.505, 1.505]) mesh(box(0.11, 0.25, 1.34, 0.025), wood, view.scene, [x, 0.175, -0.24]);
  for (const z of [-0.875, 0.35]) mesh(box(3.1, 0.25, 0.1, 0.025), wood, view.scene, [0, 0.175, z]);
  for (const x of [-1.505, 1.505]) for (const z of [-0.79, 0.28])
    mesh(new THREE.SphereGeometry(0.023, 12, 8), view.brass, view.scene, [x, 0.22, z + 0.08]);
  const lid = group(view.scene, [0, 0.52, -0.986]);
  const frame = mat('#b4bba6', { metalness: 0.6, roughness: 0.31 });
  for (const x of [-1.5, 1.5]) mesh(box(0.055, 1.28, 0.055, 0.014), frame, lid, [x, 0.64, 0]);
  for (const y of [0.035, 1.25]) mesh(box(3.04, 0.055, 0.055, 0.014), frame, lid, [0, y, 0]);
  const lidGlass = view.dirtyMeshes.find((entry) => entry.userData.field.spec.id === 'garden-seed-lid');
  view.scene.updateMatrixWorld(true);
  lid.attach(lidGlass);
  lidGlass.material.transparent = true;
  lidGlass.material.depthWrite = false;
  lidGlass.material.roughness = 0.1;
  lidGlass.material.clearcoat = 1;
  const handleGroup = group(lid, [0, 1.18, 0.035]);
  tube([[-0.15, 0, 0], [-0.15, 0, 0.095], [0.15, 0, 0.095], [0.15, 0, 0]], 0.019, view.brass, handleGroup);
  registerAction(view, 'seeds-close', handleGroup);
  for (const x of [-1.15, 1.15]) mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 28), view.brass, view.scene, [x, 0.52, -0.986], [0, 0, Math.PI / 2]);
  const cells = [], seeds = [], covers = [];
  for (const item of view.level.items) {
    const model = new THREE.Group();
    mesh(box(0.74, 0.028, 1.025, 0.035), mat(item.tint, { roughness: 0.75 }), model, [0, -0.094, 0]);
    for (const z of [-0.257, 0.257]) {
      // Revolved cup includes an inner wall and open top; the soil remains visible.
      const profile = [[0.18, -0.09], [0.23, 0.085], [0.255, 0.085], [0.255, 0.12], [0.211, 0.12], [0.169, -0.065], [0, -0.065]].map(([x, y]) => new THREE.Vector2(x, y));
      mesh(new THREE.LatheGeometry(profile, 40), clay, model, [0, 0, z]);
      const soilMaterial = mat('#9c7d58', { roughness: 1, clearcoat: 0 });
      const soil = mesh(new THREE.CylinderGeometry(0.203, 0.203, 0.026, 40), soilMaterial, model, [0, 0.084, z]);
      cells.push(soil);
      grain(model, [0, 0.102, z], 0.25, 0.25, mat('#bc9e74', { roughness: 1 }), 130 + cells.length, 10);
      const seed = mesh(new THREE.SphereGeometry(0.032, 16, 10), mat('#d4b178', { roughness: 0.66 }), model, [0, 0.108, z]);
      seed.scale.set(0.72, 0.52, 1.2); seeds.push(seed);
      const cover = mesh(new THREE.CylinderGeometry(0.062, 0.074, 0.021, 28), soilMaterial, model, [0, 0.12, z]);
      covers.push(cover);
    }
    mesh(box(0.28, 0.17, 0.029, 0.018), mat(item.tint, { roughness: 0.75 }), model, [0, 0.255, -0.465]);
    mesh(box(0.045, 0.27, 0.02, 0.008), wood, model, [0, 0.09, -0.465]);
    tag(model, item.label, item.labelEn, [0, 0.265, -0.448], [0.25, 0.14]);
    registerItem(view, item, model);
  }
  const packet = group(view.scene, [-2.06, 0.26, -0.54]);
  packet.rotation.z = 0.11;
  mesh(box(0.4, 0.52, 0.055, 0.02), mat('#e5d8b7', { roughness: 0.8 }), packet);
  tag(packet, 'SEEDS', 'SMALL BEGINNINGS', [0, 0.14, 0.032], [0.34, 0.14]);
  for (let i = 0; i < 3; i++) leaf(packet, 0.09, 0.18, mat('#7a9768', { roughness: 0.7 }), [(i - 1) * 0.065, -0.07, 0.045], [0, 0, (i - 1) * -0.6]);
  registerAction(view, 'seeds-sow', packet);
  registerAction(view, 'seeds-cover', cells[2]);
  const mister = sprayer(view.scene, view); mister.position.set(2.04, 0, -0.28);
  registerAction(view, 'seeds-mist', mister);
  const mist = group(view.scene), dropGeo = new THREE.SphereGeometry(0.012, 8, 6), waterMaterial = mat('#dcece2', { transparent: true, opacity: 0.58, roughness: 0.1, clearcoat: 1 });
  for (let i = 0; i < 24; i++) mesh(dropGeo, waterMaterial, mist);
  const dry = new THREE.Color('#9c7d58'), wet = new THREE.Color('#574932');
  let closeBlend = value(view, 'seeds-close', false);
  return { update(dt, time, { before, stage, actionId }) {
    const sow = value(view, 'seeds-sow', before), cover = value(view, 'seeds-cover', before), water = value(view, 'seeds-mist', before), closed = value(view, 'seeds-close', before);
    for (const soil of cells) { soil.material.color.copy(dry).lerp(wet, water); soil.material.roughness = 1 - water * 0.27; }
    seeds.forEach((seed) => { seed.visible = sow > 0 && cover < 0.92; seed.position.y = 0.108 - cover * 0.025; });
    covers.forEach((object) => { object.visible = cover > 0; object.scale.set(cover, Math.max(0.01, cover), cover); });
    closeBlend = before ? 0 : closeBlend + (closed - closeBlend) * (1 - Math.exp(-dt * 4));
    lid.rotation.x = closeBlend * Math.PI / 2;
    const clean = before ? 0 : lidGlass.userData.field.progress;
    lidGlass.material.opacity = 0.90 - clean * 0.72;
    const spraying = !before && stage === 'operate' && actionId === 'seeds-mist';
    mist.visible = spraying;
    if (spraying) {
      mister.position.set(1.44, 0.80, -0.13); mister.rotation.z = 0.23;
      mist.children.forEach((drop, i) => {
        const t = (time * 0.7 + i / mist.children.length) % 1;
        drop.position.set(1.22 - t * (1.0 + (i % 6) * 0.32), 1.29 - t * 0.97, -0.61 + (i % 5) * 0.175);
      });
    } else { mister.position.set(2.04, 0, -0.28); mister.rotation.z = 0; }
  } };
}

export function buildGardenEarlyScene(view) {
  addSurfaces(view);
  switch (view.level.id) {
    case 'garden-pot': return potScene(view);
    case 'garden-tools': return toolsScene(view);
    case 'garden-seeds': return seedsScene(view);
    default: throw new Error(`Unsupported early garden scene: ${view.level.id}`);
  }
}
