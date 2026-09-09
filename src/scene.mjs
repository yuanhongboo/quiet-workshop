import { buildBookScene } from './book-scenes.mjs';
import { buildStationScene } from './station-scenes.mjs';
import { buildPostScene } from './post-scenes.mjs';
import { buildGardenScene } from './garden-scenes.mjs';
import { nearestAngle, nextInspectionAngle } from './inspection.mjs';
import { SurfaceGuide } from './surface-guide.mjs';
import { buildRestorationScene } from './restoration-scenes.mjs';
import { buildFinishingScene } from './finishing-scenes.mjs';
import { buildShopScene } from './shop-scene.mjs';
import { taskAvailable, tasksFor } from './task-actions.mjs';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  canvasTexture,
  woodTexture,
  trayTexture,
  grainTexture,
  gaugeTexture,
  logoTexture,
  grimeMaterial,
} from './materials.mjs';
import { random, clamp, canPlaceItem } from './core.mjs';
import { buildAdditionalLevel } from './new-scenes.mjs';

const box = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, r);
const standard = (color, settings = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...settings });
const physical = (color, settings = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, ...settings });
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

export class WorkshopView {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.state = state;
    this.level = state.level;
    this.inspectable = this.level.inspection ?? this.level.sceneFamily === 'garden';
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.level.room?.wall || '#dadbd0');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer),
      environment = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(environment, 0.035);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.85;
    environment.dispose();
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
    this.cameraPosition = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.angle = 0.28;
    this.targetAngle = 0.28;
    this.viewIndex = 0;
    this.focus = 'enamel';
    this.cameraReady = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hit = null;
    this.dirtyMeshes = [];
    this.actionSurfaces = [];
    this.actionTargets = new Map();
    this.materials = [];
    this.items = new Map();
    this.slots = new Map();
    this.particles = [];
    this.sparkle = 0;
    this.before = false;
    this.pour = 0;
    this.time = 0;
    this.wood = woodTexture();
    this.detail = grainTexture();
    this.detail.wrapS = this.detail.wrapT = THREE.RepeatWrapping;
    this.enamel = physical('#80a38f', { clearcoat: 1, clearcoatRoughness: 0.15, roughness: 0.25 });
    this.chrome = physical('#dfdfda', { metalness: 1, roughness: 0.2 });
    this.brass = physical('#c8a574', { metalness: 0.92, roughness: 0.3 });
    this.dark = standard('#263935', { roughness: 0.4 });
    this.cream = physical('#f3ecda', { clearcoat: 0.85, roughness: 0.16 });
    this.scene.add(new THREE.HemisphereLight('#fcf3de', '#a49b85', 0.55));
    const sun = new THREE.DirectionalLight('#ffe3b3', 3.1);
    sun.position.set(-3.5, 6, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -5,
      right: 5,
      top: 5,
      bottom: -5,
      near: 0.1,
      far: 20,
    });
    sun.shadow.normalBias = 0.012;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#dfedf6', 0.7);
    rim.position.set(4, 3, -2);
    this.scene.add(rim);
    if (!this.level.room?.custom) this.buildRoom();
    if (this.level.sceneFamily === 'book') this.extra = buildBookScene(this);
    else if (this.level.sceneFamily === 'station') this.extra = buildStationScene(this);
    else if (this.level.sceneFamily === 'post') this.extra = buildPostScene(this);
    else if (this.level.sceneFamily === 'garden') this.extra = buildGardenScene(this);
    else if (this.level.id === 'coffee') {
      this.buildMachine();
      this.buildProps();
    } else if (['plant', 'clock'].includes(this.level.id)) this.extra = buildRestorationScene(this);
    else if (['window', 'sign'].includes(this.level.id)) this.extra = buildFinishingScene(this);
    else if (this.level.id === 'opening') this.extra = buildShopScene(this);
    else this.extra = buildAdditionalLevel(this);
    this.buildCleaning();
    this.rippleMat = new THREE.MeshBasicMaterial({
      color: '#edfdf3',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.particleGeo = new THREE.SphereGeometry(1, 8, 6);
    this.resize();
    this.surfaceGuide = new SurfaceGuide(this);
  }
  dispose() {
    this.surfaceGuide?.dispose();
    this.extra?.dispose?.();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    this.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const mats = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of mats) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
      object.shadow?.map?.dispose();
    });
    for (const entry of this.materials) {
      textures.add(entry.mask);
      textures.add(entry.initial);
    }
    for (const texture of textures) texture?.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.particleGeo.dispose();
    this.rippleMat.dispose();
    this.detail.dispose();
    this.wood.dispose();
    this.envTarget.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
  buildRoom() {
    const top = physical('#f5e0bd', { map: this.wood, roughness: 0.4, clearcoat: 0.2 });
    mesh(box(5.65, 0.22, 3.15, 0.045), top, this.scene, [0, -0.125, 0]);
    mesh(
      box(5.6, 2.6, 0.13, 0.02),
      standard(this.level.room?.wall || '#9aa798'),
      this.scene,
      [0, 1.2, -1.73],
    );
    const rng = random(43);
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 17; x++) {
        const shade = new THREE.Color(this.level.room?.tile || '#e2e4d8').multiplyScalar(
          0.94 + rng() * 0.09,
        );
        mesh(
          box(0.315, 0.292, 0.026, 0.01),
          physical(shade, { roughness: 0.22, clearcoat: 0.35 }),
          this.scene,
          [-2.64 + x * 0.33, 0.15 + y * 0.305, -1.65],
        );
      }
    mesh(box(5.65, 0.035, 0.09, 0.01), this.brass, this.scene, [0, 2.17, -1.62]);
    mesh(
      box(5.7, 1.9, 0.1, 0.015),
      standard(this.level.room?.wall || '#cfdbce'),
      this.scene,
      [0, 3.12, -1.74],
    );
    // A shelf and simple tactile objects give the scene a believable human scale.
    mesh(box(1.55, 0.08, 0.34, 0.015), top, this.scene, [1.83, 2.57, -1.52]);
    for (let i = 0; i < 3; i++) {
      const book = mesh(
        box(0.17, 0.44 + i * 0.03, 0.23, 0.014),
        standard(['#698278', '#ba926c', '#e8dfc7'][i]),
        this.scene,
        [1.4 + i * 0.19, 2.84, -1.49],
      );
      book.rotation.z = (i - 1) * 0.045;
    }
    const vase = mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.13, 0),
          new THREE.Vector2(0.18, 0.08),
          new THREE.Vector2(0.16, 0.35),
          new THREE.Vector2(0.09, 0.45),
          new THREE.Vector2(0.085, 0.52),
        ],
        36,
      ),
      physical('#d4b499', { roughness: 0.45, clearcoat: 0.2 }),
      this.scene,
      [-2.3, 0, -1.06],
    );
    const stem = standard('#687e58'),
      leaf = standard('#839d73', { side: THREE.DoubleSide, roughness: 0.7 });
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      tube(
        [
          [-2.3, 0.3, -1.06],
          [-2.3 + Math.sin(a) * 0.08, 0.7, -1.04],
          [-2.3 + Math.sin(a) * 0.3, 1.1 + i * 0.02, -1.06 + Math.cos(a) * 0.2],
        ],
        0.01,
        stem,
        this.scene,
      );
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(0.12, 0.13, 0, 0.36);
      shape.quadraticCurveTo(-0.12, 0.13, 0, 0);
      const l = mesh(new THREE.ShapeGeometry(shape, 16), leaf, this.scene, [
        -2.3 + Math.sin(a) * 0.17,
        0.7 + i * 0.04,
        -1.06 + Math.cos(a) * 0.12,
      ]);
      l.rotation.set(-0.3, a, Math.sin(a) * 0.65);
    }
    const fabric = standard('#d6d4bf', { roughness: 1 });
    for (let i = 0; i < 3; i++)
      mesh(
        box(0.62, 0.035, 0.4, 0.018),
        fabric,
        this.scene,
        [2.16, 0.03 + i * 0.03, -0.85],
        [0, 0.14, 0],
      );
    if (this.level.id === 'coffee')
      mesh(
        new THREE.CylinderGeometry(0.29, 0.31, 0.035, 48),
        physical('#b99569', { map: this.wood, roughness: 0.52 }),
        this.scene,
        [-1.62, 0.012, -0.61],
      );
    this.contact = mesh(
      new THREE.PlaneGeometry(2.55, 1.7),
      new THREE.MeshBasicMaterial({
        map: canvasTexture((ctx, w, h) => {
          const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
          g.addColorStop(0, 'rgba(26,30,22,.32)');
          g.addColorStop(1, 'rgba(26,30,22,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }),
        transparent: true,
        depthWrite: false,
      }),
      this.scene,
      [0, 0.002, -0.1],
      [-Math.PI / 2, 0, 0],
    );
    this.contact.castShadow = false;
  }
  surface(id, geometry, settings, position, rotation) {
    const field = this.state.surfaces.find((s) => s.spec.id === id),
      mat = grimeMaterial(field, settings, this.detail);
    const m = mesh(geometry, mat.material, this.scene, position, rotation);
    m.userData.field = field;
    m.castShadow = false;
    this.dirtyMeshes.push(m);
    this.materials.push({ field, ...mat });
    return m;
  }
  taskSurface(id, geometry, settings, position, rotation) {
    const field = this.state.taskFields.find((field) => field.spec.id === id);
    if (!field) throw new Error(`Missing action field ${id}`);
    const material = grimeMaterial(
      field,
      { ...settings, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 },
      this.detail,
    );
    const object = mesh(geometry, material.material, this.scene, position, rotation);
    object.userData.field = field;
    object.userData.actionId = id;
    object.castShadow = false;
    this.actionSurfaces.push(object);
    this.materials.push({ field, ...material });
    return object;
  }
  hitActionSurface(x, y, id) {
    this.pointer.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return (
      this.raycaster.intersectObjects(
        this.actionSurfaces.filter((object) => object.visible && object.userData.actionId === id),
        false,
      )[0] || null
    );
  }
  actionPosition(id) {
    const targetPosition = tasksFor(this.level).find((task) => task.id === id)?.targetPosition;
    if (targetPosition) return new THREE.Vector3(...targetPosition);
    const object =
      this.actionTargets.get(id)?.object ||
      this.actionSurfaces.find((object) => object.userData.actionId === id);
    if (!object) return null;
    return object.getWorldPosition(new THREE.Vector3());
  }
  hitAction(x, y) {
    this.pointer.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const available = [...this.actionTargets.entries()].filter(([id]) =>
      taskAvailable(this.state, id),
    );
    const hit = this.raycaster.intersectObjects(
      available.map(([, target]) => target.object),
      true,
    )[0];
    if (hit) return hit.object.userData.actionId;
    let closest = innerWidth <= 700 ? 42 : 30,
      result = null;
    for (const [id] of available) {
      const point = this.actionPosition(id)?.project(this.camera);
      if (!point) continue;
      const d = Math.hypot(
        ((point.x + 1) / 2) * innerWidth - x,
        ((1 - point.y) / 2) * innerHeight - y,
      );
      if (d < closest) {
        closest = d;
        result = id;
      }
    }
    return result;
  }
  buildMachine() {
    const body = mesh(box(2.04, 1.88, 0.95, 0.16), this.enamel, this.scene, [0, 1.12, -0.36]);
    mesh(box(2.14, 0.18, 1.64, 0.06), this.dark, this.scene, [0, 0.06, 0.16]);
    for (const x of [-0.85, 0.85])
      for (const z of [-0.51, 0.76])
        mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 24), standard('#353834'), this.scene, [
          x,
          0.017,
          z,
        ]);
    this.surface(
      'enamel',
      new THREE.PlaneGeometry(1.88, 1.55, 1, 1),
      { color: '#86ae96', clearcoat: 0.95, clearcoatRoughness: 0.16, roughness: 0.24 },
      [0, 1.24, 0.118],
    );
    mesh(box(2.04, 0.06, 1.0, 0.045), this.chrome, this.scene, [0, 2.085, -0.34]);
    for (let i = 0; i < 14; i++)
      mesh(box(0.015, 0.016, 0.62, 0.006), this.brass, this.scene, [
        -0.84 + i * 0.13,
        2.121,
        -0.33,
      ]);
    mesh(box(0.05, 1.59, 0.045, 0.014), this.brass, this.scene, [-0.952, 1.24, 0.15]);
    mesh(box(0.05, 1.59, 0.045, 0.014), this.brass, this.scene, [0.952, 1.24, 0.15]);
    const gaugeGroup = new THREE.Group();
    gaugeGroup.position.set(-0.31, 1.68, 0.17);
    this.scene.add(gaugeGroup);
    mesh(
      new THREE.CylinderGeometry(0.215, 0.215, 0.065, 64),
      this.chrome,
      gaugeGroup,
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    );
    mesh(
      new THREE.CircleGeometry(0.19, 64),
      standard('#ffffff', { map: gaugeTexture(), roughness: 0.72 }),
      gaugeGroup,
      [0, 0, 0.035],
    );
    this.needle = mesh(
      box(0.008, 0.14, 0.008, 0.002),
      standard('#9b5037'),
      gaugeGroup,
      [0, 0, 0.044],
    );
    this.needle.geometry.translate(0, 0.052, 0);
    this.needle.rotation.z = 2.15;
    mesh(new THREE.SphereGeometry(0.017, 16, 10), this.brass, gaugeGroup, [0, 0, 0.05]);
    for (const [x, y] of [
      [0.5, 1.69],
      [0.72, 1.12],
    ]) {
      mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.075, 40),
        this.chrome,
        this.scene,
        [x, y, 0.17],
        [Math.PI / 2, 0, 0],
      );
      mesh(
        new THREE.CylinderGeometry(0.105, 0.105, 0.07, 40),
        this.dark,
        this.scene,
        [x, y, 0.225],
        [Math.PI / 2, 0, 0],
      );
      mesh(box(0.01, 0.05, 0.009, 0.003), this.brass, this.scene, [x, y + 0.05, 0.264]);
    }
    const logo = mesh(
      new THREE.PlaneGeometry(0.6, 0.19),
      new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true, depthWrite: false }),
      this.scene,
      [-0.24, 1.27, 0.124],
    );
    logo.castShadow = false;
    mesh(
      new THREE.CylinderGeometry(0.22, 0.2, 0.15, 48),
      this.chrome,
      this.scene,
      [-0.27, 0.98, 0.49],
    );
    mesh(box(0.44, 0.19, 0.43, 0.055), this.dark, this.scene, [-0.27, 1.035, 0.27]);
    tube(
      [
        [0.69, 0.98, 0.31],
        [0.9, 0.75, 0.37],
        [0.9, 0.49, 0.69],
        [0.79, 0.37, 0.8],
      ],
      0.028,
      this.chrome,
      this.scene,
    );
    mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.11, 24),
      this.chrome,
      this.scene,
      [0.79, 0.325, 0.8],
    );
    mesh(box(1.94, 0.09, 0.91, 0.055), this.chrome, this.scene, [0, 0.115, 0.65]);
    this.surface(
      'tray',
      new THREE.PlaneGeometry(1.84, 0.82),
      { color: '#e5e5df', map: trayTexture(), metalness: 0.9, roughness: 0.26, clearcoat: 0.2 },
      [0, 0.163, 0.65],
      [-Math.PI / 2, 0, 0],
    );
    this.surface(
      'counter',
      new THREE.PlaneGeometry(4.7, 1.5),
      { color: '#f6e1c1', map: this.wood, roughness: 0.38, clearcoat: 0.18 },
      [0, -0.009, 0.67],
      [-Math.PI / 2, 0, 0],
    );
    // Steam controls and rear vents stay as small readable material details.
    for (let i = 0; i < 9; i++)
      mesh(box(0.013, 0.5, 0.03, 0.006), this.dark, this.scene, [1.025, 1.15, -0.65 + i * 0.07]);
    this.powerLight = mesh(
      new THREE.SphereGeometry(0.025, 16, 12),
      physical('#6a7970', { emissive: '#88ddb0', emissiveIntensity: 0 }),
      this.scene,
      [0.5, 1.4, 0.16],
    );
    this.streams = new THREE.Group();
    this.scene.add(this.streams);
    this.streams.visible = false;
    for (const x of [-0.3, -0.24])
      mesh(
        new THREE.CylinderGeometry(0.009, 0.014, 0.36, 10),
        physical('#693b16', { roughness: 0.15, clearcoat: 1 }),
        this.streams,
        [x, 0.65, 0.54],
      );
  }
  buildProps() {
    for (const item of this.level.items) {
      const group = new THREE.Group();
      group.userData.itemId = item.id;
      group.position.set(...item.start);
      group.rotation.y = item.yaw;
      this.scene.add(group);
      if (item.id === 'cup') {
        const profile = [
          [0, -0.15],
          [0.1, -0.15],
          [0.16, -0.12],
          [0.18, 0.12],
          [0.174, 0.15],
          [0.154, 0.15],
          [0.145, -0.08],
          [0.1, -0.11],
          [0, -0.11],
        ].map((p) => new THREE.Vector2(...p));
        mesh(new THREE.LatheGeometry(profile, 64), this.cream, group);
        mesh(
          new THREE.TorusGeometry(0.085, 0.025, 12, 40, Math.PI * 1.65),
          this.cream,
          group,
          [0.2, 0.01, 0],
          [0, 0, -Math.PI * 0.32],
        );
        this.coffee = mesh(
          new THREE.CircleGeometry(0.151, 48),
          physical('#bc8745', {
            roughness: 0.35,
            clearcoat: 0.5,
            map: canvasTexture((ctx, w, h) => {
              ctx.fillStyle = '#b67a35';
              ctx.fillRect(0, 0, w, h);
              const rng = random(231);
              for (let i = 0; i < 500; i++) {
                ctx.fillStyle = `rgba(248,222,157,${rng() * 0.3})`;
                ctx.beginPath();
                ctx.arc(rng() * w, rng() * h, 2 + rng() * 12, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.strokeStyle = '#efdeb0';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.ellipse(w / 2, h / 2, 75, 130, -0.4, 0, Math.PI * 2);
              ctx.stroke();
            }),
          }),
          group,
          [0, -0.1, 0],
          [-Math.PI / 2, 0, 0],
        );
        this.coffee.visible = false;
      } else if (item.id === 'filter') {
        mesh(new THREE.CylinderGeometry(0.15, 0.135, 0.09, 48), this.chrome, group, [-0.25, 0, 0]);
        mesh(
          new THREE.CircleGeometry(0.125, 40),
          standard('#777f7c', { metalness: 1, roughness: 0.5 }),
          group,
          [-0.25, 0.048, 0],
          [-Math.PI / 2, 0, 0],
        );
        mesh(
          new THREE.CylinderGeometry(0.048, 0.058, 0.46, 32),
          physical('#765139', { map: this.wood, roughness: 0.36, clearcoat: 0.28 }),
          group,
          [0.09, 0, 0],
          [0, 0, Math.PI / 2],
        );
        mesh(
          new THREE.SphereGeometry(0.058, 24, 16),
          physical('#765139', { roughness: 0.4 }),
          group,
          [0.32, 0, 0],
        );
      } else {
        mesh(
          new THREE.CylinderGeometry(0.21, 0.195, 0.51, 48),
          physical('#bda77e', { roughness: 0.4, clearcoat: 0.6 }),
          group,
          [0, -0.03, 0],
        );
        mesh(
          new THREE.CylinderGeometry(0.218, 0.218, 0.06, 48),
          physical('#7c5940', { map: this.wood, clearcoat: 0.2, roughness: 0.5 }),
          group,
          [0, 0.265, 0],
        );
        const label = canvasTexture(
          (ctx, w, h) => {
            ctx.fillStyle = '#f1e8d0';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#34483c';
            ctx.textAlign = 'center';
            ctx.font = '56px Georgia';
            ctx.fillText('SLOW', w / 2, 82);
            ctx.font = '20px sans-serif';
            ctx.fillText('COFFEE ROASTERS', w / 2, 120);
          },
          512,
          160,
        );
        mesh(
          new THREE.PlaneGeometry(0.3, 0.15),
          standard('#ffffff', { map: label, roughness: 0.8 }),
          group,
          [0, -0.01, 0.204],
        );
      }
      group.traverse((child) => {
        if (child.isMesh) child.userData.itemId = item.id;
      });
      this.items.set(item.id, group);
      const slot = new THREE.Group();
      this.scene.add(slot);
      slot.position.set(...item.slot);
      slot.position.y = item.id === 'filter' ? 0.94 : item.id === 'cup' ? 0.17 : 0.022;
      const slotMaterial = new THREE.MeshBasicMaterial({
        color: '#4d8860',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = mesh(
        new THREE.TorusGeometry(
          item.id === 'filter' ? 0.2 : item.id === 'cup' ? 0.23 : 0.28,
          0.009,
          6,
          56,
        ),
        slotMaterial,
        slot,
        [0, 0, 0],
        item.id === 'filter' ? [0, 0, 0] : [-Math.PI / 2, 0, 0],
      );
      ring.castShadow = false;
      const center = mesh(
        new THREE.CircleGeometry(item.id === 'filter' ? 0.19 : 0.23, 48),
        new THREE.MeshBasicMaterial({
          color: '#c3debb',
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
        slot,
        [0, 0, 0],
        item.id === 'filter' ? [0, 0, 0] : [-Math.PI / 2, 0, 0],
      );
      center.castShadow = false;
      slot.visible = false;
      this.slots.set(item.id, slot);
    }
  }
  buildCleaning() {
    this.paintBrush = new THREE.Group();
    this.paintBrush.visible = false;
    this.scene.add(this.paintBrush);
    mesh(box(0.17, 0.022, 0.09, 0.004), standard('#a1ae82'), this.paintBrush, [0, 0, 0]);
    mesh(box(0.17, 0.035, 0.05, 0.006), this.chrome, this.paintBrush, [0, 0.014, 0.065]);
    mesh(
      box(0.055, 0.038, 0.23, 0.012),
      physical('#b58c5d', { map: this.wood, roughness: 0.5 }),
      this.paintBrush,
      [0, 0.019, 0.19],
    );
    this.sponge = new THREE.Group();
    this.scene.add(this.sponge);
    this.sponge.visible = false;
    mesh(
      box(0.31, 0.06, 0.2, 0.025),
      standard('#bcbf8a', { roughness: 1 }),
      this.sponge,
      [0, 0, 0],
    );
    mesh(
      box(0.3, 0.014, 0.195, 0.015),
      standard('#6d8a72', { roughness: 0.98 }),
      this.sponge,
      [0, 0.033, 0],
    );
    this.scrubGlow = mesh(
      new THREE.RingGeometry(0.195, 0.2, 56),
      new THREE.MeshBasicMaterial({
        color: '#eef9e6',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      this.sponge,
      [0, -0.032, 0],
      [-Math.PI / 2, 0, 0],
    );
    this.scrubGlow.castShadow = false;
  }
  hitSurface(x, y) {
    this.pointer.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.dirtyMeshes, false)[0] || null;
  }
  hitItem(x, y) {
    this.pointer.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return (
      this.raycaster
        .intersectObjects([...this.items.values()], true)
        .find((hit) => !this.state.placed.has(hit.object.userData.itemId)) || null
    );
  }
  planePoint(x, y, height) {
    this.pointer.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -height),
      new THREE.Vector3(),
    );
  }
  positionTool(hit, active, kind = 'sponge') {
    const tool = kind === 'paint' ? this.paintBrush : this.sponge;
    this.sponge.visible = !!hit && active && kind !== 'paint';
    this.paintBrush.visible = !!hit && active && kind === 'paint';
    if (!hit) return;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    tool.position.copy(hit.point).addScaledVector(normal, 0.045);
    tool.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    tool.rotateY(Math.sin(this.time * 8) * 0.06);
    if (active && this.particles.length < 100) {
      for (let i = 0; i < 2; i++) {
        const m = new THREE.Mesh(
          this.particleGeo,
          new THREE.MeshBasicMaterial({
            color:
              kind === 'paint'
                ? hit.object.userData.field.spec.color || '#90a38a'
                : i
                  ? '#f7f8e9'
                  : '#e8efdb',
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }),
        );
        m.position
          .copy(hit.point)
          .add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.07, (Math.random() - 0.5) * 0.2));
        m.scale.setScalar(0.009 + Math.random() * 0.018);
        this.scene.add(m);
        this.particles.push({
          mesh: m,
          life: 0.4 + Math.random() * 0.4,
          v: new THREE.Vector3(
            (Math.random() - 0.5) * 0.12,
            0.1 + Math.random() * 0.15,
            (Math.random() - 0.5) * 0.12,
          ),
        });
      }
    }
  }
  project(position) {
    return new THREE.Vector3(...position).project(this.camera);
  }
  get focus() { return this._focus; }
  set focus(id) {
    this._focus = id;
    if (this.inspectable) {
      const field = this.level.surfaces.find(surface => surface.id === id);
      this.targetAngle = nearestAngle(this.angle, field?.camera?.angle ?? 0.28);
    }
  }
  toggleInspection() {
    this.inspectClose = !this.inspectClose;
    return this.inspectClose;
  }
  nextView() {
    if (this.inspectable) {
      this.targetAngle = nextInspectionAngle(this.targetAngle);
      return;
    }
    const values = [0.28, -0.16, 0.04];
    this.viewIndex = (this.viewIndex + 1) % values.length;
    this.targetAngle = values[this.viewIndex];
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  render(
    dt,
    time,
    physics,
    {
      stage,
      before = false,
      held = null,
      pouring = false,
      actionId = null,
      activeTaskId = null,
      guideEnabled = false,
      scrubbing = false,
    } = {},
  ) {
    this.time = time;
    this.before = before;
    if (this.inspectable && this.lastStage !== stage) {
      if (stage !== 'clean') { this.targetAngle = nearestAngle(this.angle, 0.28); this.inspectClose = false; }
      else this.focus = this._focus;
      this.lastStage = stage;
    }
    for (const entry of this.materials) {
      entry.before.value = before ? 1 : 0;
      if (entry.revision !== entry.field.revision) {
        entry.mask.needsUpdate = true;
        entry.revision = entry.field.revision;
      }
    }
    for (const item of this.level.items) {
      const model = this.items.get(item.id),
        body = physics?.bodies.get(item.id);
      if (before) {
        const initial = physics.initialPoses.get(item.id);
        model.position.copy(initial.position);
        model.quaternion.copy(initial.rotation);
      } else if (body) {
        model.position.copy(body.translation());
        model.quaternion.copy(body.rotation());
      }
      const slot = this.slots.get(item.id);
      slot.visible =
        stage === 'tidy' && !this.state.placed.has(item.id) && (!held || held === item.id);
      slot.children[0].material.color.set(
        canPlaceItem(this.state, item.id) ? '#4d8860' : '#b39565',
      );
      slot.children[0].material.opacity = 0.75 + Math.sin(time * 3) * 0.12;
    }
    for (const surface of this.actionSurfaces) {
      surface.visible =
        !before &&
        this.state.surfaces.every((s) => s.done) &&
        this.state.placed.size === this.level.items.length;
    }
    if (this.level.id === 'coffee') {
      this.pour = before ? 0 : clamp(this.state.brewTime / 4, 0, 1);
      this.coffee.visible = this.pour > 0;
      this.coffee.position.y = -0.1 + this.pour * 0.235;
      this.streams.visible = stage === 'brew' && !before;
      this.powerLight.material.emissiveIntensity = stage === 'brew' || stage === 'done' ? 1.1 : 0;
      this.needle.rotation.z =
        2.15 - (stage === 'brew' ? 2.9 + Math.sin(time * 4) * 0.05 : stage === 'done' ? 0.15 : 0);
      if ((stage === 'done' || stage === 'brew') && !before && Math.random() < dt * 9) {
        const cup = this.items.get('cup'),
          m = new THREE.Mesh(
            this.particleGeo,
            new THREE.MeshBasicMaterial({
              color: '#fff7e4',
              transparent: true,
              opacity: 0.1,
              depthWrite: false,
            }),
          );
        m.position.copy(cup.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.13, 0.16, 0));
        m.scale.set(0.025, 0.035, 0.025);
        this.scene.add(m);
        this.particles.push({
          mesh: m,
          life: 1.7,
          v: new THREE.Vector3(0.01, 0.2, 0),
          steam: true,
        });
      }
    } else this.extra.update(dt, time, { before, pouring, stage, actionId });
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.visible = !before;
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.v, dt);
      if (!p.steam) p.v.y -= dt * 0.3;
      else {
        p.mesh.position.x += Math.sin(time * 4 + p.life) * dt * 0.02;
        p.mesh.scale.multiplyScalar(1 + dt * 0.5);
      }
      p.mesh.material.opacity = Math.min(p.steam ? 0.12 : 0.45, p.life * 0.5);
    }
    this.angle += (this.targetAngle - this.angle) * (1 - Math.exp(-6 * dt));
    const aspect = innerWidth / innerHeight;
    let distance = aspect < 1.2 ? 9 : 7.2,
      height = 2.95,
      lookY = 0.93,
      lookZ = 0.03,
      lookX = aspect > 1.45 ? -0.48 : 0;
    if (this.level.id === 'coffee' && aspect < 0.8 && innerWidth <= 700) {
      if (stage === 'tidy') {
        distance = 15.6;
        height = 7;
        lookY = 0.6;
      } else if (stage === 'clean' && this.focus === 'counter') {
        distance = 17.5;
        height = 7.2;
        lookY = 0.1;
        lookZ = 0.8;
      } else if (stage === 'clean' && this.focus === 'tray') {
        distance = 7;
        height = 4;
        lookY = 0.2;
        lookZ = 0.6;
      } else {
        distance = 8.9;
        height = 3.0;
        lookY = 1.16;
        lookZ = 0.12;
      }
    }
    if (this.level.id !== 'coffee') {
      distance = aspect < 1.2 ? 10 : 8.4;
      height = this.level.id === 'desk' ? 4.2 : 6.2;
      lookY = 0.48;
      lookZ = 0.1;
      const desktop = this.level.cameras?.desktop;
      if (desktop) {
        const values = desktop.distance
          ? desktop
          : desktop[
              stage === 'intro'
                ? 'default'
                : ['operate', 'ready', 'brew', 'done'].includes(stage)
                  ? 'finale'
                  : stage
            ] || desktop.default;
        if (values) ({ distance, height, lookY, lookZ, lookX = lookX } = values);
      }
      if (aspect < 0.8 && innerWidth <= 700) {
        const cameras = this.level.cameras.mobile;
        const settings =
          stage === 'overview'
            ? cameras.overview || cameras.default
            : stage === 'intro'
              ? cameras.default
              : stage === 'clean'
                ? this.state.surfaces.find((s) => s.spec.id === this.focus)?.spec.camera
                : stage === 'tidy'
                  ? cameras.tidy
                  : cameras.finale;
        ({ distance, height, lookY, lookZ } = settings || cameras.default);
        lookX = (settings || cameras.default).lookX || 0;
      }
    }
    if (stage === 'operate' && activeTaskId && innerWidth <= 700 && aspect < 0.8) {
      const settings =
        tasksFor(this.level).find((task) => task.id === activeTaskId)?.camera ||
        tasksFor(this.level).find((task) => task.id === activeTaskId)?.field?.camera;
      if (settings) ({ distance, height, lookY, lookZ, lookX = lookX } = settings);
    }
    // Tall desktop panes keep the interactive workbench clear of the left task panel.
    if (innerWidth > 700 && aspect < 1.3 && ['clean', 'tidy'].includes(stage)) {
      const fit = 1.45 / aspect;
      distance *= fit;
      height = lookY + (height - lookY) * fit;
      if (!this.inspectable) lookX = -1.4;
    }
    if (this.inspectable && innerWidth <= 700 && stage === 'clean') {
      const spec = this.state.surfaces.find(field => field.spec.id === this.focus)?.spec;
      if (spec) {
        const minDistance = (spec.width * 1.12) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * aspect);
        if (distance < minDistance) {
          height = lookY + (height - lookY) * minDistance / distance;
          distance = minDistance;
        }
      }
    }
    if (this.inspectable && this.inspectClose && stage !== 'overview') {
      const spec = stage === 'clean' ? this.state.surfaces.find(field => field.spec.id === this.focus)?.spec : null;
      const settings = spec?.camera;
      if (settings) {
        lookX = settings.lookX ?? spec.position[0];
        lookY = settings.lookY ?? spec.position[1];
        lookZ = settings.lookZ ?? spec.position[2];
      }
      distance *= innerWidth <= 700 ? 0.8 : 0.76;
      height = lookY + (height - lookY) * 0.76;
    }
    if (this.inspectable && innerWidth > 700) {
      const shift = aspect < 1.3 ? 1.32 : 0.72;
      lookX -= Math.cos(this.angle) * shift;
      lookZ += Math.sin(this.angle) * shift;
    }
    const target = new THREE.Vector3(lookX, lookY, lookZ),
      position = new THREE.Vector3(
        Math.sin(this.angle) * distance +
          (this.inspectable || (aspect < 0.8 && innerWidth <= 700 && this.level.id !== 'coffee') ? lookX : 0),
        height,
        Math.cos(this.angle) * distance + (this.inspectable ? lookZ : 0),
      );
    if (!this.cameraReady) {
      this.camera.position.copy(position);
      this.look.copy(target);
      this.cameraReady = true;
    } else {
      this.camera.position.lerp(position, 1 - Math.exp(-5 * dt));
      this.look.lerp(target, 1 - Math.exp(-5 * dt));
    }
    this.camera.lookAt(this.look);
    this.camera.updateMatrixWorld();
    this.surfaceGuide.update(dt, {
      enabled: guideEnabled && stage === 'clean' && !before,
      interacting: scrubbing,
    });
    this.renderer.render(this.scene, this.camera);
  }
}
