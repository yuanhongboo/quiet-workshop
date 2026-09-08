import * as THREE from 'three';
import { box, mat, mesh, tube, label, weave, registerItem, registerAction } from './season-scene-kit.mjs';

const flat = [-Math.PI / 2, 0, 0];
const unit = (n) => Math.max(0, Math.min(1, n));
const group = (parent, position = [0, 0, 0]) => {
  const object = new THREE.Group();
  object.position.set(...position);
  parent.add(object);
  return object;
};
const cylinder = (parent, material, r, h, position, top = r) =>
  mesh(new THREE.CylinderGeometry(top, r, h, 40), material, parent, position);
const ring = (parent, material, radius, thickness, position, rotation = flat) =>
  mesh(new THREE.TorusGeometry(radius, thickness, 8, 48), material, parent, position, rotation);
const taskValue = (state, id, before) => before ? 0 : unit(state.taskValues?.[id] || 0);
function plaque(parent, text, small, position, size, color = '#687b64') {
  return mesh(new THREE.PlaneGeometry(...size), mat('#fffdf4', { map: label(text, small, color, '#eee5ce'), roughness: 0.8 }), parent, position);
}

function surfaces(view) {
  const linen = weave();
  for (const spec of view.level.surfaces) {
    const glass = spec.material === 'glass';
    const object = view.surface(spec.id, new THREE.PlaneGeometry(spec.width, spec.height), {
      color: spec.color,
      roughness: glass ? 0.1 : spec.material === 'linen' ? 0.96 : 0.35,
      clearcoat: glass ? 1 : 0.3,
      metalness: spec.material === 'metal' ? 0.72 : 0,
      ...(spec.material === 'wood' ? { map: view.wood } : {}),
      ...(spec.material === 'linen' ? { map: linen } : {}),
      ...(glass ? { transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide } : {}),
    }, spec.position, spec.rotation);
    if (glass && object) {
      // The same dirt mask controls opacity: a wiped area reveals the actual lamp
      // inside immediately, while the remaining grime stays visibly opaque.
      const compile = object.material.onBeforeCompile;
      object.material.onBeforeCompile = (shader, renderer) => {
        compile.call(object.material, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          'diffuseColor.a=mix(.11,.96,dirt);\n#include <roughnessmap_fragment>',
        );
      };
      object.material.customProgramCacheKey = () => `garden-glass-${spec.id}`;
    }
  }
  if (!view.level.surfaces.some((spec) => spec.material === 'linen')) linen.dispose();
}

function candle(parent, brass, wax) {
  const root = group(parent);
  cylinder(root, brass, 0.176, 0.052, [0, -0.202, 0]);
  cylinder(root, wax, 0.147, 0.4, [0, 0.01, 0]);
  cylinder(root, wax, 0.148, 0.018, [0, 0.211, 0], 0.125);
  cylinder(root, mat('#51422a', { roughness: 1 }), 0.009, 0.052, [0, 0.241, 0]);
  const glowMaterial = mat('#fff2bc', { emissive: '#ffb755', emissiveIntensity: 0, roughness: 0.3 });
  const flame = mesh(new THREE.SphereGeometry(0.036, 20, 14), glowMaterial, root, [0, 0.289, 0]);
  flame.scale.set(0.74, 1.65, 0.74);
  flame.name = 'lantern-flame';
  return { root, flame, glowMaterial };
}

function lantern(view) {
  const bronze = mat('#b29361', { metalness: 0.8, roughness: 0.3 });
  const enamel = mat('#617c70', { roughness: 0.27, clearcoat: 0.75 });
  const wax = mat('#eee0bb', { roughness: 0.7 });
  const glass = mat('#c7dfd0', { transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.09, side: THREE.DoubleSide });
  const root = group(view.scene, [-0.35, 0, -0.2]);
  mesh(box(1.13, 0.2, 1.04, 0.035), bronze, root, [0, 0.14, 0]);
  mesh(box(1.03, 0.055, 0.95, 0.022), enamel, root, [0, 0.263, 0]);
  for (const x of [-0.49, 0.49]) for (const z of [-0.425, 0.425]) {
    mesh(box(0.056, 1.07, 0.055, 0.01), bronze, root, [x, 0.79, z]);
    cylinder(root, bronze, 0.046, 0.07, [x, 1.295, z]);
    cylinder(root, enamel, 0.049, 0.09, [x, 0.045, z]);
  }
  for (const z of [-0.43, 0.43]) mesh(box(1.035, 0.045, 0.055), bronze, root, [0, 1.297, z]);
  for (const x of [-0.49, 0.49]) mesh(box(0.056, 0.045, 0.88), bronze, root, [x, 1.297, 0]);
  for (const x of [-0.456, 0.456]) {
    mesh(new THREE.PlaneGeometry(0.79, 0.94), glass, root, [x, 0.795, 0], [0, Math.PI / 2, 0]);
    tube([[x, 0.31, -0.38], [x, 0.79, 0], [x, 1.27, 0.38]], 0.006, bronze, root);
  }
  mesh(new THREE.PlaneGeometry(0.84, 0.94), glass, root, [0, 0.795, -0.422]);
  ring(root, bronze, 0.201, 0.014, [0, 0.294, 0]);
  mesh(box(0.97, 0.012, 0.94), mat('#d5cfb7', { map: weave(), roughness: 0.98 }), view.scene, [1.47, 0.001, -0.22]);
  plaque(view.scene, 'RAIN GARDEN', 'A SMALL LIGHT', [1.48, 0.019, -0.44], [0.49, 0.13]).rotation.set(...flat);

  const dial = group(root, [0.29, 0.137, 0.537]);
  mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.04, 32), enamel, dial, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(box(0.01, 0.05, 0.01, 0.002), wax, dial, [0, 0.017, 0.025]);
  registerAction(view, 'lantern-dim', dial);
  const testButton = group(root, [0, 0.137, 0.533]);
  mesh(new THREE.SphereGeometry(0.052, 24, 16), enamel, testButton);
  registerAction(view, 'lantern-test', testButton);
  const switchRoot = group(root, [-0.29, 0.137, 0.53]);
  mesh(box(0.073, 0.095, 0.025, 0.012), enamel, switchRoot);
  mesh(box(0.05, 0.043, 0.033, 0.008), wax, switchRoot, [0, 0.015, 0.02]);
  registerAction(view, 'lantern-light', switchRoot);
  const lamp = candle(new THREE.Group(), bronze, wax);
  registerItem(view, view.level.items[0], lamp.root);
  const cap = new THREE.Group();
  mesh(box(1.04, 0.045, 0.92), bronze, cap, [0, -0.119, 0]);
  mesh(new THREE.CylinderGeometry(0.25, 0.68, 0.255, 4), enamel, cap, [0, 0.017, 0], [0, Math.PI / 4, 0]);
  cylinder(cap, bronze, 0.118, 0.078, [0, 0.171, 0]);
  ring(cap, bronze, 0.136, 0.017, [0, 0.324, 0], [0, 0, 0]);
  for (const x of [-0.102, 0.102]) mesh(box(0.02, 0.05, 0.035, 0.003), bronze, cap, [x, 0.175, 0]);
  registerItem(view, view.level.items[1], cap);
  const light = new THREE.PointLight('#ffd094', 0, 5, 1.5);
  light.name = 'garden-lantern-light';
  light.position.set(-0.35, 0.84, -0.1);
  view.scene.add(light);
  const pool = mesh(new THREE.CircleGeometry(0.95, 56), new THREE.MeshBasicMaterial({ color: '#f7c579', transparent: true, opacity: 0, depthWrite: false }), view.scene, [-0.35, 0.006, 0.15], flat);
  pool.castShadow = false;
  surfaces(view);
  return {
    update(dt, time, { before = false } = {}) {
      const dim = before ? 20 : view.state.taskValues?.['lantern-dim'] ?? 20;
      dial.rotation.z = 2.1 - dim / 100 * 4.2;
      const tested = taskValue(view.state, 'lantern-test', before);
      const lit = taskValue(view.state, 'lantern-light', before);
      const power = before ? 0 : view.state.completed ? 1 : Math.max(tested * 0.8, lit);
      const breath = 1 + Math.sin(time * 2.1) * 0.025;
      lamp.flame.visible = power > 0.005;
      lamp.flame.scale.y = (1.6 + Math.sin(time * 4) * 0.05) * Math.max(0.1, power);
      lamp.glowMaterial.emissiveIntensity = power * 2.3 * breath;
      light.intensity = power * 1.4 * breath;
      pool.material.opacity = power * 0.15;
      switchRoot.rotation.x = lit ? -0.13 : 0.13;
    },
  };
}

function cushion(parent, fabric, seam) {
  const root = group(parent);
  mesh(box(0.76, 0.165, 0.63, 0.075), fabric, root);
  tube([[-0.29, 0.048, -0.27], [0.28, 0.048, -0.27], [0.34, 0.048, 0.22], [0.29, 0.048, 0.28], [-0.29, 0.048, 0.28], [-0.34, 0.048, -0.21], [-0.29, 0.048, -0.27]], 0.006, seam, root);
  for (const x of [-0.16, 0.16]) for (const z of [-0.14, 0.14]) {
    cylinder(root, seam, 0.018, 0.008, [x, 0.085, z]);
  }
  return root;
}

function bench(view) {
  const wood = mat('#bf9a71', { map: view.wood, roughness: 0.55, clearcoat: 0.27 });
  const endGrain = mat('#a5815f', { map: view.wood, roughness: 0.66 });
  const brass = mat('#b19769', { metalness: 0.75, roughness: 0.32 });
  const green = mat('#84927b', { map: weave(), roughness: 0.99, clearcoat: 0 });
  const seam = mat('#bbc0a4', { roughness: 1 });
  for (const x of [-1.61, 1.61]) {
    for (const z of [-0.47, 0.23]) mesh(box(0.115, 0.94, 0.12), wood, view.scene, [x, 0.47, z], [0, 0, x < 0 ? -0.025 : 0.025]);
    mesh(box(0.205, 0.09, 0.89, 0.025), wood, view.scene, [x + Math.sign(x) * 0.05, 0.935, -0.1]);
    mesh(box(0.12, 1.48, 0.12), wood, view.scene, [x, 0.74, -0.6]);
    mesh(box(0.13, 0.105, 0.76), endGrain, view.scene, [x, 0.36, -0.1]);
  }
  for (const z of [-0.6, 0.25]) mesh(box(3.3, 0.19, 0.074), endGrain, view.scene, [0, 0.455, z]);
  for (const z of [-0.407, 0.206]) mesh(box(3.07, 0.092, 0.31, 0.015), wood, view.scene, [0, 0.63, z]);
  mesh(box(3.07, 0.25, 0.095, 0.018), wood, view.scene, [0, 1.385, -0.585]);
  mesh(box(3.07, 0.14, 0.095, 0.018), wood, view.scene, [0, 0.855, -0.585]);
  for (const x of [-1.4, 1.4]) for (const y of [0.855, 1.385]) {
    mesh(new THREE.CircleGeometry(0.018, 20), brass, view.scene, [x, y, -0.533]);
  }
  const bolts = new Map();
  for (const [id, x] of [['bench-left-bolt', -1.66], ['bench-right-bolt', 1.66]]) {
    const bolt = group(view.scene, [x, 0.932, 0.36]);
    mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.052, 28), brass, bolt, [0, 0, 0], [Math.PI / 2, 0, 0]);
    mesh(box(0.074, 0.012, 0.008, 0.003), endGrain, bolt, [0, 0, 0.03]);
    registerAction(view, id, bolt);
    bolts.set(id, bolt);
  }
  let soft;
  for (const item of view.level.items) {
    const root = new THREE.Group();
    if (item.kind === 'garden-seat-slat') {
      mesh(box(...item.size, 0.015), wood, root);
      for (const x of [-1.4, 1.4]) cylinder(root, brass, 0.018, 0.008, [x, 0.048, 0]);
    } else if (item.kind === 'garden-back-slat') {
      mesh(box(...item.size, 0.014), wood, root);
      for (const x of [-1.4, 1.4]) mesh(new THREE.CircleGeometry(0.018, 20), brass, root, [x, 0, 0.039]);
    } else {
      soft = cushion(root, green, seam);
      soft.name = 'garden-bench-soft-cushion';
      registerAction(view, 'bench-cushion', soft);
    }
    registerItem(view, item, root);
  }
  // A folded throw remains attached to the left arm; seam curves make its edge readable.
  const throwRoot = group(view.scene, [-1.2, 0.725, -0.18]);
  mesh(box(0.52, 0.064, 0.5, 0.025), mat('#d7c9aa', { map: weave(), roughness: 1 }), throwRoot);
  for (let i = 0; i < 9; i++) tube([[-0.21 + i * 0.05, 0.025, 0.24], [-0.21 + i * 0.05, -0.02, 0.28], [-0.21 + i * 0.05, -0.12, 0.29]], 0.006, seam, throwRoot);
  surfaces(view);
  return {
    update(dt, time, { before = false } = {}) {
      for (const [id, bolt] of bolts) {
        const value = taskValue(view.state, id, before);
        bolt.rotation.z = value * Math.PI * 2 + (value ? 0 : 0.65);
        bolt.position.z = value ? 0.313 : 0.36;
      }
      const smooth = taskValue(view.state, 'bench-cushion', before);
      soft.scale.set(0.92 + smooth * 0.08, 0.75 + smooth * 0.3, 0.88 + smooth * 0.12);
      soft.rotation.z = (1 - smooth) * 0.085;
      soft.rotation.y = (1 - smooth) * -0.1;
    },
  };
}

function miniaturePlant(parent, position, scale = 1, color = '#be8e6e') {
  const root = group(parent, position);
  root.scale.setScalar(scale);
  const pot = mat(color, { roughness: 0.55, clearcoat: 0.25 });
  const soil = mat('#544c37', { roughness: 1 });
  const leaves = mat('#6f8c58', { roughness: 0.66 });
  cylinder(root, pot, 0.12, 0.22, [0, 0.11, 0], 0.16);
  ring(root, pot, 0.153, 0.018, [0, 0.218, 0]);
  cylinder(root, soil, 0.138, 0.012, [0, 0.214, 0]);
  const foliage = group(root, [0, 0.22, 0]);
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.4;
    const x = Math.cos(angle) * 0.15, z = Math.sin(angle) * 0.15, y = 0.12 + i % 3 * 0.085;
    tube([[0, 0, 0], [x * 0.3, y * 0.7, z * 0.3], [x, y, z]], 0.007, leaves, foliage);
    const leaf = mesh(new THREE.SphereGeometry(1, 12, 8), leaves, foliage, [x, y, z], [0.18, angle, -0.3]);
    leaf.scale.set(0.065, 0.018, 0.135);
  }
  return foliage;
}

function overview(view) {
  const garden = group(view.scene);
  garden.name = 'rain-garden-overview';
  const wood = mat('#b49a70', { map: view.wood, roughness: 0.68 });
  const pale = mat('#d8dbca', { roughness: 0.82 });
  const green = mat('#6e8774', { roughness: 0.42, metalness: 0.2 });
  const bronze = mat('#b39c6c', { metalness: 0.6, roughness: 0.35 });
  const glass = mat('#c8dfd4', { transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, roughness: 0.12 });
  const waterMat = mat('#86b8b1', { transparent: true, opacity: 0.8, roughness: 0.08, metalness: 0.2, clearcoat: 1 });
  mesh(box(4.65, 0.17, 2.7, 0.055), wood, garden, [0, -0.07, 0]);
  for (let x = 0; x < 9; x++) for (let z = 0; z < 5; z++)
    mesh(box(0.48, 0.027, 0.49, 0.007), (x + z) % 2 ? pale : mat('#c9cfc0', { roughness: 0.85 }), garden, [-1.99 + x * 0.498, 0.025, -1 + z * 0.508]);
  for (const x of [-2.2, -1.1, 0, 1.1, 2.2]) mesh(box(0.046, 1.96, 0.058, 0.008), green, garden, [x, 1.035, -1.2]);
  for (const y of [0.14, 1.02, 2.02]) mesh(box(4.45, 0.05, 0.067, 0.007), green, garden, [0, y, -1.2]);
  for (const x of [-2.2, 2.2]) {
    mesh(box(0.055, 1.65, 0.055), green, garden, [x, 0.85, 0.05]);
    tube([[x, 2.02, -1.2], [x, 2.02, -0.72], [x, 1.7, 0.05]], 0.025, green, garden);
    mesh(new THREE.PlaneGeometry(1.18, 1.55), glass, garden, [x, 0.94, -0.58], [0, Math.PI / 2, 0]);
  }
  const fixtures = new Map(), ghosts = new Map();
  const zones = [
    ['garden-pot', '01', '陶盆', [-1.7, 0.045, 0.53], [0.55, 0.8, 0.55]],
    ['garden-tools', '02', '工具', [-1.72, 0.045, -0.66], [0.8, 0.88, 0.51]],
    ['garden-seeds', '03', '育苗', [-0.54, 0.045, -0.72], [0.92, 0.64, 0.62]],
    ['garden-shelf', '04', '花架', [1.67, 0.045, -0.77], [0.86, 1.27, 0.5]],
    ['garden-glass', '05', '玻璃', [0.59, 1.16, -1.194], [1.97, 1.64, 0.04]],
    ['garden-fountain', '06', '流水', [0.1, 0.045, 0.6], [0.8, 0.84, 0.72]],
    ['garden-lantern', '07', '风灯', [-0.88, 1.48, -0.76], [0.34, 0.46, 0.32]],
    ['garden-bench', '08', '长椅', [1.5, 0.045, 0.52], [1.14, 0.71, 0.6]],
  ];
  for (const [id, number, name, position, size] of zones) {
    const fixture = group(garden, position);
    fixture.name = `restored-${id}`;
    fixtures.set(id, fixture);
    const ghost = group(garden, position);
    ghost.name = `placeholder-${id}`;
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), new THREE.LineBasicMaterial({ color: '#869780', transparent: true, opacity: 0.25 }));
    lines.position.y = ['garden-glass', 'garden-lantern'].includes(id) ? 0 : size[1] / 2;
    ghost.add(lines);
    const sign = plaque(ghost, `${number} ${name}`, '', [0, 0.035, 0.1], [0.44, 0.12]);
    if (!['garden-glass', 'garden-lantern'].includes(id)) sign.rotation.set(...flat);
    ghosts.set(id, ghost);
  }
  const foliage = [];
  const pot = fixtures.get('garden-pot');
  cylinder(pot, wood, 0.28, 0.15, [0, 0.085, 0]);
  foliage.push(miniaturePlant(pot, [0, 0.16, 0], 1.35, '#a5b7a0'));
  miniaturePlant(pot, [0.3, 0.02, 0.1], 0.52, '#ba926f');
  const tools = fixtures.get('garden-tools');
  mesh(box(0.83, 0.6, 0.47), wood, tools, [0, 0.32, 0]);
  mesh(box(0.9, 0.055, 0.54), pale, tools, [0, 0.65, 0]);
  for (const x of [-0.2, 0.2]) {
    mesh(box(0.35, 0.46, 0.024), green, tools, [x, 0.35, 0.25]);
    mesh(box(0.07, 0.02, 0.04), bronze, tools, [x, 0.46, 0.275]);
  }
  cylinder(tools, green, 0.11, 0.2, [-0.2, 0.78, 0]);
  tube([[-0.2, 0.79, 0], [-0.06, 0.81, 0], [0.02, 0.89, 0]], 0.017, green, tools);
  ring(tools, bronze, 0.094, 0.012, [-0.29, 0.8, 0], [0, 0, 0]);
  for (const x of [0.12, 0.27]) {
    mesh(box(0.023, 0.016, 0.21, 0.005), wood, tools, [x, 0.695, 0.02]);
    mesh(new THREE.SphereGeometry(1, 10, 8), bronze, tools, [x, 0.695, -0.105]).scale.set(0.04, 0.012, 0.06);
  }
  const seeds = fixtures.get('garden-seeds');
  mesh(box(0.94, 0.06, 0.61), wood, seeds, [0, 0.49, 0]);
  for (const x of [-0.36, 0.36]) for (const z of [-0.2, 0.2]) mesh(box(0.035, 0.47, 0.035), green, seeds, [x, 0.24, z]);
  mesh(box(0.77, 0.04, 0.41), green, seeds, [0, 0.54, 0]);
  for (const x of [-0.25, 0, 0.25]) for (const z of [-0.1, 0.1]) foliage.push(miniaturePlant(seeds, [x, 0.56, z], 0.31));
  const shelf = fixtures.get('garden-shelf');
  for (const x of [-0.38, 0.38]) for (const z of [-0.19, 0.19]) mesh(box(0.04, 1.25, 0.04), green, shelf, [x, 0.63, z]);
  for (const y of [0.18, 0.63, 1.08]) {
    mesh(box(0.83, 0.038, 0.48), wood, shelf, [0, y, 0]);
    foliage.push(miniaturePlant(shelf, [-0.2, y + 0.025, 0], 0.65, '#bba585'));
    foliage.push(miniaturePlant(shelf, [0.2, y + 0.025, 0], 0.52, '#a5b7a0'));
  }
  const glazing = fixtures.get('garden-glass');
  for (const x of [-0.51, 0.5]) for (const y of [-0.42, 0.42])
    mesh(new THREE.PlaneGeometry(0.97, 0.78), glass, glazing, [x, y, 0]);
  const roof = group(garden, [0, 2.025, -1.18]);
  roof.name = 'garden-opening-roof';
  for (const x of [-2.16, -1.08, 0, 1.08, 2.16]) mesh(box(0.032, 0.033, 1.03), green, roof, [x, 0, 0.48]);
  for (const z of [0, 0.98]) mesh(box(4.38, 0.035, 0.035), green, roof, [0, 0, z]);
  const roofGlass = mesh(new THREE.PlaneGeometry(4.3, 0.95), glass, roof, [0, 0.009, 0.49], flat);
  roofGlass.castShadow = false;
  const roofHandle = group(roof, [0, -0.055, 0.93]);
  tube([[-0.12, 0, 0], [-0.12, -0.08, 0], [0.12, -0.08, 0], [0.12, 0, 0]], 0.014, bronze, roofHandle);
  registerAction(view, 'garden-open-roof', roofHandle);
  const shade = group(garden, [0.09, 1.99, -1.14]);
  shade.name = 'garden-roller-shade';
  const cloth = mat('#d9ca9f', { map: weave(), side: THREE.DoubleSide, roughness: 1 });
  mesh(new THREE.PlaneGeometry(1.98, 1.24), cloth, shade, [0, -0.62, 0.009]);
  mesh(box(2.03, 0.035, 0.04), wood, shade, [0, -1.24, 0.009]);
  const rope = group(garden, [1.17, 1.88, -1.12]);
  tube([[0, 0, 0], [0.04, -0.74, 0.04], [0.06, -0.78, 0.07]], 0.008, bronze, rope);
  ring(rope, bronze, 0.032, 0.008, [0.06, -0.81, 0.07], [0, 0, 0]);
  registerAction(view, 'garden-open-shade', rope);
  const fountain = fixtures.get('garden-fountain');
  const stone = mat('#bebdaa', { roughness: 0.86 });
  cylinder(fountain, stone, 0.37, 0.13, [0, 0.09, 0]);
  ring(fountain, stone, 0.337, 0.038, [0, 0.178, 0]);
  const water = cylinder(fountain, waterMat, 0.299, 0.008, [0, 0.158, 0]);
  cylinder(fountain, stone, 0.095, 0.56, [0, 0.36, -0.1], 0.078);
  cylinder(fountain, stone, 0.23, 0.073, [0, 0.657, -0.1], 0.265);
  ring(fountain, stone, 0.255, 0.019, [0, 0.698, -0.1]);
  const stream = group(fountain);
  for (const x of [-0.13, 0.13]) cylinder(stream, waterMat, 0.009, 0.47, [x, 0.409, 0.06]);
  const ripples = [0.11, 0.19, 0.265].map((r) => ring(fountain, new THREE.MeshBasicMaterial({ color: '#d9efdf', transparent: true, opacity: 0.35, depthWrite: false }), r, 0.003, [0, 0.166, 0]));
  registerAction(view, 'garden-start-water', fountain);
  const lantern = fixtures.get('garden-lantern');
  mesh(box(0.28, 0.04, 0.25), bronze, lantern, [0, -0.18, 0]);
  for (const x of [-0.12, 0.12]) for (const z of [-0.1, 0.1]) mesh(box(0.014, 0.32, 0.014), bronze, lantern, [x, 0, z]);
  for (const z of [-0.105, 0.105]) mesh(new THREE.PlaneGeometry(0.23, 0.29), glass, lantern, [0, 0, z]);
  mesh(new THREE.CylinderGeometry(0.075, 0.2, 0.1, 4), green, lantern, [0, 0.19, 0], [0, Math.PI / 4, 0]);
  ring(lantern, bronze, 0.045, 0.008, [0, 0.29, 0], [0, 0, 0]);
  tube([[0, 0.33, 0], [0, 0.39, 0], [0, 0.39, -0.25]], 0.01, bronze, lantern);
  const lampMaterial = mat('#f1dfaf', { emissive: '#ffc579', emissiveIntensity: 0 });
  cylinder(lantern, lampMaterial, 0.056, 0.17, [0, -0.08, 0]);
  const lampLight = new THREE.PointLight('#ffd18d', 0, 3, 1.7);
  lampLight.position.set(0, 0, 0.1);
  lantern.add(lampLight);
  registerAction(view, 'garden-light-lantern', lantern);
  const bench = fixtures.get('garden-bench');
  for (const x of [-0.48, 0.48]) for (const z of [-0.2, 0.2]) mesh(box(0.055, 0.47, 0.055), wood, bench, [x, 0.25, z]);
  for (const z of [-0.2, 0, 0.2]) mesh(box(1.07, 0.041, 0.18), wood, bench, [0, 0.48, z]);
  for (const x of [-0.48, 0.48]) mesh(box(0.048, 0.7, 0.048), wood, bench, [x, 0.38, -0.23]);
  for (const y of [0.61, 0.76]) mesh(box(1.07, 0.105, 0.045), wood, bench, [0, y, -0.23]);
  const benchCushion = cushion(bench, mat('#93a187', { roughness: 1 }), pale);
  benchCushion.position.set(0.24, 0.54, 0.02);
  benchCushion.scale.setScalar(0.58);
  plaque(garden, '雨后花房', 'AFTER THE RAIN · SEASON 02', [0, -0.055, 1.36], [1.34, 0.14]);
  const sunlight = new THREE.PointLight('#ffe2a3', 0, 7, 1.5);
  sunlight.position.set(-0.6, 2.9, 0.8);
  garden.add(sunlight);
  const sunPatches = [];
  for (const x of [-0.77, 0.14, 1.05]) {
    const patch = mesh(new THREE.PlaneGeometry(0.64, 1.53), new THREE.MeshBasicMaterial({ color: '#ffe4a1', transparent: true, opacity: 0, depthWrite: false }), garden, [x, 0.047, 0.26], [-Math.PI / 2, 0, -0.27]);
    patch.castShadow = false;
    sunPatches.push(patch);
  }
  const motes = group(garden);
  const moteMat = new THREE.MeshBasicMaterial({ color: '#fff1bb', transparent: true, opacity: 0.6, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const mote = mesh(new THREE.SphereGeometry(0.007, 6, 4), moteMat, motes, [Math.sin(i * 2.1) * 1.2, 0.7 + i % 5 * 0.19, Math.cos(i * 1.4) * 0.7]);
    mote.castShadow = false;
  }
  return {
    update(dt, time, { before = false, stage = 'overview' } = {}) {
      const restored = view.state.seasonRestored || new Set();
      for (const [id, fixture] of fixtures) {
        fixture.visible = !before && restored.has(id);
        ghosts.get(id).visible = !fixture.visible;
      }
      const preview = stage === 'overview' || view.state.shopPreview === true;
      const done = view.state.completed || stage === 'done';
      const value = (id) => before ? 0 : (preview || done) ? 1 : taskValue(view.state, id, false);
      const roofOpen = value('garden-open-roof');
      roof.rotation.x = -0.27 - roofOpen * 0.5;
      roofGlass.visible = !before && restored.has('garden-glass');
      const shadeOpen = value('garden-open-shade');
      shade.scale.y = 1 - shadeOpen * 0.94;
      const flowing = value('garden-start-water') > 0 && restored.has('garden-fountain');
      stream.visible = flowing;
      water.material.roughness = flowing ? 0.09 : 0.26;
      for (let i = 0; i < ripples.length; i++) {
        ripples[i].visible = flowing;
        const t = (time * 0.35 + i / ripples.length) % 1;
        ripples[i].scale.setScalar(0.5 + t * 0.5);
        ripples[i].material.opacity = (1 - t) * 0.43;
      }
      const lit = value('garden-light-lantern') * Number(restored.has('garden-lantern'));
      lampMaterial.emissiveIntensity = lit * 1.4;
      lampLight.intensity = lit * 0.62;
      sunlight.intensity = shadeOpen * 1.1;
      for (const patch of sunPatches) patch.material.opacity = shadeOpen * 0.17;
      motes.visible = !before && shadeOpen > 0.1;
      motes.rotation.y = Math.sin(time * 0.12) * 0.1;
      for (let i = 0; i < foliage.length; i++) foliage[i].rotation.z = before ? 0 : Math.sin(time * 0.75 + i * 0.9) * 0.035 * roofOpen;
    },
  };
}

export function buildGardenFinaleScene(view) {
  if (view.level.id === 'garden-lantern') return lantern(view);
  if (view.level.id === 'garden-bench') return bench(view);
  if (view.level.id === 'garden-awakening') return overview(view);
  throw new Error(`Unknown garden finale level: ${view.level.id}`);
}
