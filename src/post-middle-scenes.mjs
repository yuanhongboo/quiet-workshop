import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import { box, mat, mesh, tube, label, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

const TOP = [-Math.PI / 2, 0, 0];
const FRONT_AXIS = [Math.PI / 2, 0, 0];
const named = (object, name) => { object.name = name; return object; };
const value = (view, id, before) => {
  const task = view.level.operation.tasks.find(entry => entry.id === id);
  return before ? task.initial ?? 0 : view.state.taskValues?.[id] ?? task.initial ?? 0;
};
const group = (parent, position = [0, 0, 0], name = '') => {
  const root = new THREE.Group(); parent.add(root); root.position.set(...position); root.name = name; return root;
};
const metal = color => mat(color, { metalness: 0.72, roughness: 0.28, clearcoat: 0.35 });
const disc = (parent, radius, thickness, material, position = [0, 0, 0], rotation = FRONT_AXIS) => mesh(new THREE.CylinderGeometry(radius, radius, thickness, 48), material, parent, position, rotation);
const plaque = (parent, text, small, w, h, position, rotation, background = '#e7dfc7', color = '#3c5956') => mesh(new THREE.PlaneGeometry(w, h), mat('#ffffff', { map: label(text, small, color, background), roughness: 0.86, clearcoat: 0, side: THREE.DoubleSide }), parent, position, rotation);

function letterGlyphTexture(letter) {
  return canvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#31483f';
    ctx.font = '600 108px "Songti SC", "Noto Serif CJK SC", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, w / 2, h / 2 + 3);
  }, 128, 128);
}

function paperTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#f3ebd7'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b6b6a92b'; ctx.lineWidth = 1;
    for (let y = 75; y < h - 35; y += 39) { ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(w - 32, y); ctx.stroke(); }
    ctx.fillStyle = '#657e75'; ctx.font = '18px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('LETTERS FROM THE COAST', w / 2, 38);
  }, 512, 384);
}
function gaugeTexture({ radio = false } = {}) {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#f1e6cc'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#63756a'; ctx.fillStyle = '#496057'; ctx.lineWidth = 3;
    if (radio) {
      for (let i = 0; i <= 20; i++) {
        const x = 28 + i * (w - 56) / 20;
        ctx.beginPath(); ctx.moveTo(x, h * 0.18); ctx.lineTo(x, h * (i % 5 ? 0.42 : 0.58)); ctx.stroke();
      }
      ctx.fillStyle = '#94b3a6'; ctx.fillRect(w * 0.585, h * 0.05, w * 0.075, h * 0.56);
      ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#3c5956';
      ctx.fillText('灯塔湾  ·  62', w * 0.62, h * 0.87);
    } else {
      const cx = w / 2, cy = h / 2;
      for (let i = -12; i <= 12; i++) {
        const a = i * Math.PI / 18, inner = w * (i % 3 ? 0.36 : 0.32), outer = w * 0.405;
        ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * inner, cy - Math.cos(a) * inner);
        ctx.lineTo(cx + Math.sin(a) * outer, cy - Math.cos(a) * outer); ctx.stroke();
      }
      ctx.font = '30px Georgia'; ctx.textAlign = 'center'; ctx.fillText('0', cx, h * 0.25);
      ctx.font = '20px sans-serif'; ctx.fillText('COAST POST', cx, h * 0.72);
    }
  }, 512, radio ? 192 : 512);
}
function stampTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#efe8d3'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#82a8a0'; ctx.fillRect(15, 15, w - 30, h - 30);
    ctx.fillStyle = '#dce6d4'; ctx.fillRect(w * 0.35, h * 0.32, w * 0.3, h * 0.4);
    ctx.fillStyle = '#365f5d'; ctx.beginPath(); ctx.moveTo(w * 0.28, h * 0.33); ctx.lineTo(w / 2, h * 0.19); ctx.lineTo(w * 0.72, h * 0.33); ctx.fill();
    ctx.fillRect(w * 0.33, h * 0.42, w * 0.34, h * 0.08);
    ctx.fillStyle = '#e5c885'; ctx.fillRect(w * 0.44, h * 0.3, w * 0.12, h * 0.09);
    ctx.fillStyle = '#eee8d6'; ctx.font = '20px Georgia'; ctx.textAlign = 'center'; ctx.fillText('COAST POST', w / 2, h * 0.88);
    for (let i = 8; i < w; i += 18) for (const y of [0, h]) { ctx.beginPath(); ctx.arc(i, y, 4, 0, Math.PI * 2); ctx.fill(); }
  }, 256, 320);
}

function typewriter(view) {
  const enamel = mat('#87aaa0', { roughness: 0.28, clearcoat: 0.86 });
  const dark = mat('#384c49', { roughness: 0.58 }), brass = metal('#baa173'), steel = metal('#b6bcb4');
  const paper = mat('#ffffff', { map: paperTexture(), roughness: 0.93, clearcoat: 0, side: THREE.DoubleSide });
  const machine = group(view.scene, [0, 0, 0], 'typewriter-machine');
  for (const x of [-0.86, 0.86]) for (const z of [-0.57, 0.45]) disc(machine, 0.13, 0.12, dark, [x, 0.06, z], [0, 0, 0]);
  mesh(box(2.16, 0.34, 1.36, 0.1), enamel, machine, [0, 0.23, -0.06]);
  mesh(box(2.13, 0.56, 0.68, 0.095), enamel, machine, [0, 0.69, -0.43]);
  mesh(box(2.07, 0.08, 0.85, 0.06), dark, machine, [0, 0.403, 0.18]);
  plaque(machine, 'COAST', 'LETTERS & GOOD NEWS', 0.64, 0.105, [0, 0.495, -0.044], undefined, '#87aaa0');
  const keyboard = group(machine, [0, 0, 0], 'typewriter-keyboard'), keys = [];
  const keyShape = new THREE.CylinderGeometry(0.066, 0.061, 0.042, 24);
  const keyFace = new THREE.CylinderGeometry(0.055, 0.055, 0.008, 24), ivory = mat('#ede4cd', { roughness: 0.6 });
  for (let row = 0; row < 3; row++) for (let col = 0; col < 10 - row; col++) {
    const x = (col - (9 - row) / 2) * 0.174, z = 0.045 + row * 0.177;
    const key = group(keyboard, [x, 0.49 - row * 0.023, z]);
    mesh(keyShape, brass, key); mesh(keyFace, ivory, key, [0, 0.025, 0]);
    keys.push({ key, y: key.position.y });
  }
  mesh(box(1.14, 0.042, 0.1, 0.035), dark, keyboard, [0, 0.405, 0.58]);
  registerAction(view, 'type-words', keyboard);
  const carriage = group(machine, [0, 0, 0], 'typewriter-carriage');
  mesh(box(2.06, 0.075, 0.10, 0.018), steel, carriage, [0, 0.985, -0.44]);
  const roller = group(carriage, [0, 1.055, -0.47], 'typewriter-roller');
  disc(roller, 0.12, 1.94, dark, [0, 0, 0], [0, 0, Math.PI / 2]);
  for (const x of [-1.085, 1.085]) {
    disc(roller, 0.155, 0.12, brass, [x, 0, 0], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      mesh(box(0.135, 0.018, 0.03, 0.007), dark, roller, [x, Math.cos(a) * 0.141, Math.sin(a) * 0.141], [a, 0, 0]);
    }
  }
  registerAction(view, 'type-feed', roller);
  const hammer = group(machine, [0, 0.72, -0.17], 'typewriter-typebar');
  mesh(box(0.033, 0.31, 0.026, 0.007), steel, hammer, [0, 0.145, 0]);
  mesh(box(0.065, 0.055, 0.037, 0.007), dark, hammer, [0, 0.3, 0]);
  const glyphs = [], spools = [];
  let paperSheet, paperInk, leverArm;
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.id === 'type-paper') {
      paperSheet = group(root, [0, 0, 0], 'typewriter-fed-paper');
      mesh(box(1.32, 0.82, 0.026, 0.012), paper, paperSheet);
      paperInk = group(paperSheet, [0, 0, 0.017], 'typewriter-letter-ink');
      const words = [...'愿好消息抵达你'];
      words.forEach((letter, i) => {
        const glyph = mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshBasicMaterial({ map: letterGlyphTexture(letter), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), paperInk, [(i - 3) * 0.166, -0.015, 0]);
        glyph.name = `typewriter-letter-${i}`; glyphs.push(glyph);
      });
    } else if (item.id === 'type-ribbon') {
      mesh(box(1.18, 0.018, 0.075, 0.008), mat('#383b41', { roughness: 0.98 }), root, [0, 0.038, 0]);
      for (const x of [-0.55, 0.55]) {
        const spool = group(root, [x, 0, 0]); spools.push(spool);
        disc(spool, 0.158, 0.105, dark, [0, 0, 0], [0, 0, 0]);
        disc(spool, 0.174, 0.018, steel, [0, 0.059, 0], [0, 0, 0]);
        disc(spool, 0.04, 0.023, brass, [0, 0.072, 0], [0, 0, 0]);
        for (let i = 0; i < 4; i++) disc(spool, 0.035, 0.003, dark, [Math.sin(i * Math.PI / 2) * 0.1, 0.07, Math.cos(i * Math.PI / 2) * 0.1], [0, 0, 0]);
      }
    } else {
      leverArm = group(root, [0, 0, 0], 'typewriter-return-lever');
      tube([[0.15, 0, -0.18], [-0.09, 0.02, -0.18], [-0.16, 0.02, 0.15]], 0.026, steel, leverArm);
      mesh(box(0.16, 0.085, 0.15, 0.033), dark, leverArm, [-0.16, 0.03, 0.17]);
      registerAction(view, 'type-return', leverArm);
    }
    registerItem(view, item, root);
  }
  return {
    update(dt, time, { before = false, actionId = null }) {
      const feed = clamp(value(view, 'type-feed', before) / 180, 0, 2), typed = value(view, 'type-words', before), returned = value(view, 'type-return', before);
      roller.rotation.x = -feed * Math.PI;
      carriage.position.x = returned ? 0 : -typed * 0.32;
      paperSheet.position.y = feed * 0.18 + returned * 0.085;
      paperSheet.position.x = carriage.position.x;
      paperInk.visible = !before && view.state.placed.has('type-paper');
      glyphs.forEach((glyph, i) => { glyph.visible = typed >= (i + 1) / glyphs.length; });
      const active = !before && actionId === 'type-words' && typed < 1;
      keys.forEach(({ key, y }, i) => { key.position.y = y - (active && i === Math.floor(time * 7) % keys.length ? 0.03 : 0); });
      hammer.rotation.x = active ? -0.46 + Math.max(0, Math.sin(time * 30)) * 0.55 : -0.46;
      spools.forEach(spool => { spool.rotation.y = typed * Math.PI * 3; });
      leverArm.rotation.y = returned ? -0.24 : 0;
    },
  };
}

function parcel(view) {
  const enamel = mat('#a7b9a7', { roughness: 0.3, clearcoat: 0.76 }), brass = metal('#baa077'), dark = mat('#405750');
  const bench = group(view.scene, [0, 0, 0], 'parcel-workbench');
  mesh(box(1.85, 0.055, 1.17, 0.028), mat('#c3a880', { map: view.wood, roughness: 0.78 }), bench, [1.01, 0.025, -0.2]);
  mesh(box(1.28, 0.12, 0.94, 0.065), enamel, bench, [-1, 0.09, -0.05]);
  mesh(box(1.1, 0.76, 0.72, 0.09), enamel, bench, [-1, 0.44, -0.05]);
  disc(bench, 0.34, 0.11, brass, [-1, 0.55, 0.332]);
  mesh(new THREE.CircleGeometry(0.3, 64), mat('#ffffff', { map: gaugeTexture(), roughness: 0.83, clearcoat: 0 }), bench, [-1, 0.55, 0.391]);
  const needle = group(bench, [-1, 0.55, 0.402], 'parcel-scale-needle');
  mesh(box(0.016, 0.24, 0.008, 0.004), dark, needle, [0, 0.084, 0]); disc(needle, 0.025, 0.01, brass);
  const control = disc(bench, 0.08, 0.06, brass, [-1, 0.22, 0.377]);
  registerAction(view, 'parcel-balance', control);
  mesh(box(1.33, 0.075, 0.97, 0.035), metal('#c7c4b4'), bench, [-1, 0.88, -0.05]);
  for (const z of [-0.49, 0.39]) mesh(box(1.25, 0.025, 0.028, 0.01), brass, bench, [-1, 0.927, z]);
  disc(bench, 0.26, 0.036, brass, [0.73, 0.07, -0.43], [0, 0, 0]);
  mesh(box(0.55, 0.03, 0.65, 0.028), brass, bench, [1.49, 0.07, -0.43]);
  const twineMaterial = mat('#ede0ba', { roughness: 0.95, clearcoat: 0 }), ropes = [];
  let tapeStrip, stamp, knot;
  const postage = stampTexture();
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.id === 'parcel-gift') {
      const kraft = mat('#c29a71', { roughness: 0.93, clearcoat: 0 });
      mesh(box(1.06, 0.62, 0.78, 0.025), kraft, root);
      // Folded paper end flaps make the wrapped parcel read as paper, not a wooden block.
      for (const x of [-0.534, 0.534]) {
        const seams = group(root, [x, 0, 0]);
        for (const z of [-0.38, 0.38]) tube([[0, -0.29, z], [0, 0, 0], [0, 0.29, z]], 0.006, mat('#a4805c'), seams);
      }
      plaque(root, '海的另一边', 'HANDLE WITH KINDNESS', 0.56, 0.21, [-0.13, 0.314, -0.14], TOP, '#e5d2ab');
      tapeStrip = named(mesh(box(0.14, 0.006, 0.79, 0.002), mat('#d5b58b', { roughness: 0.86 }), root, [0.2, 0.316, 0]), 'parcel-paper-seal');
      for (const points of [
        [[-0.535, 0.322, 0], [0, 0.328, 0], [0.535, 0.322, 0], [0.54, 0.02, 0], [0.532, -0.314, 0], [0, -0.318, 0], [-0.532, -0.314, 0], [-0.54, 0.02, 0], [-0.535, 0.322, 0]],
        [[0, 0.322, -0.394], [0, 0.328, 0], [0, 0.322, 0.394], [0, 0.02, 0.397], [0, -0.314, 0.394], [0, -0.318, 0], [0, -0.314, -0.394], [0, 0.02, -0.397], [0, 0.322, -0.394]],
      ]) {
        const cord = tube(points, 0.012, twineMaterial, root); cord.name = `parcel-cross-string-${ropes.length}`;
        ropes.push({ cord, count: cord.geometry.index.count });
      }
      knot = group(root, [0, 0.335, 0], 'parcel-tied-knot');
      tube([[0, 0, 0], [-0.11, 0.05, -0.07], [-0.18, 0.02, 0], [-0.11, 0.01, 0.06], [0, 0, 0], [0.1, 0.06, -0.08], [0.18, 0.02, -0.01], [0.1, 0.005, 0.06], [0, 0, 0]], 0.012, twineMaterial, knot);
      for (const sign of [-1, 1]) tube([[0, 0, 0], [sign * 0.11, 0.015, 0.11], [sign * 0.16, -0.005, 0.19]], 0.011, twineMaterial, knot);
      stamp = named(mesh(new THREE.PlaneGeometry(0.25, 0.31), mat('#ffffff', { map: postage, roughness: 0.88, clearcoat: 0, side: THREE.DoubleSide }), root, [0.23, 0.33, 0.19], TOP), 'parcel-applied-stamp');
      registerAction(view, 'parcel-wrap', root);
    } else if (item.id === 'parcel-tape') {
      const paper = mat('#cfb087', { roughness: 0.89, side: THREE.DoubleSide });
      mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.24, 48, 1, true), paper, root);
      mesh(new THREE.CylinderGeometry(0.096, 0.096, 0.242, 48, 1, true), mat('#806e52', { side: THREE.DoubleSide, roughness: 0.85 }), root);
      for (const y of [-0.12, 0.12]) mesh(new THREE.RingGeometry(0.096, 0.21, 48), paper, root, [0, y, 0], TOP);
      mesh(box(0.28, 0.007, 0.09, 0.003), paper, root, [0.15, -0.114, 0.05], [0, -0.14, 0]);
    } else {
      for (let i = 0; i < 4; i++) {
        mesh(box(0.45, 0.014, 0.54, 0.004), mat('#eee5cf', { roughness: 0.9 }), root, [0, -0.025 + i * 0.016, 0], [0, (i - 2) * 0.015, 0]);
      }
      mesh(new THREE.PlaneGeometry(0.41, 0.51), mat('#ffffff', { map: postage, roughness: 0.88 }), root, [0, 0.032, 0], TOP);
      registerAction(view, 'parcel-stamp', root);
    }
    registerItem(view, item, root);
  }
  return {
    update(dt, time, { before = false }) {
      const balance = value(view, 'parcel-balance', before), wrapped = value(view, 'parcel-wrap', before), stamped = value(view, 'parcel-stamp', before);
      needle.rotation.z = -balance * 0.045;
      control.rotation.z = balance * 0.07;
      tapeStrip.visible = wrapped > 0; tapeStrip.scale.z = Math.max(0.001, clamp(wrapped * 2, 0, 1));
      ropes.forEach(({ cord, count }, i) => {
        const progress = clamp((wrapped - i * 0.43) / 0.43, 0, 1);
        cord.visible = progress > 0;
        cord.geometry.setDrawRange(0, Math.floor(count * progress / 3) * 3);
      });
      knot.visible = wrapped >= 0.9; knot.scale.setScalar(clamp((wrapped - 0.9) * 10, 0.001, 1));
      stamp.visible = stamped === 1;
    },
  };
}

function radio(view) {
  const oak = mat('#a58966', { map: view.wood, roughness: 0.58, clearcoat: 0.24 }), enamel = mat('#b8c4b8', { roughness: 0.36, clearcoat: 0.62 });
  const brass = metal('#bda579'), dark = mat('#3e5552', { roughness: 0.64 }), steel = metal('#c3c6bc');
  const receiver = group(view.scene, [0, 0, 0], 'radio-receiver');
  mesh(box(2.22, 1.26, 0.72, 0.09), oak, receiver, [0, 0.7, -0.36]);
  mesh(box(2.09, 1.12, 0.055, 0.052), enamel, receiver, [0, 0.7, -0.008]);
  for (const x of [-0.85, 0.85]) mesh(box(0.25, 0.085, 0.51, 0.03), dark, receiver, [x, 0.045, -0.34]);
  const speaker = group(receiver, [-0.56, 0.77, 0.026], 'radio-speaker');
  disc(speaker, 0.385, 0.055, brass);
  const cone = named(disc(speaker, 0.348, 0.018, mat('#586d64', { roughness: 0.92 }), [0, 0, 0.032]), 'radio-speaker-cone');
  disc(speaker, 0.12, 0.025, dark, [0, 0, 0.053]);
  for (let row = -5; row <= 5; row++) {
    const y = row * 0.059, half = Math.sqrt(Math.max(0, 0.337 ** 2 - y ** 2));
    mesh(box(half * 2, 0.011, 0.009, 0.004), brass, speaker, [0, y, 0.075]);
  }
  mesh(box(1.02, 0.36, 0.045, 0.027), brass, receiver, [0.48, 1.003, 0.033]);
  mesh(new THREE.PlaneGeometry(0.94, 0.28), mat('#ffffff', { map: gaugeTexture({ radio: true }), roughness: 0.78 }), receiver, [0.48, 1.003, 0.059]);
  const tuningNeedle = named(mesh(box(0.012, 0.16, 0.01, 0.003), mat('#a06343'), receiver, [0.1, 1.04, 0.074]), 'radio-frequency-needle');
  const volumeKnob = disc(receiver, 0.107, 0.085, dark, [0.055, 0.48, 0.076]);
  const volumeTick = mesh(box(0.01, 0.052, 0.006, 0.002), brass, volumeKnob, [0, 0, -0.046], [-Math.PI / 2, 0, 0]);
  volumeTick.position.z = -0.05;
  registerAction(view, 'radio-volume', volumeKnob);
  const lightMaterial = mat('#8a9975', { emissive: '#dcebb1', emissiveIntensity: 0, roughness: 0.22, clearcoat: 1 });
  const light = named(disc(receiver, 0.057, 0.018, lightMaterial, [0.94, 0.68, 0.06]), 'radio-tuned-lamp');
  const receiveButton = disc(receiver, 0.08, 0.052, brass, [0.94, 0.45, 0.07]);
  registerAction(view, 'radio-receive', receiveButton);
  plaque(receiver, 'COAST RECEIVER', 'LISTENING TO THE HARBOUR', 0.99, 0.105, [0.48, 0.76, 0.036], undefined, '#b8c4b8');
  const signal = group(receiver, [0.09, 0.29, 0.049], 'radio-signal-bars');
  const bars = [];
  for (let i = 0; i < 7; i++) {
    const glow = mat('#aebba5', { emissive: '#bcdaa1', emissiveIntensity: 0, roughness: 0.37 });
    bars.push(mesh(box(0.06, 0.035 + i * 0.009, 0.009, 0.006), glow, signal, [i * 0.102, i * 0.0045, 0]));
  }
  disc(receiver, 0.095, 0.055, brass, [-0.88, 1.346, -0.4], [0, 0, 0]);
  tube([[1.1, 0.45, -0.3], [1.38, 0.4, -0.3], [1.49, 0.42, -0.3]], 0.038, brass, receiver);
  tube([[1.1, 1.06, -0.3], [1.35, 1.04, -0.3], [1.49, 1.08, -0.3]], 0.025, brass, receiver);
  const cord = named(tube([[1.37, 0.41, -0.24], [1.57, 0.2, -0.11], [1.71, 0.16, 0.16], [1.39, 0.12, 0.32], [1.18, 0.21, 0.13], [1.07, 0.34, 0.015]], 0.023, dark, receiver), 'radio-connected-cord');
  let tuningKnob;
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.id === 'radio-antenna') {
      disc(root, 0.062, 0.36, steel, [0, -0.2, 0], [0, 0, 0]);
      disc(root, 0.036, 0.37, steel, [0, 0.145, 0], [0, 0, 0]);
      mesh(new THREE.SphereGeometry(0.047, 16, 12), brass, root, [0, 0.35, 0]);
      disc(root, 0.083, 0.06, dark, [0, -0.35, 0], [0, 0, 0]);
    } else if (item.id === 'radio-knob') {
      tuningKnob = group(root, [0, 0, 0], 'radio-tuning-knob');
      disc(tuningKnob, 0.185, 0.11, dark);
      disc(tuningKnob, 0.15, 0.014, brass, [0, 0, 0.06]);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        mesh(box(0.013, 0.032, 0.06, 0.004), brass, tuningKnob, [Math.sin(a) * 0.178, Math.cos(a) * 0.178, 0], [0, 0, -a]);
      }
      mesh(box(0.012, 0.075, 0.005, 0.002), dark, tuningKnob, [0, 0.07, 0.071]);
      registerAction(view, 'radio-tune', tuningKnob);
    } else {
      tube([[0, -0.28, 0], [0.04, -0.14, -0.025], [0.04, 0.14, -0.025], [0, 0.28, 0]], 0.075, dark, root);
      for (const y of [-0.285, 0.285]) {
        disc(root, 0.14, 0.13, dark, [0, y, 0]);
        disc(root, 0.112, 0.011, brass, [0, y, 0.075]);
        for (let i = 0; i < 5; i++) disc(root, 0.009, 0.003, dark, [Math.sin(i * 1.257) * 0.055, y + Math.cos(i * 1.257) * 0.055, 0.083]);
      }
    }
    registerItem(view, item, root);
  }
  return {
    update(dt, time, { before = false, actionId = null, stage = '' }) {
      const frequency = value(view, 'radio-tune', before), volume = value(view, 'radio-volume', before), received = value(view, 'radio-receive', before);
      const assembled = !before && view.state.placed.has('radio-knob') && view.state.placed.has('radio-antenna');
      const tuned = assembled && Math.abs(frequency - 62) <= 3;
      tuningNeedle.position.x = 0.06 + frequency / 100 * 0.84;
      tuningKnob.rotation.z = (0.5 - frequency / 100) * Math.PI * 1.6;
      volumeKnob.rotation.z = volume / 10 * -Math.PI * 1.4;
      lightMaterial.emissiveIntensity = tuned ? 0.8 : 0;
      lightMaterial.color.set(tuned ? '#c4d39c' : '#8a9975');
      bars.forEach((bar, i) => {
        const on = !before && received >= (i + 1) / bars.length;
        bar.material.emissiveIntensity = on ? 0.55 : 0;
        bar.material.color.set(on ? '#a3c59d' : '#aebba5');
      });
      const listening = tuned && volume > 0 && (actionId === 'radio-receive' || received === 1 && ['ready', 'brew', 'done'].includes(stage));
      cone.position.z = 0.032 + (listening ? Math.sin(time * 18) * 0.006 : 0);
      receiveButton.position.z = actionId === 'radio-receive' && !before ? 0.055 : 0.07;
      cord.visible = !before && view.state.placed.has('radio-handset');
    },
  };
}

export function buildPostMiddleScene(view) {
  const build = { 'post-typewriter': typewriter, 'post-parcel': parcel, 'post-radio': radio }[view.level.id];
  if (!build) throw new Error(`Unsupported middle post level: ${view.level.id}`);
  const extra = build(view); addSurfaces(view); return extra;
}
