import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import { box, mat, mesh, tube, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

const TOP = [-Math.PI / 2, 0, 0];
const FRONT_AXIS = [Math.PI / 2, 0, 0];
const SIDE_AXIS = [0, 0, Math.PI / 2];
const value = (view, id, before) => {
  const task = view.level.operation.tasks.find(entry => entry.id === id);
  return before ? task.initial ?? 0 : view.state.taskValues?.[id] ?? task.initial ?? 0;
};
const group = (parent, position = [0, 0, 0], name = '') => {
  const root = new THREE.Group(); root.position.set(...position); root.name = name; parent.add(root); return root;
};
const named = (object, name) => { object.name = name; return object; };
const metal = color => mat(color, { metalness: 0.7, roughness: 0.3, clearcoat: 0.35 });
const disc = (parent, radius, depth, material, position = [0, 0, 0], rotation = FRONT_AXIS) => mesh(new THREE.CylinderGeometry(radius, radius, depth, 40), material, parent, position, rotation);
const ring = (parent, radius, thickness, material, position, rotation) => mesh(new THREE.TorusGeometry(radius, thickness, 8, 48), material, parent, position, rotation);

// Character tiles use a square texture with generous lettering, independent of UI fonts.
function textTexture(text, { background = '#344c41', color = '#f5edd7', width = 256, height = 256, size = 172 } = {}) {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${size}px "Songti SC", "Noto Serif CJK SC", serif`;
    ctx.fillText(text, w / 2, h / 2 + 3);
  }, width, height);
}
function textPlane(parent, text, width, height, position, options = {}, rotation) {
  return mesh(new THREE.PlaneGeometry(width, height), mat('#ffffff', { map: textTexture(text, options), roughness: 0.88, clearcoat: 0, side: THREE.DoubleSide }), parent, position, rotation);
}

function board(view) {
  const pine = mat('#c3a777', { map: view.wood, roughness: 0.62, clearcoat: 0.25 });
  const sage = mat('#91a38a', { roughness: 0.3, clearcoat: 0.72 }), dark = mat('#344c41', { roughness: 0.8 });
  const brass = metal('#b79f72'), ivory = mat('#eae2ca');
  const cabinet = group(view.scene, [0, 0, 0], 'station-board-frame');
  mesh(box(2.84, 0.2, 0.86, 0.05), sage, cabinet, [0, 0.13, -0.2]);
  for (const x of [-1.12, 1.12]) mesh(box(0.22, 0.07, 0.65, 0.025), dark, cabinet, [x, 0.035, -0.19]);
  mesh(box(2.8, 1.62, 0.5, 0.045), pine, cabinet, [0, 1.06, -0.31]);
  mesh(box(2.4, 1.21, 0.033, 0.015), dark, cabinet, [0, 1.11, -0.043]);
  for (const y of [0.45, 1.06, 1.73]) mesh(box(2.52, 0.035, 0.11, 0.008), brass, cabinet, [0, y, 0.015]);
  mesh(box(2.62, 0.22, 0.17, 0.025), pine, cabinet, [0, 1.87, -0.04]);
  for (const x of [-1.31, 1.31]) mesh(box(0.18, 1.5, 0.2, 0.025), pine, cabinet, [x, 1.06, -0.055]);
  textPlane(cabinet, '山间小站', 0.75, 0.16, [0, 0.35, -0.035], { width: 768, height: 160, size: 120, background: '#c3a777', color: '#455744' });
  const latch = group(cabinet, [0, 0.46, 0.084], 'station-board-latch');
  mesh(box(0.31, 0.055, 0.045, 0.015), brass, latch);
  disc(latch, 0.035, 0.012, dark, [-0.12, 0, 0.03]);
  registerAction(view, 'board-lock', latch);
  disc(cabinet, 0.15, 0.13, brass, [1.445, 1.13, -0.27], SIDE_AXIS);
  const alignment = group(cabinet, [1.315, 1.41, 0.057], 'station-board-alignment');
  mesh(box(0.016, 0.12, 0.012, 0.003), brass, alignment, [0, 0.047, 0]);
  for (const x of [-0.06, 0, 0.06]) mesh(box(0.01, x ? 0.025 : 0.045, 0.009, 0.003), ivory, cabinet, [1.315 + x, 1.54, 0.06]);
  registerAction(view, 'board-align', alignment);
  const flips = [];
  let crank;
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.id !== 'board-crank') {
      const upper = item.id === 'board-destination', characters = [...(upper ? '山谷' : '慢慢来')], tileW = upper ? 0.84 : 0.53, tileH = upper ? 0.5 : 0.37;
      mesh(box(1.93, 0.042, 0.04, 0.007), brass, root, [0, 0, -0.027]);
      characters.forEach((character, index) => {
        const pivot = group(root, [(index - (characters.length - 1) / 2) * (tileW + 0.08), 0, 0], `station-board-flap-${flips.length}`);
        mesh(box(tileW, tileH, 0.047, 0.017), dark, pivot);
        const glyph = textPlane(pivot, character, tileH * 0.88, tileH * 0.88, [0, 0, 0.027]);
        glyph.name = `station-board-glyph-${flips.length}`;
        const seam = mesh(box(tileW - 0.02, 0.009, 0.005, 0.002), brass, pivot, [0, 0, 0.035]);
        for (const x of [-tileW / 2, tileW / 2]) disc(pivot, 0.03, 0.024, brass, [x, 0, 0], SIDE_AXIS);
        flips.push({ pivot, glyph, seam });
      });
    } else {
      crank = group(root, [0, 0, 0], 'station-board-crank');
      disc(crank, 0.14, 0.07, brass, [0, 0, 0], SIDE_AXIS);
      mesh(box(0.075, 0.24, 0.05, 0.02), brass, crank, [0.05, -0.095, 0]);
      disc(crank, 0.07, 0.18, dark, [0.1, -0.2, 0], SIDE_AXIS);
      registerAction(view, 'board-flip', crank);
    }
    registerItem(view, item, root);
  }
  return { update(dt, time, { before = false }) {
    const deviation = value(view, 'board-align', before), flipped = value(view, 'board-flip', before), locked = value(view, 'board-lock', before);
    alignment.rotation.z = -deviation * Math.PI / 180;
    crank.rotation.x = -flipped * Math.PI * 4;
    flips.forEach(({ pivot, glyph }, i) => {
      const progress = clamp((flipped - i * 0.11) / 0.53, 0, 1);
      pivot.rotation.x = -Math.PI * 2 * progress;
      glyph.visible = !before && progress >= 0.52;
    });
    latch.rotation.z = locked ? Math.PI / 2 : 0;
  } };
}

function wheel(parent, material, brass, name) {
  const root = group(parent, [0, 0, 0], name);
  disc(root, 0.27, 0.16, material, [0, 0, 0], SIDE_AXIS);
  for (const x of [-0.087, 0.087]) {
    disc(root, 0.19, 0.018, brass, [x, 0, 0], SIDE_AXIS);
    disc(root, 0.087, 0.024, material, [x * 1.2, 0, 0], SIDE_AXIS);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4;
      disc(root, 0.027, 0.021, material, [x * 1.13, Math.cos(a) * 0.135, Math.sin(a) * 0.135], SIDE_AXIS);
    }
  }
  return root;
}

function luggage(view) {
  const sage = mat('#90a28b', { roughness: 0.34, clearcoat: 0.7 }), pine = mat('#cab184', { map: view.wood, roughness: 0.73 });
  const brass = metal('#b59d71'), rubber = mat('#424a3f', { roughness: 0.88, clearcoat: 0.02 });
  const leather = mat('#a88763', { roughness: 0.74, clearcoat: 0.16 }), edge = mat('#776447', { roughness: 0.88 });
  const trolley = group(view.scene, [0, 0, 0], 'station-luggage-frame');
  mesh(box(2.02, 0.24, 1.24, 0.052), sage, trolley, [0, 0.38, -0.1]);
  mesh(box(1.82, 0.055, 0.81, 0.01), pine, trolley, [0, 0.46, -0.1]);
  for (const x of [-0.63, -0.21, 0.21, 0.63]) mesh(box(0.012, 0.006, 0.79, 0.002), edge, trolley, [x, 0.488, -0.1]);
  for (const z of [-0.54, 0.34]) mesh(box(1.89, 0.023, 0.023, 0.008), brass, trolley, [0, 0.505, z]);
  mesh(box(2.02, 0.34, 0.14, 0.02), sage, trolley, [0, 0.7, -0.61]);
  for (const x of [-0.93, 0.93]) {
    tube([[x, 0.45, -0.61], [x, 0.82, -0.65], [x, 1.0, -0.65]], 0.047, sage, trolley);
    disc(trolley, 0.063, 0.1, brass, [x, 0.985, -0.65], [0, 0, 0]);
  }
  disc(trolley, 0.056, 2.25, brass, [0, 0.27, -0.1], SIDE_AXIS);
  const leftWheel = wheel(trolley, rubber, brass, 'station-luggage-left-wheel'); leftWheel.position.set(-1.08, 0.27, -0.1);
  const brake = group(trolley, [-0.99, 0.58, 0.3], 'station-luggage-brake');
  mesh(box(0.28, 0.058, 0.2, 0.017), brass, brake);
  for (const z of [-0.06, 0, 0.06]) mesh(box(0.2, 0.015, 0.012, 0.004), rubber, brake, [0, 0.032, z]);
  registerAction(view, 'luggage-brake', brake);
  const visuals = [], straps = [];
  let rightWheel, buckle;
  for (const item of view.level.items) {
    const root = new THREE.Group(), visual = group(root, [0, 0, 0], `${item.id}-visual`); visuals.push({ id: item.id, visual });
    if (item.id === 'luggage-wheel') rightWheel = wheel(visual, rubber, brass, 'station-luggage-right-wheel');
    else if (item.id === 'luggage-handle') {
      tube([[-0.93, -0.475, 0], [-0.93, 0.28, 0], [-0.83, 0.45, 0], [0.83, 0.45, 0], [0.93, 0.28, 0], [0.93, -0.475, 0]], 0.047, sage, visual);
      disc(visual, 0.063, 0.88, rubber, [0, 0.45, 0], SIDE_AXIS);
      for (const x of [-0.5, 0.5]) disc(visual, 0.068, 0.056, brass, [x, 0.45, 0], SIDE_AXIS);
      registerAction(view, 'luggage-roll', visual);
    } else {
      mesh(box(1.36, 0.74, 0.8, 0.07), leather, visual);
      for (const y of [-0.325, 0.325]) {
        tube([[-0.62, y, -0.35], [0.62, y, -0.35], [0.66, y, -0.29], [0.66, y, 0.29], [0.61, y, 0.36], [-0.61, y, 0.36], [-0.66, y, 0.28], [-0.66, y, -0.28], [-0.62, y, -0.35]], 0.013, edge, visual);
      }
      for (const x of [-0.49, 0.49]) {
        mesh(box(0.14, 0.14, 0.034, 0.024), brass, visual, [x, 0.13, 0.401]);
        mesh(box(0.068, 0.023, 0.044, 0.009), edge, visual, [x, 0.125, 0.42]);
      }
      tube([[-0.19, 0.375, 0.03], [-0.15, 0.49, 0.03], [0.15, 0.49, 0.03], [0.19, 0.375, 0.03]], 0.031, edge, visual);
      textPlane(visual, '山谷', 0.32, 0.14, [0, -0.11, 0.406], { width: 512, height: 224, size: 154, background: '#e5d6b4', color: '#536046' });
      for (const x of [-0.3, 0.3]) {
        const strap = group(visual, [x, 0, 0], `station-luggage-strap-${straps.length}`);
        for (const z of [-0.406, 0.406]) mesh(box(0.085, 0.745, 0.017, 0.007), edge, strap, [0, 0, z]);
        for (const y of [-0.377, 0.377]) mesh(box(0.085, 0.014, 0.815, 0.005), edge, strap, [0, y, 0]);
        straps.push(strap);
      }
      buckle = group(visual, [0, 0.12, 0.429], 'station-luggage-buckles');
      for (const x of [-0.3, 0.3]) {
        mesh(box(0.115, 0.13, 0.026, 0.02), brass, buckle, [x, 0, 0]);
        mesh(box(0.065, 0.078, 0.031, 0.012), edge, buckle, [x, 0, 0.01]);
        mesh(box(0.009, 0.09, 0.036, 0.003), brass, buckle, [x, 0, 0.013]);
      }
      registerAction(view, 'luggage-strap', visual);
    }
    registerItem(view, item, root);
  }
  return { update(dt, time, { before = false }) {
    const strapped = value(view, 'luggage-strap', before), rolled = value(view, 'luggage-roll', before), braked = value(view, 'luggage-brake', before), travel = rolled * 0.24;
    trolley.position.x = travel;
    visuals.forEach(({ id, visual }) => { visual.position.x = !before && view.state.placed.has(id) ? travel : 0; });
    leftWheel.rotation.x = rightWheel.rotation.x = rolled * 2.6;
    straps.forEach((strap, i) => { const progress = clamp((strapped - i * 0.4) / 0.6, 0, 1); strap.visible = progress > 0; strap.scale.y = Math.max(0.005, progress); });
    buckle.visible = strapped >= 0.95;
    brake.rotation.x = braked ? -0.3 : 0;
    // Once assembly ends the cleaned faces travel with their frame as well.
    view.dirtyMeshes.forEach(surface => { const spec = surface.userData.field.spec; surface.position.x = spec.position[0] + travel; });
  } };
}

function signal(view) {
  const sage = mat('#91a38a', { roughness: 0.29, clearcoat: 0.78 }), brass = metal('#baa37a');
  const dark = mat('#435746', { roughness: 0.75 }), cream = mat('#e0d9c3', { roughness: 0.43 });
  const lamp = group(view.scene, [0, 0, 0], 'station-signal-housing');
  mesh(box(1.46, 0.22, 0.96, 0.065), sage, lamp, [0, 0.15, -0.14]);
  for (const x of [-0.5, 0.5]) for (const z of [-0.44, 0.13]) disc(lamp, 0.085, 0.07, dark, [x, 0.035, z], [0, 0, 0]);
  disc(lamp, 0.12, 1.2, brass, [0, 0.79, -0.31], [0, 0, 0]);
  for (const y of [0.3, 1.12]) disc(lamp, 0.17, 0.085, brass, [0, y, -0.31], [0, 0, 0]);
  mesh(box(0.99, 1.04, 0.7, 0.06), cream, lamp, [0, 1.66, -0.31]);
  for (const x of [-0.488, 0.488]) mesh(box(0.025, 0.79, 0.56, 0.016), mat('#b8c7ae', { roughness: 0.19, clearcoat: 1 }), lamp, [x, 1.65, -0.31]);
  mesh(box(0.97, 0.045, 0.67, 0.02), brass, lamp, [0, 2.157, -0.31]);
  const reflector = named(disc(lamp, 0.426, 0.062, dark, [0, 1.66, 0.045]), 'station-signal-reflector');
  ring(lamp, 0.432, 0.03, brass, [0, 1.66, 0.084]);
  const lightMaterial = mat('#cfb475', { roughness: 0.22, emissive: '#ffe2a4', emissiveIntensity: 0, clearcoat: 1 });
  const glow = named(mesh(new THREE.CircleGeometry(0.353, 64), lightMaterial, lamp, [0, 1.66, 0.086]), 'station-signal-light');
  const beamMaterial = new THREE.MeshBasicMaterial({ color: '#a8d59b', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const beam = named(mesh(new THREE.ConeGeometry(0.66, 1.65, 40, 1, true), beamMaterial, lamp, [0, 1.66, 0.86], [-Math.PI / 2, 0, 0]), 'station-signal-soft-beam');
  beam.castShadow = false;
  disc(lamp, 0.12, 0.14, brass, [0.55, 0.48, -0.07], SIDE_AXIS);
  tube([[0.12, 0.53, -0.31], [0.37, 0.5, -0.22], [0.55, 0.48, -0.07]], 0.039, brass, lamp);
  const alignment = group(lamp, [0, 1.66, 0.153], 'station-signal-alignment');
  const tick = mesh(box(0.018, 0.1, 0.018, 0.006), brass, alignment, [0, 0.38, 0]);
  registerAction(view, 'signal-align', alignment);
  disc(lamp, 0.037, 0.012, mat('#79a57c'), [0.273, 1.933, 0.115]);
  textPlane(lamp, '慢行', 0.29, 0.14, [0, 0.82, -0.183], { width: 512, height: 240, size: 168, background: '#baa37a', color: '#435746' });
  let glassMaterial, lever;
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.id === 'signal-lens') {
      ring(root, 0.384, 0.029, brass, [0, 0, 0]);
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) disc(root, 0.023, 0.02, brass, [Math.sin(angle) * 0.384, Math.cos(angle) * 0.384, 0.018]);
      glassMaterial = mat('#b6c6a8', { transparent: true, opacity: 0.64, roughness: 0.33, clearcoat: 1, metalness: 0.08, side: THREE.DoubleSide, depthWrite: false });
      named(mesh(new THREE.CircleGeometry(0.36, 64), glassMaterial, root, [0, 0, 0.016]), 'station-signal-lens-glass');
      const ridges = mat('#d4e0c4', { transparent: true, opacity: 0.33, roughness: 0.15, clearcoat: 1, depthWrite: false });
      for (const radius of [0.10, 0.18, 0.26, 0.33]) ring(root, radius, 0.005, ridges, [0, 0, 0.025]);
      registerAction(view, 'signal-polish', root);
    } else if (item.id === 'signal-lever') {
      lever = group(root, [0, -0.15, 0], 'station-signal-lever');
      disc(lever, 0.106, 0.12, brass, [0, 0, 0], SIDE_AXIS);
      tube([[0, 0, 0], [0, 0.17, 0], [0, 0.47, 0]], 0.032, brass, lever);
      disc(lever, 0.068, 0.2, dark, [0, 0.43, 0], [0, 0, 0]);
      registerAction(view, 'signal-pull', lever);
    } else {
      mesh(box(1.14, 0.075, 0.94, 0.04), brass, root, [0, -0.135, 0]);
      mesh(new THREE.CylinderGeometry(0.32, 0.54, 0.25, 48), sage, root, [0, 0.018, 0]);
      disc(root, 0.32, 0.023, sage, [0, 0.155, 0], [0, 0, 0]);
      for (let i = 0; i < 5; i++) mesh(box(0.055, 0.1, 0.018, 0.015), dark, root, [(i - 2) * 0.1, 0.068, 0.343]);
    }
    registerItem(view, item, root);
  }
  return { update(dt, time, { before = false, stage = '' }) {
    const polished = value(view, 'signal-polish', before), angle = value(view, 'signal-align', before), pulled = value(view, 'signal-pull', before);
    const assembled = !before && view.state.placed.has('signal-lens');
    glassMaterial.opacity = 0.64 - polished * 0.42; glassMaterial.roughness = 0.33 - polished * 0.25;
    alignment.rotation.z = -angle * Math.PI / 180;
    lever.rotation.x = pulled ? -0.92 : 0;
    lightMaterial.color.set(pulled ? '#8bbf80' : '#cfb475');
    lightMaterial.emissive.set(pulled ? '#9dde92' : '#ffe2a4');
    lightMaterial.emissiveIntensity = assembled ? 0.12 + polished * 0.43 + pulled * 0.32 : 0;
    beamMaterial.opacity = assembled && pulled ? 0.036 : 0;
    beam.visible = !before && pulled === 1;
    tick.visible = !before && view.state.placed.has('signal-lens');
    reflector.visible = glow.visible = true;
  } };
}

export function buildStationMiddleScene(view) {
  const build = { 'station-board': board, 'station-luggage': luggage, 'station-signal': signal }[view.level.id];
  if (!build) throw new Error(`Unsupported middle station level: ${view.level.id}`);
  const extra = build(view); addSurfaces(view); return extra;
}
