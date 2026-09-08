import * as THREE from 'three';
import { canvasTexture } from './materials.mjs';
import { clamp } from './core.mjs';
import {
  box,
  mat,
  mesh,
  tube,
  registerItem,
  addSurfaces,
  registerAction,
  addTaskSurfaces,
} from './season-scene-kit.mjs';

const value = (view, id, before) => (before ? 0 : clamp(view.state.taskValues?.[id] || 0, 0, 1));

function fabric(base, line, checked = false) {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = line;
      if (checked) {
        ctx.globalAlpha = 0.27;
        for (let i = 0; i < w; i += 64) {
          ctx.fillRect(i, 0, 23, h);
          ctx.fillRect(0, i, w, 23);
        }
      }
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < w; i += 4) {
        ctx.fillRect(i, 0, 1, h);
        ctx.fillRect(0, i, w, 1);
      }
      ctx.globalAlpha = 1;
    },
    256,
    256,
  );
}

function treeTexture(shadow = false) {
  return canvasTexture(
    (ctx, w, h) => {
      if (!shadow) {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#a8c4bc');
        sky.addColorStop(0.6, '#d5dfc5');
        sky.addColorStop(1, '#a5b890');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f7edc49a';
        ctx.beginPath();
        ctx.arc(w * 0.26, h * 0.2, 54, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = shadow ? '#344634' : '#76866a';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.86, h);
      ctx.bezierCurveTo(w * 0.75, h * 0.63, w * 0.78, h * 0.25, w * 0.56, 0);
      ctx.stroke();
      const branches = [
        [0.77, 0.69, 0.49, 0.4],
        [0.77, 0.48, 0.93, 0.17],
        [0.72, 0.31, 0.34, 0.12],
        [0.81, 0.8, 0.96, 0.62],
      ];
      ctx.lineWidth = 5;
      for (const [x, y, tx, ty] of branches) {
        ctx.beginPath();
        ctx.moveTo(x * w, y * h);
        ctx.lineTo(tx * w, ty * h);
        ctx.stroke();
      }
      for (let i = 0; i < 28; i++) {
        const angle = i * 2.399;
        const radius = 52 + (i % 7) * 17;
        const x = w * 0.68 + Math.sin(angle) * radius;
        const y = h * 0.3 + Math.cos(angle) * radius * 0.72;
        ctx.fillStyle = shadow ? '#344634b0' : ['#879d71', '#9aaf80', '#6e8b69', '#b4c39a'][i % 4];
        ctx.beginPath();
        ctx.ellipse(x, y, 31 + (i % 15), 17 + (i % 9), angle, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    512,
    512,
  );
}

function curtainGeometry(width, height) {
  const geo = new THREE.PlaneGeometry(width, height, 36, 12);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    p.setZ(i, Math.sin((x / width + 0.5) * Math.PI * 12) * 0.032);
    p.setY(i, y + Math.cos((x / width + 0.5) * Math.PI * 12) * 0.012 * (0.5 - y / height));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function pillowPiping(group, w, h, d, material) {
  const x = w / 2 - 0.035,
    y = h / 2 - 0.035;
  return tube(
    [
      [-x, -y, d],
      [x, -y, d],
      [x, y, d],
      [-x, y, d],
      [-x, -y, d],
    ],
    0.007,
    material,
    group,
  );
}

function windowSeat(view) {
  const wood = mat('#d7bb92', { map: view.wood, roughness: 0.57 });
  const frame = mat('#ede5d2', { roughness: 0.64 });
  const brass = mat('#b19b69', { metalness: 0.78, roughness: 0.35 });
  const outside = mesh(
    new THREE.PlaneGeometry(2.34, 1.28),
    mat('#ffffff', { map: treeTexture(), roughness: 1 }),
    view.scene,
    [-0.35, 1.56, -0.914],
  );
  outside.castShadow = false;
  for (const x of [-1.59, 0.89]) mesh(box(0.13, 1.43, 0.17), frame, view.scene, [x, 1.56, -0.92]);
  for (const y of [0.855, 2.265]) mesh(box(2.6, 0.13, 0.19), frame, view.scene, [-0.35, y, -0.92]);
  mesh(box(2.79, 0.07, 0.35), wood, view.scene, [-0.35, 0.797, -0.8]);
  mesh(box(2.61, 0.16, 1.17), wood, view.scene, [-0.35, 0.35, 0.08]);
  for (const x of [-1.46, 0.76])
    for (const z of [-0.31, 0.47]) mesh(box(0.13, 0.28, 0.13), wood, view.scene, [x, 0.14, z]);
  mesh(box(2.49, 0.075, 0.08), wood, view.scene, [-0.35, 0.17, 0.49]);
  mesh(box(0.85, 0.1, 0.85, 0.05), wood, view.scene, [1.73, 0.478, 0.08]);
  for (const x of [1.43, 2.03])
    for (const z of [-0.21, 0.37]) mesh(box(0.055, 0.43, 0.055), wood, view.scene, [x, 0.23, z]);
  // The glass is translucent, so cleaned areas reveal the quiet street beyond.
  for (const spec of view.level.surfaces) {
    view.surface(
      spec.id,
      new THREE.PlaneGeometry(spec.width, spec.height),
      spec.material === 'glass'
        ? {
            color: spec.color,
            roughness: 0.08,
            clearcoat: 1,
            transparent: true,
            opacity: 0.53,
            depthWrite: false,
          }
        : { color: spec.color, map: view.wood, roughness: 0.55, clearcoat: 0.17 },
      spec.position,
      spec.rotation,
    );
  }
  mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 2.93, 16),
    brass,
    view.scene,
    [-0.35, 2.315, -0.71],
    [0, 0, Math.PI / 2],
  );
  for (const x of [-1.84, 1.14])
    mesh(new THREE.SphereGeometry(0.047, 16, 12), brass, view.scene, [x, 2.315, -0.71]);
  const curtains = [];
  for (const side of [-1, 1]) {
    const group = new THREE.Group();
    view.scene.add(group);
    group.position.set(side < 0 ? -1.44 : 0.79, 1.64, -0.68);
    mesh(
      curtainGeometry(0.57, 1.26),
      mat('#d3c7a6', {
        map: fabric('#d5cbb1', '#76694e'),
        side: THREE.DoubleSide,
        roughness: 0.95,
        clearcoat: 0,
      }),
      group,
    );
    for (let i = -2; i <= 2; i++)
      mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 18), brass, group, [i * 0.112, 0.675, -0.028]);
    curtains.push(group);
  }
  registerAction(view, 'open-curtain', curtains[1]);
  let looseThread, button;
  const clothEdge = mat('#c9bc97', { roughness: 1 });
  for (const item of view.level.items) {
    const group = new THREE.Group();
    if (item.kind === 'seat-pad') {
      mesh(
        box(...item.size, 0.068),
        mat('#b4bea0', { map: fabric('#bbc3a8', '#718268'), roughness: 1, clearcoat: 0 }),
        group,
      );
      const piping = pillowPiping(group, item.size[0], item.size[2], 0.078, clothEdge);
      piping.rotation.x = -Math.PI / 2;
      for (const x of [-0.55, 0, 0.55])
        mesh(new THREE.SphereGeometry(0.026, 14, 8), mat('#9ca98d', { roughness: 1 }), group, [
          x,
          0.071,
          0,
        ]);
    } else if (item.kind === 'window-cushion') {
      mesh(
        box(...item.size, 0.086),
        mat('#e0c9a1', { map: fabric('#e4cea9', '#778b6b', true), roughness: 1, clearcoat: 0 }),
        group,
      );
      pillowPiping(group, item.size[0], item.size[1], 0.109, clothEdge);
      button = mesh(
        new THREE.CylinderGeometry(0.046, 0.046, 0.021, 24),
        mat('#b6955f', { roughness: 0.55 }),
        group,
        [0, -0.015, 0.124],
        [Math.PI / 2, 0, 0],
      );
      for (const x of [-0.011, 0.011])
        mesh(new THREE.SphereGeometry(0.006, 8, 6), mat('#544d3d'), button, [x, 0.013, 0]);
      looseThread = tube(
        [
          [0.02, -0.015, 0.131],
          [0.077, -0.07, 0.15],
          [0.04, -0.13, 0.143],
          [0.1, -0.2, 0.14],
        ],
        0.0035,
        clothEdge,
        group,
      );
      registerAction(view, 'sew-button', group);
    } else {
      const rope = mat('#ae956b', { roughness: 0.88 });
      tube(
        [
          [-0.14, 0.075, 0],
          [-0.1, 0.14, -0.035],
          [0.12, 0.12, -0.03],
          [0.14, 0.015, 0],
          [-0.14, 0.075, 0],
        ],
        0.025,
        rope,
        group,
      );
      tube(
        [
          [0.03, 0.025, 0.005],
          [0.04, -0.075, 0.01],
          [0.075, -0.14, 0.016],
        ],
        0.016,
        rope,
        group,
      );
      mesh(new THREE.CylinderGeometry(0.027, 0.05, 0.09, 18), rope, group, [0.075, -0.17, 0.016]);
    }
    registerItem(view, item, group);
  }
  const sunlight = new THREE.SpotLight('#ffe3a5', 0, 8, 0.8, 0.7, 1.7);
  sunlight.position.set(-0.85, 3.3, -0.55);
  sunlight.target.position.set(-0.05, 0.25, 0.5);
  view.scene.add(sunlight, sunlight.target);
  const glow = canvasTexture(
    (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w / 2);
      grad.addColorStop(0, '#fff0bccc');
      grad.addColorStop(0.6, '#ffe5a650');
      grad.addColorStop(1, '#fff0bc00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    256,
    256,
  );
  const lightPool = mesh(
    new THREE.PlaneGeometry(2.4, 1.3),
    new THREE.MeshBasicMaterial({ map: glow, transparent: true, opacity: 0, depthWrite: false }),
    view.scene,
    [-0.35, 0.606, 0.16],
    [-Math.PI / 2, 0, -0.2],
  );
  lightPool.castShadow = lightPool.receiveShadow = false;
  const leafShadow = mesh(
    new THREE.PlaneGeometry(1.92, 0.79),
    new THREE.MeshBasicMaterial({
      map: treeTexture(true),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    view.scene,
    [-0.25, 0.607, 0.14],
    [-Math.PI / 2, 0, 0],
  );
  leafShadow.castShadow = leafShadow.receiveShadow = false;
  return {
    update(dt, time, { before = false } = {}) {
      const open = value(view, 'open-curtain', before);
      const sewn = value(view, 'sew-button', before);
      curtains[0].scale.x = curtains[1].scale.x = 1 - open * 0.61;
      curtains[0].position.x = -1.44 - open * 0.1;
      curtains[1].position.x = 0.79 + open * 0.14;
      curtains.forEach((curtain, index) => {
        curtain.rotation.z = open * Math.sin(time * 0.8 + index) * 0.006;
      });
      looseThread.visible = sewn < 1;
      button.rotation.z = (1 - sewn) * -0.25;
      sunlight.intensity = open * 4;
      lightPool.material.opacity = open * 0.35;
      leafShadow.material.opacity = open * 0.16;
      leafShadow.position.x = -0.25 + Math.sin(time * 0.38) * 0.025 * open;
    },
  };
}

function glyphTexture(text) {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#f4eacb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${text.length > 1 ? 190 : 222}px "Songti SC", "Noto Serif SC", serif`;
      ctx.shadowColor = '#102c27';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 4;
      ctx.fillText(text, w / 2, h * 0.52);
    },
    text.length > 1 ? 512 : 320,
    320,
  );
}

function signBoard(view) {
  const wood = mat('#bfa67b', { map: view.wood, roughness: 0.63 });
  const iron = mat('#53655c', { metalness: 0.74, roughness: 0.55 });
  const brass = mat('#a28c5f', { metalness: 0.72, roughness: 0.65 });
  mesh(box(3.24, 0.13, 0.75, 0.055), iron, view.scene, [0, 0.065, -0.08]);
  for (const x of [-1.39, 1.39]) mesh(box(0.26, 1.54, 0.2), iron, view.scene, [x, 0.89, -0.36]);
  mesh(box(2.66, 1.3, 0.15, 0.058), wood, view.scene, [0, 1.23, -0.385]);
  const trim = new THREE.Group();
  view.scene.add(trim);
  for (const x of [-1.315, 1.315])
    mesh(box(0.066, 1.22, 0.049, 0.018), brass, trim, [x, 1.23, -0.275]);
  for (const y of [0.617, 1.845]) mesh(box(2.63, 0.055, 0.049, 0.014), brass, trim, [0, y, -0.275]);
  for (const x of [-1.31, 1.31])
    for (const y of [0.66, 1.8])
      mesh(new THREE.SphereGeometry(0.025, 16, 10), brass, trim, [x, y, -0.237]);
  registerAction(view, 'polish-frame', trim);
  addSurfaces(view);
  addTaskSurfaces(view);
  for (const item of view.level.items) {
    const group = new THREE.Group();
    mesh(box(...item.size, 0.022), mat('#56775f', { roughness: 0.47, clearcoat: 0.32 }), group);
    const face = mesh(
      new THREE.PlaneGeometry(item.size[0] - 0.04, item.size[1] - 0.045),
      new THREE.MeshBasicMaterial({
        map: glyphTexture(item.glyph),
        transparent: true,
        depthWrite: false,
      }),
      group,
      [0, 0, 0.031],
    );
    face.castShadow = false;
    for (const x of [-item.size[0] / 2 + 0.045, item.size[0] / 2 - 0.045])
      mesh(new THREE.SphereGeometry(0.012, 10, 8), brass, group, [x, -0.221, 0.032]);
    registerItem(view, item, group);
  }
  const lamp = new THREE.Group();
  view.scene.add(lamp);
  tube(
    [
      [0, 1.9, -0.43],
      [0, 2.15, -0.43],
      [0, 2.23, -0.09],
      [0, 2.13, 0.045],
    ],
    0.025,
    iron,
    lamp,
  );
  mesh(new THREE.ConeGeometry(0.24, 0.115, 40, 1, true), iron, lamp, [0, 2.096, 0.045]);
  const bulb = mesh(
    new THREE.SphereGeometry(0.064, 24, 12),
    mat('#fff1c4', { emissive: '#ffda7f', emissiveIntensity: 0, roughness: 0.15 }),
    lamp,
    [0, 2.044, 0.045],
  );
  const light = new THREE.SpotLight('#ffe0a0', 0, 5, 0.98, 0.8, 1.5);
  light.position.set(0, 2.025, 0.075);
  light.target.position.set(0, 1.07, -0.24);
  view.scene.add(light, light.target);
  const glint = mesh(
    new THREE.PlaneGeometry(0.16, 1.18),
    new THREE.MeshBasicMaterial({
      color: '#ffefb7',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    view.scene,
    [1.316, 1.23, -0.242],
  );
  glint.castShadow = false;
  return {
    update(dt, time, { before = false, stage } = {}) {
      const polished = value(view, 'polish-frame', before);
      const lit = !before && (stage === 'brew' || stage === 'done');
      const fade = lit ? clamp((view.state.brewTime || 0) / 1.1, 0, 1) : 0;
      brass.roughness = 0.65 - polished * 0.43;
      brass.color.setRGB(0.36 + polished * 0.28, 0.26 + polished * 0.25, 0.13 + polished * 0.16);
      light.intensity = fade * 3.4;
      bulb.material.emissiveIntensity = fade * 1.7;
      glint.material.opacity = before ? 0 : polished * (0.025 + Math.sin(time * 1.6) * 0.012);
    },
  };
}

export function buildFinishingScene(view) {
  if (view.level.id === 'window') return windowSeat(view);
  if (view.level.id === 'sign') return signBoard(view);
  throw new Error(`Unknown finishing workbench: ${view.level.id}`);
}
