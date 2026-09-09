import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { box, mat, mesh, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

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
const metal = color => mat(color, { metalness: 0.66, roughness: 0.33, clearcoat: 0.3 });
const disc = (parent, radius, depth, material, position = [0, 0, 0], rotation = FRONT_AXIS) => mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material, parent, position, rotation);
const ring = (parent, radius, thickness, material, position, rotation) => mesh(new THREE.TorusGeometry(radius, thickness, 8, 48), material, parent, position, rotation);
function textPlane(parent, text, width, height, position, { background = '#ede5cd', color = '#445341', size = 115 } = {}, rotation) {
  const map = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${size}px "Songti SC", "Noto Serif CJK SC", serif`;
    ctx.fillText(text, w / 2, h / 2 + 3);
  }, Math.max(256, [...text].length * 135), 160);
  return mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false }), parent, position, rotation);
}

function catalog(view) {
  const pine = mat('#c6ae85', { map: view.wood, roughness: 0.7 }), sage = mat('#9daa8a', { roughness: 0.48 });
  const shadow = mat('#6f694e', { roughness: 0.95 }), brass = metal('#b39a6a'), paper = mat('#ede5ce', { roughness: 0.94, clearcoat: 0 });
  const cabinet = group(view.scene, [0, 0, 0], 'book-catalog-cabinet');
  mesh(box(2.8, 0.22, 1.26, 0.055), sage, cabinet, [0, 0.17, -0.19]);
  mesh(box(2.76, 0.12, 1.1, 0.027), pine, cabinet, [0, 1.28, -0.21]);
  mesh(box(2.74, 1.06, 0.1, 0.023), pine, cabinet, [0, 0.75, -0.7]);
  for (const x of [-1.315, -0.43, 0.43, 1.315]) mesh(box(x === -1.315 || x === 1.315 ? 0.11 : 0.055, 1.04, 1.02, 0.018), pine, cabinet, [x, 0.75, -0.21]);
  for (const x of [-1.1, 1.1]) mesh(box(0.24, 0.07, 0.93, 0.025), shadow, cabinet, [x, 0.035, -0.18]);
  const words = ['山野', '旅行', '故事'], colors = ['#a6b69b', '#d2b790', '#b9958a'], drawers = [], cardVisuals = [];
  words.forEach((word, index) => {
    const x = (index - 1) * 0.86, drawer = group(cabinet, [x, 0.54, -0.14], `book-catalog-drawer-${index}`); drawers.push(drawer);
    mesh(box(0.78, 0.065, 0.89, 0.018), pine, drawer, [0, -0.045, -0.08]);
    mesh(box(0.78, 0.35, 0.075, 0.025), pine, drawer, [0, 0.015, 0.495]);
    for (const side of [-0.366, 0.366]) mesh(box(0.045, 0.25, 0.85, 0.012), pine, drawer, [side, 0.045, 0.045]);
    mesh(box(0.57, 0.195, 0.025, 0.015), brass, drawer, [0, 0.022, 0.547]);
    named(textPlane(drawer, word, 0.51, 0.14, [0, 0.026, 0.563], { background: colors[index], color: '#3c4a39' }), `book-catalog-label-${index}`);
    const handle = group(drawer, [0, -0.139, 0.572], `book-catalog-handle-${index}`);
    mesh(box(0.28, 0.031, 0.055, 0.013), brass, handle);
    for (const side of [-0.115, 0.115]) disc(handle, 0.027, 0.03, brass, [side, 0, -0.034]);
    if (index === 1) registerAction(view, 'catalog-pull', handle);
  });
  const slide = group(drawers[1], [0.305, -0.07, 0.562], 'book-catalog-return-tab');
  mesh(box(0.065, 0.085, 0.036, 0.009), sage, slide);
  registerAction(view, 'catalog-close', slide);
  let indexCards;
  for (const [index, item] of view.level.items.entries()) {
    const root = new THREE.Group(), visual = group(root, [0, 0, 0], `${item.id}-visual`); cardVisuals.push({ id: item.id, visual });
    mesh(box(0.62, 0.36, 0.52, 0.014), paper, visual, [0, -0.042, 0]);
    for (let n = 0; n < 5; n++) mesh(box(0.625, 0.39, 0.012, 0.005), paper, visual, [0, -0.032 + (n % 2) * 0.014, -0.21 + n * 0.091]);
    const divider = group(visual, [0, 0, 0], `book-catalog-divider-${index}`);
    mesh(box(0.63, 0.46, 0.027, 0.014), mat(colors[index], { roughness: 0.96, clearcoat: 0 }), divider, [0, 0, 0.252]);
    named(textPlane(divider, words[index], 0.57, 0.18, [0, 0.115, 0.269], { background: colors[index], color: '#3c4a39' }), `book-catalog-card-label-${index}`);
    if (index === 1) { indexCards = divider; registerAction(view, 'catalog-index', divider); }
    registerItem(view, item, root);
  }
  return { update(dt, time, { before = false }) {
    const pulled = value(view, 'catalog-pull', before), closed = value(view, 'catalog-close', before), aligned = value(view, 'catalog-index', before);
    const travel = pulled * (1 - closed) * 0.4;
    drawers[1].position.z = -0.14 + travel;
    for (const { id, visual } of cardVisuals) visual.position.z = !before && id === 'catalog-travel' && view.state.placed.has(id) ? travel : 0;
    indexCards.rotation.z = aligned * Math.PI / 300;
    slide.rotation.z = -closed * Math.PI / 2;
  } };
}

// A hand-drawn fictional atlas, deliberately unrelated to real borders or geography.
function islandMapTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#a9c0b0'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e9e6ce88'; ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += h / 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const islands = [[0.17, 0.31, 0.1, 0.14], [0.42, 0.62, 0.13, 0.14], [0.70, 0.3, 0.09, 0.16], [0.85, 0.69, 0.08, 0.1], [0.54, 0.25, 0.055, 0.095], [0.27, 0.75, 0.035, 0.055]];
    islands.forEach(([x, y, sx, sy], index) => {
      ctx.fillStyle = index % 2 ? '#d5d7b1' : '#c7cd9d'; ctx.strokeStyle = '#778d7133'; ctx.lineWidth = 4; ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const angle = i / 24 * Math.PI * 2, radius = 0.79 + 0.15 * Math.sin(angle * 3 + index) + 0.07 * Math.cos(angle * 5);
        const px = (x + Math.cos(angle) * sx * radius) * w, py = (y + Math.sin(angle) * sy * radius) * h;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#879a78';
      for (let n = 0; n < 4; n++) { const px = (x + (n - 1.5) * sx / 3) * w, py = (y + Math.sin(n + index) * sy / 5) * h; ctx.beginPath(); ctx.moveTo(px - 8, py + 8); ctx.lineTo(px, py - 8); ctx.lineTo(px + 8, py + 8); ctx.fill(); }
    });
  }, 1024, 512);
}
function globe(view) {
  const brass = metal('#b7a177'), pine = mat('#bea780', { map: view.wood, roughness: 0.69 }), sage = mat('#a6b5a2', { roughness: 0.44 });
  const dark = mat('#515f49', { roughness: 0.75 }), cream = mat('#ede5cd', { roughness: 0.75 });
  const atlas = mat('#ffffff', { map: islandMapTexture(), roughness: 0.78, clearcoat: 0.12 });
  const stand = group(view.scene, [0, 0, 0], 'book-globe-stand');
  mesh(box(2.05, 0.26, 1.34, 0.09), brass, stand, [0, 0.16, -0.04]);
  mesh(box(1.84, 0.19, 1.19, 0.06), pine, stand, [0, 0.315, -0.015]);
  mesh(box(1.74, 0.3, 0.055, 0.025), sage, stand, [0, 0.3, 0.62]);
  disc(stand, 0.31, 0.1, brass, [0, 0.445, -0.25], [0, 0, 0]);
  disc(stand, 0.12, 0.23, brass, [0, 0.58, -0.25], [0, 0, 0]);
  const lower = group(stand, [0, 1.42, -0.25], 'book-globe-lower');
  mesh(new THREE.SphereGeometry(0.76, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), atlas, lower);
  disc(lower, 0.748, 0.022, dark, [0, -0.005, 0], [0, 0, 0]);
  ring(lower, 0.762, 0.009, brass, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const compass = group(stand, [0, 0.429, 0.35], 'book-globe-compass');
  disc(compass, 0.21, 0.025, brass, [0, 0, 0], [0, 0, 0]);
  disc(compass, 0.177, 0.012, cream, [0, 0.017, 0], [0, 0, 0]);
  const needle = group(compass, [0, 0.034, 0], 'book-globe-needle');
  mesh(new THREE.ConeGeometry(0.044, 0.145, 3), mat('#966e65'), needle, [0, 0, -0.055], [-Math.PI / 2, 0, 0]);
  mesh(new THREE.ConeGeometry(0.039, 0.13, 3), dark, needle, [0, 0, 0.055], [Math.PI / 2, 0, 0]);
  registerAction(view, 'globe-lock', compass);
  named(textPlane(stand, '风栖岛', 0.65, 0.16, [0, 0.56, 0.063], { background: '#ede5cd', color: '#445341' }), 'book-globe-name');
  const guide = mesh(box(0.024, 0.12, 0.024, 0.007), brass, stand, [0, 0.81, 0.264]);
  let upper, crank, island;
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.id === 'globe-hemisphere') {
      upper = group(root, [0, -0.38, 0], 'book-globe-upper');
      mesh(new THREE.SphereGeometry(0.76, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), atlas, upper);
      island = group(upper, [0, 0.27, 0.713], 'book-globe-island');
      const pebble = mesh(new THREE.SphereGeometry(0.11, 14, 8), mat('#dfcf9d', { roughness: 0.86 }), island); pebble.scale.set(1, 0.6, 0.16);
      disc(island, 0.037, 0.025, brass, [0, 0.015, 0.027]);
      registerAction(view, 'globe-island', island);
    } else if (item.id === 'globe-meridian') {
      ring(root, 0.936, 0.035, brass, [0, 0, 0]);
      for (const y of [-0.854, 0.854]) disc(root, 0.065, 0.2, brass, [0, y, 0], [0, 0, 0]);
      for (let n = 0; n < 12; n++) { const a = n * Math.PI / 6; const tick = mesh(box(0.01, 0.042, 0.012, 0.003), dark, root, [Math.sin(a) * 0.936, Math.cos(a) * 0.936, 0.037]); tick.rotation.z = -a; }
    } else {
      crank = group(root, [0, 0, 0], 'book-globe-crank');
      disc(crank, 0.077, 0.24, brass, [-0.01, 0.1, 0], SIDE_AXIS);
      mesh(box(0.061, 0.28, 0.052, 0.014), brass, crank, [0.09, 0.003, 0]);
      disc(crank, 0.067, 0.19, dark, [0.10, -0.12, 0], SIDE_AXIS);
      registerAction(view, 'globe-spin', crank);
    }
    registerItem(view, item, root);
  }
  return { update(dt, time, { before = false }) {
    const spin = value(view, 'globe-spin', before), dial = value(view, 'globe-island', before), locked = value(view, 'globe-lock', before);
    const angle = spin * Math.PI * 2 + (dial - 35) * Math.PI / 180;
    lower.rotation.y = upper.rotation.y = angle;
    crank.rotation.x = -spin * Math.PI * 4;
    needle.rotation.y = locked ? 0 : (dial - 35) * Math.PI / 180;
    compass.position.y = 0.429 - locked * 0.023;
    guide.visible = !before && view.state.placed.has('globe-hemisphere');
    island.children[0].material.color.set(locked ? '#ecd7a2' : '#dfcf9d');
  } };
}

function paperBird(parent, material, brass) {
  const bird = group(parent, [0, 0, 0], 'book-music-bird');
  const body = mesh(new THREE.ConeGeometry(0.12, 0.31, 4), material, bird, [0, 0.0, 0], [0, 0, -0.65]);
  body.scale.z = 0.65;
  const head = mesh(new THREE.OctahedronGeometry(0.081), material, bird, [0.11, 0.115, 0]); head.scale.z = 0.75;
  mesh(new THREE.ConeGeometry(0.027, 0.088, 3), brass, bird, [0.185, 0.116, 0], [0, 0, -Math.PI / 2]);
  disc(bird, 0.009, 0.01, mat('#48503e'), [0.132, 0.126, 0.054]);
  mesh(new THREE.ConeGeometry(0.09, 0.23, 3), material, bird, [-0.137, 0.055, 0], [0, 0, 0.83]);
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = group(bird, [-0.015, 0.025, side * 0.03], `book-music-wing-${side}`);
    const fold = mesh(new THREE.ConeGeometry(0.105, 0.24, 3), material, wing, [-0.018, 0.045, side * 0.071], [side * 0.7, 0, -0.5]); fold.scale.z = 0.34; wings.push(wing);
  }
  disc(bird, 0.034, 0.11, brass, [-0.015, -0.143, 0], [0, 0, 0]);
  return { bird, wings };
}
function music(view) {
  const pine = mat('#bda27d', { map: view.wood, roughness: 0.7 }), brass = metal('#b9a273');
  const linen = mat('#ddd4bc', { roughness: 0.93, clearcoat: 0 }), burgundy = mat('#956f69', { roughness: 0.87 }), dark = mat('#535947', { roughness: 0.85 });
  const caseRoot = group(view.scene, [0, 0, 0], 'book-music-case');
  mesh(box(2.35, 0.17, 1.3, 0.065), pine, caseRoot, [0, 0.16, -0.06]);
  mesh(box(2.19, 0.022, 1.12, 0.025), burgundy, caseRoot, [0, 0.257, -0.06]);
  for (const x of [-1.12, 1.12]) mesh(box(0.11, 0.44, 1.23, 0.025), pine, caseRoot, [x, 0.35, -0.06]);
  for (const z of [-0.66, 0.54]) mesh(box(2.2, 0.38, 0.076, 0.022), linen, caseRoot, [0, 0.36, z]);
  mesh(box(2.3, 0.03, 1.27, 0.012), pine, caseRoot, [0, 0.2, -0.06]);
  for (const z of [-0.68, 0.56]) mesh(box(2.3, 0.03, 0.045, 0.01), pine, caseRoot, [0, 0.565, z]);
  for (const x of [-1.125, 1.125]) mesh(box(0.05, 0.03, 1.23, 0.01), pine, caseRoot, [x, 0.565, -0.06]);
  for (const x of [-0.93, 0.93]) mesh(box(0.24, 0.075, 1.02, 0.027), dark, caseRoot, [x, 0.038, -0.06]);
  // Separate hinge and underside keep the raised lid and its lettering physically readable.
  const lid = group(caseRoot, [0, 0.69, -0.64], 'book-music-lid');
  mesh(box(2.35, 0.09, 1.27, 0.038), pine, lid, [0, 0, 0.58]);
  mesh(box(2.13, 0.01, 1.05, 0.028), burgundy, lid, [0, -0.05, 0.58]);
  named(textPlane(lid, '风吹书页', 1.22, 0.3, [0, -0.057, 0.56], { background: '#956f69', color: '#f0e5cf', size: 124 }, [Math.PI / 2, 0, 0]), 'book-music-lid-label');
  for (const x of [-0.77, 0.77]) disc(caseRoot, 0.044, 0.3, brass, [x, 0.681, -0.637], SIDE_AXIS);
  registerAction(view, 'music-lid', lid);
  for (const x of [-0.96, 0.16]) {
    mesh(box(0.07, 0.26, 0.16, 0.018), brass, caseRoot, [x, 0.44, -0.12]);
    disc(caseRoot, 0.078, 0.04, brass, [x, 0.62, -0.12], SIDE_AXIS);
  }
  const comb = [], combRoot = group(caseRoot, [-0.41, 0.53, 0.17], 'book-music-comb');
  mesh(box(1.05, 0.075, 0.1, 0.016), brass, combRoot, [0, -0.02, 0.12]);
  for (let n = 0; n < 13; n++) {
    const tooth = mesh(new THREE.BoxGeometry(0.047, 0.012, 0.23 - n * 0.005), brass, combRoot, [(n - 6) * 0.075, 0.022, 0.013]); comb.push(tooth);
  }
  disc(caseRoot, 0.23, 0.08, brass, [0.62, 0.61, -0.2], [0, 0, 0]);
  disc(caseRoot, 0.185, 0.026, sageMaterial(), [0.62, 0.664, -0.2], [0, 0, 0]);
  let cylinder, key, bird, wings;
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.id === 'music-cylinder') {
      cylinder = group(root, [0, 0, 0], 'book-music-cylinder');
      disc(cylinder, 0.185, 1.08, brass, [0, 0, 0], SIDE_AXIS);
      for (const x of [-0.525, 0.525]) disc(cylinder, 0.193, 0.027, dark, [x, 0, 0], SIDE_AXIS);
      const pinGeometry = new THREE.CylinderGeometry(0.012, 0.013, 0.049, 6);
      for (let n = 0; n < 24; n++) {
        const a = (n * 2.39996) % (Math.PI * 2), x = ((n % 12) - 5.5) * 0.079;
        mesh(pinGeometry, brass, cylinder, [x, Math.cos(a) * 0.19, Math.sin(a) * 0.19], [a, 0, 0]);
      }
    } else if (item.id === 'music-key') {
      key = group(root, [0, 0, 0], 'book-music-key');
      disc(key, 0.05, 0.28, brass, [0, 0, 0], SIDE_AXIS);
      for (const y of [-0.112, 0.112]) {
        ring(key, 0.083, 0.024, brass, [0.126, y, 0], [0, Math.PI / 2, 0]);
      }
      mesh(box(0.035, 0.24, 0.025, 0.009), brass, key, [0.126, 0, 0]);
      registerAction(view, 'music-wind', key);
    } else {
      ({ bird, wings } = paperBird(root, mat('#e8dec2', { roughness: 0.94, clearcoat: 0 }), brass));
      registerAction(view, 'music-bird', bird);
    }
    registerItem(view, item, root);
  }
  const lidOffset = new THREE.Vector3(0, 0.047, 0.58), lidRotation = new THREE.Euler(...TOP);
  return { update(dt, time, { before = false, stage = '', actionId = null }) {
    const wound = value(view, 'music-wind', before), opened = value(view, 'music-lid', before), awake = value(view, 'music-bird', before);
    const assembledStage = !before && !['clean', 'intro'].includes(stage) && view.state.surfaces.every(field => field.done);
    lid.rotation.x = assembledStage ? -0.95 - opened * 0.82 : 0;
    key.rotation.x = wound * Math.PI * 5;
    const dancing = !before && awake === 1 && view.state.placed.has('music-paper-bird');
    cylinder.rotation.x = dancing ? time * 0.65 : 0;
    bird.rotation.y = dancing ? Math.sin(time * 0.7) * 0.3 : 0;
    bird.position.y = dancing ? Math.sin(time * 1.4) * 0.012 : 0;
    wings.forEach((wing, index) => { wing.rotation.x = dancing ? Math.sin(time * 1.4) * 0.11 * (index ? 1 : -1) : 0; });
    comb.forEach((tooth, index) => { tooth.rotation.x = dancing ? Math.sin(time * 5 + index * 1.4) * 0.03 : 0; });
    const cleanLid = view.dirtyMeshes.find(surface => surface.userData.field.spec.id === 'music-lid-face');
    if (cleanLid) {
      lid.updateMatrix(); cleanLid.position.copy(lidOffset).applyMatrix4(lid.matrix);
      cleanLid.quaternion.copy(lid.quaternion).multiply(new THREE.Quaternion().setFromEuler(lidRotation));
    }
  } };
}
function sageMaterial() { return mat('#a7b29a', { roughness: 0.48 }); }

export function buildBookMiddleScene(view) {
  const build = { 'book-catalog': catalog, 'book-globe': globe, 'book-music': music }[view.level.id];
  if (!build) throw new Error(`Unsupported middle book level: ${view.level.id}`);
  const extra = build(view); addSurfaces(view); return extra;
}
