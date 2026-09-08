import * as THREE from 'three';
import { box, mat, mesh, tube, label, registerItem, registerAction } from './season-scene-kit.mjs';

const flat = [-Math.PI / 2, 0, 0];
const clamp = (value) => Math.max(0, Math.min(1, value));
const taskValue = (state, id, before) => before ? 0 : clamp(state.taskValues?.[id] || 0);
const group = (parent, position = [0, 0, 0], name = '') => {
  const root = new THREE.Group(); root.position.set(...position); root.name = name; parent.add(root); return root;
};
const cylinder = (parent, material, radius, height, position = [0, 0, 0], top = radius, rotation) =>
  mesh(new THREE.CylinderGeometry(top, radius, height, 36), material, parent, position, rotation);
const ring = (parent, material, radius, thickness, position = [0, 0, 0], rotation = [0, 0, 0]) =>
  mesh(new THREE.TorusGeometry(radius, thickness, 8, 48), material, parent, position, rotation);
function plaque(parent, text, small, position, size, color = '#345f5b', background = '#f4ebd7') {
  return mesh(new THREE.PlaneGeometry(...size), mat('#ffffff', { map: label(text, small, color, background), roughness: 0.85 }), parent, position);
}
function palette(view) {
  return {
    brass: mat('#b89e69', { metalness: 0.78, roughness: 0.28 }),
    green: mat('#70968b', { metalness: 0.18, roughness: 0.28, clearcoat: 0.8 }),
    cream: mat('#e1dcc6', { roughness: 0.53 }),
    dark: mat('#3e514c', { roughness: 0.74 }),
    wood: mat('#b79b76', { map: view.wood, roughness: 0.62 }),
    paper: mat('#f1e8d1', { roughness: 0.9 }),
    rust: mat('#b07b63', { roughness: 0.74 }),
    glass: mat('#c5e0d9', { transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.09, side: THREE.DoubleSide }),
  };
}
function surfaces(view) {
  for (const spec of view.level.surfaces) {
    const glass = spec.material === 'glass';
    const object = view.surface(spec.id, spec.mask?.kind === 'disc' ? new THREE.CircleGeometry(spec.width / 2, 72) : new THREE.PlaneGeometry(spec.width, spec.height), {
      color: spec.color, roughness: glass ? 0.09 : 0.36, clearcoat: glass ? 1 : 0.45,
      metalness: spec.material === 'metal' ? 0.55 : 0,
      ...(spec.material === 'wood' ? { map: view.wood } : {}),
      ...(glass ? { transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide } : {}),
    }, spec.position, spec.rotation);
    if (glass && object) {
      const compile = object.material.onBeforeCompile;
      object.material.onBeforeCompile = (shader, renderer) => {
        compile.call(object.material, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', 'diffuseColor.a=mix(.13,.96,dirt);\n#include <roughnessmap_fragment>');
      };
      object.material.customProgramCacheKey = () => `post-glass-${spec.id}`;
    }
  }
}

function wheel(parent, colors) {
  const root = group(parent);
  ring(root, colors.dark, 0.545, 0.045);
  ring(root, colors.cream, 0.492, 0.015);
  cylinder(root, colors.brass, 0.055, 0.19, [0, 0, 0], 0.055, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    tube([[Math.cos(angle) * 0.065, Math.sin(angle) * 0.065, 0.02], [Math.cos(angle + 0.07) * 0.488, Math.sin(angle + 0.07) * 0.488, 0]], 0.006, colors.brass, root);
  }
  mesh(box(0.1, 0.028, 0.04, 0.008), colors.cream, root, [0.25, 0.25, 0.02], [0, 0, -Math.PI / 4]);
  return root;
}
function basket(parent, colors) {
  const root = group(parent);
  mesh(box(0.65, 0.05, 0.47), colors.wood, root, [0, -0.225, 0]);
  for (let y = -0.2; y < 0.26; y += 0.07) {
    for (const z of [-0.235, 0.235]) mesh(box(0.69, 0.025, 0.019, 0.006), colors.wood, root, [0, y, z]);
    for (const x of [-0.333, 0.333]) mesh(box(0.019, 0.025, 0.48, 0.006), colors.wood, root, [x, y, 0]);
  }
  for (let x = -0.29; x <= 0.3; x += 0.1) for (const z of [-0.24, 0.24]) mesh(box(0.016, 0.49, 0.017), colors.cream, root, [x, 0, z]);
  for (const x of [-0.34, 0.34]) for (const z of [-0.18, 0, 0.18]) mesh(box(0.014, 0.49, 0.017), colors.cream, root, [x, 0, z]);
  return root;
}
function bell(parent, colors) {
  const root = group(parent);
  const dome = mesh(new THREE.SphereGeometry(0.092, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), colors.brass, root, [0, -0.025, 0]);
  ring(root, colors.brass, 0.087, 0.011, [0, -0.023, 0], flat);
  cylinder(root, colors.dark, 0.045, 0.06, [0, -0.058, 0]);
  tube([[0.05, -0.04, 0.02], [0.11, -0.028, 0.03], [0.115, 0.005, 0.015]], 0.012, colors.dark, root);
  return { root, dome };
}
function bicycleBody(parent, colors) {
  const root = group(parent);
  const rear = wheel(root, colors); rear.position.set(-1.04, 0.59, -0.06);
  const points = { rear: [-1.04, 0.59, -0.06], crank: [-0.21, 0.56, -0.06], seat: [-0.49, 1.31, -0.06], head: [0.65, 1.35, -0.06] };
  for (const [a, b] of [['rear', 'crank'], ['crank', 'seat'], ['seat', 'rear'], ['crank', 'head'], ['seat', 'head']]) tube([points[a], points[b]], 0.037, colors.green, root);
  for (const z of [-0.15, 0.03]) tube([[0.63, 1.4, z], [0.8, 1.0, z], [1.03, 0.59, z]], 0.032, colors.green, root);
  tube([[-0.49, 1.31, -0.06], [-0.53, 1.57, -0.06]], 0.027, colors.brass, root);
  mesh(box(0.46, 0.105, 0.32, 0.045), colors.dark, root, [-0.57, 1.58, -0.06]);
  tube([[0.64, 1.36, -0.06], [0.62, 1.66, -0.06], [0.66, 1.67, 0.28]], 0.024, colors.brass, root);
  tube([[0.62, 1.66, -0.06], [0.65, 1.67, -0.39]], 0.024, colors.brass, root);
  for (const z of [-0.39, 0.3]) mesh(box(0.18, 0.065, 0.07, 0.019), colors.dark, root, [0.65, 1.66, z]);
  tube([[0.65, 1.61, 0.22], [0.76, 1.22, 0.14], [1.01, 0.75, 0.1]], 0.008, colors.dark, root);
  const fender = mesh(new THREE.TorusGeometry(0.615, 0.039, 8, 40, Math.PI), colors.cream, root, [-1.04, 0.59, -0.06]);
  fender.scale.z = 2.4;
  mesh(box(1.01, 0.19, 0.035), colors.cream, root, [-1.04, 1.035, 0.1]);
  for (const x of [-1.39, -0.7]) tube([[x, 1.23, -0.06], [-1.04, 0.62, -0.06]], 0.015, colors.brass, root);
  mesh(box(0.84, 0.05, 0.35), colors.wood, root, [-1.06, 1.2, -0.06]);
  mesh(box(0.8, 0.32, 0.033), colors.wood, root, [-1.06, 1.355, 0.112]);
  mesh(box(1.08, 0.25, 0.04, 0.05), colors.green, root, [-0.18, 1.05, 0.085]);
  plaque(root, 'POST', 'COASTAL ROUTE', [-0.17, 1.05, 0.117], [0.35, 0.11]);
  const chain = tube([[-1.04, 0.69, 0.058], [-0.2, 0.76, 0.058], [0.0, 0.56, 0.058], [-0.2, 0.365, 0.058], [-1.04, 0.49, 0.058], [-1.14, 0.59, 0.058], [-1.04, 0.69, 0.058]], 0.013, colors.dark, root);
  const crank = group(root, [-0.21, 0.56, 0.105], 'post-bicycle-crank');
  ring(crank, colors.brass, 0.177, 0.016);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    tube([[0, 0, 0], [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0]], 0.012, colors.brass, crank);
  }
  tube([[-0.2, -0.16, 0.04], [0, 0, 0.04], [0.2, 0.16, 0.04]], 0.02, colors.brass, crank);
  for (const sign of [-1, 1]) mesh(box(0.14, 0.06, 0.18), colors.dark, crank, [sign * 0.2, sign * 0.16, 0.07]);
  tube([[-0.25, 0.52, -0.13], [-0.41, 0.03, -0.33]], 0.023, colors.brass, root);
  return { root, rear, crank, chain };
}
function bicycle(view) {
  const colors = palette(view), body = bicycleBody(view.scene, colors);
  const front = wheel(new THREE.Group(), colors);
  front.name = 'post-bicycle-front-spin';
  registerItem(view, view.level.items[0], front.parent);
  const basketRoot = basket(new THREE.Group(), colors);
  registerItem(view, view.level.items[1], basketRoot.parent);
  const bellParts = bell(new THREE.Group(), colors);
  registerItem(view, view.level.items[2], bellParts.root.parent);
  bellParts.root.name = 'post-bicycle-bell';
  registerAction(view, 'bicycle-bell', bellParts.root);
  registerAction(view, 'bicycle-pedal', body.crank);
  const oil = group(view.scene, [0.76, 0.2, 0.87], 'post-bicycle-oil-can');
  cylinder(oil, colors.rust, 0.11, 0.29); cylinder(oil, colors.brass, 0.085, 0.05, [0, 0.17, 0]);
  tube([[0, 0.18, 0], [-0.04, 0.25, 0], [-0.2, 0.29, 0]], 0.022, colors.brass, oil);
  ring(oil, colors.brass, 0.09, 0.017, [0.12, 0.02, 0]);
  registerAction(view, 'bicycle-oil', oil);
  const drops = group(view.scene, [-0.45, 0.56, 0.16], 'post-bicycle-oil-drops');
  for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.022, 12, 8), colors.brass, drops, [i * 0.09, 0.07 + i * 0.035, 0]).scale.y = 1.6;
  surfaces(view);
  return {
    update(dt, time, { before = false, actionId } = {}) {
      const oilValue = taskValue(view.state, 'bicycle-oil', before), pedal = taskValue(view.state, 'bicycle-pedal', before), rung = taskValue(view.state, 'bicycle-bell', before);
      body.chain.material.roughness = 0.75 - oilValue * 0.45;
      drops.visible = !before && actionId === 'bicycle-oil' && oilValue < 1;
      drops.position.y = 0.56 - (time * 0.12 % 0.16);
      const rotation = before ? 0 : pedal * Math.PI * 4 + (pedal >= 1 ? time * 0.6 : 0);
      body.crank.rotation.z = -rotation;
      body.rear.rotation.z = -rotation * 1.7;
      front.rotation.z = view.state.placed.has('bicycle-wheel') ? -rotation * 1.7 : 0;
      bellParts.root.rotation.z = rung ? Math.sin(time * 5) * 0.055 : 0;
      oil.rotation.z = actionId === 'bicycle-oil' && !before ? 0.35 : 0;
    },
  };
}

function gear(parent, colors, radius = 0.2) {
  const root = group(parent);
  cylinder(root, colors.brass, radius * 0.84, 0.056, [0, 0, 0], radius * 0.84, [Math.PI / 2, 0, 0]);
  ring(root, colors.dark, radius * 0.39, radius * 0.05, [0, 0, 0.032]);
  for (let i = 0; i < 14; i++) {
    const angle = i * Math.PI * 2 / 14;
    mesh(box(radius * 0.22, radius * 0.24, 0.062, 0.006), colors.brass, root, [Math.cos(angle) * radius * 0.87, Math.sin(angle) * radius * 0.87, 0], [0, 0, angle]);
  }
  cylinder(root, colors.dark, radius * 0.16, 0.072, [0, 0, 0], radius * 0.16, [Math.PI / 2, 0, 0]);
  return root;
}
function beaconBeam(parent, name = 'post-beacon-beam') {
  const root = group(parent, [0, 0, 0], name);
  const material = new THREE.MeshBasicMaterial({ color: '#ffe4a2', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
  const beam = mesh(new THREE.ConeGeometry(0.48, 2.5, 32, 1, true), material, root, [0, 0, 1.25], [-Math.PI / 2, 0, 0]);
  beam.castShadow = false; beam.receiveShadow = false;
  return root;
}
function beacon(view) {
  const colors = palette(view), root = group(view.scene, [-0.28, 0, -0.04]);
  mesh(box(1.43, 0.3, 0.88, 0.035), colors.brass, root, [0, 0.205, 0]);
  mesh(box(1.51, 0.08, 0.98, 0.025), colors.green, root, [0, 0.055, 0]);
  cylinder(root, colors.brass, 0.25, 0.17, [0, 0.44, 0]);
  cylinder(root, colors.green, 0.58, 0.09, [0, 0.57, 0]);
  for (const x of [-0.57, 0.57]) {
    tube([[x, 0.57, -0.31], [x, 1.13, -0.31], [x, 1.7, -0.31]], 0.034, colors.brass, root);
    tube([[x, 0.57, 0.34], [x, 1.13, 0.34], [x, 1.7, 0.34]], 0.023, colors.brass, root);
  }
  mesh(box(1.23, 0.085, 0.82), colors.green, root, [0, 1.72, 0.015]);
  mesh(new THREE.CylinderGeometry(0.17, 0.75, 0.26, 6), colors.brass, root, [0, 1.89, 0.02], [0, Math.PI / 6, 0]);
  cylinder(root, colors.green, 0.09, 0.13, [0, 2.06, 0.02]);
  ring(root, colors.brass, 0.573, 0.024, [0, 1.13, 0.382]);
  mesh(new THREE.PlaneGeometry(1.02, 0.95), colors.glass, root, [0, 1.13, -0.331]);
  mesh(new THREE.PlaneGeometry(0.51, 0.69), colors.glass, root, [-0.552, 1.13, 0.01], [0, Math.PI / 2, 0]);
  const rotor = group(root, [0, 1.13, 0.39], 'post-beacon-prism-rotor');
  for (const radius of [0.15, 0.26, 0.37, 0.48]) ring(rotor, colors.glass, radius, 0.014);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    mesh(box(0.018, 0.3, 0.025), colors.glass, rotor, [Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], [0, 0, a - Math.PI / 2]);
  }
  const wick = new THREE.Group();
  cylinder(wick, colors.brass, 0.15, 0.09, [0, -0.21, 0]);
  cylinder(wick, colors.cream, 0.105, 0.35, [0, 0.01, 0]);
  cylinder(wick, colors.dark, 0.016, 0.08, [0, 0.22, 0]);
  const glowMaterial = mat('#fff0b9', { emissive: '#ffc978', emissiveIntensity: 0, roughness: 0.2 });
  const flame = mesh(new THREE.SphereGeometry(0.055, 20, 14), glowMaterial, wick, [0, 0.29, 0]); flame.scale.y = 1.6; flame.name = 'post-beacon-flame';
  registerItem(view, view.level.items[0], wick);
  const rim = new THREE.Group(); ring(rim, colors.brass, 0.626, 0.028); ring(rim, colors.cream, 0.587, 0.012);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    mesh(new THREE.SphereGeometry(0.027, 12, 8), colors.brass, rim, [Math.cos(a) * 0.626, Math.sin(a) * 0.626, 0.025]);
  }
  registerItem(view, view.level.items[1], rim);
  const pinion = gear(new THREE.Group(), colors, 0.22); pinion.name = 'post-beacon-pinion';
  registerItem(view, view.level.items[2], pinion.parent); registerAction(view, 'beacon-turn', pinion);
  const dial = group(root, [-0.4, 0.39, 0.5], 'post-beacon-angle-dial');
  cylinder(dial, colors.green, 0.1, 0.07, [0, 0, 0], 0.1, [Math.PI / 2, 0, 0]);
  mesh(box(0.01, 0.071, 0.012), colors.cream, dial, [0, 0.025, 0.044]);
  registerAction(view, 'beacon-angle', dial);
  const button = cylinder(root, colors.green, 0.077, 0.058, [0.38, 0.385, 0.47], 0.077, [Math.PI / 2, 0, 0]);
  registerAction(view, 'beacon-light', button);
  cylinder(root, colors.brass, 0.048, 0.22, [0.92, 0.47, 0.13], 0.048, [Math.PI / 2, 0, 0]);
  tube([[0.92, 0.47, 0.04], [0.91, 0.3, -0.06], [0.63, 0.3, -0.06]], 0.028, colors.brass, root);
  const beam = beaconBeam(root); beam.position.set(0, 1.13, 0.39);
  const light = new THREE.PointLight('#ffd48e', 0, 5, 1.7); light.name = 'post-beacon-light'; light.position.set(0, 1.23, 0.1); root.add(light);
  surfaces(view);
  return {
    update(dt, time, { before = false } = {}) {
      const angle = before ? 0 : view.state.taskValues?.['beacon-angle'] || 0;
      const turn = taskValue(view.state, 'beacon-turn', before), lit = taskValue(view.state, 'beacon-light', before);
      dial.rotation.z = -angle * Math.PI / 90;
      pinion.rotation.z = -turn * Math.PI * 6 - (lit ? time * 0.4 : 0);
      rotor.rotation.z = turn * Math.PI * 2 + (lit ? time * 0.15 : 0);
      beam.visible = lit > 0; beam.rotation.y = angle * Math.PI / 180 + Math.sin(time * 0.28) * 0.65;
      flame.visible = lit > 0; glowMaterial.emissiveIntensity = lit * 2.5; light.intensity = lit * 1.8;
      button.position.z = lit ? 0.457 : 0.47;
    },
  };
}

function envelope(parent, colors, position = [0, 0, 0], scale = 1) {
  const root = group(parent, position); root.scale.setScalar(scale);
  mesh(box(0.44, 0.29, 0.015, 0.006), colors.paper, root);
  tube([[-0.21, 0.132, 0.011], [0, -0.015, 0.012], [0.21, 0.132, 0.011]], 0.004, colors.wood, root);
  mesh(box(0.067, 0.075, 0.008, 0.003), colors.green, root, [0.14, 0.071, 0.014]);
  return root;
}
function table(parent, colors, width, depth, height) {
  mesh(box(width, 0.065, depth, 0.018), colors.wood, parent, [0, height, 0]);
  for (const x of [-width * 0.41, width * 0.41]) for (const z of [-depth * 0.35, depth * 0.35]) mesh(box(0.045, height, 0.045), colors.green, parent, [x, height / 2, z]);
}
function miniatureMailbox(parent, colors) {
  cylinder(parent, colors.green, 0.2, 0.14, [0, 0.09, 0]);
  cylinder(parent, colors.green, 0.067, 0.53, [0, 0.42, 0]);
  mesh(box(0.49, 0.56, 0.42, 0.055), colors.green, parent, [0, 0.91, 0]);
  mesh(new THREE.SphereGeometry(0.245, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), colors.green, parent, [0, 1.16, 0]).scale.z = 0.86;
  mesh(box(0.32, 0.042, 0.016), colors.dark, parent, [0, 1.055, 0.215]);
  plaque(parent, 'POST', '海边来信', [0, 0.91, 0.217], [0.31, 0.11]);
  mesh(box(0.28, 0.2, 0.013), colors.brass, parent, [0, 0.705, 0.218]);
}
function miniatureSorter(parent, colors) {
  table(parent, colors, 1.1, 0.54, 0.52);
  mesh(box(1.03, 0.76, 0.034), colors.wood, parent, [0, 0.94, -0.22]);
  for (const x of [-0.52, -0.175, 0.175, 0.52]) mesh(box(0.036, 0.78, 0.45), colors.wood, parent, [x, 0.95, 0]);
  for (const y of [0.56, 0.95, 1.34]) mesh(box(1.08, 0.035, 0.47), colors.wood, parent, [0, y, 0]);
  for (const x of [-0.35, 0, 0.35]) for (const y of [0.6, 0.995]) {
    const letter = envelope(parent, colors, [x, y + 0.026, 0.045], 0.53); letter.rotation.x = -Math.PI / 2;
  }
}
function miniatureStamp(parent, colors) {
  table(parent, colors, 0.7, 0.57, 0.63);
  const letter = envelope(parent, colors, [0.03, 0.67, 0.08], 0.78); letter.rotation.x = -Math.PI / 2;
  mesh(box(0.22, 0.04, 0.14), colors.green, parent, [-0.18, 0.685, -0.16]);
  cylinder(parent, colors.brass, 0.077, 0.035, [0.17, 0.69, -0.13]);
  cylinder(parent, colors.wood, 0.039, 0.13, [0.17, 0.77, -0.13]);
  mesh(new THREE.SphereGeometry(0.056, 16, 10), colors.wood, parent, [0.17, 0.845, -0.13]);
}
function miniatureTypewriter(parent, colors) {
  table(parent, colors, 1.0, 0.57, 0.66);
  mesh(box(0.64, 0.16, 0.4, 0.04), colors.green, parent, [0, 0.78, 0.04]);
  mesh(box(0.53, 0.2, 0.18, 0.025), colors.green, parent, [0, 0.93, -0.095]);
  cylinder(parent, colors.dark, 0.044, 0.63, [0, 1.04, -0.1], 0.044, [0, 0, Math.PI / 2]);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) cylinder(parent, colors.cream, 0.018, 0.024, [-0.228 + col * 0.065, 0.873 + row * 0.02, 0.19 - row * 0.075]);
  mesh(box(0.23, 0.025, 0.028), colors.brass, parent, [0, 0.874, 0.255]);
  const paper = plaque(parent, 'DEAR FRIEND', 'A LETTER FROM THE SHORE', [0, 1.155, -0.102], [0.34, 0.27]); paper.rotation.x = -0.1;
  return paper;
}
function miniatureParcel(parent, colors) {
  table(parent, colors, 0.74, 0.57, 0.46);
  mesh(box(0.51, 0.31, 0.39, 0.013), colors.wood, parent, [0, 0.65, 0]);
  for (const x of [-0.15, 0.15]) mesh(box(0.012, 0.315, 0.395), colors.paper, parent, [x, 0.65, 0]);
  mesh(box(0.518, 0.315, 0.013), colors.paper, parent, [0, 0.65, 0]);
  const tag = envelope(parent, colors, [0.07, 0.814, 0.07], 0.44); tag.rotation.x = -Math.PI / 2;
}
function miniatureRadio(parent, colors) {
  mesh(box(0.66, 0.46, 0.26, 0.047), colors.wood, parent, [0, 0.25, 0]);
  for (let x = -0.25; x < -0.04; x += 0.03) mesh(box(0.012, 0.27, 0.018), colors.dark, parent, [x, 0.27, 0.139]);
  plaque(parent, 'SEA FM', '90  100  110', [0.14, 0.34, 0.139], [0.22, 0.11]);
  for (const x of [0.07, 0.23]) cylinder(parent, colors.brass, 0.033, 0.025, [x, 0.15, 0.142], 0.033, [Math.PI / 2, 0, 0]);
  tube([[0.19, 0.47, 0], [0.26, 0.8, 0]], 0.007, colors.brass, parent);
  const glow = mesh(box(0.008, 0.07, 0.01), mat('#ffe9af', { emissive: '#ffd48e', emissiveIntensity: 0 }), parent, [0.14, 0.34, 0.148]);
  return glow;
}
function miniatureLighthouse(parent, colors) {
  cylinder(parent, colors.cream, 0.32, 0.15, [0, 0.1, 0], 0.3);
  cylinder(parent, colors.cream, 0.28, 1.75, [0, 1.0, 0], 0.19);
  for (const y of [0.63, 1.1, 1.58]) cylinder(parent, colors.rust, 0.28 - (y - 0.1) * 0.049, 0.17, [0, y, 0], 0.27 - (y - 0.1) * 0.049);
  mesh(box(0.115, 0.31, 0.025, 0.013), colors.green, parent, [0, 0.305, 0.283]);
  for (const y of [0.82, 1.34]) mesh(box(0.068, 0.12, 0.015), colors.dark, parent, [0, y, 0.256 - (y - 0.3) * 0.045]);
  cylinder(parent, colors.brass, 0.33, 0.07, [0, 1.91, 0]);
  ring(parent, colors.brass, 0.32, 0.012, [0, 2.08, 0], flat);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    cylinder(parent, colors.brass, 0.009, 0.16, [Math.cos(a) * 0.32, 2.0, Math.sin(a) * 0.32]);
  }
  cylinder(parent, colors.glass, 0.185, 0.38, [0, 2.14, 0]);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    cylinder(parent, colors.brass, 0.011, 0.42, [Math.cos(a) * 0.19, 2.15, Math.sin(a) * 0.19]);
  }
  cylinder(parent, colors.rust, 0.31, 0.23, [0, 2.43, 0], 0.01);
  const lamp = cylinder(parent, mat('#f5e2af', { emissive: '#ffc875', emissiveIntensity: 0 }), 0.07, 0.19, [0, 2.15, 0]);
  const beam = beaconBeam(parent, 'post-overview-beam'); beam.position.y = 2.15; beam.scale.setScalar(0.72);
  const light = new THREE.PointLight('#ffdb91', 0, 4, 1.8); light.name = 'post-overview-beacon-light'; light.position.y = 2.16; parent.add(light);
  return { lamp, beam, light };
}

export const POST_OVERVIEW_IDS = ['post-box', 'post-sorter', 'post-stamp', 'post-typewriter', 'post-parcel', 'post-radio', 'post-bicycle', 'post-beacon'];
function overview(view) {
  const colors = palette(view), root = group(view.scene, [0, 0, 0], 'lighthouse-post-overview');
  mesh(box(5.6, 0.17, 3.12, 0.055), colors.wood, root, [0, -0.07, 0]);
  const lightTimber = mat('#bea27d', { map: view.wood, roughness: 0.64 });
  for (let i = 0; i < 12; i++) mesh(box(0.435, 0.022, 2.96, 0.005), i % 2 ? lightTimber : colors.wood, root, [-2.43 + i * 0.44, 0.03, 0]);
  // Open-front architecture preserves every workbench target from phone and desktop cameras.
  for (const x of [-2.56, 1.56]) mesh(box(0.11, 2.25, 0.13), colors.green, root, [x, 1.17, -1.42]);
  mesh(box(4.24, 0.13, 0.15), colors.green, root, [-0.5, 2.27, -1.42]);
  mesh(box(4.19, 0.43, 0.09), colors.cream, root, [-0.5, 0.28, -1.44]);
  for (const x of [-1.2, 0.18]) mesh(box(0.035, 1.72, 0.045), colors.wood, root, [x, 1.35, -1.42]);
  mesh(box(4.08, 0.034, 0.045), colors.wood, root, [-0.5, 1.53, -1.42]);
  mesh(new THREE.PlaneGeometry(4.01, 1.62), colors.glass, root, [-0.5, 1.34, -1.45]);
  const curtain = group(root, [-0.2, 2.23, -1.34], 'post-overview-curtain');
  const curtainCloth = mat('#a6bab0', { roughness: 1, side: THREE.DoubleSide });
  const curtains = [];
  for (const sign of [-1, 1]) {
    const panel = group(curtain, [sign * 0.74, 0, 0]);
    for (let i = 0; i < 10; i++) mesh(box(0.15, 1.65, 0.07, 0.027), curtainCloth, panel, [-0.665 + i * 0.147, -0.825, i % 2 * 0.038]);
    curtains.push(panel);
  }
  const pull = group(root, [1.38, 1.98, -1.21]);
  tube([[0, 0, 0], [0, -0.71, 0], [0.035, -0.82, 0.05]], 0.011, colors.brass, pull);
  ring(pull, colors.brass, 0.039, 0.012, [0.035, -0.86, 0.05]);
  registerAction(view, 'post-open-curtain', pull);

  const zones = [
    ['post-box', '01 邮筒', [-2.05, 0.047, 0.75], [0.55, 1.4, 0.5]],
    ['post-sorter', '02 信格', [-1.69, 0.047, -0.76], [1.1, 1.38, 0.54]],
    ['post-stamp', '03 印章', [-0.91, 0.047, 0.57], [0.7, 0.88, 0.57]],
    ['post-typewriter', '04 打字机', [-0.14, 0.047, -0.75], [1.0, 1.29, 0.57]],
    ['post-parcel', '05 包裹', [0.21, 0.047, 0.67], [0.74, 0.83, 0.57]],
    ['post-radio', '06 收音机', [0.99, 1.26, -1.19], [0.66, 0.8, 0.3]],
    ['post-bicycle', '07 邮差车', [1.64, 0.047, 0.55], [1.5, 0.96, 0.5]],
    ['post-beacon', '08 灯塔', [2.16, 0.047, -0.9], [0.72, 2.58, 0.72]],
  ];
  const fixtures = new Map(), ghosts = new Map(), highlights = new Map();
  for (const [id, name, position, size] of zones) {
    const fixture = group(root, position, `restored-${id}`); fixtures.set(id, fixture);
    const ghost = group(root, position, `placeholder-${id}`); ghosts.set(id, ghost);
    const geometry = new THREE.BoxGeometry(...size), edges = new THREE.EdgesGeometry(geometry); geometry.dispose();
    const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#56786f', transparent: true, opacity: 0.4 }));
    outline.position.y = size[1] / 2; ghost.add(outline);
    const halo = ring(root, new THREE.MeshBasicMaterial({ color: '#e6bc69', transparent: true, opacity: 0, depthWrite: false }), Math.min(size[0], 0.85) * 0.62, 0.012, [position[0], position[1] + 0.008, position[2]], flat);
    halo.name = `chapter-highlight-${id}`; halo.castShadow = false; highlights.set(id, halo);
  }
  miniatureMailbox(fixtures.get('post-box'), colors);
  miniatureSorter(fixtures.get('post-sorter'), colors);
  miniatureStamp(fixtures.get('post-stamp'), colors);
  const typedPaper = miniatureTypewriter(fixtures.get('post-typewriter'), colors);
  miniatureParcel(fixtures.get('post-parcel'), colors);
  const radio = fixtures.get('post-radio');
  mesh(box(0.78, 0.04, 0.37), colors.wood, radio, [0, -0.01, 0]);
  const radioGlow = miniatureRadio(radio, colors);
  const bike = bicycleBody(fixtures.get('post-bicycle'), colors); bike.root.scale.setScalar(0.46);
  const front = wheel(bike.root, colors); front.position.set(1.03, 0.59, -0.06);
  basket(bike.root, colors).position.set(1.03, 1.405, -0.02);
  bell(bike.root, colors).root.position.set(0.69, 1.67, 0.245);
  const lighthouse = miniatureLighthouse(fixtures.get('post-beacon'), colors);
  registerAction(view, 'post-light-beacon', fixtures.get('post-beacon'));

  const letter = envelope(root, colors, [-0.87, 0.72, 0.72], 0.76); letter.name = 'post-overview-letter'; letter.rotation.x = -Math.PI / 2;
  registerAction(view, 'post-send-letter', letter);
  const sign = group(root, [-0.49, 0.047, 1.16], 'post-overview-open-sign');
  for (const x of [-0.24, 0.24]) mesh(box(0.035, 0.63, 0.035), colors.wood, sign, [x, 0.32, 0]);
  const signBoard = group(sign, [0, 0.51, 0], 'post-overview-sign-board');
  mesh(box(0.58, 0.26, 0.04, 0.016), colors.green, signBoard);
  const openFace = plaque(signBoard, 'OPEN', '海边来信 · 营业中', [0, 0, 0.025], [0.52, 0.2], '#fff4d8', '#527d72');
  const closedFace = plaque(signBoard, 'SEE YOU SOON', '正在收拾', [0, 0, -0.025], [0.52, 0.2], '#fff4d8', '#527d72'); closedFace.rotation.y = Math.PI;
  registerAction(view, 'post-open-sign', signBoard);
  plaque(root, '海边来信', 'LIGHTHOUSE POST · SEASON 03', [0, -0.055, 1.568], [1.43, 0.145]);
  const sunlight = new THREE.PointLight('#ffe0a0', 0, 8, 1.5); sunlight.position.set(-0.5, 3.2, 1.1); root.add(sunlight);
  const sunPatch = mesh(new THREE.PlaneGeometry(2.45, 1.8), new THREE.MeshBasicMaterial({ color: '#ffdb90', transparent: true, opacity: 0, depthWrite: false }), root, [-0.48, 0.048, 0.21], [-Math.PI / 2, 0, -0.23]); sunPatch.castShadow = false;
  const letterStart = new THREE.Vector3(-0.87, 0.72, 0.72), letterEnd = new THREE.Vector3(-2.05, 1.07, 0.948);
  return {
    update(dt, time, { before = false, stage = 'overview' } = {}) {
      const restored = view.state.seasonRestored || new Set(), chapter = view.state.chapterHighlights || new Set();
      for (const [id, fixture] of fixtures) {
        fixture.visible = !before && restored.has(id); ghosts.get(id).visible = !fixture.visible;
        const halo = highlights.get(id); halo.visible = fixture.visible && chapter.has(id);
        halo.material.opacity = halo.visible ? 0.48 + Math.sin(time * 1.6) * 0.12 : 0;
      }
      const preview = stage === 'overview' || view.state.shopPreview === true;
      const done = view.state.completed || stage === 'done';
      const value = (id) => before ? 0 : preview || done ? 1 : taskValue(view.state, id, false);
      const opened = value('post-open-curtain');
      curtains.forEach((panel, i) => { panel.scale.x = 1 - opened * 0.82; panel.position.x = (i ? 1 : -1) * (0.74 + opened * 0.61); panel.rotation.z = opened * Math.sin(time * 0.58 + i) * 0.016; });
      curtain.userData.openAmount = opened;
      const power = value('post-light-beacon') * Number(!before && restored.has('post-beacon'));
      lighthouse.beam.visible = power > 0; lighthouse.beam.rotation.y = -0.4 + time * 0.24;
      lighthouse.lamp.material.emissiveIntensity = power * 2.1; lighthouse.light.intensity = power * 1.25;
      radioGlow.material.emissiveIntensity = !before && restored.has('post-radio') ? 1.2 : 0;
      radioGlow.position.x = 0.14 + (!before ? Math.sin(time * 0.7) * 0.035 : 0);
      typedPaper.rotation.x = -0.1 + (!before ? opened * Math.sin(time * 0.55) * 0.022 : 0);
      const sent = value('post-send-letter');
      letter.visible = !before && restored.has('post-stamp') && restored.has('post-box') && sent < 1;
      letter.position.lerpVectors(letterStart, letterEnd, sent);
      letter.position.y += Math.sin(sent * Math.PI) * 0.65;
      letter.rotation.x = -Math.PI / 2 + sent * Math.PI / 2; letter.scale.setScalar(0.76 * (1 - Math.max(0, sent - 0.82) * 3.6));
      const signOpen = value('post-open-sign'); signBoard.rotation.y = Math.PI * (1 - signOpen);
      signBoard.rotation.z = signOpen && !before ? Math.sin(time * 0.9) * 0.022 : 0;
      sunlight.intensity = opened * 0.85; sunPatch.material.opacity = opened * 0.12;
      bike.crank.rotation.z = !before && restored.has('post-bicycle') ? -Math.sin(time * 0.3) * 0.06 : 0;
      openFace.visible = true;
    },
  };
}

export function buildPostFinaleScene(view) {
  if (view.level.id === 'post-bicycle') return bicycle(view);
  if (view.level.id === 'post-beacon') return beacon(view);
  if (view.level.id === 'post-opening') return overview(view);
  throw new Error(`Unknown post finale level: ${view.level.id}`);
}
