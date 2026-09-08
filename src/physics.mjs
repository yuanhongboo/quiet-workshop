import RAPIER from '@dimforge/rapier3d-compat';
import { COFFEE, CONFIG, canPlaceItem } from './core.mjs';
function orientation(angles = [0, 0, 0]) {
  const [x, y, z] = angles.map((v) => v / 2),
    cx = Math.cos(x),
    sx = Math.sin(x),
    cy = Math.cos(y),
    sy = Math.sin(y),
    cz = Math.cos(z),
    sz = Math.sin(z);
  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz + sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
  };
}
let init;
export async function createPropsPhysics(state) {
  init ||= RAPIER.init();
  await init;
  return new PropsPhysics(state);
}
export class PropsPhysics {
  constructor(state) {
    this.state = state;
    this.level = state.level || COFFEE;
    this.items = this.level.items;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = CONFIG.physicsStep;
    this.bodies = new Map();
    this.events = [];
    this.held = null;
    this.target = null;
    this.dropTarget = undefined;
    this.lastImpact = new Map();
    this.placements = new Map();
    this.time = 0;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(2.825, 0.1, 1.575).setTranslation(0, -0.115, 0).setFriction(0.8),
    );
    for (const obstacle of this.level.obstacles)
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(...obstacle.half).setTranslation(...obstacle.position),
      );
    for (const item of this.items) this.createBody(item);
    for (let i = 0; i < 80; i++) this.step();
    this.initialPoses = new Map(
      this.items.map((item) => {
        const body = this.bodies.get(item.id);
        return [item.id, { position: body.translation(), rotation: body.rotation() }];
      }),
    );
    for (const item of this.items) if (state.placed.has(item.id)) this.snap(item.id, false);
    this.events.length = 0;
  }
  createBody(item, pose) {
    const position = pose?.position || { x: item.start[0], y: item.start[1], z: item.start[2] };
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinearDamping(0.8)
        .setAngularDamping(CONFIG.itemAngularDamping)
        .setCcdEnabled(true),
    );
    const half = item.size.map((value) => value / 2);
    const shape =
      item.collider === 'box' || item.id === 'filter'
        ? RAPIER.ColliderDesc.cuboid(...half)
        : RAPIER.ColliderDesc.cylinder(half[1], half[0]);
    this.world.createCollider(shape.setMass(item.mass).setFriction(0.8).setRestitution(0.12), body);
    body.setRotation(
      pose?.rotation || orientation(item.startRotation || [0, item.yaw || 0, 0]),
      true,
    );
    this.bodies.set(item.id, body);
    return body;
  }
  recoveryReason(body) {
    const p = body.translation(),
      q = body.rotation(),
      v = body.linvel(),
      a = body.angvel();
    if (
      ![...Object.values(p), ...Object.values(q), ...Object.values(v), ...Object.values(a)].every(
        Number.isFinite,
      )
    )
      return 'invalid-pose';
    if (
      Math.hypot(v.x, v.y, v.z) > CONFIG.maxItemSpeed ||
      Math.hypot(a.x, a.y, a.z) > CONFIG.maxItemSpin
    )
      return 'unstable-motion';
    const bounds = CONFIG.recoveryBounds;
    if (
      Math.abs(p.x) > bounds.x ||
      p.y < bounds.minY ||
      p.y > bounds.maxY ||
      Math.abs(p.z) > bounds.z
    )
      return 'out-of-bounds';
    return null;
  }
  recoverItem(id, reason = 'manual') {
    if (this.state.placed.has(id)) return false;
    const item = this.items.find((value) => value.id === id),
      body = this.bodies.get(id);
    if (!item || !body) return false;
    const canceledDrag = this.held === id;
    if (canceledDrag) {
      this.held = null;
      this.target = null;
    }
    // Recreate the rigid body so invalid rotations/contact state cannot survive a reset.
    this.world.removeRigidBody(body);
    this.createBody(item, this.initialPoses?.get(id));
    this.lastImpact.delete(id);
    this.events.push({ type: 'recover', id, reason, canceledDrag });
    return true;
  }
  recoverUnplaced() {
    return this.items.filter((item) => this.recoverItem(item.id)).map((item) => item.id);
  }
  pick(id) {
    if (this.state.placed.has(id) || this.held) return false;
    const body = this.bodies.get(id);
    if (!body) return false;
    this.held = id;
    this.dropTarget = undefined;
    body.setGravityScale(0, true);
    body.setAngularDamping(CONFIG.grabAngularDamping);
    this.target = { ...body.translation(), y: Math.max(body.translation().y, 0.5) };
    return true;
  }
  move(target, dropTarget) {
    this.dropTarget = dropTarget;
    if (!this.held || !target || ![target.x, target.y, target.z].every(Number.isFinite)) return;
    this.target = {
      x: Math.max(-2.55, Math.min(2.55, target.x)),
      y: target.y,
      z: Math.max(-1.32, Math.min(1.42, target.z)),
    };
  }
  nearSlot() {
    if (!this.held) return false;
    if (!canPlaceItem(this.state, this.held)) return false;
    if (this.dropTarget !== undefined) return this.dropTarget === this.held;
    const item = this.items.find((i) => i.id === this.held),
      p = this.target || this.bodies.get(item.id).translation();
    return (
      Math.hypot(p.x - item.slot[0], p.z - item.slot[2]) <
      (item.snapDistance ?? CONFIG.snapDistance)
    );
  }
  release() {
    if (!this.held) return null;
    const id = this.held,
      body = this.bodies.get(id);
    body.setAngularDamping(CONFIG.itemAngularDamping);
    let placed = null;
    if (this.nearSlot()) {
      this.snap(id);
      placed = id;
    } else if (this.dropTarget) {
      const item = this.items.find((i) => i.id === id),
        missing = (item.requires || []).filter((required) => !this.state.placed.has(required));
      this.events.push({ type: 'placement-hint', id, missing });
      this.recoverItem(id, 'placement-hint');
    } else {
      body.setGravityScale(1, true);
      body.setLinvel({ x: 0, y: -0.05, z: 0 }, true);
    }
    this.held = null;
    this.target = null;
    return placed;
  }
  cancel() {
    if (!this.held) return;
    const body = this.bodies.get(this.held);
    body.setGravityScale(1, true);
    body.setAngularDamping(CONFIG.itemAngularDamping);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.held = null;
    this.target = null;
  }
  snap(id, notify = true) {
    const item = this.items.find((i) => i.id === id),
      body = this.bodies.get(id);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.state.placed.add(id);
    if (notify) {
      const from = body.translation();
      this.placements.set(id, {
        from,
        rotation: body.rotation(),
        time: 0,
        viaFront:
          this.level.id === 'coffee' &&
          from.x * item.slot[0] < 0 &&
          Math.min(from.z, item.slot[2]) < 0.2,
      });
      body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    } else {
      body.setBodyType(RAPIER.RigidBodyType.Fixed, true);
      body.setTranslation({ x: item.slot[0], y: item.slot[1], z: item.slot[2] }, true);
      body.setRotation(orientation(item.slotRotation), true);
    }
  }
  step() {
    const dt = CONFIG.physicsStep;
    this.time += dt;
    for (const [id, placement] of this.placements) {
      const item = this.items.find((i) => i.id === id),
        body = this.bodies.get(id);
      placement.time += dt;
      const t = Math.min(1, placement.time / (placement.viaFront ? 0.8 : 0.3)),
        e = 1 - (1 - t) ** 3;
      let next = {
        x: placement.from.x + (item.slot[0] - placement.from.x) * e,
        y:
          placement.from.y +
          (item.slot[1] - placement.from.y) * e +
          Math.sin(t * Math.PI) * (item.placementLift ?? 0.08),
        z: placement.from.z + (item.slot[2] - placement.from.z) * e,
      };
      if (placement.viaFront) {
        const a =
          t < 0.25
            ? placement.from
            : t < 0.75
              ? { x: placement.from.x, y: 0.7, z: 1.36 }
              : { x: item.slot[0], y: 0.7, z: 1.36 };
        const b =
          t < 0.25
            ? { x: placement.from.x, y: 0.7, z: 1.36 }
            : t < 0.75
              ? { x: item.slot[0], y: 0.7, z: 1.36 }
              : { x: item.slot[0], y: item.slot[1], z: item.slot[2] };
        const phase = t < 0.25 ? t / 0.25 : t < 0.75 ? (t - 0.25) / 0.5 : (t - 0.75) / 0.25,
          smooth = phase * phase * (3 - 2 * phase);
        next = {
          x: a.x + (b.x - a.x) * smooth,
          y: a.y + (b.y - a.y) * smooth,
          z: a.z + (b.z - a.z) * smooth,
        };
      }
      body.setNextKinematicTranslation(next);
      const r = placement.rotation,
        end = orientation(item.slotRotation),
        q = {
          x: r.x + (end.x - r.x) * e,
          y: r.y + (end.y - r.y) * e,
          z: r.z + (end.z - r.z) * e,
          w: r.w + (end.w - r.w) * e,
        },
        length = Math.hypot(q.x, q.y, q.z, q.w);
      body.setNextKinematicRotation({
        x: q.x / length,
        y: q.y / length,
        z: q.z / length,
        w: q.w / length,
      });
      if (t === 1) {
        body.setBodyType(RAPIER.RigidBodyType.Fixed, true);
        body.setTranslation({ x: item.slot[0], y: item.slot[1], z: item.slot[2] }, true);
        body.setRotation(orientation(item.slotRotation), true);
        this.placements.delete(id);
        this.events.push({ type: 'place', id });
      }
    }
    for (const item of this.items) {
      const body = this.bodies.get(item.id);
      if (this.state.placed.has(item.id)) continue;
      const reason = this.recoveryReason(body);
      if (reason) {
        this.recoverItem(item.id, reason);
        continue;
      }
      const v = body.linvel(),
        p = body.translation();
      if (item.id === this.held && this.target) {
        const k = 90,
          d = 19,
          m = item.mass;
        body.applyImpulse(
          {
            x: ((this.target.x - p.x) * k - v.x * d) * m * dt,
            y: ((this.target.y - p.y) * k - v.y * d) * m * dt,
            z: ((this.target.z - p.z) * k - v.z * d) * m * dt,
          },
          true,
        );
      }
      body.userData = { previousY: v.y };
    }
    this.world.step();
    for (const item of this.items) {
      const body = this.bodies.get(item.id);
      if (this.state.placed.has(item.id)) continue;
      const reason = this.recoveryReason(body);
      if (reason) {
        this.recoverItem(item.id, reason);
        continue;
      }
      if (item.id === this.held) continue;
      const delta = body.linvel().y - (body.userData?.previousY || 0);
      if (delta > 0.55 && this.time - (this.lastImpact.get(item.id) || 0) > 0.2) {
        this.events.push({ type: 'clink', id: item.id, strength: Math.min(delta / 3, 1) });
        this.lastImpact.set(item.id, this.time);
      }
    }
  }
  dispose() {
    this.world.free();
  }
}
