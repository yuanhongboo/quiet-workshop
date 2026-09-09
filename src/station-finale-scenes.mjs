import * as THREE from 'three';
import { box, mat, mesh, tube, label, registerItem, registerAction, addSurfaces } from './season-scene-kit.mjs';

const TOP = [-Math.PI / 2, 0, 0];
const FRONT = [Math.PI / 2, 0, 0];
const clamp = n => Math.max(0, Math.min(1, n));
const progress = (view, id, before) => before ? 0 : clamp(view.state.taskValues?.[id] || 0);
const group = (parent, position = [0, 0, 0], name = '') => {
  const root = new THREE.Group(); root.position.set(...position); root.name = name; parent.add(root); return root;
};
const block = (parent, material, size, position = [0, 0, 0], rotation) => mesh(new THREE.BoxGeometry(...size), material, parent, position, rotation);
const round = (parent, material, size, position = [0, 0, 0], radius = 0.03, rotation) => mesh(box(...size, radius), material, parent, position, rotation);
const cylinder = (parent, material, radius, height, position = [0, 0, 0], rotation, top = radius) => mesh(new THREE.CylinderGeometry(top, radius, height, 24), material, parent, position, rotation);
const ring = (parent, material, radius, width, position = [0, 0, 0], rotation) => mesh(new THREE.TorusGeometry(radius, width, 7, 32), material, parent, position, rotation);
const sphere = (parent, material, radius, position = [0, 0, 0]) => mesh(new THREE.SphereGeometry(radius, 20, 12), material, parent, position);
function palette(view) {
  return {
    sage: mat('#819c86', { roughness: 0.36, clearcoat: 0.65 }),
    forest: mat('#476754', { roughness: 0.52 }),
    cream: mat('#e4dcc4', { roughness: 0.63 }),
    brass: mat('#bba171', { metalness: 0.76, roughness: 0.29 }),
    steel: mat('#b1bbb0', { metalness: 0.78, roughness: 0.29 }),
    dark: mat('#394842', { roughness: 0.78 }),
    wood: mat('#ad8d66', { map: view.wood, roughness: 0.75 }),
    stone: mat('#aeafa0', { roughness: 0.95, clearcoat: 0 }),
    glass: mat('#a9c8bb', { transparent: true, opacity: 0.3, roughness: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  };
}
function plaque(parent, text, small, size, position, background = '#ece3cd', color = '#395d49') {
  return mesh(new THREE.PlaneGeometry(...size), mat('#ffffff', { map: label(text, small, color, background), roughness: 0.85, clearcoat: 0 }), parent, position);
}
function rail(parent, colors, length = 1.36) {
  block(parent, colors.steel, [length, 0.037, 0.13], [0, -0.06, 0]);
  block(parent, colors.steel, [length, 0.095, 0.041]);
  round(parent, colors.steel, [length, 0.035, 0.094], [0, 0.059, 0], 0.009);
  return parent;
}
function track(view) {
  const c = palette(view), root = group(view.scene, [0, 0, 0], 'station-track-model');
  round(root, c.wood, [3.7, 0.18, 1.22], [0, 0.09, -0.2], 0.045);
  for (let i = 0; i < 13; i++) block(root, c.wood, [0.19, 0.075, 0.97], [-1.67 + i * 0.28, 0.205, -0.2]);
  for (const z of [0.09, -0.49]) {
    rail(group(root, [-0.97, 0.275, z]), c, 1.63);
    for (let i = 0; i < 6; i++) cylinder(root, c.brass, 0.024, 0.018, [-1.64 + i * 0.27, 0.251, z + 0.13]);
  }
  round(root, c.sage, [0.55, 0.3, 0.37], [-1.47, 0.285, 0.61], 0.025);
  cylinder(root, c.brass, 0.13, 0.08, [-1.47, 0.467, 0.62]);
  tube([[-1.23, 0.26, 0.59], [-0.86, 0.26, 0.59], [-0.86, 0.26, -0.08]], 0.022, c.steel, root);
  const switchRoot = group(root, [-0.75, 0.337, -0.2], 'station-track-points');
  for (const z of [-0.12, 0.12]) block(switchRoot, c.steel, [1.32, 0.032, 0.025], [0.66, 0, z]);
  const route = group(root, [-1.73, 0.8, 0.42], 'station-track-direction');
  block(route, c.cream, [0.31, 0.15, 0.045]);
  plaque(route, '小站 →', '', [0.28, 0.13], [0, 0, 0.028]);
  const leverItem = new THREE.Group(), lever = group(leverItem, [0, -0.245, 0], 'station-track-lever');
  cylinder(lever, c.brass, 0.034, 0.46, [0, 0.21, 0]); sphere(lever, c.forest, 0.094, [0, 0.46, 0]);
  const wrench = group(root, [0.29, 0.365, 0.06], 'station-track-wrench');
  block(wrench, c.brass, [0.23, 0.033, 0.055], [0.07, 0, 0]); ring(wrench, c.brass, 0.044, 0.016, [-0.052, 0, 0], TOP);
  registerAction(view, 'track-tighten', wrench);
  const oil = group(root, [-1.02, 0.12, 0.69]);
  cylinder(oil, c.cream, 0.085, 0.17); tube([[0.02, 0.07, 0], [0.08, 0.19, 0], [0.18, 0.22, 0]], 0.017, c.brass, oil);
  registerAction(view, 'track-oil', oil);
  for (const item of view.level.items) registerItem(view, item, item.id === 'track-lever' ? leverItem : rail(new THREE.Group(), c));
  registerAction(view, 'track-switch', lever);
  addSurfaces(view);
  return { update(dt, time, { before = false, actionId = null } = {}) {
    const tightened = progress(view, 'track-tighten', before), angle = before ? 0 : view.state.taskValues?.['track-switch'] || 0;
    wrench.rotation.y = -tightened * Math.PI * 4;
    lever.rotation.z = -angle * Math.PI / 180;
    switchRoot.rotation.y = 0.23 * (1 - clamp(angle / 60));
    route.rotation.y = Math.PI / 2 * (1 - clamp(angle / 60));
    oil.rotation.z = !before && actionId === 'track-oil' ? -0.2 : 0;
    switchRoot.userData.connected = !before && Math.abs(angle - 60) <= 5;
  } };
}
function wheelset(parent, colors, name = '') {
  const root = group(parent, [0, 0, 0], name), wheels = [];
  for (const x of [-0.7, 0, 0.7]) {
    const wheel = group(root, [x, 0, 0]); wheels.push(wheel);
    cylinder(wheel, colors.dark, 0.31, 0.12, [0, 0, 0], FRONT);
    cylinder(wheel, colors.sage, 0.265, 0.016, [0, 0, 0.071], FRONT);
    ring(wheel, colors.brass, 0.225, 0.012, [0, 0, 0.085]);
    for (let i = 0; i < 6; i++) block(wheel, colors.cream, [0.028, 0.4, 0.025], [0, 0, 0.085], [0, 0, i * Math.PI / 3]);
    cylinder(wheel, colors.brass, 0.052, 0.035, [0, 0, 0.115], FRONT);
  }
  const rod = block(root, colors.brass, [1.57, 0.053, 0.027], [0, -0.1, 0.151]); rod.name = name ? `${name}-rod` : '';
  return { root, wheels, rod, animate(angle) {
    wheels.forEach(wheel => { wheel.rotation.z = -angle; });
    rod.position.x = Math.sin(angle) * 0.1; rod.position.y = -Math.cos(angle) * 0.1;
  } };
}
function cabin(parent, colors) {
  const root = group(parent);
  round(root, colors.sage, [0.87, 0.42, 0.96], [0, -0.35, 0], 0.04);
  for (const x of [-0.37, 0.37]) for (const z of [-0.42, 0.42]) block(root, colors.cream, [0.09, 0.69, 0.09], [x, 0.17, z]);
  for (const z of [-0.431, 0.431]) {
    block(root, colors.cream, [0.82, 0.07, 0.046], [0, 0.47, z]);
    mesh(new THREE.PlaneGeometry(0.63, 0.42), colors.glass, root, [0, 0.2, z], z < 0 ? [0, Math.PI, 0] : undefined);
  }
  round(root, colors.forest, [1.0, 0.14, 1.12], [0, 0.56, 0], 0.068);
  cylinder(root, colors.brass, 0.077, 0.025, [0.17, 0.643, 0.13]);
  plaque(root, '04', '山谷小火车', [0.3, 0.19], [0, -0.36, 0.488], '#819c86', '#f8efd6');
  return root;
}
function whistle(parent, colors) {
  const root = group(parent);
  cylinder(root, colors.brass, 0.063, 0.3); cylinder(root, colors.brass, 0.097, 0.04, [0, 0.16, 0]);
  cylinder(root, colors.forest, 0.079, 0.03, [0, -0.15, 0]);
  return root;
}
function locomotive(parent, colors, name = '') {
  const root = group(parent, [0, 0, 0], name);
  round(root, colors.cream, [2.47, 0.2, 1.01], [0, 0.46, 0], 0.038);
  cylinder(root, colors.sage, 0.41, 1.7, [0.32, 0.89, 0], [0, 0, Math.PI / 2]);
  for (const x of [-0.25, 0.7]) ring(root, colors.brass, 0.416, 0.022, [x, 0.89, 0], [0, Math.PI / 2, 0]);
  round(root, colors.sage, [1.33, 0.39, 0.055], [0.35, 0.83, 0.4], 0.025);
  cylinder(root, colors.forest, 0.332, 0.07, [1.17, 0.89, 0], [0, 0, Math.PI / 2]);
  cylinder(root, colors.forest, 0.12, 0.39, [0.89, 1.36, 0], undefined, 0.18);
  cylinder(root, colors.brass, 0.187, 0.04, [0.89, 1.57, 0]);
  cylinder(root, colors.brass, 0.13, 0.15, [0.03, 1.34, 0]); sphere(root, colors.brass, 0.13, [0.03, 1.41, 0]);
  for (const z of [-0.31, 0.31]) {
    cylinder(root, colors.dark, 0.072, 0.11, [1.29, 0.42, z], [0, 0, Math.PI / 2]);
    cylinder(root, colors.brass, 0.11, 0.04, [1.36, 0.42, z], [0, 0, Math.PI / 2]);
  }
  const backWheels = wheelset(root, colors); backWheels.root.position.set(0, 0.34, -0.47); backWheels.root.rotation.y = Math.PI;
  const lamp = sphere(root, mat('#fff0bf', { emissive: '#ffe0a0', emissiveIntensity: 0, roughness: 0.21 }), 0.094, [1.228, 1.02, 0]);
  return { root, backWheels, lamp };
}
function steamPuffs(parent, position, name) {
  const root = group(parent, position, name), puffs = [];
  for (let i = 0; i < 4; i++) {
    const material = new THREE.MeshBasicMaterial({ color: '#f7f3e5', transparent: true, opacity: 0, depthWrite: false });
    const puff = sphere(root, material, 0.13); puff.castShadow = false; puffs.push(puff);
  }
  return { root, update(time, enabled) {
    root.visible = enabled;
    puffs.forEach((puff, i) => {
      const phase = (time * 0.2 + i / puffs.length) % 1;
      puff.position.set(-phase * 0.26, phase * 0.7, Math.sin(phase * Math.PI) * 0.07);
      puff.scale.setScalar(0.35 + phase * 0.95); puff.material.opacity = enabled ? Math.sin(phase * Math.PI) * 0.24 : 0;
    });
  } };
}
function train(view) {
  const c = palette(view), body = locomotive(view.scene, c, 'station-train-model');
  const frontWheels = wheelset(new THREE.Group(), c, 'station-train-wheels');
  registerItem(view, view.level.items[0], frontWheels.root.parent);
  const cab = cabin(new THREE.Group(), c); registerItem(view, view.level.items[1], cab.parent);
  const horn = whistle(new THREE.Group(), c); horn.name = 'station-train-whistle'; registerItem(view, view.level.items[2], horn.parent);
  registerAction(view, 'train-wheels', frontWheels.root); registerAction(view, 'train-whistle', horn);
  const oil = group(body.root, [1.36, 0.1, 0.63]); cylinder(oil, c.cream, 0.086, 0.16);
  tube([[0.02, 0.07, 0], [0.05, 0.18, 0], [0.14, 0.22, 0]], 0.016, c.brass, oil); registerAction(view, 'train-oil', oil);
  const steam = steamPuffs(body.root, [0.89, 1.63, 0], 'station-train-steam');
  addSurfaces(view);
  return { update(dt, time, { before = false, stage = '', actionId = null } = {}) {
    const turn = progress(view, 'train-wheels', before), sounded = progress(view, 'train-whistle', before);
    const gentleSpin = !before && sounded && ['finale', 'done', 'running'].includes(stage) ? time * 0.6 : 0;
    frontWheels.animate(turn * Math.PI * 6 + gentleSpin); body.backWheels.animate(-(turn * Math.PI * 6 + gentleSpin));
    steam.update(time, sounded > 0); body.lamp.material.emissiveIntensity = sounded * 1.6;
    horn.rotation.z = sounded ? Math.sin(time * 2.4) * 0.012 : 0;
    oil.rotation.z = !before && actionId === 'train-oil' ? -0.2 : 0;
  } };
}
function bench(parent, c) {
  for (const x of [-0.43, 0.43]) for (const z of [-0.19, 0.19]) block(parent, c.forest, [0.06, 0.38, 0.06], [x, 0.2, z]);
  for (let i = 0; i < 3; i++) round(parent, c.wood, [1.08, 0.065, 0.105], [0, 0.42, -0.14 + i * 0.14], 0.016);
  for (let i = 0; i < 2; i++) round(parent, c.wood, [1.08, 0.14, 0.055], [0, 0.62 + i * 0.18, -0.21], 0.014);
  for (const x of [-0.43, 0.43]) block(parent, c.forest, [0.045, 0.5, 0.055], [x, 0.54, -0.23]);
}
function ticketDesk(parent, c) {
  round(parent, c.wood, [0.86, 0.74, 0.56], [0, 0.38, 0], 0.03);
  round(parent, c.cream, [0.96, 0.07, 0.63], [0, 0.79, 0], 0.025);
  round(parent, c.sage, [0.4, 0.36, 0.3], [0, 1, -0.05], 0.05);
  block(parent, c.dark, [0.24, 0.025, 0.012], [0, 1.03, 0.106]);
  block(parent, c.cream, [0.16, 0.012, 0.27], [0, 0.93, 0.18], [-0.3, 0, 0]);
  cylinder(parent, c.brass, 0.062, 0.045, [0.215, 0.99, 0.07], [0, 0, Math.PI / 2]);
  plaque(parent, '车票', '', [0.38, 0.2], [0, 0.51, 0.29]);
}
function timetable(parent, c) {
  round(parent, c.wood, [1.27, 0.76, 0.13], [0, 0, 0], 0.03);
  const leaves = [];
  for (let i = 0; i < 3; i++) {
    const page = group(parent, [0, 0.22 - i * 0.23, 0.081]); leaves.push(page);
    block(page, c.forest, [1.13, 0.2, 0.025]);
    plaque(page, ['山谷来信', '林间慢车', '欢迎回来'][i], '', [0.96, 0.17], [0, 0, 0.018], '#476754', '#f4ead1');
  }
  return leaves;
}
function trolley(parent, c) {
  round(parent, c.wood, [0.7, 0.055, 0.43], [0, 0.21, 0], 0.018);
  for (const x of [-0.25, 0.25]) for (const z of [-0.2, 0.2]) cylinder(parent, c.dark, 0.09, 0.05, [x, 0.1, z], FRONT);
  tube([[0.29, 0.2, -0.17], [0.33, 0.67, -0.17], [0.33, 0.67, 0.17], [0.29, 0.2, 0.17]], 0.025, c.brass, parent);
  round(parent, c.wood, [0.49, 0.3, 0.35], [-0.035, 0.39, 0], 0.035);
  round(parent, c.sage, [0.38, 0.22, 0.3], [-0.035, 0.66, 0], 0.032);
  for (const x of [-0.16, 0.09]) block(parent, c.brass, [0.025, 0.31, 0.014], [x, 0.4, 0.183]);
  ring(parent, c.brass, 0.055, 0.012, [-0.035, 0.8, 0]);
}
function signal(parent, c) {
  round(parent, c.stone, [0.38, 0.14, 0.37], [0, 0.08, 0], 0.04);
  cylinder(parent, c.forest, 0.04, 1.29, [0, 0.77, 0]);
  round(parent, c.forest, [0.32, 0.65, 0.19], [0, 1.43, 0], 0.065);
  const lights = [];
  for (const [i, color] of ['#b09c6a', '#90b088'].entries()) {
    const bulb = sphere(parent, mat(color, { emissive: color, emissiveIntensity: 0, roughness: 0.23 }), 0.093, [0, 1.58 - i * 0.27, 0.1]); lights.push(bulb);
    mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.16, 24, 1, true, 0, Math.PI), c.dark, parent, [0, 1.58 - i * 0.27, 0.16], [Math.PI / 2, 0, 0]);
  }
  return lights;
}
function stationSign(parent, c) {
  for (const x of [-0.43, 0.43]) block(parent, c.wood, [0.065, 1.37, 0.075], [x, 0.69, 0]);
  round(parent, c.forest, [1.12, 0.54, 0.07], [0, 1.2, 0], 0.025);
  plaque(parent, '山间小站', 'MOUNTAIN STATION', [1.01, 0.44], [0, 1.2, 0.039], '#476754', '#f4ead1');
}
function fullTrack(parent, c) {
  for (let i = 0; i < 23; i++) block(parent, c.wood, [0.16, 0.08, 0.7], [-2.64 + i * 0.24, 0.06, 0]);
  for (const z of [-0.23, 0.23]) rail(group(parent, [0, 0.15, z]), c, 5.62);
}
export const STATION_OVERVIEW_IDS = ['station-sign', 'station-bench', 'station-ticket', 'station-board', 'station-luggage', 'station-signal', 'station-track', 'station-train'];
function overview(view) {
  const c = palette(view), root = group(view.scene, [0, 0, 0], 'mountain-station-overview');
  round(root, c.stone, [6.05, 0.15, 3.44], [0, -0.08, 0.02], 0.055);
  // A single warm stone platform avoids alternating pale plank stripes and keeps the miniature coherent.
  round(root, c.stone, [5.82, 0.25, 1.91], [0, 0.11, -0.71], 0.035);
  const platformTop = mat('#c4bfab', { roughness: 0.93, clearcoat: 0 });
  block(root, platformTop, [5.8, 0.032, 1.89], [0, 0.249, -0.71]);
  for (const x of [-2.15, -1.43, -0.71, 0.01, 0.73, 1.45, 2.17]) block(root, c.stone, [0.008, 0.004, 1.8], [x, 0.268, -0.72]);
  block(root, c.cream, [5.76, 0.035, 0.12], [0, 0.262, 0.178]);
  block(root, c.wood, [5.8, 0.048, 0.045], [0, 0.18, 0.274]);
  // The shallow rear canopy shelters the station without covering restored objects or action targets.
  for (const x of [-2.65, 1.7]) block(root, c.wood, [0.09, 1.93, 0.09], [x, 1.2, -1.48]);
  block(root, c.cream, [4.46, 1.6, 0.095], [-0.47, 1.07, -1.5]);
  block(root, c.wood, [4.55, 0.1, 0.12], [-0.47, 2.1, -1.48]);
  round(root, c.forest, [4.88, 0.14, 0.77], [-0.47, 2.2, -1.32], 0.045, [-0.11, 0, 0]);
  for (let i = 0; i < 9; i++) block(root, c.sage, [0.026, 0.016, 0.69], [-2.59 + i * 0.52, 2.273, -1.32], [-0.11, 0, 0]);
  const window = group(root, [-0.95, 1.32, -1.43]);
  block(window, c.forest, [1.55, 0.89, 0.052]);
  block(window, c.glass, [1.34, 0.7, 0.057], [0, 0, 0.017]);
  block(window, c.cream, [0.035, 0.77, 0.042], [0, 0, 0.058]);
  block(window, c.cream, [1.4, 0.035, 0.042], [0, 0, 0.058]);
  const shutters = group(window, [0, 0, 0.085], 'station-overview-shutters'), panels = [];
  for (const side of [-1, 1]) {
    const panel = group(shutters, [side * 0.72, 0, 0]); panels.push(panel);
    block(panel, c.sage, [0.68, 0.8, 0.065], [-side * 0.34, 0, 0]);
    for (let i = 0; i < 5; i++) block(panel, c.forest, [0.62, 0.021, 0.018], [-side * 0.34, -0.28 + i * 0.14, 0.045]);
  }
  const handle = group(root, [-0.08, 1.61, -1.28]);
  cylinder(handle, c.brass, 0.032, 0.09, [0, 0, -0.035], FRONT);
  ring(handle, c.brass, 0.066, 0.017); registerAction(view, 'station-open-shutters', handle);
  const zones = [
    ['station-sign', [-2.12, 0.27, -0.45], [1.12, 1.5, 0.18]],
    ['station-bench', [-0.66, 0.27, -0.18], [1.12, 0.9, 0.49]],
    ['station-ticket', [-1.48, 0.27, -1.02], [0.96, 1.21, 0.64]],
    ['station-board', [0.66, 1.55, -1.415], [1.27, 0.76, 0.13]],
    ['station-luggage', [0.84, 0.27, -0.02], [0.75, 0.89, 0.5]],
    ['station-signal', [2.16, 0.03, 0.42], [0.4, 1.81, 0.4]],
    ['station-track', [0, 0.015, 1.08], [5.62, 0.25, 0.75]],
    ['station-train', [0.2, 0.025, 1.08], [1.66, 1.23, 0.75]],
  ];
  const restored = new Map(), placeholders = new Map(), highlights = new Map();
  for (const [id, position, size] of zones) {
    restored.set(id, group(root, position, `restored-${id}`));
    const ghost = group(root, position, `placeholder-${id}`); placeholders.set(id, ghost);
    const geometry = new THREE.BoxGeometry(...size), edges = new THREE.EdgesGeometry(geometry); geometry.dispose();
    const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#768779', transparent: true, opacity: 0.32 })); outline.position.y = id === 'station-board' ? 0 : size[1] / 2; ghost.add(outline);
    const halo = ring(root, new THREE.MeshBasicMaterial({ color: '#e3b969', transparent: true, opacity: 0, depthWrite: false }), Math.min(size[0] * 0.52, 0.6), 0.014, [position[0], id === 'station-board' ? 0.278 : position[1] + 0.014, position[2]], TOP);
    halo.name = `chapter-highlight-${id}`; halo.castShadow = false; highlights.set(id, halo);
  }
  stationSign(restored.get('station-sign'), c); bench(restored.get('station-bench'), c); ticketDesk(restored.get('station-ticket'), c);
  const pages = timetable(restored.get('station-board'), c); trolley(restored.get('station-luggage'), c);
  const signals = signal(restored.get('station-signal'), c); registerAction(view, 'station-set-signal', restored.get('station-signal'));
  fullTrack(restored.get('station-track'), c);
  const littleTrain = locomotive(restored.get('station-train'), c, 'station-overview-train'); littleTrain.root.scale.setScalar(0.58);
  const wheels = wheelset(littleTrain.root, c); wheels.root.position.set(0, 0.34, 0.545);
  cabin(littleTrain.root, c).position.set(-0.86, 1.1, 0); whistle(littleTrain.root, c).position.set(-0.69, 1.83, 0.13);
  const steam = steamPuffs(littleTrain.root, [0.89, 1.63, 0], 'station-overview-steam');
  const invite = group(root, [1.57, 0.32, 0.13]);
  cylinder(invite, c.brass, 0.1, 0.035); cylinder(invite, c.forest, 0.027, 0.2, [0, 0.11, 0]); sphere(invite, c.cream, 0.074, [0, 0.22, 0]);
  registerAction(view, 'station-arrive-train', invite);
  const bellStand = group(root, [1.5, 0.27, -0.98]);
  cylinder(bellStand, c.wood, 0.045, 1.15, [0, 0.58, 0]); block(bellStand, c.wood, [0.4, 0.045, 0.07], [-0.15, 1.16, 0]);
  const bell = group(bellStand, [-0.29, 1.11, 0], 'station-overview-arrival-bell');
  cylinder(bell, c.brass, 0.11, 0.15, [0, -0.09, 0], undefined, 0.058); ring(bell, c.brass, 0.112, 0.015, [0, -0.17, 0], TOP); sphere(bell, c.dark, 0.025, [0, -0.182, 0]);
  registerAction(view, 'station-arrival-bell', bell);
  const light = new THREE.PointLight('#ffe0a9', 0, 5, 1.6); light.position.set(-0.7, 1.75, -0.9); root.add(light);
  const warmWindow = mat('#ffdf9a', { emissive: '#ffcf83', emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false });
  const warmth = mesh(new THREE.PlaneGeometry(1.25, 0.62), warmWindow, window, [0, 0, 0.049]); warmth.castShadow = false;
  return { update(dt, time, { before = false, stage = 'overview' } = {}) {
    const collection = view.state.seasonRestored || new Set(), chapter = view.state.chapterHighlights || new Set();
    for (const [id, object] of restored) {
      object.visible = !before && collection.has(id); placeholders.get(id).visible = !object.visible;
      const halo = highlights.get(id); halo.visible = object.visible && chapter.has(id); halo.material.opacity = halo.visible ? 0.46 + Math.sin(time * 1.5) * 0.09 : 0;
    }
    const preview = stage === 'overview' || view.state.shopPreview === true, done = view.state.completed || stage === 'done';
    const value = id => before ? 0 : preview || done ? 1 : progress(view, id, false);
    const opened = value('station-open-shutters'), signalOn = value('station-set-signal') * Number(collection.has('station-signal'));
    panels.forEach((panel, i) => { panel.rotation.y = (i ? 1 : -1) * opened * Math.PI * 0.82; }); shutters.userData.openAmount = opened;
    signals[0].material.emissiveIntensity = before ? 0 : 0.3 * (1 - signalOn); signals[1].material.emissiveIntensity = signalOn * 2.1;
    const arrival = value('station-arrive-train'), eased = 1 - Math.pow(1 - arrival, 3);
    // The saved hold progress determines position; the last metres ease gently to a complete stop.
    const train = restored.get('station-train'); train.position.x = -2.03 + eased * 2.23;
    train.userData.arrivalProgress = arrival; train.userData.stopped = arrival >= 1;
    const wheelAngle = eased * 2.23 / (0.31 * 0.58); wheels.animate(wheelAngle); littleTrain.backWheels.animate(-wheelAngle);
    littleTrain.lamp.material.emissiveIntensity = !before && collection.has('station-train') ? 1.3 : 0;
    steam.update(time, !before && collection.has('station-train') && (arrival > 0 || preview));
    const rung = value('station-arrival-bell'); bell.rotation.z = rung ? Math.sin(time * 2.2) * 0.055 : 0;
    bell.userData.rung = rung > 0; invite.rotation.z = arrival < 1 ? -arrival * 0.24 : 0;
    pages.forEach((page, i) => { page.rotation.x = !before && collection.has('station-board') ? Math.sin(time * 0.35 + i) * 0.008 : 0; });
    light.intensity = opened * 0.7; warmWindow.opacity = opened * 0.35; warmWindow.emissiveIntensity = opened * 0.9;
  } };
}
export function buildStationFinaleScene(view) {
  if (view.level.id === 'station-track') return track(view);
  if (view.level.id === 'station-train') return train(view);
  if (view.level.id === 'station-opening') return overview(view);
  throw new Error(`Unknown station finale level: ${view.level.id}`);
}
