import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import { box, mat, mesh, tube, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

const TOP = [-Math.PI / 2, 0, 0];
const named = (object, name) => { object.name = name; return object; };
const amount = (view, id, before) => before ? 0 : clamp(view.state.taskValues?.[id] || 0, 0, 1);
const brass = () => mat('#c3aa79', { roughness: 0.35, metalness: 0.7, clearcoat: 0.16 });
const pine = (view, color = '#c4ad87') => mat(color, { map: view.wood, roughness: 0.76, clearcoat: 0.06 });
function print(parent, text, small, position, width, height, foreground = '#2f5140', background = '#ece7d4') {
  const texture = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = foreground; ctx.textAlign = 'center';
    const letters = text.replace(/\s/g, '').length;
    ctx.font = `600 ${letters <= 2 ? 100 : 78}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(text, w / 2, h * 0.64, w * 0.90);
    ctx.font = '18px sans-serif'; ctx.fillText(small, w / 2, h * 0.89, w * 0.90);
  }, 512, 160);
  // Small wayfinding labels retain ink contrast under the bright outdoor lighting.
  return mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), parent, position);
}
function screw(parent, position, metal, radius = 0.035) {
  const group = new THREE.Group(); group.position.set(...position); parent.add(group);
  mesh(new THREE.CylinderGeometry(radius, radius, 0.018, 16), metal, group, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(box(radius * 1.35, 0.005, 0.004, 0.001), mat('#75694e'), group, [0, 0, 0.011]);
  return group;
}
function arrowShape() {
  const shape = new THREE.Shape(); shape.moveTo(-0.66, -0.145); shape.lineTo(0.40, -0.145);
  shape.lineTo(0.70, 0); shape.lineTo(0.40, 0.145); shape.lineTo(-0.66, 0.145); shape.closePath(); return shape;
}
function sign(view) {
  const root = named(new THREE.Group(), 'station-sign-frame'); view.scene.add(root);
  const enamel = mat('#eae5d4', { roughness: 0.27, clearcoat: 0.75 });
  const green = mat('#779786', { roughness: 0.43, metalness: 0.15 });
  const metal = brass(), wood = pine(view, '#baa17a');
  mesh(box(2.73, 0.20, 0.8, 0.048), wood, root, [0, 0.10, -0.025]);
  for (const x of [-0.91, 0.91]) {
    mesh(box(0.12, 1.92, 0.14, 0.027), green, root, [x, 1.10, -0.32]);
    mesh(box(0.30, 0.10, 0.34, 0.035), metal, root, [x, 0.245, -0.26]);
    mesh(new THREE.SphereGeometry(0.075, 16, 12), metal, root, [x, 2.1, -0.32]);
  }
  mesh(box(2.41, 0.85, 0.17, 0.055), green, root, [0, 1.76, -0.23]);
  mesh(box(2.29, 0.73, 0.022, 0.036), enamel, root, [0, 1.76, -0.145]);
  for (const x of [-1.07, 1.07]) for (const y of [1.47, 2.05]) screw(root, [x, y, -0.125], metal, 0.019);
  mesh(box(1.95, 0.07, 0.08, 0.02), green, root, [0, 0.94, -0.26]);
  mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.32, 24), metal, root, [0.16, 0.94, -0.045], [Math.PI / 2, 0, 0]);
  const nameItem = view.level.items.find(item => item.id === 'station-sign-name'), name = new THREE.Group();
  const fittedName = named(new THREE.Group(), 'station-sign-straight-name'); name.add(fittedName);
  mesh(box(1.68, 0.43, 0.05, 0.021), enamel, fittedName);
  named(print(fittedName, '山 谷 小 站', 'VALLEY STATION', [0, 0, 0.029], 1.35, 0.36), 'station-sign-readable-name');
  const screws = new THREE.Group(); fittedName.add(screws);
  const screwHeads = [-0.76, 0.76].map(x => screw(screws, [x, 0, 0.038], metal));
  registerAction(view, 'station-sign-align', name); registerAction(view, 'station-sign-tighten', screws); registerItem(view, nameItem, name);
  const arrowItem = view.level.items.find(item => item.id === 'station-sign-arrow'), arrow = new THREE.Group();
  const pointer = named(new THREE.Group(), 'station-sign-direction-pointer'); arrow.add(pointer);
  mesh(new THREE.ExtrudeGeometry(arrowShape(), { depth: 0.055, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, steps: 1 }), green, pointer, [0, 0, -0.0275]);
  print(pointer, '站 台', 'PLATFORM', [-0.06, 0, 0.039], 0.66, 0.23, '#f9f3df', '#51725f');
  screw(pointer, [-0.54, 0, 0.04], metal, 0.023);
  registerAction(view, 'station-sign-point', arrow); registerItem(view, arrowItem, arrow);
  return { update(dt, time, { before = false } = {}) {
    const angle = before ? -18 : view.state.taskValues?.['station-sign-align'] ?? -18;
    fittedName.rotation.z = angle * Math.PI / 180;
    const tight = amount(view, 'station-sign-tighten', before);
    for (const head of screwHeads) { head.rotation.z = tight * Math.PI * 2.5; head.position.z = 0.038 + (1 - tight) * 0.028; }
    pointer.rotation.z = (1 - amount(view, 'station-sign-point', before)) * -0.42;
  } };
}

function bench(view) {
  const root = named(new THREE.Group(), 'station-bench-frame'); view.scene.add(root);
  const green = mat('#718d7a', { roughness: 0.47, metalness: 0.15 }), wood = pine(view), metal = brass();
  for (const x of [-1.32, 1.32]) {
    for (const z of [-0.39, 0.22]) {
      mesh(box(0.15, z < 0 ? 1.28 : 0.58, 0.15, 0.035), green, root, [x, z < 0 ? 0.64 : 0.29, z]);
      mesh(box(0.31, 0.075, 0.29, 0.033), green, root, [x, 0.04, z]);
    }
    mesh(box(0.15, 0.10, 0.87, 0.035), green, root, [x, 0.48, -0.045]);
  }
  mesh(box(2.63, 0.07, 0.07, 0.017), green, root, [0, 0.25, -0.37]);
  const seat = mesh(box(2.72, 0.08, 0.34, 0.027), wood, root, [0, 0.55, 0.21]);
  const back = mesh(box(2.72, 0.30, 0.08, 0.027), wood, root, [0, 1.115, -0.35]);
  for (const x of [-1.46, 1.46]) {
    mesh(box(0.10, 0.29, 0.11, 0.025), green, root, [x, 0.71, 0.29]);
    tube([[x, 0.68, -0.33], [x, 0.82, -0.34], [x, 0.87, -0.23]], 0.039, green, root);
  }
  mesh(box(0.15, 0.13, 0.86, 0.045), wood, root, [-1.46, 0.88, -0.02]);
  const scuffs = named(new THREE.Group(), 'station-bench-wood-scuffs'); root.add(scuffs);
  for (let i = 0; i < 18; i++) {
    const x = -1.09 + (i * 0.277) % 2.18, y = 1.015 + (i * 0.043) % 0.19;
    mesh(box(0.095 + (i % 4) * 0.023, 0.006, 0.002, 0.001), mat('#e8d8b8', { roughness: 0.96 }), scuffs, [x, y, -0.296], [0, 0, (i % 3 - 1) * 0.16]);
  }
  for (let i = 0; i < 10; i++) {
    const strip = mesh(box(0.15, 0.002, 0.009, 0.001), mat('#e8d8b8', { roughness: 0.96 }), scuffs, [-1.02 + i * 0.225, 0.601, 0.23 + (i % 2) * 0.07]);
    strip.rotation.y = (i % 3 - 1) * 0.13;
  }
  registerAction(view, 'station-bench-sand', back); registerAction(view, 'station-bench-oil', seat);
  let armBolt;
  for (const item of view.level.items) {
    const group = new THREE.Group(); mesh(box(...item.size, item.id.endsWith('-arm') ? 0.04 : 0.024), wood, group);
    if (item.id.endsWith('-back-slat')) for (const x of [-1.22, 1.22]) screw(group, [x, 0, 0.044], metal, 0.024);
    if (item.id.endsWith('-arm')) {
      armBolt = named(screw(group, [0, -0.012, 0.438], metal, 0.033), 'station-bench-arm-bolt');
      registerAction(view, 'station-bench-fasten', group);
    }
    registerItem(view, item, group);
  }
  return { update(dt, time, { before = false } = {}) {
    const sand = amount(view, 'station-bench-sand', before), oil = amount(view, 'station-bench-oil', before);
    scuffs.visible = sand < 1;
    for (const scar of scuffs.children) scar.scale.x = Math.max(0.001, 1 - sand);
    wood.roughness = 0.84 - sand * 0.18 - oil * 0.38; wood.clearcoat = 0.06 + oil * 0.48;
    wood.color.set('#c4ad87').lerp(new THREE.Color('#b38b54'), oil * 0.7);
    for (const surface of view.dirtyMeshes) {
      surface.material.roughness = wood.roughness; surface.material.clearcoat = wood.clearcoat;
      surface.material.color.copy(wood.color);
    }
    const fixed = amount(view, 'station-bench-fasten', before);
    armBolt.rotation.z = fixed * Math.PI; armBolt.position.z = 0.438 + (1 - fixed) * 0.027;
  } };
}

function ticketTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#f0e6c9'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a9956a'; ctx.lineWidth = 3; ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#536e58'; ctx.textAlign = 'center'; ctx.font = '36px Georgia'; ctx.fillText('山 谷 小 站', w / 2, h * 0.19);
    ctx.font = '19px sans-serif'; ctx.fillText('VALLEY STATION', w / 2, h * 0.26);
    ctx.beginPath(); ctx.moveTo(w * 0.16, h * 0.51); ctx.lineTo(w * 0.35, h * 0.36); ctx.lineTo(w * 0.53, h * 0.51); ctx.lineTo(w * 0.69, h * 0.40); ctx.lineTo(w * 0.84, h * 0.51); ctx.stroke();
    ctx.font = '24px Georgia'; ctx.fillText('下一站 · 山间', w / 2, h * 0.62);
    ctx.font = '21px Georgia'; ctx.fillText('NO. 0001', w / 2, h * 0.75);
    ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(35, h * 0.84); ctx.lineTo(w - 35, h * 0.84); ctx.stroke();
  }, 384, 576);
}
function ticketPaper(parent, perforated, material) {
  const shape = new THREE.Shape(); shape.moveTo(-0.32, -0.47); shape.lineTo(0.32, -0.47); shape.lineTo(0.32, 0.47); shape.lineTo(-0.32, 0.47); shape.closePath();
  if (perforated) for (const x of [-0.19, 0.19]) {
    const hole = new THREE.Path(); hole.absarc(x, -0.355, 0.033, 0, Math.PI * 2, true); shape.holes.push(hole);
  }
  const geometry = new THREE.ShapeGeometry(shape, 24), positions = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) uv.setXY(i, (positions.getX(i) + 0.32) / 0.64, (positions.getY(i) + 0.47) / 0.94);
  return mesh(geometry, material, parent, [0, 0, 0], TOP);
}
function ticket(view) {
  const root = named(new THREE.Group(), 'station-ticket-machine'); view.scene.add(root);
  const enamel = mat('#88a496', { roughness: 0.29, clearcoat: 0.64 }), dark = mat('#446253', { roughness: 0.52 });
  const metal = brass(), wood = pine(view, '#bba17a');
  mesh(box(2.57, 0.14, 1.8, 0.05), wood, root, [0, 0.07, 0.30]);
  mesh(box(1.11, 1.18, 0.62, 0.11), enamel, root, [-0.1, 0.85, -0.32]);
  mesh(box(1.23, 0.12, 0.76, 0.07), dark, root, [-0.1, 0.25, -0.23]);
  mesh(box(1.20, 0.13, 0.72, 0.06), enamel, root, [-0.1, 1.47, -0.32]);
  mesh(box(0.94, 0.14, 0.026, 0.035), dark, root, [-0.1, 0.51, 0.004]);
  mesh(box(0.83, 0.046, 0.025, 0.008), mat('#283e32'), root, [-0.1, 0.49, 0.025]);
  print(root, '山 間 鐵 道', 'TICKET OFFICE', [-0.1, 1.355, 0.013], 0.81, 0.17);
  for (const x of [-0.54, 0.34]) for (const y of [0.7, 1.32]) screw(root, [x, y, 0.016], metal, 0.021);
  mesh(box(1.51, 0.046, 0.68, 0.03), metal, root, [-0.1, 0.173, 0.82]);
  for (const x of [-0.83, 0.63]) mesh(box(0.045, 0.06, 0.68, 0.01), metal, root, [x, 0.21, 0.82]);
  tube([[-0.60, 0.22, 1.14], [-0.60, 0.245, 1.20], [0.40, 0.245, 1.20], [0.40, 0.22, 1.14]], 0.017, metal, root);
  mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.31, 24), metal, root, [-1.05, 1.08, -0.19], [Math.PI / 2, 0, 0]);
  tube([[-0.65, 0.72, -0.28], [-1.05, 0.73, -0.28], [-1.05, 1.08, -0.28]], 0.045, metal, root);
  const rollItem = view.level.items.find(item => item.id === 'station-ticket-roll'), roll = new THREE.Group();
  const reel = named(new THREE.Group(), 'station-ticket-moving-reel'); roll.add(reel);
  mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 48), mat('#eadfc2', { roughness: 0.95, clearcoat: 0 }), reel, [0, 0, 0], [Math.PI / 2, 0, 0]);
  for (const r of [0.19, 0.24, 0.29, 0.32]) mesh(new THREE.TorusGeometry(r, 0.003, 6, 48), mat('#c7b797'), reel, [0, 0, 0.134]);
  mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.273, 24), metal, reel, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(box(0.038, 0.23, 0.012, 0.006), mat('#aa9170'), reel, [0.12, 0, 0.14]);
  registerAction(view, 'station-ticket-feed', roll); registerItem(view, rollItem, roll);
  const handleItem = view.level.items.find(item => item.id === 'station-ticket-handle'), handle = new THREE.Group();
  const lever = named(new THREE.Group(), 'station-ticket-press-lever'); handle.add(lever); lever.position.x = -0.37;
  mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.14, 24), metal, lever, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(box(0.72, 0.075, 0.09, 0.027), metal, lever, [0.30, 0, 0]);
  mesh(box(0.28, 0.13, 0.14, 0.055), pine(view, '#8c714e'), lever, [0.68, 0, 0]);
  registerAction(view, 'station-ticket-punch', handle); registerItem(view, handleItem, handle);
  const typeItem = view.level.items.find(item => item.id === 'station-ticket-type'), type = new THREE.Group();
  mesh(box(0.68, 0.25, 0.067, 0.018), metal, type);
  named(print(type, '山 谷 小 站', 'NO. 0001', [0, 0, 0.036], 0.61, 0.21, '#2f5140', '#d4c199'), 'station-ticket-readable-type');
  registerItem(view, typeItem, type);
  const punch = named(new THREE.Group(), 'station-ticket-descending-pins'); root.add(punch);
  for (const x of [-0.52, 0.32]) tube([[x, 0.62, 0.02], [x, 0.62, 0.63], [x, 0.49, 0.795]], 0.021, metal, root);
  mesh(box(0.66, 0.065, 0.10, 0.013), metal, punch, [-0.1, 0.478, 0.795]);
  for (const x of [-0.29, 0.09]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.11, 16), metal, punch, [x, 0.413, 0.795]);
  const paper = named(new THREE.Group(), 'station-ticket-presented-paper'); root.add(paper); paper.position.set(-0.1, 0.246, 0.40);
  const paperMaterial = mat('#fffaf0', { map: ticketTexture(), roughness: 0.92, clearcoat: 0, side: THREE.DoubleSide });
  const intact = named(ticketPaper(paper, false, paperMaterial), 'station-ticket-uncut-paper');
  const punched = named(ticketPaper(paper, true, paperMaterial), 'station-ticket-punched-paper');
  registerAction(view, 'station-ticket-present', paper);
  return { update(dt, time, { before = false } = {}) {
    const feed = amount(view, 'station-ticket-feed', before), pressure = amount(view, 'station-ticket-punch', before), present = amount(view, 'station-ticket-present', before);
    reel.rotation.z = -feed * Math.PI * 1.8;
    const pressed = pressure >= 1 ? 0 : pressure;
    lever.rotation.z = -pressed * 0.68; punch.position.y = -pressed * 0.116;
    paper.visible = !before && feed > 0.02;
    paper.scale.z = Math.max(0.01, feed); paper.position.z = 0.10 + feed * 0.34 + present * 0.27;
    intact.visible = pressure < 1; punched.visible = pressure >= 1;
  } };
}

export function buildStationEarlyScene(view) {
  const builder = { 'station-sign': sign, 'station-bench': bench, 'station-ticket': ticket }[view.level.id];
  if (!builder) throw new Error(`Unsupported early station level: ${view.level.id}`);
  const extra = builder(view); addSurfaces(view); return extra;
}
