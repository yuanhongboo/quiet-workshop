import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import { box, mat, mesh, tube, label, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

const TOP = [-Math.PI / 2, 0, 0];
const value = (view, id, before, max = 1) => before ? 0 : clamp(view.state.taskValues?.[id] || 0, 0, max);
const named = (object, name) => { object.name = name; return object; };
const brass = () => mat('#c3a875', { roughness: 0.32, metalness: 0.72, clearcoat: 0.18 });
const screw = (parent, x, y, z, material) => {
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16), material, parent, [x, y, z], [Math.PI / 2, 0, 0]);
  mesh(box(0.027, 0.0035, 0.003, 0.001), mat('#6b664f'), parent, [x, y, z + 0.008]);
};
function plate(parent, text, subtitle, position, width, height, color, background) {
  return mesh(new THREE.PlaneGeometry(width, height), mat('#fffaf0', {
    map: label(text, subtitle, color || '#425850', background || '#f2e8d2'), roughness: 0.76, clearcoat: 0,
  }), parent, position);
}
function paperTexture(color, stampColor = '#6f9f94') {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#81756050'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.5, h * 0.53); ctx.lineTo(w, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w * 0.35, h * 0.43); ctx.moveTo(w, h); ctx.lineTo(w * 0.65, h * 0.43); ctx.stroke();
    ctx.fillStyle = stampColor; ctx.fillRect(w * 0.8, h * 0.1, w * 0.11, h * 0.19);
    ctx.strokeStyle = '#fbf3dd'; ctx.lineWidth = 2; ctx.strokeRect(w * 0.815, h * 0.12, w * 0.08, h * 0.15);
    ctx.fillStyle = '#5d665850'; ctx.fillRect(w * 0.11, h * 0.19, w * 0.18, 2); ctx.fillRect(w * 0.11, h * 0.24, w * 0.25, 2);
  }, 512, 320);
}
function envelope(parent, color, width, depth, y = 0, height = 0.025) {
  const paper = mat(color, { roughness: 0.86, clearcoat: 0 });
  mesh(box(width, height, depth, 0.009), paper, parent, [0, y, 0]);
  mesh(new THREE.PlaneGeometry(width - 0.012, depth - 0.012), mat('#ffffff', {
    map: paperTexture(color), roughness: 0.9, clearcoat: 0,
  }), parent, [0, y + height / 2 + 0.001, 0], TOP);
}

function mailbox(view) {
  const root = new THREE.Group(); root.name = 'post-box-body'; view.scene.add(root);
  const enamel = mat('#7ba99e', { roughness: 0.27, clearcoat: 0.9, metalness: 0.08 });
  const dark = mat('#354e48', { roughness: 0.8 });
  const metal = brass(), hingeMaterial = brass(); hingeMaterial.roughness = 0.74;
  mesh(box(1.86, 1.58, 0.82, 0.09), enamel, root, [0, 0.97, -0.34]);
  mesh(box(1.98, 0.21, 0.93, 0.09), enamel, root, [0, 1.81, -0.34]);
  mesh(box(1.72, 1.13, 0.024, 0.045), dark, root, [0, 0.82, 0.078]);
  for (const x of [-0.7, 0.7]) {
    mesh(box(0.15, 0.18, 0.67, 0.035), dark, root, [x, 0.12, -0.35]);
    screw(root, x, 1.23, 0.1, metal); screw(root, x, 0.38, 0.1, metal);
  }
  mesh(box(1.42, 0.32, 0.025, 0.025), metal, root, [0, 1.51, 0.091]);
  named(mesh(box(1.29, 0.21, 0.036, 0.018), dark, root, [0, 1.51, 0.119]), 'post-box-mail-opening');
  const hinges = new THREE.Group(); root.add(hinges);
  for (const x of [-0.56, 0.56]) {
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.17, 24), hingeMaterial, hinges, [x, 1.665, 0.151], [0, 0, Math.PI / 2]);
    mesh(box(0.13, 0.12, 0.02, 0.012), hingeMaterial, hinges, [x, 1.695, 0.115]);
    screw(hinges, x, 1.715, 0.133, metal);
  }
  registerAction(view, 'post-box-oil', hinges);
  const lidItem = view.level.items.find(i => i.id === 'post-box-lid'), lid = new THREE.Group();
  const hinge = named(new THREE.Group(), 'post-box-opening-lid'); hinge.position.y = 0.145; lid.add(hinge);
  mesh(box(1.34, 0.29, 0.065, 0.025), enamel, hinge, [0, -0.145, 0]);
  const lidStripe = mesh(box(1.19, 0.022, 0.012, 0.006), metal, hinge, [0, -0.23, 0.039]);
  plate(hinge, 'LETTERS', 'BY THE SEA', [0, -0.134, 0.035], 0.61, 0.12, '#35554a', '#91b9a9');
  registerAction(view, 'post-box-open', lid); registerItem(view, lidItem, lid);
  const nameItem = view.level.items.find(i => i.id === 'post-box-name'), name = new THREE.Group();
  mesh(box(0.92, 0.32, 0.065, 0.025), mat('#c8ac80', { map: view.wood, roughness: 0.65 }), name);
  plate(name, '海边邮局', 'SEASIDE POST', [0, 0, 0.034], 0.79, 0.25);
  screw(name, -0.405, 0, 0.038, metal); screw(name, 0.405, 0, 0.038, metal);
  registerItem(view, nameItem, name);
  mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.08, 24), metal, root, [0.99, 1.01, -0.06], [Math.PI / 2, 0, 0]);
  const flag = named(new THREE.Group(), 'post-box-raised-flag'); flag.position.set(0.99, 1.01, -0.002); root.add(flag);
  mesh(box(0.035, 0.6, 0.03, 0.008), metal, flag, [0, 0.28, 0]);
  mesh(box(0.33, 0.21, 0.035, 0.025), mat('#ca896f', { roughness: 0.55 }), flag, [0.135, 0.48, 0]);
  plate(flag, '01', '', [0.14, 0.48, 0.02], 0.19, 0.13, '#fbebd5', '#ca896f');
  registerAction(view, 'post-box-flag', flag);
  tube([[1.03, 0.28, -0.4], [1.16, 0.27, -0.34], [1.13, 0.28, -0.22]], 0.017, metal, root);
  return { update(dt, time, { before = false } = {}) {
    const oil = value(view, 'post-box-oil', before);
    hingeMaterial.roughness = 0.74 - oil * 0.5;
    hinge.rotation.x = -value(view, 'post-box-open', before) * 1.16;
    flag.rotation.z = -(1 - value(view, 'post-box-flag', before)) * Math.PI / 2;
    lidStripe.material.clearcoat = 0.2 + oil * 0.5;
  } };
}

function sorter(view) {
  const root = new THREE.Group(); root.name = 'post-sorter-cabinet'; view.scene.add(root);
  const oak = mat('#bda077', { map: view.wood, roughness: 0.59, clearcoat: 0.18 });
  const edge = mat('#997a51', { map: view.wood, roughness: 0.73 });
  const metal = brass();
  mesh(box(2.76, 0.15, 0.9, 0.035), oak, root, [0, 0.075, -0.4]);
  mesh(box(2.78, 0.11, 0.94, 0.024), oak, root, [0, 0.31, -0.4]);
  mesh(box(2.73, 1.4, 0.064, 0.017), oak, root, [0, 1.03, -0.84]);
  for (const x of [-1.34, -0.43, 0.43, 1.34]) mesh(box(0.075, 1.36, 0.7, 0.014), oak, root, [x, 1.06, -0.44]);
  mesh(box(2.87, 0.13, 0.9, 0.035), oak, root, [0, 1.79, -0.4]);
  mesh(box(2.74, 0.14, 0.1, 0.015), oak, root, [0, 1.665, -0.048]);
  const labels = [];
  const routes = [
    { x: -0.86, id: 'post-sorter-bay', title: '海湾', small: 'THE BAY', color: '#a1c0b6' },
    { x: 0, id: 'post-sorter-hill', title: '山间', small: 'THE HILLS', color: '#eaddc0' },
    { x: 0.86, id: 'post-sorter-street', title: '街角', small: 'THE STREET', color: '#dca38e' },
  ];
  for (const route of routes) {
    mesh(box(0.14, 0.024, 0.12, 0.012), mat(route.color), root, [route.x, 0.379, -0.055]);
    const card = named(new THREE.Group(), route.id + '-label'); root.add(card); card.position.set(route.x, 1.82, 0.07);
    mesh(box(0.68, 0.25, 0.022, 0.017), metal, card);
    plate(card, route.title, route.small, [0, 0, 0.014], 0.61, 0.205, '#40574c', route.color);
    registerAction(view, route.id, card); labels.push({ ...route, card });
  }
  const drawer = named(new THREE.Group(), 'post-sorter-open-drawer'); root.add(drawer); drawer.position.set(0, 0.185, -0.4);
  mesh(box(2.58, 0.045, 0.76, 0.017), oak, drawer, [0, -0.045, 0]);
  for (const x of [-1.26, 1.26]) mesh(box(0.065, 0.17, 0.76, 0.012), edge, drawer, [x, 0.03, 0]);
  mesh(box(2.56, 0.15, 0.055, 0.012), edge, drawer, [0, 0.028, -0.365]);
  const face = mesh(box(2.68, 0.19, 0.07, 0.018), oak, drawer, [0, 0.018, 0.4]);
  tube([[-0.21, 0.01, 0.446], [-0.18, 0.01, 0.52], [0.18, 0.01, 0.52], [0.21, 0.01, 0.446]], 0.025, metal, drawer);
  for (const x of [-0.7, 0.2, 0.8]) {
    const cards = new THREE.Group(); cards.position.set(x, 0, 0.12); cards.rotation.y = x * 0.08; drawer.add(cards);
    envelope(cards, '#eee6d2', 0.47, 0.31, 0, 0.018);
  }
  registerAction(view, 'post-sorter-drawer', drawer);
  for (const item of view.level.items) {
    const group = new THREE.Group();
    for (let n = 0; n < 4; n++) {
      const layer = new THREE.Group(); layer.rotation.y = (n % 2 ? 1 : -1) * 0.028; group.add(layer);
      envelope(layer, item.color, 0.63 - n * 0.007, 0.465 - n * 0.006, -0.059 + n * 0.039, 0.031);
    }
    mesh(box(0.049, 0.166, 0.473, 0.009), mat('#e7d7b4', { roughness: 0.92 }), group, [-0.17, 0, 0]);
    registerItem(view, item, group);
  }
  return { update(dt, time, { before = false } = {}) {
    for (const route of labels) {
      const done = value(view, route.id, before);
      route.card.rotation.z = (1 - done) * (route.x === 0 ? -0.11 : Math.sign(route.x) * 0.12);
      route.card.position.y = 1.82 - (1 - done) * 0.04;
      route.card.position.z = 0.07 + (1 - done) * 0.035;
    }
    drawer.position.z = -0.4 + value(view, 'post-sorter-drawer', before) * 0.54;
    face.material.clearcoat = 0.18;
  } };
}

function dateFace() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#eee3c8'; ctx.fillRect(0, 0, w, h); ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = '#6e654c'; ctx.fillStyle = '#57614d'; ctx.textAlign = 'center';
    for (let i = 0; i < 60; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 30); ctx.lineWidth = i % 5 ? 2 : 4;
      ctx.beginPath(); ctx.moveTo(0, -w * 0.4); ctx.lineTo(0, -w * (i % 5 ? 0.365 : 0.335)); ctx.stroke();
      if (i % 5 === 0) { ctx.font = '27px Georgia'; ctx.fillText(String(i), 0, -w * 0.29); }
      ctx.restore();
    }
    ctx.font = '38px Georgia'; ctx.fillText('SEA', 0, 8); ctx.font = '22px Georgia'; ctx.fillText('POST OFFICE', 0, 42);
  }, 512, 512);
}
function postmark() {
  return canvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.translate(w / 2, h / 2); ctx.strokeStyle = '#536e90'; ctx.fillStyle = '#536e90';
    for (const radius of [w * 0.44, w * 0.365]) { ctx.lineWidth = radius > w * 0.4 ? 6 : 3; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.font = '36px Georgia'; ctx.fillText('SEASIDE', 0, -70); ctx.font = '30px sans-serif'; ctx.fillText('海 边 邮 局', 0, 88);
    ctx.font = 'bold 45px Georgia'; ctx.fillText('09 · 09', 0, 17);
    for (const y of [-38, 40]) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-137, y); ctx.lineTo(137, y); ctx.stroke(); }
    // Deterministic paper gaps keep the impression tactile without external bitmap assets.
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 190; i++) ctx.fillRect((i * 83.19) % w - w / 2, (i * 47.73) % h - h / 2, i % 3 + 1, 2);
  }, 512, 512);
}
function stamp(view) {
  const root = new THREE.Group(); root.name = 'post-stamp-workbench'; view.scene.add(root);
  const oak = mat('#bca27b', { map: view.wood, roughness: 0.62, clearcoat: 0.18 });
  const walnut = mat('#725c40', { map: view.wood, roughness: 0.4, clearcoat: 0.35 });
  const metal = brass(), enamel = mat('#79948a', { roughness: 0.3, clearcoat: 0.7 });
  mesh(box(2.85, 0.12, 1.42, 0.035), oak, root, [0, 0.06, -0.03]);
  mesh(box(0.99, 0.13, 0.75, 0.055), mat('#496158'), root, [-1.19, 0.188, -0.03]);
  mesh(box(0.94, 0.034, 0.69, 0.045), enamel, root, [-1.19, 0.24, -0.03]);
  for (const x of [-1.52, -0.86]) mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.12, 20), metal, root, [x, 0.24, -0.39], [0, 0, Math.PI / 2]);
  for (const x of [-0.06, 0.96]) {
    mesh(box(0.16, 1.34, 0.17, 0.038), metal, root, [x, 0.82, -0.36]);
    mesh(box(0.26, 0.12, 0.33, 0.022), metal, root, [x, 0.2, -0.36]);
    for (let n = 0; n < 8; n++) mesh(box(0.064, 0.014, 0.006, 0.002), mat('#786d4c'), root, [x, 0.49 + n * 0.11, -0.271]);
  }
  mesh(box(1.4, 0.25, 0.23, 0.05), metal, root, [0.45, 1.5, -0.36]);
  mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.11, 32), metal, root, [0.45, 1.065, 0.03], [Math.PI / 2, 0, 0]);
  tube([[0.45, 1.39, -0.34], [0.45, 1.38, -0.03], [0.45, 1.31, 0.21]], 0.055, metal, root);
  const press = named(new THREE.Group(), 'post-stamp-moving-head'); root.add(press);
  mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.69, 32), metal, press, [0.45, 1.005, 0.21]);
  mesh(new THREE.CylinderGeometry(0.218, 0.218, 0.095, 48), metal, press, [0.45, 0.72, 0.21]);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 48), mat('#535457', { roughness: 0.93 }), press, [0.45, 0.665, 0.21]);
  const knob = new THREE.Group(); knob.position.set(0.45, 1.365, 0.21); press.add(knob);
  mesh(new THREE.SphereGeometry(0.145, 32, 20), walnut, knob); knob.scale.set(1.6, 0.7, 0.85);
  registerAction(view, 'post-stamp-press', press);
  const foot = new THREE.Group(), footItem = view.level.items.find(i => i.id === 'post-stamp-foot');
  mesh(box(1.18, 0.22, 0.86, 0.075), enamel, foot);
  mesh(box(1.02, 0.035, 0.71, 0.018), mat('#d2c4a3', { roughness: 0.65 }), foot, [0, 0.115, 0]);
  for (const x of [-0.49, 0.49]) screw(foot, x, 0.0, 0.405, metal);
  registerItem(view, footItem, foot);
  const ringItem = view.level.items.find(i => i.id === 'post-stamp-ring'), ring = new THREE.Group();
  const rotor = named(new THREE.Group(), 'post-stamp-date-rotor'); ring.add(rotor);
  mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.12, 64), metal, rotor, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CircleGeometry(0.233, 64), mat('#fff5df', { map: dateFace(), roughness: 0.7, clearcoat: 0 }), rotor, [0, 0, 0.064]);
  mesh(new THREE.TorusGeometry(0.249, 0.017, 10, 64), metal, rotor, [0, 0, 0.066]);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    const tooth = mesh(box(0.028, 0.019, 0.073, 0.004), metal, rotor, [Math.sin(a) * 0.267, Math.cos(a) * 0.267, 0]); tooth.rotation.z = -a;
  }
  const pointer = new THREE.Shape(); pointer.moveTo(0, -0.02); pointer.lineTo(-0.036, 0.065); pointer.lineTo(0.036, 0.065); pointer.closePath();
  mesh(new THREE.ShapeGeometry(pointer), mat('#c38565', { side: THREE.DoubleSide }), ring, [0, 0.25, 0.071]);
  registerAction(view, 'post-stamp-align', ring); registerItem(view, ringItem, ring);
  const letterItem = view.level.items.find(i => i.id === 'post-stamp-letter'), letter = new THREE.Group();
  envelope(letter, '#f1e8d3', 0.9, 0.53, 0, 0.035);
  const impression = named(mesh(new THREE.PlaneGeometry(0.41, 0.41), new THREE.MeshBasicMaterial({
    map: postmark(), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  }), letter, [0, 0.019, -0.015], TOP), 'post-stamp-paper-impression');
  impression.castShadow = false; registerItem(view, letterItem, letter);
  return { update(dt, time, { before = false } = {}) {
    const angle = value(view, 'post-stamp-align', before, 60), pressure = value(view, 'post-stamp-press', before);
    rotor.rotation.z = -angle * Math.PI / 180;
    // A completed press lifts the head back up so the mark stays visible after reload.
    press.position.y = pressure >= 1 ? 0 : -pressure * 0.268;
    impression.visible = !before && pressure > 0.72 && view.state.placed.has('post-stamp-letter');
    impression.material.opacity = clamp((pressure - 0.72) / 0.28, 0, 1) * 0.86;
    impression.rotation.z = -angle * Math.PI / 180;
  } };
}

export function buildPostEarlyScene(view) {
  const build = { 'post-box': mailbox, 'post-sorter': sorter, 'post-stamp': stamp }[view.level.id];
  if (!build) throw new Error(`Unsupported early post level: ${view.level.id}`);
  const extra = build(view); addSurfaces(view); return extra;
}
