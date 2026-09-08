import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';

const rounded = (w, h, d, r = 0.025) => new RoundedBoxGeometry(w, h, d, 3, r);
const mat = (color, options = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 0.25, ...options });
function mesh(geometry, material, parent, position = [0, 0, 0], rotation) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  if (rotation) m.rotation.set(...rotation);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function tube(points, radius, material, parent) {
  return mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      32,
      radius,
      12,
      false,
    ),
    material,
    parent,
  );
}
function label(text, small = '', color = '#344b46', background = '#f0e4cb') {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.font = '42px Georgia';
      ctx.fillText(text, w / 2, h * 0.48);
      ctx.font = '15px sans-serif';
      ctx.fillText(small, w / 2, h * 0.76);
    },
    512,
    160,
  );
}
function weave() {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#e3ddcb';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < w; i += 3) {
        ctx.fillStyle = i % 2 ? '#b4ac9933' : '#ffffff36';
        ctx.fillRect(i, 0, 1, h);
        ctx.fillRect(0, i, w, 1);
      }
    },
    512,
    512,
  );
}
function grooves() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#cbd0cc';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#535954';
    ctx.lineWidth = 0.7;
    for (let r = 14; r < 256; r += 3) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}
function surfaces(view) {
  for (const spec of view.level.surfaces) {
    const options = { color: spec.color, roughness: 0.45, clearcoat: 0.18 };
    if (['wood', 'bamboo'].includes(spec.material)) options.map = view.wood;
    if (['leather', 'linen'].includes(spec.material)) {
      options.map = weave();
      options.roughness = 0.92;
      options.clearcoat = 0;
    }
    if (['metal', 'platter'].includes(spec.material)) {
      options.metalness = 0.8;
      options.roughness = 0.3;
    }
    if (spec.material === 'platter') options.map = grooves();
    if (spec.material === 'ceramic') {
      options.roughness = 0.22;
      options.clearcoat = 0.8;
    }
    view.surface(
      spec.id,
      spec.mask?.kind === 'disc'
        ? new THREE.CircleGeometry(spec.width / 2, 96)
        : new THREE.PlaneGeometry(spec.width, spec.height),
      options,
      spec.position,
      spec.rotation,
    );
  }
}
function register(view, item, group) {
  group.position.set(...item.start);
  group.rotation.set(...(item.startRotation || [0, item.yaw || 0, 0]));
  group.traverse((child) => {
    if (child.isMesh) child.userData.itemId = item.id;
  });
  view.scene.add(group);
  view.items.set(item.id, group);
  const slot = new THREE.Group(),
    marker = item.marker;
  slot.position.set(...marker.position);
  view.scene.add(slot);
  const rotation = marker.plane === 'front' ? [0, 0, 0] : [-Math.PI / 2, 0, 0];
  const material = new THREE.MeshBasicMaterial({
    color: '#4d8860',
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = mesh(
    new THREE.TorusGeometry(marker.radius, 0.009, 6, 64),
    material,
    slot,
    [0, 0, 0],
    rotation,
  );
  ring.castShadow = false;
  const center = mesh(
    new THREE.CircleGeometry(marker.radius * 0.95, 48),
    new THREE.MeshBasicMaterial({
      color: '#c3debb',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    slot,
    [0, 0, 0],
    rotation,
  );
  center.castShadow = false;
  if (item.order) {
    const n = mesh(
      new THREE.PlaneGeometry(0.17, 0.17),
      new THREE.MeshBasicMaterial({
        map: label(String(item.order).padStart(2, '0')),
        transparent: false,
        depthWrite: false,
      }),
      slot,
      [0, 0, 0.004],
    );
    n.castShadow = false;
  }
  slot.visible = false;
  view.slots.set(item.id, slot);
}
function steam(view, position, dt) {
  if (view.particles.length > 80 || Math.random() > dt * 8) return;
  const m = mesh(
    view.particleGeo,
    new THREE.MeshBasicMaterial({
      color: '#fff9e9',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    }),
    view.scene,
    position,
  );
  m.castShadow = false;
  m.position.x += (Math.random() - 0.5) * 0.14;
  m.scale.set(0.025, 0.035, 0.025);
  view.particles.push({ mesh: m, life: 1.8, v: new THREE.Vector3(0.015, 0.19, 0), steam: true });
}
function desk(view) {
  const wood = mat('#dbbb88', { map: view.wood, roughness: 0.47 }),
    blue = mat('#839aa6'),
    brass = view.brass;
  mesh(rounded(1.63, 0.12, 0.81), wood, view.scene, [-0.68, 0.05, -0.5]);
  mesh(rounded(1.5, 1.05, 0.075), wood, view.scene, [-0.68, 0.61, -0.9]);
  for (const x of [-1.44, 0.09]) mesh(rounded(0.07, 1.06, 0.76), wood, view.scene, [x, 0.61, -0.5]);
  mesh(rounded(1.62, 0.06, 0.8), wood, view.scene, [-0.68, 1.16, -0.5]);
  for (const x of [-1.05, -0.69, -0.33]) {
    mesh(rounded(0.27, 0.013, 0.61, 0.003), mat('#809396', { roughness: 0.8 }), view.scene, [
      x,
      0.117,
      -0.41,
    ]);
  }
  // Stitched desk pad and a pencil rail retain their detail after the dirt lifts.
  mesh(
    rounded(2.74, 0.02, 1.3, 0.025),
    mat('#405c6c', { roughness: 1 }),
    view.scene,
    [-0.25, -0.001, 0.53],
  );
  for (let x = -1.52; x < 1.04; x += 0.05)
    for (const z of [-0.054, 1.114])
      mesh(rounded(0.022, 0.002, 0.005, 0.001), mat('#c9bc9b'), view.scene, [x, 0.013, z]);
  mesh(rounded(0.82, 0.14, 0.69, 0.055), blue, view.scene, [1.57, 0.065, 0.28]);
  tube(
    [
      [1.66, 0.12, 0.2],
      [1.72, 0.63, 0.07],
      [1.6, 1.23, -0.15],
      [1.19, 1.66, 0.16],
    ],
    0.026,
    brass,
    view.scene,
  );
  for (const p of [
    [1.72, 0.64, 0.07],
    [1.6, 1.23, -0.15],
  ])
    mesh(new THREE.SphereGeometry(0.052, 24, 16), brass, view.scene, p);
  const shade = mat('#718c9c', { side: THREE.DoubleSide, metalness: 0.3, clearcoat: 0.6 });
  mesh(
    new THREE.CylinderGeometry(0.14, 0.37, 0.24, 64, 1, true),
    shade,
    view.scene,
    [1.18, 1.58, 0.16],
  );
  mesh(
    new THREE.TorusGeometry(0.366, 0.012, 8, 64),
    brass,
    view.scene,
    [1.18, 1.46, 0.16],
    [-Math.PI / 2, 0, 0],
  );
  mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.13, 32), brass, view.scene, [1.18, 1.425, 0.16]);
  mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.028, 24),
    view.dark,
    view.scene,
    [1.79, 0.155, 0.39],
  );
  const lampLight = new THREE.SpotLight('#ffe2a0', 0, 7, Math.PI / 3, 0.8, 1.4);
  lampLight.position.set(1.18, 1.4, 0.16);
  lampLight.target.position.set(0.5, 0.02, 0.62);
  view.scene.add(lampLight, lampLight.target);
  const pool = mesh(
    new THREE.CircleGeometry(0.78, 64),
    new THREE.MeshBasicMaterial({
      color: '#ffe9b0',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    view.scene,
    [0.66, 0.023, 0.55],
    [-Math.PI / 2, 0, 0],
  );
  pool.castShadow = false;
  for (const item of view.level.items) {
    const g = new THREE.Group();
    if (item.kind === 'book') {
      const colors = ['#748e98', '#ba976b', '#94a18b'],
        color = colors[item.order - 1],
        cover = mat(color, { roughness: 0.74 });
      mesh(rounded(0.25, 0.83, 0.52, 0.015), mat('#e9e4cd', { roughness: 0.94 }), g);
      for (const x of [-0.139, 0.139]) {
        mesh(rounded(0.018, 0.87, 0.565, 0.008), cover, g, [x, 0, 0]);
        mesh(
          new THREE.PlaneGeometry(0.48, 0.73),
          mat('#ffffff', {
            map: label(`0${item.order}`, 'FIELD NOTES', color, '#e7dfc9'),
            roughness: 0.9,
          }),
          g,
          [x + Math.sign(x) * 0.01, 0, 0],
          [0, (Math.sign(x) * Math.PI) / 2, 0],
        );
      }
      const spine = canvasTexture(
        (ctx, w, h) => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#f3e8ce';
          ctx.textAlign = 'center';
          ctx.font = '42px Georgia';
          ctx.fillText(`0${item.order}`, w / 2, 70);
          ctx.strokeStyle = '#e9dcc1';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let x = 0; x <= w; x++) {
            const global = item.order - 1 + x / w,
              y = 285 - 68 * Math.sin(global * 2.1) - 18 * Math.sin(global * 5);
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
          ctx.font = '16px Georgia';
          ctx.fillText(['FIELD', 'FORM', 'FLOW'][item.order - 1], w / 2, h - 45);
          ctx.fillRect(18, 105, w - 36, 2);
          ctx.fillRect(18, h - 84, w - 36, 2);
        },
        160,
        512,
      );
      mesh(rounded(0.281, 0.862, 0.027, 0.008), cover, g, [0, 0, 0.274]);
      mesh(
        new THREE.PlaneGeometry(0.275, 0.85),
        mat('#ffffff', { map: spine, roughness: 0.85 }),
        g,
        [0, 0, 0.289],
      );
      for (let y = -0.39; y < 0.4; y += 0.035)
        mesh(rounded(0.235, 0.001, 0.003, 0.001), mat('#c7bfa5'), g, [0, y, -0.262]);
    } else {
      const glow = mat('#f3e5b8', {
        roughness: 0.15,
        clearcoat: 1,
        emissive: '#ffe3a1',
        emissiveIntensity: 0,
      });
      const bulb = mesh(new THREE.SphereGeometry(0.118, 40, 24), glow, g, [0, -0.035, 0]);
      bulb.scale.set(1, 1.07, 1);
      view.deskBulb = bulb;
      mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.12, 32), brass, g, [0, 0.095, 0]);
      for (let y = 0.055; y < 0.145; y += 0.02)
        mesh(
          new THREE.TorusGeometry(0.06, 0.006, 6, 32),
          view.chrome,
          g,
          [0, y, 0],
          [-Math.PI / 2, 0, 0],
        );
    }
    register(view, item, g);
  }
  return {
    update(dt, time, { before }) {
      const light = before ? 0 : clamp(view.state.brewTime / 1.1, 0, 1);
      lampLight.intensity = light * 4.5;
      pool.material.opacity = light * 0.12;
      view.deskBulb.material.emissiveIntensity = light * 2.8;
    },
  };
}
function bowl(parent, material, radius, height) {
  const profile = [
    [0, -height / 2],
    [radius * 0.5, -height / 2],
    [radius * 0.68, -height * 0.38],
    [radius, height * 0.42],
    [radius * 0.99, height / 2],
    [radius * 0.92, height / 2],
    [radius * 0.61, -height * 0.24],
    [0, -height * 0.27],
  ].map((p) => new THREE.Vector2(...p));
  return mesh(new THREE.LatheGeometry(profile, 64), material, parent);
}
function tea(view) {
  const bamboo = mat('#b89161', { map: view.wood, roughness: 0.5 }),
    celadon = mat('#adc5b6', { roughness: 0.2, clearcoat: 1 }),
    ivory = mat('#ece6ce', { roughness: 0.16, clearcoat: 1 });
  mesh(rounded(2.96, 0.086, 1.7, 0.05), bamboo, view.scene, [0, 0.032, 0.19]);
  for (const x of [-1.445, 1.445])
    mesh(rounded(0.05, 0.03, 1.65, 0.01), bamboo, view.scene, [x, 0.075, 0.19]);
  for (const z of [-0.63, 1.01])
    mesh(rounded(2.92, 0.03, 0.05, 0.01), bamboo, view.scene, [0, 0.075, z]);
  // Fine draining slats are visible in the restored bamboo.
  for (let z = -0.54; z < 0.85; z += 0.105)
    mesh(rounded(2.4, 0.004, 0.012, 0.002), mat('#725a37', { roughness: 0.9 }), view.scene, [
      0,
      0.089,
      z,
    ]);
  mesh(rounded(0.64, 0.84, 0.56, 0.04), celadon, view.scene, [1.84, 0.42, -0.64]);
  mesh(rounded(0.66, 0.07, 0.58, 0.04), bamboo, view.scene, [1.84, 0.866, -0.64]);
  mesh(
    new THREE.CylinderGeometry(0.046, 0.057, 0.08, 24),
    bamboo,
    view.scene,
    [1.84, 0.937, -0.64],
  );
  mesh(
    new THREE.PlaneGeometry(0.34, 0.21),
    mat('#ffffff', { map: label('茶', 'SLOW STEEP', '#425647', '#e9e4d0') }),
    view.scene,
    [1.84, 0.46, -0.329],
  );
  mesh(
    rounded(4.57, 0.012, 0.45, 0.009),
    mat('#bebaa4', { map: weave(), roughness: 1 }),
    view.scene,
    [0, -0.005, 1.26],
  );
  for (let x = -2.23; x < 2.24; x += 0.07)
    mesh(rounded(0.002, 0.002, 0.032, 0.001), ivory, view.scene, [x, 0.006, 1.432]);
  for (const item of view.level.items) {
    const g = new THREE.Group();
    if (item.kind === 'gaiwan') {
      bowl(g, celadon, 0.3, 0.28);
      mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.025, 48), celadon, g, [0, -0.143, 0]);
      view.teaWater = mesh(
        new THREE.CircleGeometry(0.27, 64),
        mat('#c49b54', { transparent: true, opacity: 0.8, roughness: 0.1, clearcoat: 1 }),
        g,
        [0, -0.07, 0],
        [-Math.PI / 2, 0, 0],
      );
      const leaves = mat('#5b6232', { roughness: 0.8 });
      for (let i = 0; i < 11; i++) {
        const a = i * 2.4,
          r = 0.05 + (i % 3) * 0.044,
          l = mesh(new THREE.SphereGeometry(1, 10, 6), leaves, g, [
            Math.sin(a) * r,
            -0.065,
            Math.cos(a) * r,
          ]);
        l.scale.set(0.016, 0.004, 0.045);
        l.rotation.y = a;
      }
    } else if (item.kind === 'teacup') {
      bowl(g, ivory, 0.145, 0.19);
      mesh(
        new THREE.TorusGeometry(0.14, 0.006, 8, 64),
        view.brass,
        g,
        [0, 0.091, 0],
        [-Math.PI / 2, 0, 0],
      );
      mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.018, 32), ivory, g, [0, -0.097, 0]);
    } else {
      mesh(rounded(0.51, 0.036, 0.09, 0.015), bamboo, g, [0.085, 0, 0]);
      const scoop = mesh(
        new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat('#c9a975', { map: view.wood, side: THREE.DoubleSide }),
        g,
        [-0.25, 0.023, 0],
        [0, 0, Math.PI],
      );
      scoop.scale.set(0.12, 0.042, 0.078);
    }
    register(view, item, g);
  }
  const kettle = new THREE.Group();
  view.scene.add(kettle);
  kettle.position.set(0.46, 1.0, -0.01);
  mesh(
    new THREE.SphereGeometry(0.29, 48, 32),
    mat('#597468', { roughness: 0.3, clearcoat: 0.6 }),
    kettle,
  );
  mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.055, 48), bamboo, kettle, [0, 0.25, 0]);
  mesh(new THREE.SphereGeometry(0.045, 20, 14), bamboo, kettle, [0, 0.3, 0]);
  tube(
    [
      [-0.12, 0.08, 0],
      [-0.35, 0.06, 0.05],
      [-0.46, 0.13, 0.18],
    ],
    0.042,
    celadon,
    kettle,
  );
  mesh(
    new THREE.TorusGeometry(0.22, 0.025, 10, 48, Math.PI * 1.7),
    bamboo,
    kettle,
    [0.28, 0.08, 0],
    [0, 0, -0.9],
  );
  const stream = mesh(
    new THREE.CylinderGeometry(0.009, 0.017, 1, 12),
    mat('#d4e6d8', { transparent: true, opacity: 0.6, roughness: 0.06, clearcoat: 1 }),
    view.scene,
    [0, 0.74, 0.17],
  );
  let visibility = 0;
  return {
    update(dt, time, { before, pouring, stage }) {
      const amount = before ? 0 : view.state.operationValue / view.level.operation.target;
      view.teaWater.visible = amount > 0;
      view.teaWater.position.y = -0.065 + amount * 0.16;
      view.teaWater.scale.setScalar(0.61 + amount * 0.39);
      view.teaWater.material.color.set(view.state.brewTime > 0 ? '#ad792d' : '#c7ac70');
      const active = pouring && !before && stage === 'operate';
      visibility += (Number(active) - visibility) * (1 - Math.exp(-10 * dt));
      kettle.visible = visibility > 0.01;
      kettle.position.y = 1.05 + (1 - visibility) * 0.3;
      kettle.rotation.z = -visibility * 0.12;
      stream.visible = active;
      kettle.updateWorldMatrix(true, false);
      view.teaWater.updateWorldMatrix(true, false);
      const tip = kettle.localToWorld(new THREE.Vector3(-0.46, 0.13, 0.18)),
        destination = view.teaWater.localToWorld(new THREE.Vector3()),
        direction = tip.clone().sub(destination);
      stream.position.copy(tip).add(destination).multiplyScalar(0.5);
      stream.scale.set(1 + Math.sin(time * 25) * 0.1, direction.length(), 1);
      stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      if (!before && view.state.brewTime > 0) steam(view, [0, 0.43, 0.17], dt);
    },
  };
}
function vinylTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#171f1b';
    ctx.fillRect(0, 0, w, h);
    for (let r = 77; r < 254; r += 2) {
      ctx.strokeStyle = r % 3 === 0 ? '#707971' : '#2f3933';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#b88568';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 77, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#efdebd';
    ctx.font = '22px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('SLOW HOURS', w / 2, h / 2 - 24);
    ctx.font = '12px sans-serif';
    ctx.fillText('SIDE A · 33⅓', w / 2, h / 2 + 33);
    ctx.fillStyle = '#34473c';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
  });
}
function record(view) {
  const walnut = mat('#a97750', { map: view.wood, roughness: 0.36, clearcoat: 0.55 }),
    silver = mat('#c4c6be', { metalness: 0.84, roughness: 0.26 });
  mesh(rounded(2.75, 0.36, 1.8, 0.05), walnut, view.scene, [0, 0.18, 0]);
  mesh(
    rounded(2.63, 0.025, 1.67, 0.035),
    mat('#bfc2af', { metalness: 0.55, roughness: 0.45 }),
    view.scene,
    [0, 0.36, 0],
  );
  for (const x of [-1.05, 1.05])
    for (const z of [-0.64, 0.64])
      mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.09, 32), view.dark, view.scene, [x, 0.004, z]);
  mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.034, 96), silver, view.scene, [-0.43, 0.386, 0.06]);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    mesh(
      rounded(0.013, 0.012, 0.02, 0.003),
      view.dark,
      view.scene,
      [-0.43 + Math.sin(a) * 0.743, 0.395, 0.06 + Math.cos(a) * 0.743],
      [0, a, 0],
    );
  }
  mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.11, 32),
    view.chrome,
    view.scene,
    [-0.43, 0.451, 0.06],
  );
  mesh(
    new THREE.PlaneGeometry(0.51, 0.09),
    mat('#ffffff', { map: label('SLOW HOURS', 'ANALOGUE AUDIO') }),
    view.scene,
    [-0.83, 0.18, 0.912],
  );
  mesh(new THREE.CylinderGeometry(0.088, 0.09, 0.045, 40), silver, view.scene, [0.83, 0.417, 0.55]);
  const dialMark = mesh(
    rounded(0.007, 0.003, 0.035, 0.002),
    view.dark,
    view.scene,
    [0.83, 0.442, 0.55],
  );
  dialMark.geometry.translate(0, 0, 0.046);
  const led = mesh(
    new THREE.SphereGeometry(0.018, 16, 12),
    mat('#496452', { emissive: '#98d896', emissiveIntensity: 0 }),
    view.scene,
    [1.02, 0.396, 0.58],
  );
  // A fabric-front speaker completes the listening corner without adding another task.
  mesh(rounded(0.69, 1.1, 0.57, 0.04), walnut, view.scene, [1.98, 0.56, -0.74]);
  mesh(
    new THREE.PlaneGeometry(0.57, 0.93),
    mat('#555e51', { map: weave(), roughness: 1 }),
    view.scene,
    [1.98, 0.56, -0.451],
  );
  const arm = new THREE.Group();
  arm.position.set(0.95, 0.65, -0.52);
  view.scene.add(arm);
  mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.27, 40), silver, view.scene, [0.95, 0.513, -0.52]);
  tube(
    [
      [0, 0, 0],
      [-0.09, 0.02, 0.13],
      [-0.13, 0.005, 0.69],
      [-0.31, -0.05, 0.94],
    ],
    0.018,
    view.chrome,
    arm,
  );
  mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.18, 32),
    view.dark,
    arm,
    [0.06, 0, -0.12],
    [Math.PI / 2, 0, 0],
  );
  for (const item of view.level.items) {
    const g = new THREE.Group();
    if (item.kind === 'belt')
      mesh(
        new THREE.TorusGeometry(0.67, 0.014, 12, 96),
        mat('#303b33', { roughness: 0.9 }),
        g,
        [0, 0, 0],
        [-Math.PI / 2, 0, 0],
      );
    if (item.kind === 'vinyl') {
      mesh(
        new THREE.CylinderGeometry(0.705, 0.705, 0.035, 96),
        mat('#1e2722', { roughness: 0.25, clearcoat: 0.7 }),
        g,
      );
      mesh(
        new THREE.CircleGeometry(0.702, 96),
        mat('#ffffff', { map: vinylTexture(), roughness: 0.26, clearcoat: 0.8 }),
        g,
        [0, 0.018, 0],
        [-Math.PI / 2, 0, 0],
      );
    }
    if (item.kind === 'cartridge') {
      mesh(rounded(0.22, 0.075, 0.31, 0.016), silver, g, [0, 0.025, 0]);
      mesh(rounded(0.13, 0.09, 0.16, 0.015), mat('#b3895e'), g, [0, -0.03, 0.09]);
      mesh(rounded(0.025, 0.064, 0.014, 0.004), view.brass, g, [0, -0.073, 0.13]);
      for (const x of [-0.069, 0.069])
        mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 16), view.dark, g, [x, 0.067, 0.02]);
    }
    register(view, item, g);
  }
  let spin = 0;
  return {
    update(dt, time, { before, stage }) {
      const powered = !before && ['operate', 'ready', 'brew', 'done'].includes(stage);
      if (powered) spin += (dt * view.state.operationValue * Math.PI * 2) / 60;
      const disc = view.items.get('record-disc');
      if (view.state.placed.has('record-disc') && !before) disc.rotation.y = powered ? spin : 0;
      led.material.emissiveIntensity = powered ? 1.5 : 0;
      dialMark.rotation.y = ((view.state.operationValue - 25) / 20) * Math.PI * 1.4;
      const lowering = before ? 0 : clamp(view.state.brewTime / 2.1, 0, 1),
        ease = lowering * lowering * (3 - 2 * lowering),
        angle = -0.58 * ease;
      arm.rotation.y = angle;
      arm.position.y = 0.65 - ease * 0.035;
      if (
        view.state.placed.has('cartridge') &&
        !before &&
        !view.state.completed &&
        stage !== 'brew'
      )
        return;
      if (view.state.placed.has('cartridge') && !before) {
        const cartridge = view.items.get('cartridge'),
          offset = new THREE.Vector3(-0.31, -0.05, 0.94).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            angle,
          );
        cartridge.position.copy(arm.position).add(offset);
        cartridge.rotation.set(0, angle, 0);
      }
    },
  };
}
export function buildAdditionalLevel(view) {
  const builder = { desk, tea, record }[view.level.id];
  if (!builder) throw new Error(`Unknown workbench: ${view.level.id}`);
  const result = builder(view);
  surfaces(view);
  return result;
}
