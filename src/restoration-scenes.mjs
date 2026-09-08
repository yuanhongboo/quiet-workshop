import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import {
  box,
  mat,
  mesh,
  tube,
  label,
  registerItem,
  addSurfaces,
  registerAction,
} from './season-scene-kit.mjs';

const UP = new THREE.Vector3(0, 1, 0);
const leafGeometry = (width, length) => {
  // A folded midrib gives each leaf thickness and a soft highlight without a sprite.
  const positions = [],
    uvs = [],
    indices = [],
    rows = 12;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows,
      spread = Math.sin(Math.PI * t) ** 0.8 * width * 0.5;
    for (let col = -1; col <= 1; col++) {
      positions.push(
        col * spread,
        (t - 0.5) * length,
        Math.sin(Math.PI * t) * (col ? 0.015 : width * 0.14),
      );
      uvs.push((col + 1) / 2, t);
    }
  }
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < 2; col++) {
      const a = row * 3 + col;
      indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

function leaf(parent, material, width, length) {
  const group = new THREE.Group();
  parent.add(group);
  mesh(leafGeometry(width, length), material, group);
  tube(
    [
      [0, -length * 0.47, 0],
      [0, 0, width * 0.14 + 0.003],
      [0, length * 0.46, 0.005],
    ],
    0.006,
    mat('#819768', { roughness: 0.8 }),
    group,
  );
  return group;
}

function wateringCan(parent, bodyMaterial, brass) {
  const group = new THREE.Group();
  parent.add(group);
  mesh(new THREE.CylinderGeometry(0.195, 0.225, 0.38, 48), bodyMaterial, group);
  mesh(
    new THREE.TorusGeometry(0.199, 0.014, 8, 48),
    brass,
    group,
    [0, 0.19, 0],
    [-Math.PI / 2, 0, 0],
  );
  mesh(
    new THREE.CylinderGeometry(0.183, 0.183, 0.008, 40),
    mat('#405747', { roughness: 0.85 }),
    group,
    [0, 0.17, 0],
  );
  mesh(
    new THREE.TorusGeometry(0.185, 0.025, 10, 48, Math.PI * 1.58),
    brass,
    group,
    [0.185, 0.03, 0],
    [0, 0, -Math.PI * 0.79],
  );
  tube(
    [
      [-0.17, -0.1, 0],
      [-0.34, 0.0, 0],
      [-0.5, 0.11, 0],
    ],
    0.037,
    bodyMaterial,
    group,
  );
  mesh(
    new THREE.CylinderGeometry(0.085, 0.064, 0.04, 28),
    brass,
    group,
    [-0.505, 0.113, 0],
    [0, 0, -0.9],
  );
  return group;
}

function plant(view) {
  const celadon = mat('#a1b5a3', { roughness: 0.23, clearcoat: 0.85 }),
    pale = mat('#b8c2b0', { metalness: 0.5, roughness: 0.35 }),
    wood = mat('#b39366', { map: view.wood, roughness: 0.6 }),
    green = mat('#4e784a', { side: THREE.DoubleSide, roughness: 0.56, clearcoat: 0.15 }),
    young = mat('#779754', { side: THREE.DoubleSide, roughness: 0.59 }),
    dry = mat('#aa7847', { side: THREE.DoubleSide, roughness: 0.92, clearcoat: 0 }),
    stemMaterial = mat('#66723d', { roughness: 0.85 });
  mesh(box(1.25, 0.66, 0.9, 0.075), celadon, view.scene, [-0.45, 0.35, -0.42]);
  // Four rim pieces leave an actual opening. A full rounded box here would cap
  // the soil and hide the watering feedback just below the lip.
  for (const x of [-1.05, 0.15])
    mesh(box(0.09, 0.052, 0.94, 0.018), celadon, view.scene, [x, 0.68, -0.42]);
  for (const z of [-0.8475, 0.0075])
    mesh(box(1.16, 0.052, 0.085, 0.017), celadon, view.scene, [-0.45, 0.68, z]);
  const soil = mesh(
    box(1.11, 0.024, 0.77, 0.028),
    mat('#826446', { roughness: 1, clearcoat: 0 }),
    view.scene,
    [-0.45, 0.689, -0.42],
  );
  // Low, matte pebbles make the watering change legible against the darkening soil.
  const pebbleGeo = new THREE.IcosahedronGeometry(1, 1),
    pebbleMat = mat('#baa98b', { roughness: 1 });
  for (const [x, z, s] of [
    [-0.8, -0.64, 0.052],
    [-0.13, -0.68, 0.035],
    [-0.93, -0.16, 0.04],
    [-0.14, -0.15, 0.038],
    [-0.67, -0.18, 0.031],
    [-0.35, -0.66, 0.04],
  ]) {
    const stone = mesh(pebbleGeo, pebbleMat, view.scene, [x, 0.72, z]);
    stone.scale.set(s, s * 0.44, s * 0.72);
  }
  mesh(
    box(4.02, 0.014, 0.59, 0.016),
    mat('#a7ad90', { roughness: 1 }),
    view.scene,
    [0, -0.001, 1.12],
  );
  mesh(box(1.24, 0.044, 1.38, 0.045), pale, view.scene, [1.53, 0.023, -0.12]);
  for (const x of [0.925, 2.135])
    mesh(box(0.025, 0.045, 1.34, 0.009), pale, view.scene, [x, 0.06, -0.12]);
  for (const z of [-0.79, 0.55])
    mesh(box(1.22, 0.045, 0.024, 0.008), pale, view.scene, [1.53, 0.06, z]);
  mesh(box(1.14, 0.007, 0.013, 0.003), mat('#7f927d'), view.scene, [1.53, 0.057, -0.02]);
  mesh(box(0.014, 0.007, 0.52, 0.003), mat('#7f927d'), view.scene, [1.52, 0.057, 0.25]);
  const plantRoot = new THREE.Vector3(-0.45, 0.71, -0.42);
  tube(
    [plantRoot.toArray(), [-0.48, 1.05, -0.42], [-0.4, 1.48, -0.41], [-0.39, 1.77, -0.36]],
    0.022,
    stemMaterial,
    view.scene,
  );
  const leaves = [];
  for (const [x, y, z, angle, length, width, colorIndex] of [
    [-0.87, 1.54, -0.37, 0.95, 0.67, 0.34, 0],
    [-0.04, 1.61, -0.44, -0.83, 0.72, 0.36, 0],
    [-0.36, 1.97, -0.37, -0.08, 0.57, 0.3, 1],
    [-0.83, 1.17, -0.39, 1.27, 0.53, 0.3, 0],
    [0.02, 1.21, -0.26, -1.17, 0.59, 0.31, 1],
    [-0.43, 1.45, 0.04, 0.12, 0.61, 0.32, 0],
  ]) {
    const group = leaf(view.scene, colorIndex ? young : green, width, length);
    group.position.set(x, y, z);
    group.rotation.set(-0.26, 0, angle);
    const base = new THREE.Vector3(0, -length * 0.47, 0)
      .applyEuler(group.rotation)
      .add(group.position);
    tube(
      [[-0.44, Math.max(1.02, y - 0.2), -0.41], base.toArray()],
      0.009,
      stemMaterial,
      view.scene,
    );
    leaves.push({ group, angle, lean: -0.26 });
  }
  const deadLeaves = [];
  for (const [id, x, y, z, angle] of [
    ['prune-left', -1.18, 1.22, 0.06, 2.18],
    ['prune-right', 0.39, 1.27, 0.03, -2.1],
    ['prune-low', -0.46, 0.97, 0.27, 2.86],
  ]) {
    const group = leaf(view.scene, dry, 0.29, 0.48);
    group.position.set(x, y, z);
    group.rotation.set(-0.17, 0, angle);
    const base = new THREE.Vector3(0, -0.225, 0).applyEuler(group.rotation).add(group.position);
    tube([[-0.44, 1.12, -0.35], base.toArray()], 0.009, stemMaterial, view.scene);
    registerAction(view, id, group);
    deadLeaves.push({
      id,
      group,
      origin: group.position.clone(),
      angle,
      progress: view.state.taskValues?.[id] >= 1 ? 1 : 0,
    });
  }
  registerAction(view, 'water', soil);
  for (const item of view.level.items) {
    let group;
    if (item.kind === 'watering-can') {
      const holder = new THREE.Group();
      group = wateringCan(holder, mat('#6b8b75', { metalness: 0.25, clearcoat: 0.55 }), view.brass);
    } else {
      group = new THREE.Group();
      if (item.kind === 'garden-trowel') {
        mesh(box(0.082, 0.054, 0.31, 0.025), wood, group, [0, 0, 0.145]);
        mesh(box(0.027, 0.025, 0.13, 0.008), view.brass, group, [0, 0, -0.035]);
        const blade = mesh(
          new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
          mat('#aab6af', { metalness: 0.82, roughness: 0.29, side: THREE.DoubleSide }),
          group,
          [0, 0.018, -0.21],
          [Math.PI, 0, 0],
        );
        blade.scale.set(0.108, 0.035, 0.145);
      } else {
        for (const sign of [-1, 1]) {
          mesh(
            new THREE.TorusGeometry(0.055, 0.014, 8, 28),
            mat('#55725d'),
            group,
            [sign * 0.069, 0, 0.16],
            [-Math.PI / 2, 0, sign * 0.15],
          );
          mesh(
            box(0.025, 0.024, 0.2, 0.007),
            mat('#55725d'),
            group,
            [sign * 0.04, 0, 0.05],
            [0, sign * 0.18, 0],
          );
          mesh(
            box(0.055, 0.018, 0.26, 0.022),
            view.chrome,
            group,
            [sign * 0.032, 0, -0.145],
            [0, sign * -0.18, 0],
          );
        }
        mesh(
          new THREE.CylinderGeometry(0.023, 0.023, 0.024, 20),
          view.brass,
          group,
          [0, 0.018, -0.02],
        );
      }
    }
    registerItem(view, item, group);
  }
  const waterMaterial = mat('#d0e7d2', {
      transparent: true,
      opacity: 0.69,
      roughness: 0.09,
      clearcoat: 1,
    }),
    stream = mesh(new THREE.CylinderGeometry(0.011, 0.019, 1, 12), waterMaterial, view.scene);
  stream.visible = false;
  stream.castShadow = false;
  const ripple = mesh(
    new THREE.RingGeometry(0.07, 0.085, 40),
    new THREE.MeshBasicMaterial({
      color: '#cce2c6',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    view.scene,
    [-0.45, 0.705, -0.17],
    [-Math.PI / 2, 0, 0],
  );
  ripple.castShadow = false;
  let pouringBlend = 0;
  const drySoil = new THREE.Color('#826446'),
    wetSoil = new THREE.Color('#392e20');
  return {
    update(dt, time, { before, stage, actionId }) {
      const water = before ? 0 : clamp(view.state.taskValues?.water || 0, 0, 1);
      soil.material.color.copy(drySoil).lerp(wetSoil, water);
      soil.material.roughness = 1 - water * 0.27;
      for (const { group, angle, lean } of leaves) {
        group.rotation.z =
          angle * (1 - water * 0.16) + (before ? 0 : Math.sin(time * 0.7 + angle) * 0.012 * water);
        group.rotation.x = lean - water * 0.33;
      }
      for (const entry of deadLeaves) {
        const cut = !before && (view.state.taskValues?.[entry.id] || 0) >= 1;
        entry.progress = cut ? Math.min(1, entry.progress + dt * 3.2) : 0;
        entry.group.visible = !cut || entry.progress < 1;
        entry.group.position.copy(entry.origin);
        entry.group.position.y -= entry.progress * 0.25;
        entry.group.rotation.z = entry.angle + entry.progress * 0.7;
        entry.group.scale.setScalar(1 - entry.progress * 0.85);
      }
      const active = !before && stage === 'operate' && actionId === 'water';
      pouringBlend = before
        ? 0
        : pouringBlend + (Number(active) - pouringBlend) * (1 - Math.exp(-9 * dt));
      const can = view.items.get('watering-can');
      if (!before && view.state.placed.has('watering-can') && pouringBlend > 0.001) {
        can.position.lerp(new THREE.Vector3(0.07, 1.24, -0.13), pouringBlend);
        can.rotation.z = pouringBlend * 0.46;
      }
      stream.visible = active && pouringBlend > 0.65;
      if (stream.visible) {
        can.updateWorldMatrix(true, false);
        const tip = can.localToWorld(new THREE.Vector3(-0.535, 0.13, 0)),
          destination = new THREE.Vector3(-0.45, 0.707, -0.17),
          direction = tip.clone().sub(destination);
        stream.position.copy(tip).add(destination).multiplyScalar(0.5);
        stream.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
        stream.scale.set(1 + Math.sin(time * 27) * 0.14, direction.length(), 1);
      }
      ripple.material.opacity = stream.visible ? 0.24 : 0;
      ripple.scale.setScalar(0.7 + ((time * 1.4) % 1) * 1.2);
    },
  };
}

function gearGeometry(radius, teeth) {
  const shape = new THREE.Shape();
  for (let i = 0; i < teeth * 4; i++) {
    const angle = (i / (teeth * 4)) * Math.PI * 2,
      r = radius * [0.84, 1, 1, 0.84][i % 4];
    const x = Math.sin(angle) * r,
      y = Math.cos(angle) * r;
    if (!i) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const center = new THREE.Path();
  center.absarc(0, 0, radius * 0.15, 0, Math.PI * 2, true);
  shape.holes.push(center);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2,
      hole = new THREE.Path();
    hole.absarc(
      Math.sin(angle) * radius * 0.49,
      Math.cos(angle) * radius * 0.49,
      radius * 0.18,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.003,
    bevelThickness: 0.003,
    curveSegments: 14,
  });
  geometry.translate(0, 0, -0.0275);
  return geometry;
}

function clockFaceTexture() {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#eee7d4';
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      const radius = w * 0.43;
      ctx.strokeStyle = '#ae9870';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.485, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2,
          inner = radius - (i % 5 ? 8 : 17);
        ctx.lineWidth = i % 5 ? 1.4 : 3;
        ctx.strokeStyle = '#655742';
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * inner, -Math.cos(a) * inner);
        ctx.lineTo(Math.sin(a) * radius, -Math.cos(a) * radius);
        ctx.stroke();
      }
      ctx.fillStyle = '#4b4c3e';
      ctx.font = '34px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillText(String(i), Math.sin(a) * w * 0.34, -Math.cos(a) * w * 0.34);
      }
      ctx.font = '16px Georgia';
      ctx.fillStyle = '#8f7957';
      ctx.fillText('STILL HOURS', 0, h * 0.17);
      ctx.font = '11px sans-serif';
      ctx.fillText('A LITTLE RESET', 0, h * 0.21);
    },
    768,
    768,
  );
}

function clock(view) {
  const walnut = mat('#986d48', { map: view.wood, roughness: 0.4, clearcoat: 0.4 }),
    oak = mat('#c09a69', { map: view.wood, roughness: 0.45, clearcoat: 0.3 }),
    brass = mat('#caa766', { metalness: 0.8, roughness: 0.28, clearcoat: 0.25 }),
    dark = mat('#3e483e', { roughness: 0.82 });
  mesh(box(1.94, 2.38, 0.4, 0.14), walnut, view.scene, [-0.2, 1.35, -0.26]);
  mesh(box(2.32, 0.16, 0.84, 0.045), oak, view.scene, [-0.2, 0.08, -0.15]);
  mesh(box(2.04, 0.08, 0.64, 0.035), walnut, view.scene, [-0.2, 0.194, -0.2]);
  for (const x of [-1.06, 0.66])
    mesh(box(0.24, 1.86, 0.16, 0.035), oak, view.scene, [x, 1.32, -0.065]);
  mesh(box(1.46, 0.97, 0.034, 0.06), dark, view.scene, [-0.2, 0.768, -0.037]);
  mesh(new THREE.TorusGeometry(0.683, 0.037, 12, 96), brass, view.scene, [-0.2, 1.88, -0.025]);
  mesh(new THREE.TorusGeometry(0.728, 0.018, 10, 96), oak, view.scene, [-0.2, 1.88, -0.04]);
  for (const [x, y] of [
    [-0.49, 1.04],
    [-0.02, 1.04],
    [0.19, 0.77],
    [-0.2, 0.868],
  ]) {
    mesh(
      new THREE.CylinderGeometry(0.024, 0.035, 0.14, 24),
      brass,
      view.scene,
      [x, y, 0.034],
      [Math.PI / 2, 0, 0],
    );
    mesh(new THREE.TorusGeometry(0.054, 0.008, 8, 32), brass, view.scene, [x, y, -0.013]);
  }
  mesh(
    new THREE.PlaneGeometry(0.74, 0.105),
    mat('#ffffff', {
      map: label('STILL HOURS', 'HAND ASSEMBLED', '#6d5d42', '#dfceb0'),
      roughness: 0.8,
    }),
    view.scene,
    [-0.2, 0.256, 0.021],
  );
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.kind === 'clock-gear') {
      mesh(gearGeometry(item.radius, item.teeth), brass, group);
      mesh(new THREE.TorusGeometry(item.radius * 0.24, 0.013, 8, 36), brass, group, [0, 0, 0.032]);
    } else {
      mesh(box(0.03, 0.58, 0.026, 0.012), brass, group, [0, 0.054, 0]);
      mesh(
        new THREE.CylinderGeometry(0.174, 0.174, 0.048, 56),
        brass,
        group,
        [0, -0.178, 0],
        [Math.PI / 2, 0, 0],
      );
      mesh(new THREE.TorusGeometry(0.145, 0.008, 8, 48), oak, group, [0, -0.178, 0.029]);
      mesh(new THREE.TorusGeometry(0.033, 0.01, 8, 24), brass, group, [0, 0.328, 0]);
    }
    registerItem(view, item, group);
  }
  const minutePivot = new THREE.Group(),
    hourPivot = new THREE.Group();
  minutePivot.position.set(-0.2, 1.88, 0.005);
  hourPivot.position.set(-0.2, 1.88, 0.027);
  minutePivot.name = 'clock-minute-hand';
  hourPivot.name = 'clock-hour-hand';
  view.scene.add(minutePivot, hourPivot);
  mesh(box(0.032, 0.49, 0.022, 0.012), dark, minutePivot, [0, 0.184, 0]);
  mesh(box(0.051, 0.35, 0.027, 0.018), dark, hourPivot, [0, 0.12, 0]);
  mesh(new THREE.SphereGeometry(0.047, 24, 16), brass, view.scene, [-0.2, 1.88, 0.055]);
  // The clock face itself is the manipulation target; the slider gives precise touch control.
  const target = mesh(
    new THREE.CircleGeometry(0.64, 64),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    view.scene,
    [-0.2, 1.88, 0.07],
  );
  target.castShadow = false;
  registerAction(view, 'set-time', target);
  let elapsed = 0;
  return {
    faceTexture: clockFaceTexture(),
    update(dt, time, { before }) {
      const powered = !before && (view.state.brewTime > 0 || view.state.completed);
      if (powered) elapsed += dt;
      const minutes = before
        ? 540
        : (view.state.taskValues?.['set-time'] ?? 540) + (powered ? elapsed / 60 : 0);
      minutePivot.rotation.z = (-minutes / 60) * Math.PI * 2;
      hourPivot.rotation.z = (-minutes / 720) * Math.PI * 2;
      for (const item of view.level.items.filter((item) => item.kind === 'clock-gear')) {
        const group = view.items.get(item.id);
        if (!before && view.state.placed.has(item.id))
          group.rotation.z = powered
            ? (elapsed * 0.34 * (item.order === 2 ? -1 : 1) * 0.275) / item.radius
            : 0;
      }
      if (!before && view.state.placed.has('clock-pendulum')) {
        const group = view.items.get('clock-pendulum'),
          angle = powered ? Math.sin(elapsed * Math.PI * 2 * 0.75) * 0.18 : 0;
        // Rotate around the hanging eye, keeping it attached to its shaft.
        group.rotation.z = angle;
        const offset = new THREE.Vector3(0, -0.328, 0).applyAxisAngle(
          new THREE.Vector3(0, 0, 1),
          angle,
        );
        group.position.set(-0.2, 0.868, 0.175).add(offset);
      }
    },
  };
}

export function buildRestorationScene(view) {
  const result = { plant, clock }[view.level.id](view);
  addSurfaces(view);
  if (result.faceTexture) {
    const face = view.dirtyMeshes.find(
      (object) => object.userData.field?.spec.id === 'clock-glass',
    );
    face.material.map = result.faceTexture;
    face.material.color.set('#ffffff');
    face.material.needsUpdate = true;
  }
  return result;
}
