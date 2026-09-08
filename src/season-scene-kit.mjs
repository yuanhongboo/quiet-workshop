import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTexture } from './materials.mjs';

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

export function registerAction(view, id, object) {
  object.traverse((child) => {
    if (child.isMesh) child.userData.actionId = id;
  });
  view.actionTargets.set(id, { object });
  return object;
}
export function addTaskSurfaces(view) {
  for (const task of view.level.operation.tasks || []) {
    if (!task.field) continue;
    const spec = task.field;
    const settings = {
      color: spec.color || '#c3d1b8',
      roughness: spec.roughness ?? 0.42,
      clearcoat: spec.clearcoat ?? 0.4,
    };
    if (spec.material === 'wood') settings.map = view.wood;
    view.taskSurface(
      task.id,
      new THREE.PlaneGeometry(spec.width, spec.height),
      settings,
      spec.position,
      spec.rotation,
    );
  }
}
export {
  rounded as box,
  mat,
  mesh,
  tube,
  label,
  weave,
  surfaces as addSurfaces,
  register as registerItem,
  steam,
};
