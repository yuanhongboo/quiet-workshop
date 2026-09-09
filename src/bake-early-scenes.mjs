import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import { box, mat, mesh, tube, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';
const TOP = [-Math.PI / 2, 0, 0];
const named = (object, name) => { object.name = name; return object; };
const amount = (view, id, before) => before ? 0 : clamp(view.state.taskValues?.[id] || 0, 0, 1);
const wood = (view, color = '#c3a373') => mat(color, { map: view.wood, roughness: 0.7, clearcoat: 0.12 });
const brass = () => mat('#bba06e', { roughness: 0.43, metalness: 0.67 });
const ink = texture => new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
function print(parent, text, position, width, height, rotation = [0, 0, 0], background = '#eee1c7') {
  const texture = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#b5a17c'; ctx.lineWidth = 5; ctx.strokeRect(13, 13, w - 26, h - 26);
    ctx.fillStyle = '#536149'; ctx.textAlign = 'center'; ctx.font = '600 74px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText(text, w / 2, h * 0.66, w * 0.88);
  }, 512, 192);
  return mesh(new THREE.PlaneGeometry(width, height), ink(texture), parent, position, rotation);
}
function oven(view) {
  const root = named(new THREE.Group(), 'bake-oven-body'); view.scene.add(root);
  const enamel = mat('#e6d9be', { roughness: 0.32, clearcoat: 0.63 }), terra = mat('#b67f64', { roughness: 0.61 }), metal = brass(), timber = wood(view, '#bc9968');
  for (const x of [-0.84, 0.84]) for (const z of [-0.45, 0.45]) mesh(new THREE.CylinderGeometry(0.10, 0.115, 0.20, 20), terra, root, [x, 0.10, z]);
  mesh(box(2.16, 0.20, 1.30, 0.045), terra, root, [0, 0.21, -0.04]);
  mesh(box(2.16, 0.13, 1.26, 0.045), enamel, root, [0, 1.755, -0.04]);
  mesh(box(2.06, 1.46, 0.15, 0.035), enamel, root, [0, 1.01, -0.59]);
  for (const x of [-1.01, 1.01]) mesh(box(0.14, 1.47, 1.22, 0.04), enamel, root, [x, 1.01, -0.02]);
  mesh(box(1.93, 0.34, 0.14, 0.025), terra, root, [0, 1.57, 0.53]);
  named(print(root, '晚风', [-0.49, 1.61, 0.608], 0.54, 0.18), 'bake-oven-name');
  const inner = mat('#655b4c', { roughness: 0.84, clearcoat: 0.05 });
  mesh(box(1.87, 1.11, 0.035, 0.01), inner, root, [0, 0.92, -0.50]);
  mesh(box(1.87, 0.035, 0.97, 0.01), inner, root, [0, 0.32, -0.01]);
  for (const x of [-0.91, 0.91]) for (const y of [0.56, 0.75, 0.94]) mesh(new THREE.BoxGeometry(0.036, 0.026, 0.88), metal, root, [x, y, -0.005]);
  const hinge = named(new THREE.Group(), 'bake-oven-door-hinge'); hinge.position.set(0, 0.31, 0.615); root.add(hinge);
  for (const x of [-0.87, 0.87]) mesh(box(0.13, 1.16, 0.085, 0.025), terra, hinge, [x, 0.58, 0.025]);
  for (const y of [0.04, 1.12]) mesh(box(1.84, 0.13, 0.085, 0.025), terra, hinge, [0, y, 0.025]);
  const glass = named(mesh(new THREE.PlaneGeometry(1.60, 0.96), mat('#c8cbb8', { transparent: true, opacity: 0.20, side: THREE.DoubleSide, roughness: 0.08, metalness: 0.12, depthWrite: false }), hinge, [0, 0.59, 0.047]), 'bake-oven-clear-glass');
  const axle = named(mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.29, 24), metal, root, [1.08, 0.44, 0.73], [0, 0, Math.PI / 2]), 'bake-oven-oil-hinge');
  const scuffs = named(new THREE.Group(), 'bake-oven-dry-hinge'); root.add(scuffs);
  for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.044, 0.018, 0.014), mat('#e4dbba'), scuffs, [1.00 + i * 0.06, 0.466, 0.811], [0, 0, 0.3]);
  const bulb = named(mesh(new THREE.SphereGeometry(0.075, 24, 16), mat('#c4b289', { emissive: '#ffc06c', emissiveIntensity: 0 }), root, [0.46, 1.01, -0.05]), 'bake-oven-warm-bulb');
  const glow = named(new THREE.PointLight('#ffc78b', 0, 3.4, 1.7), 'bake-oven-warm-light'); glow.position.set(0.42, 1.00, 0.08); root.add(glow);
  const litBack = named(mesh(new THREE.PlaneGeometry(1.70, 1.00), new THREE.MeshBasicMaterial({ color: '#e3ac5c', toneMapped: false, transparent: true, opacity: 0, depthWrite: false }), root, [0, 0.91, -0.476]), 'bake-oven-golden-interior');
  let handle, knob;
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.id.endsWith('rack')) {
      const steel = mat('#9f9d88', { roughness: 0.43, metalness: 0.77 });
      for (const z of [-0.4, 0.4]) mesh(new THREE.CylinderGeometry(0.023, 0.023, 1.58, 16), steel, group, [0, 0, z], [0, 0, Math.PI / 2]);
      for (let i = 0; i < 9; i++) mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.83, 12), steel, group, [-0.77 + i * 0.1925, 0, 0], [Math.PI / 2, 0, 0]);
    } else if (item.id.endsWith('handle')) {
      handle = group; named(group, 'bake-oven-moving-handle');
      mesh(new THREE.CylinderGeometry(0.077, 0.077, 1.06, 28), timber, group, [0, 0, 0], [0, 0, Math.PI / 2]);
      for (const x of [-0.49, 0.49]) { mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.19, 20), metal, group, [x, 0, -0.07], [Math.PI / 2, 0, 0]); mesh(new THREE.SphereGeometry(0.081, 16, 10), timber, group, [x, 0, 0]); }
    } else {
      knob = group; named(group, 'bake-oven-light-knob');
      mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.13, 32), mat('#829775'), group, [0, 0, 0], [Math.PI / 2, 0, 0]);
      mesh(box(0.026, 0.09, 0.011, 0.006), mat('#f0dfba'), group, [0, 0.044, 0.073]);
    }
    registerItem(view, item, group);
  }
  registerAction(view, 'bake-oven-oil', axle); registerAction(view, 'bake-oven-close', handle); registerAction(view, 'bake-oven-light', knob);
  let glassDirt;
  return { afterSurfaces() { glassDirt = view.dirtyMeshes.find(object => object.userData.field.spec.id === 'bake-oven-glass'); hinge.updateMatrixWorld(true); hinge.attach(glassDirt); }, update(dt, time, { before = false } = {}) {
    const oil = amount(view, 'bake-oven-oil', before), close = amount(view, 'bake-oven-close', before), light = amount(view, 'bake-oven-light', before);
    hinge.rotation.x = (1 - close) * 0.30; hinge.updateMatrixWorld(true);
    if (!before && view.state.placed.has('bake-oven-handle')) { handle.position.set(0, 1.20, 0.175).applyMatrix4(hinge.matrixWorld); handle.quaternion.copy(hinge.quaternion); }
    if (!before && view.state.placed.has('bake-oven-knob')) knob.rotation.z = -light * Math.PI / 3;
    scuffs.visible = oil < 1; scuffs.scale.y = Math.max(0.001, 1 - oil);
    glassDirt.visible = before || !glassDirt.userData.field.done; glass.visible = true;
    bulb.material.emissiveIntensity = light * 2.8; glow.intensity = light * 2.4; litBack.material.opacity = light * 0.42;
  } };
}
function mill(view) {
  const root = named(new THREE.Group(), 'bake-mill-body'); view.scene.add(root);
  const timber = wood(view), dark = wood(view, '#a78259'), metal = brass(), flourMat = mat('#eee5ce', { roughness: 1, clearcoat: 0 });
  mesh(box(1.58, 0.15, 1.34, 0.035), timber, root, [0, 0.075, -0.04]);
  for (const x of [-0.68, 0.68]) mesh(box(0.15, 0.45, 1.08, 0.025), timber, root, [x, 0.385, -0.06]);
  mesh(box(1.54, 0.20, 1.30, 0.04), timber, root, [0, 0.66, -0.06]);
  mesh(box(1.20, 0.82, 0.91, 0.045), mat('#9b9f81', { roughness: 0.55 }), root, [0, 1.19, -0.04]);
  mesh(box(1.19, 0.80, 0.10, 0.055), mat('#e2d3b4', { roughness: 0.48 }), root, [0, 1.20, 0.41]);
  mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.18, 24), metal, root, [0, 1.64, -0.04]);
  const latch = named(mesh(box(0.10, 0.26, 0.07, 0.025), metal, root, [0.67, 1.19, 0.48]), 'bake-mill-brass-latch');
  const shaft = named(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.20, 24), metal, root, [0, 1.20, 0.55], [Math.PI / 2, 0, 0]), 'bake-mill-drive-shaft');
  mesh(box(0.34, 0.13, 0.22, 0.018), dark, root, [0, 0.57, 0.46]);
  const stream = named(new THREE.Group(), 'bake-mill-falling-flour'); root.add(stream);
  for (let i = 0; i < 14; i++) mesh(new THREE.SphereGeometry(0.018 + (i % 3) * 0.003, 8, 6), flourMat, stream, [Math.sin(i * 2.4) * 0.07, 0.32 + i / 14 * 0.21, 0.49 + Math.cos(i * 1.2) * 0.04]);
  let hopper, grains, crank, drawer, pile;
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.id.endsWith('hopper')) {
      hopper = group; named(group, 'bake-mill-hopper');
      mesh(new THREE.CylinderGeometry(0.455, 0.12, 0.60, 40, 1, true), mat('#b7a275', { roughness: 0.49, metalness: 0.58, side: THREE.DoubleSide }), group, [0, 0.03, 0]);
      mesh(new THREE.TorusGeometry(0.455, 0.025, 8, 40), metal, group, [0, 0.33, 0], TOP);
      mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 24), metal, group, [0, -0.27, 0]);
      grains = named(new THREE.Group(), 'bake-mill-wheat'); group.add(grains); grains.position.y = 0.13;
      mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.17, 32), mat('#b79b62', { roughness: 1, clearcoat: 0 }), grains, [0, -0.07, 0]);
      for (let i = 0; i < 18; i++) { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 18) * 0.31; const grain = mesh(new THREE.SphereGeometry(0.042, 10, 6), mat(i % 2 ? '#d7ba77' : '#c5a66a', { roughness: 0.95, clearcoat: 0 }), grains, [Math.cos(a) * r, 0.013, Math.sin(a) * r]); grain.scale.set(1, 0.6, 0.52); grain.rotation.y = a; }
    } else if (item.id.endsWith('crank')) {
      crank = group; named(group, 'bake-mill-turning-crank');
      mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.13, 24), metal, group, [0, 0, 0], [Math.PI / 2, 0, 0]);
      mesh(box(0.43, 0.105, 0.075, 0.025), metal, group, [0.18, 0, 0.032]);
      mesh(new THREE.CylinderGeometry(0.066, 0.075, 0.25, 24), dark, group, [0.39, 0, 0.12], [Math.PI / 2, 0, 0]);
    } else {
      drawer = group; named(group, 'bake-mill-flour-drawer');
      mesh(box(1.00, 0.055, 0.72, 0.015), timber, group, [0, -0.11, 0]);
      for (const x of [-0.47, 0.47]) mesh(box(0.06, 0.25, 0.72, 0.018), timber, group, [x, 0, 0]);
      for (const z of [-0.33, 0.33]) mesh(box(1.00, 0.25, 0.06, 0.018), timber, group, [0, 0, z]);
      mesh(new THREE.SphereGeometry(0.072, 20, 12), dark, group, [0, 0, 0.40]);
      pile = named(mesh(new THREE.SphereGeometry(0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), flourMat, group, [0, -0.078, 0]), 'bake-mill-collected-flour'); pile.scale.set(1, 0.34, 0.65);
      named(print(group, '麦香', [0, -0.005, 0.368], 0.45, 0.15), 'bake-mill-flour-label');
    }
    registerItem(view, item, group);
  }
  registerAction(view, 'bake-mill-latch', latch); registerAction(view, 'bake-mill-grind', crank); registerAction(view, 'bake-mill-drawer', drawer);
  return { update(dt, time, { before = false, actionId = null } = {}) {
    const latched = amount(view, 'bake-mill-latch', before), grind = amount(view, 'bake-mill-grind', before), open = amount(view, 'bake-mill-drawer', before);
    latch.rotation.z = (1 - latched) * 0.30; shaft.rotation.y = grind * Math.PI * 6;
    if (!before && view.state.placed.has('bake-mill-crank')) crank.rotation.z = -grind * Math.PI * 6;
    grains.visible = grind < 1; grains.scale.y = Math.max(0.02, 1 - grind); grains.position.y = 0.13 - grind * 0.30;
    pile.visible = !before && grind > 0; pile.scale.set(1, Math.max(0.001, grind * 0.34), 0.65);
    if (!before && view.state.placed.has('bake-mill-drawer')) drawer.position.z = 0.29 + open * 0.63;
    stream.visible = !before && grind > 0 && grind < 1 && actionId === 'bake-mill-grind';
    stream.children.forEach((object, i) => { object.position.y = 0.53 - ((time * 0.7 + i / 14) % 1) * 0.25; });
  } };
}
function scale(view) {
  const root = named(new THREE.Group(), 'bake-scale-body'); view.scene.add(root);
  const sage = mat('#8fa18b', { roughness: 0.39, clearcoat: 0.50 }), metal = brass(), paper = mat('#decbb0', { roughness: 0.94, clearcoat: 0 }), flourMat = mat('#f0e8d5', { roughness: 1, clearcoat: 0 });
  mesh(box(2.04, 0.16, 1.42, 0.055), sage, root, [0, 0.08, 0.03]);
  mesh(box(1.24, 1.12, 0.74, 0.08), sage, root, [0, 0.75, -0.01]);
  mesh(box(1.10, 0.83, 0.07, 0.075), metal, root, [0, 0.91, 0.395]);
  mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.31, 24), metal, root, [0, 1.42, -0.03]);
  mesh(new THREE.CylinderGeometry(0.27, 0.20, 0.085, 32), metal, root, [0, 1.555, -0.03]);
  mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 32), metal, root, [-0.76, 0.167, 0.50], TOP);
  const dialFace = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#ede4d0'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#536149'; ctx.strokeStyle = '#66715b'; ctx.lineWidth = 5;
    for (let i = -4; i <= 4; i++) { const a = i * Math.PI / 10, x = w / 2 + Math.sin(a) * 177, y = h * 0.73 - Math.cos(a) * 177; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(a) * (i % 2 ? 18 : 27), y + Math.cos(a) * (i % 2 ? 18 : 27)); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.font = '600 44px "PingFang SC", sans-serif'; ctx.fillText('0', w / 2, h * 0.235); ctx.font = '600 36px "PingFang SC", sans-serif'; ctx.fillText('慢慢分好', w / 2, h * 0.90);
  }, 512, 384);
  const face = named(mesh(new THREE.PlaneGeometry(1.00, 0.73), ink(dialFace), root, [0, 0.91, 0.439]), 'bake-scale-readable-face');
  const needle = named(new THREE.Group(), 'bake-scale-needle'); needle.position.set(0, 0.76, 0.464); root.add(needle);
  mesh(box(0.020, 0.34, 0.018, 0.007), mat('#a77456'), needle, [0, 0.15, 0]); mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.024, 20), metal, needle, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const knob = named(mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.10, 24), metal, root, [0.42, 0.36, 0.443], [Math.PI / 2, 0, 0]), 'bake-scale-zero-knob');
  mesh(box(0.024, 0.08, 0.011, 0.005), mat('#ead7b0'), knob, [0, 0.052, 0], [Math.PI / 2, 0, 0]);
  let pan, bag, flour, flap;
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.id.endsWith('pan')) {
      pan = group; named(group, 'bake-scale-weighing-pan');
      mesh(box(1.43, 0.044, 1.04, 0.075), metal, group, [0, -0.055, 0]);
      for (const x of [-0.70, 0.70]) mesh(box(0.045, 0.17, 1.04, 0.02), metal, group, [x, 0.025, 0]);
      for (const z of [-0.50, 0.50]) mesh(box(1.42, 0.17, 0.045, 0.02), metal, group, [0, 0.025, z]);
    } else if (item.id.endsWith('weight')) {
      mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.22, 28), metal, group, [0, -0.025, 0]);
      mesh(new THREE.CylinderGeometry(0.066, 0.053, 0.06, 24), metal, group, [0, 0.115, 0]);
      named(print(group, '麦', [0, -0.018, 0.144], 0.15, 0.12), 'bake-scale-weight-label');
    } else {
      bag = group; named(group, 'bake-scale-flour-bag');
      mesh(box(0.58, 0.05, 0.43, 0.014), paper, group, [0, -0.305, 0]);
      for (const x of [-0.285, 0.285]) mesh(box(0.025, 0.61, 0.43, 0.012), paper, group, [x, 0, 0]);
      for (const z of [-0.205, 0.205]) mesh(box(0.58, 0.61, 0.025, 0.012), paper, group, [0, 0, z]);
      named(print(group, '晚风面粉', [0, -0.012, 0.222], 0.53, 0.24), 'bake-scale-bag-label');
      flour = named(mesh(box(0.52, 0.48, 0.36, 0.035), flourMat, group, [0, -0.22, 0]), 'bake-scale-bag-flour');
      flap = named(new THREE.Group(), 'bake-scale-folded-mouth'); flap.position.set(0, 0.29, -0.21); group.add(flap);
      mesh(box(0.59, 0.035, 0.44, 0.014), paper, flap, [0, 0, 0.215]);
      named(print(flap, '刚刚好', [0, 0.022, 0.22], 0.43, 0.17, TOP), 'bake-scale-fold-label');
    }
    registerItem(view, item, group);
  }
  const scoop = named(new THREE.Group(), 'bake-scale-filling-scoop'); root.add(scoop);
  mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.25, 24, 1, true), mat('#bc9969', { map: view.wood, roughness: 0.68, side: THREE.DoubleSide }), scoop, [0, 0, 0], [0, 0, 1.6]);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.40, 16), wood(view), scoop, [0.29, 0, 0], [0, 0, Math.PI / 2]);
  registerAction(view, 'bake-scale-zero', knob); registerAction(view, 'bake-scale-fill', bag); registerAction(view, 'bake-scale-fold', flap);
  let dirt;
  return { afterSurfaces() { dirt = view.dirtyMeshes.find(object => object.userData.field.spec.id === 'bake-scale-face'); }, update(dt, time, { before = false, actionId = null } = {}) {
    const zero = before ? -16 : (view.state.taskValues?.['bake-scale-zero'] ?? -16), fill = amount(view, 'bake-scale-fill', before), fold = amount(view, 'bake-scale-fold', before);
    const clean = !before && dirt.userData.field.done;
    dirt.visible = !clean; face.visible = clean; needle.visible = clean;
    needle.rotation.z = -zero * Math.PI / 180 - fill * 0.81 + Math.sin(fill * Math.PI * 8) * 0.035 * (1 - fill);
    knob.rotation.y = -zero * Math.PI / 180;
    const lower = fill * 0.055;
    if (!before && view.state.placed.has('bake-scale-pan')) pan.position.y = 1.58 - lower;
    if (!before && view.state.placed.has('bake-scale-bag')) { bag.position.y = 1.98 - lower; bag.scale.x = 0.90 + fill * 0.10; } else bag.scale.x = 1;
    flour.visible = !before && fill > 0; flour.scale.y = Math.max(0.001, fill); flour.position.y = -0.28 + fill * 0.24;
    flap.rotation.x = (1 - fold) * -Math.PI / 2;
    scoop.visible = !before && fill > 0 && fill < 1 && actionId === 'bake-scale-fill'; scoop.position.set(0.38, 2.58 - lower, 0.05); scoop.rotation.z = fill * 0.2;
  } };
}
export function buildBakeEarlyScene(view) {
  const builder = { 'bake-oven': oven, 'bake-mill': mill, 'bake-scale': scale }[view.level.id];
  if (!builder) throw new Error(`Unsupported early bakery level: ${view.level.id}`);
  const extra = builder(view); addSurfaces(view); extra.afterSurfaces?.(); return extra;
}
