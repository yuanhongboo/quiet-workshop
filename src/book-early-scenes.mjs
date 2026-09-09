import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import { box, mat, mesh, tube, weave, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';
const TOP = [-Math.PI / 2, 0, 0];
const named = (object, name) => { object.name = name; return object; };
const amount = (view, id, before) => before ? 0 : clamp(view.state.taskValues?.[id] || 0, 0, 1);
const wood = (view, color = '#ba9f79') => mat(color, { map: view.wood, roughness: 0.7, clearcoat: 0.1 });
const brass = () => mat('#b49b65', { roughness: 0.4, metalness: 0.67 });
const inkMaterial = texture => new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
function print(parent, text, position, width, height, rotation = TOP) {
  const texture = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#eee6d3'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#9c9479'; ctx.lineWidth = 5; ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#35473a'; ctx.textAlign = 'center'; ctx.font = '600 76px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText(text, w / 2, h * 0.65, w * 0.88);
  }, 512, 192);
  return mesh(new THREE.PlaneGeometry(width, height), inkMaterial(texture), parent, position, rotation);
}
function pageArtwork(title = '山风的一天') {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#f3ecdb'; ctx.fillRect(0, 0, w, h); ctx.textAlign = 'center'; ctx.fillStyle = '#334c40';
    ctx.font = '600 48px "PingFang SC", sans-serif'; ctx.fillText(title, w / 2, h * 0.15, w * 0.84);
    ctx.fillStyle = '#d7c28b'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.34, w * 0.075, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9eaf96'; ctx.beginPath(); ctx.moveTo(0, h * 0.8); ctx.bezierCurveTo(w * 0.1, h * 0.30, w * 0.55, h * 0.40, w, h * 0.75); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = '#79927b'; ctx.beginPath(); ctx.moveTo(0, h * 0.87); ctx.bezierCurveTo(w * 0.3, h * 0.55, w * 0.72, h * 0.50, w, h * 0.9); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.strokeStyle = '#e4d4aa'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(w * 0.38, h); ctx.bezierCurveTo(w * 0.52, h * 0.77, w * 0.2, h * 0.72, w * 0.5, h * 0.62); ctx.stroke();
    ctx.fillStyle = '#ece2ca'; ctx.fillRect(w * 0.42, h * 0.53, w * 0.19, h * 0.13); ctx.fillStyle = '#957864';
    ctx.beginPath(); ctx.moveTo(w * 0.39, h * 0.53); ctx.lineTo(w * 0.515, h * 0.44); ctx.lineTo(w * 0.64, h * 0.53); ctx.fill();
    ctx.fillStyle = '#4a6251'; ctx.fillRect(w * 0.49, h * 0.585, w * 0.044, h * 0.075);
  }, 512, 640);
}
function pageEdges(parent, width, depth, height, center = [0, 0, 0]) {
  mesh(box(width, height, depth, 0.012), mat('#e9dfc7', { roughness: 0.95, clearcoat: 0 }), parent, center);
  for (let i = 1; i < 7; i++) mesh(new THREE.BoxGeometry(width - 0.025, 0.003, 0.002), mat('#c9bca1'), parent, [center[0], center[1] - height / 2 + i * height / 7, center[2] + depth / 2 + 0.002]);
}
function cover(view) {
  const root = named(new THREE.Group(), 'book-cover-book'); view.scene.add(root);
  const cloth = mat('#91a188', { map: weave(), roughness: 0.92, clearcoat: 0 }), metal = brass();
  mesh(box(1.90, 0.048, 1.98, 0.02), cloth, root, [0.22, 0.097, -0.03]);
  pageEdges(root, 1.78, 1.85, 0.19, [0.22, 0.217, -0.03]);
  const page = named(mesh(new THREE.PlaneGeometry(1.67, 1.77), inkMaterial(pageArtwork()), root, [0.22, 0.316, -0.03], TOP), 'book-cover-first-page');
  const hinge = named(new THREE.Group(), 'book-cover-hinge'); hinge.position.set(-0.71, 0.33, -0.03); root.add(hinge);
  const lid = mesh(box(1.90, 0.048, 1.98, 0.02), cloth, hinge, [0.93, 0, 0]);
  mesh(box(0.095, 0.25, 1.96, 0.025), cloth, root, [-0.71, 0.213, -0.03]);
  named(print(hinge, '慢慢读', [0.93, -0.026, 0], 1.33, 0.50, [Math.PI / 2, 0, Math.PI]), 'book-cover-inside-label');
  const crease = named(new THREE.Group(), 'book-cover-repaired-crease'); hinge.add(crease);
  for (let i = 0; i < 9; i++) mesh(new THREE.BoxGeometry(0.065, 0.003, 0.11), mat('#c1cbb7', { roughness: 0.96 }), crease, [1.18 + i * 0.054, 0.030, 0.04 + i * 0.074], [0, -0.58, 0]);
  const itemModels = [];
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.id.endsWith('brass')) {
      mesh(box(0.23, 0.014, 0.23, 0.008), metal, group, [0, 0.004, 0]);
      mesh(box(0.27, 0.04, 0.07, 0.014), metal, group, [0, 0, 0.10]); mesh(box(0.07, 0.04, 0.27, 0.014), metal, group, [0.10, 0, 0]);
      mesh(new THREE.SphereGeometry(0.024, 12, 8), metal, group, [0.10, 0.031, 0.1]); registerAction(view, 'book-cover-corner', group);
    } else {
      mesh(box(...item.size, 0.012), mat('#e9dfc6', { roughness: 0.9 }), group);
      named(print(group, '山风的一天', [0, 0.019, 0], 0.74, 0.51), 'book-cover-title-label');
    }
    registerItem(view, item, group); itemModels.push({ group, item, offset: new THREE.Vector3(...item.slot).sub(hinge.position) });
  }
  registerAction(view, 'book-cover-smooth', crease); registerAction(view, 'book-cover-open', lid);
  return { afterSurfaces() {
    hinge.updateMatrixWorld(true); const surface = view.dirtyMeshes.find(object => object.userData.field.spec.id === 'book-cover-cloth'); hinge.attach(surface);
  }, update(dt, time, { before = false } = {}) {
    const smooth = amount(view, 'book-cover-smooth', before), open = amount(view, 'book-cover-open', before);
    crease.visible = smooth < 1; crease.scale.set(1, 1, Math.max(0.001, 1 - smooth)); hinge.rotation.z = open * 2.94;
    hinge.updateMatrixWorld(true);
    for (const { group, item, offset } of itemModels) if (!before && view.state.placed.has(item.id)) {
      group.position.copy(offset).applyMatrix4(hinge.matrixWorld); group.quaternion.copy(hinge.quaternion);
      if (item.id.endsWith('brass')) group.position.y += (1 - amount(view, 'book-cover-corner', before)) * 0.026;
    }
    page.visible = true;
  } };
}
function binding(view) {
  const root = named(new THREE.Group(), 'book-binding-workbench'); view.scene.add(root);
  const timber = wood(view), metal = brass(), thread = mat('#985b53', { roughness: 0.95, clearcoat: 0 });
  mesh(box(2.36, 0.15, 1.66, 0.035), timber, root, [0, 0.075, -0.02]);
  mesh(box(2.12, 0.014, 1.48, 0.012), mat('#dad2bb', { map: weave(), roughness: 0.95, clearcoat: 0 }), root, [0, 0.158, -0.02]);
  mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.20, 20), metal, root, [-0.91, 0.24, -0.43]);
  const registered = {};
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.id.endsWith('pages')) {
      pageEdges(group, 1.26, 1.12, 0.19);
      named(print(group, '山间手记', [0.12, 0.098, 0.02], 0.84, 0.40), 'book-binding-readable-pages');
      for (let i = 0; i < 7; i++) mesh(new THREE.CircleGeometry(0.023, 12), mat('#705e4b'), group, [-0.51, 0.099, -0.43 + i * 0.145], TOP);
    } else if (item.id.endsWith('spool')) {
      for (const y of [-0.16, 0.16]) mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 24), timber, group, [0, y, 0]);
      const reel = named(new THREE.Group(), 'book-binding-reel'); group.add(reel);
      mesh(new THREE.CylinderGeometry(0.127, 0.127, 0.27, 24), thread, reel);
      for (let y = -0.115; y < 0.13; y += 0.025) mesh(new THREE.TorusGeometry(0.127, 0.008, 5, 24), mat('#b4776b'), reel, [0, y, 0], TOP);
      mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.38, 16), metal, group);
    } else {
      mesh(box(...item.size, 0.022), timber, group);
      mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.21, 20), metal, group, [0, 0.085, 0]);
      mesh(box(0.28, 0.05, 0.07, 0.015), metal, group, [0, 0.20, 0]);
    }
    registerItem(view, item, group); registered[item.id] = group;
  }
  const stitchRoot = named(new THREE.Group(), 'book-binding-stitch-path'); root.add(stitchRoot);
  const stitches = [];
  for (let i = 0; i < 6; i++) {
    const z = -0.37 + i * 0.145;
    const stitch = tube([[-0.51, 0.376, z], [-0.59, 0.401, z + 0.034], [-0.43, 0.406, z + 0.107], [-0.51, 0.376, z + 0.145]], 0.014, thread, stitchRoot);
    stitches.push(stitch);
  }
  const tail = named(tube([[-0.51, 0.381, 0.50], [-0.47, 0.33, 0.73], [-0.71, 0.183, 0.97], [-0.98, 0.10, 1.08]], 0.014, thread, root), 'book-binding-untrimmed-tail');
  const knot = named(mesh(new THREE.TorusGeometry(0.083, 0.015, 8, 28), thread, root, [-0.51, 0.392, 0.48], TOP), 'book-binding-knot-loop');
  const needle = named(mesh(new THREE.CylinderGeometry(0.012, 0.007, 0.27, 12), metal, root, [-0.51, 0.46, -0.37], [Math.PI / 4, 0, 0.35]), 'book-binding-moving-needle');
  registerAction(view, 'book-binding-stitch', registered['book-binding-pages']); registerAction(view, 'book-binding-trim', tail); registerAction(view, 'book-binding-knot', knot);
  return { update(dt, time, { before = false } = {}) {
    const stitch = amount(view, 'book-binding-stitch', before), trim = amount(view, 'book-binding-trim', before), tied = amount(view, 'book-binding-knot', before);
    stitchRoot.visible = !before && stitch > 0; tail.visible = !before && stitch > 0.99 && trim < 1; knot.visible = !before && trim >= 1;
    stitches.forEach((object, i) => object.geometry.setDrawRange(0, Math.floor(clamp(stitch * 6 - i, 0, 1) * object.geometry.index.count / 6) * 6));
    needle.visible = !before && view.state.placed.has('book-binding-pages') && stitch < 1;
    needle.position.z = -0.37 + stitch * 0.87; needle.position.y = 0.45 + Math.sin(stitch * Math.PI * 12) * 0.05;
    knot.scale.setScalar(1 - tied * 0.64);
    view.scene.getObjectByName('book-binding-reel').rotation.y = stitch * Math.PI * 3;
  } };
}
function press(view) {
  const root = named(new THREE.Group(), 'book-press-frame'); view.scene.add(root);
  const timber = wood(view, '#b99a6f'), dark = wood(view, '#967c57'), metal = brass();
  mesh(box(2.40, 0.24, 1.58, 0.055), timber, root, [0, 0.12, -0.04]);
  for (const x of [-0.98, 0.98]) {
    mesh(box(0.19, 1.70, 0.20, 0.03), dark, root, [x, 1.01, -0.22]);
    mesh(box(0.35, 0.11, 0.36, 0.027), timber, root, [x, 0.30, -0.22]);
    mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), metal, root, [x, 1.77, 0.04], [Math.PI / 2, 0, 0]);
  }
  mesh(box(2.28, 0.28, 0.48, 0.039), timber, root, [0, 1.76, -0.22]);
  const screw = named(new THREE.Group(), 'book-press-screw'); root.add(screw); screw.position.set(0, 1.56, -0.20);
  mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.02, 24), dark, screw);
  const coilPoints = Array.from({ length: 129 }, (_, i) => { const phase = i / 128; return [Math.sin(phase * Math.PI * 22) * 0.083, phase * 0.99 - 0.49, Math.cos(phase * Math.PI * 22) * 0.083]; });
  const coil = new THREE.CatmullRomCurve3(coilPoints.map(point => new THREE.Vector3(...point)));
  mesh(new THREE.TubeGeometry(coil, 160, 0.017, 6, false), metal, screw);
  let platen, handle, pages, curl;
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.id.endsWith('platen')) {
      platen = group; named(group, 'book-press-moving-platen'); mesh(box(...item.size, 0.035), timber, group);
      mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 24), metal, group, [0, 0.11, -0.15]);
    } else if (item.id.endsWith('pages')) {
      pages = group; pageEdges(group, 1.24, 1.04, 0.15);
      const geometry = new THREE.PlaneGeometry(1.21, 1.02, 20, 12);
      curl = named(mesh(geometry, inkMaterial(pageArtwork('纸页与山风')), group, [0, 0.078, 0], TOP), 'book-press-curling-page');
    } else {
      handle = group; named(group, 'book-press-turning-handle'); mesh(new THREE.CylinderGeometry(0.063, 0.063, 1.4, 24), dark, group, [0, 0, 0], [0, 0, Math.PI / 2]);
      for (const x of [-0.68, 0.68]) mesh(new THREE.SphereGeometry(0.105, 20, 12), timber, group, [x, 0, 0]);
      mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.17, 24), metal, group);
    }
    registerItem(view, item, group);
  }
  registerAction(view, 'book-press-turn', handle); registerAction(view, 'book-press-flatten', platen); registerAction(view, 'book-press-release', screw);
  return { update(dt, time, { before = false } = {}) {
    const turn = before ? 0 : (view.state.taskValues?.['book-press-turn'] || 0) / 180;
    const flat = amount(view, 'book-press-flatten', before), release = amount(view, 'book-press-release', before);
    const pressure = flat * (1 - release), descent = pressure * 0.61;
    screw.rotation.y = (turn + pressure * 2) * Math.PI; screw.position.y = 1.56 - descent;
    if (!before && view.state.placed.has('book-press-platen')) platen.position.y = 1.12 - descent;
    if (!before && view.state.placed.has('book-press-handle')) { handle.position.y = 2.06 - descent; handle.rotation.y = screw.rotation.y; }
    if (!before && view.state.placed.has('book-press-pages')) pages.position.z = 0.09 + release * 0.44;
    const positions = curl.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const edge = Math.abs(positions.getX(i)) / 0.605;
      positions.setZ(i, Math.pow(edge, 5) * 0.15 * (1 - flat));
    }
    positions.needsUpdate = true; curl.geometry.computeVertexNormals(); curl.geometry.computeBoundingSphere();
  } };
}
export function buildBookEarlyScene(view) {
  const builder = { 'book-cover': cover, 'book-binding': binding, 'book-press': press }[view.level.id];
  if (!builder) throw new Error(`Unsupported early library level: ${view.level.id}`);
  const extra = builder(view); addSurfaces(view); extra.afterSurfaces?.(); return extra;
}
