import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTexture } from './materials.mjs';
import { registerAction, steam } from './season-scene-kit.mjs';

const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const box = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 2, r);
const mat = (color, settings = {}) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.55,
    clearcoat: 0.1,
    ...settings,
  });
function mesh(geometry, material, parent, position = [0, 0, 0], rotation) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}
function group(parent, position = [0, 0, 0], rotation) {
  const object = new THREE.Group();
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  parent.add(object);
  return object;
}
function cylinder(parent, radius, height, material, position, radiusTop = radius) {
  return mesh(
    new THREE.CylinderGeometry(radiusTop, radius, height, 28),
    material,
    parent,
    position,
  );
}
function tube(parent, points, radius, material) {
  return mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      16,
      radius,
      8,
      false,
    ),
    material,
    parent,
  );
}
function label(text, small = '', background = '#f0e9d7', ink = '#405047') {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = ink;
      ctx.font = '500 49px Georgia, "Songti SC", serif';
      ctx.fillText(text, w / 2, small ? h * 0.49 : h * 0.65);
      if (small) {
        ctx.font = '16px sans-serif';
        ctx.fillText(small, w / 2, h * 0.79);
      }
    },
    512,
    160,
  );
}
function plaque(parent, text, small, position, width, height, settings = {}) {
  return mesh(
    new THREE.PlaneGeometry(width, height),
    mat('#ffffff', {
      map: label(text, small, settings.background, settings.ink),
      roughness: 0.9,
      ...settings.material,
    }),
    parent,
    position,
    settings.rotation,
  );
}
function clockFace() {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#ede5cc';
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      for (let i = 0; i < 60; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 30);
        ctx.fillStyle = '#645d48';
        ctx.fillRect(-2, -w * 0.45, i % 5 ? 2 : 4, i % 5 ? 8 : 17);
        ctx.restore();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#756e57';
      ctx.font = '23px Georgia';
      ctx.fillText('QUIET HOURS', 0, 66);
    },
    256,
    256,
  );
}
function floorTexture() {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#dfc39a';
      ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 10; row++) {
        const y = (row * h) / 10;
        ctx.fillStyle = row % 2 ? '#e4ccaa' : '#dbc19c';
        ctx.fillRect(0, y, w, h / 10 - 2);
        ctx.strokeStyle = '#9f815c30';
        ctx.lineWidth = 1;
        for (let grain = 0; grain < 6; grain++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 32) {
            const yy = y + grain * 8 + 7 + Math.sin(x / 90 + row) * 1.8;
            x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
          }
          ctx.stroke();
        }
        const seam = ((row * 193) % 510) + 170;
        ctx.fillStyle = '#9e805b55';
        ctx.fillRect(seam, y, 2, h / 10);
      }
    },
    1024,
    512,
  );
}
function cup(parent, position, ceramic, tea, radius = 0.095) {
  const object = group(parent, position);
  cylinder(object, radius * 0.78, 0.105, ceramic, [0, 0.055, 0], radius);
  cylinder(object, radius * 0.84, 0.004, tea, [0, 0.108, 0]);
  mesh(new THREE.TorusGeometry(radius * 0.44, 0.014, 8, 18), ceramic, object, [radius, 0.07, 0]);
  return object;
}

/** A persistent miniature shop. Each restoration owns one visible vignette. */
export function buildShopScene(view) {
  const shop = group(view.scene);
  const wood = mat('#d2ad7c', { map: view.wood, roughness: 0.52 });
  const darkWood = mat('#8c6747', { map: view.wood, roughness: 0.55 });
  const wall = mat('#eee5d3', { roughness: 0.94, clearcoat: 0 });
  const panel = mat('#99ad99', { roughness: 0.72 });
  const green = mat('#6f9782', { roughness: 0.32, clearcoat: 0.8 });
  const cream = mat('#f1e8d5', { roughness: 0.25, clearcoat: 0.65 });
  const brass = mat('#bc9863', { metalness: 0.85, roughness: 0.32 });
  const chrome = mat('#bcc4bd', { metalness: 0.9, roughness: 0.25 });
  const ink = mat('#323c35', { roughness: 0.43 });
  const coffeeMat = mat('#644127', { roughness: 0.19 });
  const fabric = mat('#d3b981', { roughness: 0.97, clearcoat: 0 });
  const fixtures = new Map();
  const ghosts = new Map();

  mesh(box(5.7, 0.19, 3.3, 0.06), darkWood, shop, [0, -0.1, 0]);
  mesh(
    box(5.58, 0.045, 3.18),
    mat('#ffffff', { map: floorTexture(), roughness: 0.8 }),
    shop,
    [0, 0.011, 0],
  );
  mesh(box(5.63, 2.65, 0.12), wall, shop, [0, 1.325, -1.58]);
  mesh(box(0.12, 2.65, 2.04), wall, shop, [-2.76, 1.325, -0.59]);
  mesh(box(5.53, 0.71, 0.036), panel, shop, [0, 0.375, -1.51]);
  mesh(box(0.037, 0.71, 1.96), panel, shop, [-2.69, 0.375, -0.59]);
  mesh(box(5.6, 0.055, 0.06), wood, shop, [0, 0.75, -1.49]);
  mesh(box(0.065, 0.055, 2.02), wood, shop, [-2.68, 0.75, -0.57]);
  mesh(box(5.67, 0.085, 0.14), wood, shop, [0, 2.63, -1.56]);
  mesh(box(0.14, 0.085, 2.07), wood, shop, [-2.76, 2.63, -0.57]);
  // One print and two pegs belong to the building, so the empty shop feels inhabited.
  plaque(shop, '街角旧店', 'A LITTLE RESET · EST. 1986', [-0.3, 2.23, -1.505], 1.45, 0.45, {
    background: '#eee5d3',
    ink: '#968368',
  });
  for (const x of [-2.15, -1.98]) cylinder(shop, 0.025, 0.06, brass, [x, 1.7, -1.45]);

  const zones = [
    ['coffee', '01', '咖啡角', [-1.63, 0.08, -0.94], [1.12, 0.83, 0.77]],
    ['desk', '02', '书桌', [-1.86, 0.08, 0.37], [1.05, 0.67, 0.69]],
    ['tea', '03', '茶席', [0.1, 0.08, 0.49], [1.0, 0.65, 0.8]],
    ['record', '04', '唱片角', [0.18, 0.08, -1.03], [1.5, 0.76, 0.61]],
    ['plant', '05', '绿植台', [2.22, 0.08, 0.72], [0.54, 0.64, 0.56]],
    ['clock', '06', '旧挂钟', [-0.79, 1.8, -1.43], [0.45, 0.54, 0.08]],
    ['window', '07', '窗边座位', [1.92, 0.08, -0.9], [1.15, 0.51, 0.63]],
    ['sign', '08', '门口招牌', [-2.19, 2.04, 1.02], [1.2, 0.33, 0.07]],
  ];
  for (const [id, number, name, position, size] of zones) {
    const restored = group(shop);
    restored.name = `restored-${id}`;
    fixtures.set(id, restored);
    const placeholder = group(shop, position);
    placeholder.name = `placeholder-${id}`;
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),
      new THREE.LineBasicMaterial({ color: '#aaa48d', transparent: true, opacity: 0.29 }),
    );
    outline.position.y = ['clock', 'sign'].includes(id) ? 0 : size[1] / 2;
    placeholder.add(outline);
    plaque(
      placeholder,
      `${number}  ${name}`,
      '',
      ['clock', 'sign'].includes(id) ? [0, 0, size[2] / 2 + 0.008] : [0, 0.015, 0],
      ['clock', 'sign'].includes(id) ? Math.min(size[0], 1.0) : 0.6,
      ['clock', 'sign'].includes(id) ? 0.17 : 0.19,
      {
        background: '#e4dac5',
        ink: '#9c947d',
        rotation: ['clock', 'sign'].includes(id) ? undefined : [-Math.PI / 2, 0, 0],
      },
    );
    ghosts.set(id, placeholder);
  }

  // 01. Coffee corner: enamel machine, walnut counter, one waiting cup.
  const coffee = group(fixtures.get('coffee'), [-1.63, 0.035, -0.94]);
  mesh(box(1.12, 0.75, 0.74), wood, coffee, [0, 0.375, 0]);
  mesh(box(1.2, 0.07, 0.83), cream, coffee, [0, 0.79, 0]);
  for (const x of [-0.27, 0.27]) {
    mesh(box(0.49, 0.56, 0.025), panel, coffee, [x, 0.39, 0.385]);
    mesh(box(0.13, 0.025, 0.055), brass, coffee, [x, 0.58, 0.415]);
  }
  const machine = group(coffee, [-0.08, 0.84, -0.055]);
  mesh(box(0.61, 0.53, 0.38, 0.055), green, machine, [0, 0.265, -0.035]);
  mesh(box(0.55, 0.19, 0.045), cream, machine, [0, 0.355, 0.178]);
  mesh(new THREE.CircleGeometry(0.066, 28), cream, machine, [-0.14, 0.39, 0.204]);
  mesh(box(0.006, 0.045, 0.005), ink, machine, [-0.14, 0.401, 0.209], [0, 0, -0.6]);
  mesh(box(0.3, 0.055, 0.1), chrome, machine, [0, 0.22, 0.21]);
  mesh(box(0.075, 0.06, 0.24), darkWood, machine, [0, 0.22, 0.32]);
  mesh(box(0.56, 0.055, 0.46), chrome, machine, [0, 0.035, 0.11]);
  for (let i = 0; i < 6; i++)
    mesh(box(0.39, 0.008, 0.013, 0.002), ink, machine, [0, 0.066, -0.06 + i * 0.052]);
  const coffeePower = mat('#d7b574', { emissive: '#ffca76', emissiveIntensity: 0 });
  mesh(new THREE.CircleGeometry(0.025, 18), coffeePower, machine, [0.18, 0.37, 0.205]);
  const firstCup = cup(machine, [0, 0.069, 0.19], cream, coffeeMat, 0.088);
  const cupSurface = firstCup.children[1];
  const pourStream = cylinder(machine, 0.006, 0.085, coffeeMat, [0, 0.22, 0.19]);
  pourStream.visible = false;
  registerAction(view, 'opening-coffee', machine);

  // 02. Reading desk: the three restored volumes and their repaired light.
  const desk = group(fixtures.get('desk'), [-1.86, 0.035, 0.37]);
  mesh(box(1.09, 0.065, 0.69), wood, desk, [0, 0.66, 0]);
  for (const x of [-0.43, 0.43])
    for (const z of [-0.24, 0.24]) mesh(box(0.055, 0.64, 0.055), darkWood, desk, [x, 0.32, z]);
  mesh(box(0.55, 0.011, 0.38), mat('#72918c', { roughness: 0.95 }), desk, [-0.03, 0.7, 0.06]);
  const bookColors = ['#9aafbd', '#d4b577', '#99ac91'];
  for (let i = 0; i < 3; i++) {
    mesh(box(0.105, 0.32 + i * 0.015, 0.25, 0.007), mat(bookColors[i]), desk, [
      -0.29 + i * 0.12,
      0.87,
      -0.19,
    ]);
    plaque(desk, `0${i + 1}`, '', [-0.29 + i * 0.12, 0.865, -0.06], 0.08, 0.08, {
      background: bookColors[i],
      ink: '#f9f1db',
    });
  }
  mesh(box(0.21, 0.012, 0.29, 0.005), cream, desk, [-0.06, 0.713, 0.13], [0, -0.17, 0]);
  const lamp = group(desk, [0.31, 0.7, -0.08]);
  cylinder(lamp, 0.115, 0.025, green, [0, 0.015, 0]);
  tube(
    lamp,
    [
      [0, 0.025, 0],
      [0.01, 0.26, 0],
      [-0.12, 0.42, 0],
      [-0.19, 0.43, 0.01],
    ],
    0.015,
    brass,
  );
  const shade = group(lamp, [-0.19, 0.4, 0.025], [0, 0, -0.18]);
  cylinder(shade, 0.135, 0.14, green, [0, 0, 0], 0.075);
  const bulbMat = mat('#dfdac0', { emissive: '#ffc56b', emissiveIntensity: 0 });
  mesh(new THREE.SphereGeometry(0.057, 18, 10), bulbMat, shade, [0, -0.055, 0]);
  const readingLight = new THREE.PointLight('#ffd08a', 0, 2.4, 1.7);
  readingLight.position.set(-0.19, 0.32, 0.03);
  lamp.add(readingLight);
  const deskGlow = mesh(
    new THREE.CircleGeometry(0.23, 32),
    new THREE.MeshBasicMaterial({
      color: '#ffdb97',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    desk,
    [0.1, 0.719, 0.06],
    [-Math.PI / 2, 0, 0],
  );
  deskGlow.castShadow = false;
  registerAction(view, 'opening-lamp', lamp);
  const stool = group(desk, [0, 0, 0.6]);
  cylinder(stool, 0.2, 0.07, fabric, [0, 0.39, 0]);
  for (const x of [-0.12, 0.12])
    for (const z of [-0.12, 0.12]) mesh(box(0.04, 0.36, 0.04), darkWood, stool, [x, 0.18, z]);

  // 03. Tea table: the careful symmetry is still visible at miniature scale.
  const tea = group(fixtures.get('tea'), [0.1, 0.035, 0.49]);
  cylinder(tea, 0.55, 0.075, wood, [0, 0.63, 0]);
  cylinder(tea, 0.2, 0.6, darkWood, [0, 0.3, 0], 0.12);
  cylinder(tea, 0.32, 0.035, darkWood, [0, 0.05, 0]);
  mesh(box(0.65, 0.027, 0.39), mat('#a9804b', { map: view.wood }), tea, [0, 0.685, 0]);
  const teaMat = mat('#ad7435', { roughness: 0.18 });
  cup(tea, [-0.2, 0.7, 0.05], cream, teaMat, 0.056);
  cup(tea, [0.2, 0.7, 0.05], cream, teaMat, 0.056);
  cylinder(tea, 0.07, 0.1, cream, [0, 0.75, -0.04], 0.104);
  cylinder(tea, 0.11, 0.023, cream, [0, 0.81, -0.04], 0.083);
  mesh(new THREE.SphereGeometry(0.023, 12, 8), brass, tea, [0, 0.836, -0.04]);
  mesh(box(0.25, 0.012, 0.035), darkWood, tea, [0, 0.707, 0.15], [0, -0.18, 0]);
  for (const x of [-0.63, 0.63]) {
    cylinder(tea, 0.185, 0.07, fabric, [x, 0.36, 0.14]);
    for (const z of [0.03, 0.25]) mesh(box(0.035, 0.33, 0.035), darkWood, tea, [x, 0.165, z]);
  }

  // 04. Record console: rotation, tonearm and a softly lit amplifier.
  const record = group(fixtures.get('record'), [0.18, 0.035, -1.03]);
  mesh(box(1.46, 0.57, 0.59), wood, record, [0, 0.43, 0]);
  for (const x of [-0.61, 0.61])
    for (const z of [-0.2, 0.2]) mesh(box(0.055, 0.16, 0.055), darkWood, record, [x, 0.08, z]);
  mesh(box(1.32, 0.42, 0.025), darkWood, record, [0, 0.44, 0.31]);
  for (let i = 0; i < 7; i++)
    mesh(
      box(0.065, 0.33 + (i % 3) * 0.015, 0.035, 0.004),
      mat(bookColors[i % 3]),
      record,
      [-0.53 + i * 0.08, 0.43, 0.335],
      [0, 0, i === 6 ? -0.12 : 0],
    );
  mesh(box(0.49, 0.3, 0.035), ink, record, [0.38, 0.43, 0.339]);
  const speakerMap = canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#5b6258';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#292f29';
      for (let y = 3; y < h; y += 8) for (let x = 3; x < w; x += 8) ctx.fillRect(x, y, 2, 2);
    },
    128,
    128,
  );
  mesh(
    new THREE.PlaneGeometry(0.41, 0.25),
    mat('#ffffff', { map: speakerMap }),
    record,
    [0.38, 0.43, 0.36],
  );
  const turntable = group(record, [-0.04, 0.745, 0]);
  mesh(box(0.92, 0.08, 0.48), darkWood, turntable, [0, 0.04, 0]);
  mesh(box(0.87, 0.008, 0.435), chrome, turntable, [0, 0.084, 0]);
  const disc = cylinder(turntable, 0.193, 0.012, ink, [-0.16, 0.098, 0]);
  const discTop = group(disc, [0, 0.009, 0]);
  for (const radius of [0.08, 0.115, 0.15, 0.18])
    mesh(
      new THREE.TorusGeometry(radius, 0.0014, 3, 36),
      chrome,
      discTop,
      [0, 0, 0],
      [-Math.PI / 2, 0, 0],
    );
  cylinder(discTop, 0.068, 0.005, mat('#b78d64'), [0, 0.001, 0]);
  mesh(box(0.058, 0.003, 0.006, 0.001), cream, discTop, [0.003, 0.006, 0]);
  const tonearm = group(turntable, [0.2, 0.14, -0.14]);
  cylinder(tonearm, 0.034, 0.09, brass, [0, 0, 0]);
  tube(
    tonearm,
    [
      [0, 0.05, 0],
      [0.012, 0.05, 0.16],
      [-0.14, 0.03, 0.265],
    ],
    0.012,
    chrome,
  );
  mesh(box(0.037, 0.035, 0.06), ink, tonearm, [-0.14, 0.02, 0.27], [0, -0.4, 0]);
  const recordLedMat = mat('#678a74', { emissive: '#aad98b', emissiveIntensity: 0 });
  mesh(new THREE.SphereGeometry(0.012, 10, 6), recordLedMat, turntable, [0.33, 0.09, 0.16]);
  registerAction(view, 'opening-music', turntable);

  // 05. Two living plants, with broad shaped leaves instead of particle foliage.
  const plants = group(fixtures.get('plant'), [2.22, 0.035, 0.72]);
  const terracotta = mat('#be8867', { roughness: 0.85 });
  cylinder(plants, 0.17, 0.3, terracotta, [0, 0.15, 0], 0.205);
  cylinder(plants, 0.206, 0.034, terracotta, [0, 0.297, 0]);
  cylinder(plants, 0.18, 0.005, mat('#534534', { roughness: 1 }), [0, 0.313, 0]);
  const leafGeo = new THREE.SphereGeometry(1, 12, 8);
  const leafMats = [mat('#719567', { roughness: 0.65 }), mat('#496f50', { roughness: 0.65 })];
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4,
      reach = 0.18 + (i % 3) * 0.055,
      height = 0.53 + (i % 4) * 0.13;
    const tip = [Math.cos(angle) * reach, height, Math.sin(angle) * reach];
    tube(
      plants,
      [[0, 0.3, 0], [tip[0] * 0.4, height * 0.8, tip[2] * 0.4], tip],
      0.006,
      leafMats[1],
    );
    const leaf = mesh(leafGeo, leafMats[i % 2], plants, tip, [0.2, angle, -0.5]);
    leaf.scale.set(0.095, 0.025, 0.2);
  }
  cylinder(plants, 0.095, 0.17, cream, [-0.29, 0.087, 0.18], 0.105);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const leaf = mesh(
      leafGeo,
      leafMats[i % 2],
      plants,
      [-0.29 + Math.cos(angle) * 0.065, 0.22, 0.18 + Math.sin(angle) * 0.065],
      [0.2, angle, 0.3],
    );
    leaf.scale.set(0.045, 0.018, 0.095);
  }

  // 06. Pendulum clock, with its restored face and second hand.
  const clock = group(fixtures.get('clock'), [-0.79, 1.92, -1.43]);
  mesh(box(0.46, 0.77, 0.12, 0.04), darkWood, clock, [0, -0.1, 0]);
  mesh(
    new THREE.CircleGeometry(0.19, 48),
    mat('#ffffff', { map: clockFace(), roughness: 0.8 }),
    clock,
    [0, 0.055, 0.067],
  );
  mesh(new THREE.TorusGeometry(0.195, 0.012, 8, 48), brass, clock, [0, 0.055, 0.076]);
  mesh(box(0.012, 0.12, 0.005, 0.001), ink, clock, [-0.041, 0.082, 0.086], [0, 0, -1]);
  mesh(box(0.008, 0.17, 0.005, 0.001), ink, clock, [0.025, 0.126, 0.091], [0, 0, -0.32]);
  const seconds = group(clock, [0, 0.055, 0.097]);
  mesh(box(0.003, 0.175, 0.003, 0.0005), mat('#a9674f'), seconds, [0, 0.075, 0]);
  mesh(box(0.2, 0.22, 0.015), ink, clock, [0, -0.3, 0.068]);
  const pendulum = group(clock, [0, -0.17, 0.09]);
  mesh(box(0.01, 0.155, 0.009, 0.002), brass, pendulum, [0, -0.075, 0]);
  mesh(new THREE.CircleGeometry(0.055, 24), brass, pendulum, [0, -0.17, 0.007]);

  // 07. Window nook: framed blue daylight, a linen bench and a small cushion.
  const window = group(fixtures.get('window'), [1.92, 0.035, -0.9]);
  const skyTexture = canvasTexture(
    (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#bdd4d2');
      sky.addColorStop(1, '#f5eed7');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#95b5a090';
      for (const [x, y, r] of [
        [40, 225, 90],
        [150, 260, 70],
        [246, 196, 55],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    256,
    256,
  );
  mesh(
    new THREE.PlaneGeometry(1.27, 1.34),
    mat('#ffffff', { map: skyTexture, emissive: '#d8dfc6', emissiveIntensity: 0.13 }),
    window,
    [0, 1.83, -0.603],
  );
  for (const x of [-0.66, 0, 0.66]) mesh(box(0.046, 1.42, 0.075), cream, window, [x, 1.83, -0.55]);
  for (const y of [1.13, 1.84, 2.53]) mesh(box(1.37, 0.045, 0.075), cream, window, [0, y, -0.55]);
  mesh(box(1.44, 0.065, 0.24), wood, window, [0, 1.07, -0.47]);
  mesh(box(1.23, 0.43, 0.62), wood, window, [0, 0.24, 0]);
  mesh(box(1.19, 0.085, 0.56, 0.04), fabric, window, [0, 0.495, 0]);
  mesh(
    box(0.3, 0.28, 0.13, 0.055),
    mat('#7d9a8c', { roughness: 1 }),
    window,
    [-0.29, 0.65, -0.16],
    [0.1, 0.18, 0.2],
  );
  for (const x of [-0.39, 0.39]) mesh(box(0.49, 0.3, 0.025), panel, window, [x, 0.255, 0.322]);
  mesh(box(0.2, 0.025, 0.26, 0.01), cream, window, [0.2, 0.55, 0.06], [0, 0.2, 0]);

  // Entry stays part of the architecture. Only the restored sign joins in level 08.
  const entry = group(shop, [-2.72, 0.035, 1.04]);
  for (const x of [0, 1.08]) mesh(box(0.062, 1.89, 0.065), darkWood, entry, [x, 0.945, 0]);
  mesh(box(1.15, 0.06, 0.09), wood, entry, [0.54, 1.91, 0]);
  const door = group(entry, [0.045, 0.015, 0]);
  door.name = 'shop-door';
  const glass = mat('#c5d8c7', {
    transparent: true,
    opacity: 0.12,
    roughness: 0.1,
    metalness: 0.05,
    depthWrite: false,
  });
  const doorGlass = mesh(box(0.94, 1.64, 0.012), glass, door, [0.495, 0.88, 0]);
  doorGlass.castShadow = false;
  for (const x of [0.02, 0.97]) mesh(box(0.045, 1.82, 0.043), green, door, [x, 0.91, 0]);
  for (const y of [0.04, 0.37, 1.78]) mesh(box(1, 0.043, 0.043), green, door, [0.495, y, 0]);
  mesh(box(0.018, 0.14, 0.045, 0.006), brass, door, [0.86, 0.89, 0.05]);
  const doorTag = plaque(door, 'CLOSED', '', [0.51, 1.25, 0.035], 0.31, 0.1, {
    background: '#f0e6d2',
    ink: '#697968',
  });
  const openTagTexture = label('OPEN', '', '#f0e6d2', '#597d65');
  const closedTagTexture = doorTag.material.map;
  // The inactive map is released by the scene's dispose hook below.
  const sign = group(fixtures.get('sign'), [-2.19, 2.065, 1.04]);
  mesh(box(1.3, 0.36, 0.07, 0.035), darkWood, sign);
  const signMat = mat('#ffffff', {
    map: label('好好收拾', 'THE CORNER SHOP', '#63856f', '#fff0cb'),
    emissive: '#cdb079',
    emissiveIntensity: 0,
  });
  mesh(new THREE.PlaneGeometry(1.21, 0.29), signMat, sign, [0, 0, 0.041]);
  for (const x of [-0.4, 0.4])
    tube(
      sign,
      [
        [x, 0.1, -0.025],
        [x, 0.24, 0.04],
        [x, 0.23, 0.1],
      ],
      0.009,
      brass,
    );
  const signLight = new THREE.PointLight('#ffd394', 0, 2.8, 1.8);
  signLight.position.set(0, 0.13, 0.27);
  sign.add(signLight);
  const welcome = plaque(
    shop,
    'WELCOME BACK',
    'YOUR LITTLE CORNER',
    [-1.99, 0.042, 1.37],
    0.88,
    0.24,
    { background: '#9c8665', ink: '#ebe0be', rotation: [-Math.PI / 2, 0, 0] },
  );
  const floorGlow = mesh(
    new THREE.PlaneGeometry(2.45, 2.06),
    new THREE.MeshBasicMaterial({
      color: '#ffd88f',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    shop,
    [-1.2, 0.042, 0.43],
    [-Math.PI / 2, 0, -0.24],
  );
  floorGlow.castShadow = false;
  const entranceLight = new THREE.PointLight('#ffda9d', 0, 6, 2);
  entranceLight.position.set(-1.7, 2.1, 1.8);
  shop.add(entranceLight);

  let fill = 0;
  let completion = 0;
  let tagOpen = false;
  const steamPosition = new THREE.Vector3();
  return {
    update(dt, time, { before = false, stage = 'overview', actionId = null } = {}) {
      const restored = view.state.seasonRestored || new Set();
      for (const [id, vignette] of fixtures) {
        const visible = !before && restored.has(id);
        vignette.visible = visible;
        ghosts.get(id).visible = !visible;
      }
      const preview = stage === 'overview' || view.state.shopPreview === true;
      const done = view.state.completed || stage === 'done';
      const task = (id) => !before && (preview || done || (view.state.taskValues?.[id] || 0) >= 1);
      const lampOn = task('opening-lamp') && restored.has('desk');
      const musicOn = task('opening-music') && restored.has('record');
      const coffeeOn = task('opening-coffee') && restored.has('coffee');
      readingLight.intensity = lampOn ? 0.6 : 0;
      bulbMat.emissiveIntensity = lampOn ? 1.5 : 0;
      deskGlow.material.opacity = lampOn ? 0.2 : 0;
      recordLedMat.emissiveIntensity = musicOn ? 1.8 : 0;
      coffeePower.emissiveIntensity = coffeeOn ? 1.6 : 0;
      if (musicOn) disc.rotation.y -= (dt * Math.PI * 100) / 90;
      tonearm.rotation.y += ((musicOn ? -0.3 : 0.34) - tonearm.rotation.y) * Math.min(dt * 3, 1);
      const targetFill = coffeeOn ? 1 : 0;
      fill = before ? 0 : fill + (targetFill - fill) * Math.min(dt * 1.3, 1);
      cupSurface.visible = fill > 0.02;
      cupSurface.position.y = 0.035 + fill * 0.073;
      pourStream.visible = coffeeOn && fill < 0.96 && !preview;
      if (coffeeOn && fill > 0.6 && !before) {
        firstCup.getWorldPosition(steamPosition);
        steamPosition.y += 0.12;
        steam(view, steamPosition.toArray(), dt * 0.7);
      }
      if (restored.has('clock') && !before) {
        pendulum.rotation.z = Math.sin(time * Math.PI * 1.45) * 0.19;
        seconds.rotation.z = (-time * Math.PI) / 30;
      }
      const raw = before ? 0 : done ? 1 : clamp((view.state.brewTime || 0) / 6);
      completion = before ? 0 : completion + (raw - completion) * Math.min(dt * 3.5, 1);
      const doorProgress = clamp(completion * 1.4);
      door.rotation.y = -doorProgress * Math.PI * 0.43;
      const isOpen = !before && completion > 0.5;
      if (isOpen !== tagOpen) {
        tagOpen = isOpen;
        doorTag.material.map = isOpen ? openTagTexture : closedTagTexture;
        doorTag.material.needsUpdate = true;
      }
      signMat.emissiveIntensity = before ? 0 : restored.has('sign') ? 0.13 + completion * 0.65 : 0;
      signLight.intensity = before ? 0 : completion * 0.85;
      entranceLight.intensity = before ? 0 : completion * 0.8;
      floorGlow.material.opacity = before ? 0 : completion * 0.1;
      welcome.visible = !before && restored.has('sign');
      // A tiny pulse acknowledges the currently selected physical target.
      for (const [id, object] of [
        ['opening-lamp', lamp],
        ['opening-music', turntable],
        ['opening-coffee', machine],
      ]) {
        const pulse = !before && !preview && actionId === id ? 1 + Math.sin(time * 5) * 0.009 : 1;
        object.scale.setScalar(pulse);
      }
    },
    dispose() {
      // This alternate tag is not always attached to a material map.
      openTagTexture.dispose();
      closedTagTexture.dispose();
    },
  };
}
