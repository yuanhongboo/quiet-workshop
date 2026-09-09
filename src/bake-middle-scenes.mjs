import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { box, mat, mesh, tube, weave, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

const TOP = [-Math.PI / 2, 0, 0], FRONT_AXIS = [Math.PI / 2, 0, 0], SIDE_AXIS = [0, 0, Math.PI / 2];
const value = (view, id, before) => { const task = view.level.operation.tasks.find(entry => entry.id === id); return before ? task.initial ?? 0 : view.state.taskValues?.[id] ?? task.initial ?? 0; };
function group(parent, position = [0, 0, 0], name = '') { const object = new THREE.Group(); object.position.set(...position); object.name = name; parent.add(object); return object; }
const named = (object, name) => { object.name = name; return object; };
const metal = color => mat(color, { metalness: 0.64, roughness: 0.36, clearcoat: 0.1 });
const disc = (parent, radius, depth, material, position = [0, 0, 0], rotation = FRONT_AXIS) => mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material, parent, position, rotation);
const ring = (parent, radius, thickness, material, position = [0, 0, 0], rotation = TOP) => mesh(new THREE.TorusGeometry(radius, thickness, 8, 48), material, parent, position, rotation);
function lettering(parent, text, width, height, position, background = '#ede3cc', rotation) {
  const map = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#4b5140'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 110px "Songti SC", "Noto Serif CJK SC", serif'; ctx.fillText(text, w / 2, h / 2 + 3);
  }, Math.max(256, [...text].length * 135), 160);
  return mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false }), parent, position, rotation);
}
function flourMaterial() {
  const map = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#eee0bf'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 850; i++) { ctx.fillStyle = i % 2 ? '#ffffff12' : '#927b4c0c'; ctx.fillRect((i * 71) % w, (i * 137) % h, 1, 1); }
  }, 256, 256);
  return mat('#f0e4c9', { map, roughness: 0.98, clearcoat: 0, metalness: 0 });
}
// Every frame starts from the same rest shape: partial saves and before/after views never accumulate deformation.
function softDough(parent, material, name, position = [0, 0, 0]) {
  const geometry = new THREE.SphereGeometry(1, 36, 24), basis = geometry.attributes.position.array.slice();
  const object = named(mesh(geometry, material, parent, position), name);
  let signature = '';
  return { object, deform({ x = 0.45, y = 0.25, z = 0.39, fold = 0, smooth = 0, turn = 0 } = {}) {
    const next = [x, y, z, fold, smooth, turn].join('|'); if (signature === next) return; signature = next;
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const bx = basis[i], by = basis[i + 1], bz = basis[i + 2];
      const edge = Math.max(0, bx) ** 2, waviness = (1 - smooth) * 0.055 * Math.sin(bx * 5 + turn) * Math.cos(bz * 5 - turn);
      vertices[i] = x * (bx - fold * edge * 0.56 + waviness);
      vertices[i + 1] = y * (by + fold * edge * 0.66 + waviness) + Math.max(-0.055, -by * 0.025);
      vertices[i + 2] = z * (bz * (1 + fold * edge * 0.09) + waviness * 0.6);
    }
    geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere(); geometry.computeBoundingBox();
  } };
}

function mixer(view) {
  const cream = mat('#e8dec7', { roughness: 0.32, clearcoat: 0.3 }), sage = mat('#b3b99c', { roughness: 0.45, clearcoat: 0.15 });
  const brass = metal('#b79a63'), steel = metal('#b8c2be'), pine = mat('#b79970', { map: view.wood, roughness: 0.72 });
  const machine = group(view.scene, [0, 0, 0], 'bake-mixer-machine');
  mesh(box(2.08, 0.25, 1.38, 0.105), cream, machine, [0, 0.17, -0.02]);
  for (const x of [-0.79, 0.79]) mesh(box(0.25, 0.06, 1.03, 0.025), mat('#787f6b', { roughness: 0.94 }), machine, [x, 0.03, -0.02]);
  mesh(box(0.47, 1.64, 0.68, 0.11), cream, machine, [-0.79, 1.03, -0.2]);
  disc(machine, 0.42, 0.08, sage, [0.32, 0.325, -0.05], [0, 0, 0]);
  const arm = group(machine, [-0.8, 1.86, -0.2], 'bake-mixer-arm');
  mesh(box(1.6, 0.43, 0.67, 0.1), sage, arm, [0.73, 0, 0]);
  named(lettering(arm, '慢慢揉', 0.65, 0.16, [0.65, 0.025, 0.34], '#b3b99c'), 'bake-mixer-label');
  const latch = group(arm, [1.3, -0.075, 0.37], 'bake-mixer-latch');
  mesh(box(0.13, 0.18, 0.06, 0.023), brass, latch); registerAction(view, 'mixer-release', latch);
  const switchKnob = group(machine, [-0.79, 1.2, 0.205], 'bake-mixer-switch');
  disc(switchKnob, 0.155, 0.1, mat('#73836d', { roughness: 0.45 }));
  mesh(box(0.025, 0.095, 0.012, 0.006), cream, switchKnob, [0, 0.015, 0.059]); registerAction(view, 'mixer-turn', switchKnob);
  let dough, hookVisual, hookSpin, crank;
  for (const item of view.level.items) {
    const root = new THREE.Group(), visual = group(root, [0, 0, 0], `${item.id}-visual`);
    if (item.id === 'mixer-bowl') {
      const points = [[0.34, -0.3], [0.4, -0.28], [0.49, -0.18], [0.57, 0.04], [0.6, 0.27], [0.58, 0.3], [0.555, 0.26], [0.53, 0.035], [0.45, -0.15], [0.35, -0.23], [0, -0.23]].map(([x, y]) => new THREE.Vector2(x, y));
      mesh(new THREE.LatheGeometry(points, 48), steel, visual); ring(visual, 0.582, 0.024, brass, [0, 0.285, 0]);
      dough = softDough(visual, flourMaterial(), 'bake-mixer-dough', [0, 0.12, 0]);
      registerAction(view, 'mixer-fold', dough.object);
    } else if (item.id === 'mixer-hook') {
      hookVisual = visual; hookSpin = group(visual, [0, 0, 0], 'bake-mixer-hook-spin');
      tube([[0, 0.45, 0], [0, 0.14, 0], [-0.17, -0.12, 0.07], [0.02, -0.38, 0.07], [0.18, -0.22, 0]], 0.038, brass, hookSpin);
      disc(hookSpin, 0.095, 0.07, steel, [0, 0.4, 0], [0, 0, 0]);
    } else {
      crank = visual; disc(visual, 0.084, 0.19, brass, [0, 0, 0], SIDE_AXIS);
      mesh(box(0.045, 0.37, 0.05, 0.012), brass, visual, [-0.08, -0.07, 0]);
      disc(visual, 0.075, 0.18, pine, [-0.11, -0.23, 0], SIDE_AXIS);
    }
    registerItem(view, item, root);
  }
  const hookSlot = new THREE.Vector3(...view.level.items.find(item => item.id === 'mixer-hook').slot), pivot = arm.position.clone();
  const cleanOffset = new THREE.Vector3(0.73, 0.216, 0), topRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...TOP));
  return { update(dt, time, { before = false }) {
    const turn = value(view, 'mixer-turn', before), fold = value(view, 'mixer-fold', before), release = value(view, 'mixer-release', before);
    arm.rotation.z = release * 0.61; switchKnob.rotation.z = -turn * Math.PI * 1.5;
    crank.rotation.x = view.state.placed.has('mixer-crank') && !before ? turn * Math.PI * 6 : 0;
    hookSpin.rotation.y = view.state.placed.has('mixer-hook') && !before ? turn * Math.PI * 8 : 0;
    const angle = view.state.placed.has('mixer-hook') && !before ? arm.rotation.z : 0;
    hookVisual.position.copy(hookSlot).sub(pivot).applyAxisAngle(new THREE.Vector3(0, 0, 1), angle).add(pivot).sub(hookSlot); hookVisual.rotation.z = angle;
    dough.deform({ x: 0.4 + fold * 0.025, y: 0.24 + fold * 0.035, z: 0.39, fold: Math.sin(turn * Math.PI * 3) * 0.36 + fold * (1 - fold) * 2, smooth: fold, turn: turn * Math.PI * 8 });
    dough.object.rotation.y = -turn * Math.PI * 4;
    const surface = view.dirtyMeshes.find(object => object.userData.field.spec.id === 'mixer-arm-top');
    if (surface) { arm.updateMatrix(); surface.position.copy(cleanOffset).applyMatrix4(arm.matrix); surface.quaternion.copy(arm.quaternion).multiply(topRotation); }
  } };
}

function doughBoard(view) {
  const pine = mat('#c9ad80', { map: view.wood, roughness: 0.8, clearcoat: 0 }), sage = mat('#9aa68a', { roughness: 0.78, clearcoat: 0 }), steel = metal('#b7c1b9');
  const board = group(view.scene, [0, 0, 0], 'bake-dough-board');
  mesh(box(2.83, 0.23, 1.65, 0.06), pine, board, [0, 0.13, -0.08]);
  for (const x of [-0.57, 0.57]) mesh(box(0.2, 0.12, 0.28, 0.037), sage, board, [x, 0.3, -0.69]);
  mesh(box(0.59, 0.1, 0.17, 0.02), sage, board, [-1.08, 0.29, 0.18]);
  const nameplate = group(board, [0, 0.67, -0.94], 'bake-dough-nameplate');
  mesh(box(1.06, 0.24, 0.055, 0.022), pine, nameplate);
  for (const x of [-0.4, 0.4]) mesh(box(0.045, 0.45, 0.055, 0.012), sage, nameplate, [x, -0.28, -0.015]);
  named(lettering(nameplate, '慢慢就好', 0.95, 0.14, [0, 0, 0.037], '#c9ad80'), 'bake-dough-label');
  let soft, scraper, roller;
  for (const item of view.level.items) {
    const root = new THREE.Group(), visual = group(root, [0, 0, 0], `${item.id}-visual`);
    if (item.id === 'dough-scraper') {
      scraper = visual; mesh(box(0.54, 0.33, 0.035, 0.013), steel, visual, [0, -0.08, 0]);
      mesh(box(0.56, 0.15, 0.09, 0.035), pine, visual, [0, 0.14, 0]); registerAction(view, 'dough-fold', visual);
    } else if (item.id === 'dough-roller') {
      roller = visual; disc(visual, 0.125, 0.91, pine, [0, 0, 0], SIDE_AXIS);
      for (const x of [-0.57, 0.57]) disc(visual, 0.065, 0.25, sage, [x, 0, 0], SIDE_AXIS);
      registerAction(view, 'dough-stretch', visual);
    } else {
      soft = softDough(visual, flourMaterial(), 'bake-dough-soft'); registerAction(view, 'dough-round', soft.object);
    }
    registerItem(view, item, root);
  }
  return { update(dt, time, { before = false }) {
    const fold = value(view, 'dough-fold', before), round = value(view, 'dough-round', before), stretch = value(view, 'dough-stretch', before);
    const placed = view.state.placed.has('dough-piece') && !before;
    soft.deform({ x: 0.43 - round * 0.045 + stretch * 0.23, y: 0.225 + round * 0.11 - stretch * 0.085, z: 0.345 + round * 0.035 + stretch * 0.005, fold: fold * (1 - round) * 1.05, smooth: round, turn: 0 });
    soft.object.rotation.y = placed ? round * Math.PI * 2 : 0;
    soft.object.position.y = round * 0.11 - stretch * 0.085;
    const working = fold > 0 && fold < 1 && !before;
    scraper.rotation.z = working ? -Math.sin(fold * Math.PI) * 0.4 : 0;
    scraper.position.x = working ? Math.sin(fold * Math.PI) * 0.4 : 0;
    roller.rotation.x = -stretch * Math.PI * 3;
    roller.position.z = stretch > 0 && stretch < 1 && !before ? Math.sin(stretch * Math.PI) * 0.5 : 0;
  } };
}

function proof(view) {
  const wicker = mat('#ba9a67', { map: view.wood, roughness: 0.92, clearcoat: 0 }), pine = mat('#b69769', { map: view.wood, roughness: 0.85, clearcoat: 0 });
  const linen = mat('#e3dcc8', { map: weave(), roughness: 1, clearcoat: 0, side: THREE.DoubleSide }), sage = mat('#99a28a', { roughness: 0.94, clearcoat: 0 });
  const basket = group(view.scene, [0, 0, 0], 'bake-proof-basket');
  mesh(box(2.1, 0.21, 1.57, 0.065), pine, basket, [0, 0.13, -0.04]);
  mesh(box(1.88, 0.1, 1.28, 0.055), linen, basket, [0, 0.29, -0.04]);
  for (const z of [-0.68, 0.6]) mesh(box(1.97, 0.43, 0.12, 0.052), wicker, basket, [0, 0.435, z]);
  for (const x of [-0.94, 0.94]) mesh(box(0.11, 0.43, 1.23, 0.05), wicker, basket, [x, 0.435, -0.04]);
  for (let i = 0; i < 7; i++) {
    const y = 0.27 + i * 0.058;
    for (const z of [-0.745, 0.659]) mesh(box(1.88, 0.021, 0.022, 0.008), pine, basket, [0, y, z]);
    for (const x of [-1.002, 1.002]) mesh(box(0.021, 0.021, 1.23, 0.008), pine, basket, [x, y, -0.04]);
  }
  for (let i = 0; i < 8; i++) mesh(box(0.029, 0.37, 0.025, 0.008), wicker, basket, [-0.84 + i * 0.24, 0.43, 0.673]);
  mesh(box(1.88, 0.065, 0.27, 0.025), linen, basket, [0, 0.647, -0.59]);
  // A continuous cloth bends and rises over the actual dough instead of swapping unrelated models.
  let cloth, clothMesh, corner, soft, tag;
  for (const item of view.level.items) {
    const root = new THREE.Group(), visual = group(root, [0, 0, 0], `${item.id}-visual`);
    if (item.id === 'proof-cloth') {
      cloth = visual; const geometry = new THREE.PlaneGeometry(1.86, 1.4, 26, 20); geometry.rotateX(-Math.PI / 2);
      clothMesh = named(mesh(geometry, linen, visual), 'bake-proof-cloth');
      corner = named(mesh(box(0.22, 0.025, 0.13, 0.012), sage, visual, [0.63, 0.02, 0.46]), 'bake-proof-cloth-tab');
      registerAction(view, 'proof-cover', clothMesh); registerAction(view, 'proof-uncover', corner);
    } else if (item.id === 'proof-dough') {
      soft = softDough(visual, flourMaterial(), 'bake-proof-dough');
    } else {
      tag = visual; mesh(box(0.36, 0.27, 0.07, 0.03), pine, visual);
      named(lettering(visual, '期待', 0.31, 0.17, [0, -0.014, 0.04]), 'bake-proof-label');
      tube([[0, 0.11, 0], [0.015, 0.22, 0], [-0.02, 0.26, -0.045]], 0.012, sage, visual);
      registerAction(view, 'proof-grow', visual);
    }
    registerItem(view, item, root);
  }
  const base = clothMesh.geometry.attributes.position.array.slice();
  let signature = '';
  return { update(dt, time, { before = false }) {
    const cover = value(view, 'proof-cover', before), rise = value(view, 'proof-grow', before), uncover = value(view, 'proof-uncover', before);
    const placed = view.state.placed.has('proof-cloth') && !before, closed = cover * (1 - uncover);
    cloth.scale.set(placed ? 1 : 0.39, 1, placed ? 0.21 + closed * 0.79 : 0.46);
    cloth.position.set(0, placed ? closed * (0.14 + rise * 0.13) : 0, placed ? closed * 0.55 : 0);
    const next = [rise, placed, closed].join('|');
    if (next !== signature) {
      signature = next; const vertices = clothMesh.geometry.attributes.position.array;
      for (let i = 0; i < vertices.length; i += 3) {
        const x = base[i], z = base[i + 2], dome = Math.max(0, 1 - (x / 0.92) ** 2 - (z / 0.78) ** 2);
        vertices[i] = x; vertices[i + 1] = Math.sin(x * 24 + z * 5) * 0.018 + closed * (0.15 + rise * 0.16) * dome; vertices[i + 2] = z;
      }
      clothMesh.geometry.attributes.position.needsUpdate = true; clothMesh.geometry.computeVertexNormals(); clothMesh.geometry.computeBoundingSphere(); clothMesh.geometry.computeBoundingBox();
    }
    corner.position.y = 0.025 + closed * rise * 0.03;
    soft.deform({ x: 0.41 + rise * 0.26, y: 0.225 + rise * 0.26, z: 0.35 + rise * 0.14, smooth: rise });
    soft.object.position.y = rise * 0.26; tag.rotation.z = -0.04 * rise;
  } };
}
export function buildBakeMiddleScene(view) {
  const build = { 'bake-mixer': mixer, 'bake-dough': doughBoard, 'bake-proof': proof }[view.level.id];
  if (!build) throw new Error(`Unsupported middle bakery level: ${view.level.id}`);
  const extra = build(view); addSurfaces(view); return extra;
}
