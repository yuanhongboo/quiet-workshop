import * as THREE from 'three';
import { findCleaningHint } from './cleaning-hints.mjs';

export class SurfaceGuide {
  constructor(view) {
    this.view = view;
    this.field = null;
    this.remaining = 0;
    this.age = 0;
    this.target = null;
    this.refreshIn = 0;
    this.group = new THREE.Group();
    this.group.visible = false;
    const overlay = { transparent: true, depthTest: false, depthWrite: false, toneMapped: false };
    this.fillMaterial = new THREE.MeshBasicMaterial({
      ...overlay,
      color: '#b5dfc5',
      side: THREE.DoubleSide,
      opacity: 0.12,
    });
    this.lineMaterial = new THREE.LineBasicMaterial({ ...overlay, color: '#477d5b', opacity: 0.9 });
    this.ringMaterial = new THREE.MeshBasicMaterial({
      ...overlay,
      color: '#427455',
      side: THREE.DoubleSide,
      opacity: 0.9,
    });
    this.dotMaterial = new THREE.MeshBasicMaterial({ ...overlay, color: '#fff4cc', opacity: 1 });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), this.ringMaterial);
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.013, 16), this.dotMaterial);
    this.group.add(this.ring, this.dot);
    this.group.renderOrder = 40;
    this.ring.renderOrder = 42;
    this.dot.renderOrder = 43;
    this.element = document.createElement('div');
    this.element.id = 'surface-guide';
    this.element.hidden = true;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.innerHTML =
      '<svg class="surface-guide-line" aria-hidden="true"><path /></svg><div class="surface-guide-label"></div>';
    this.label = this.element.querySelector('.surface-guide-label');
    this.path = this.element.querySelector('path');
    document.body.append(this.element);
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  show(id) {
    const surface = this.view.dirtyMeshes.find((mesh) => mesh.userData.field.spec.id === id);
    if (!surface) return false;
    this.clear();
    this.surface = surface;
    this.field = surface.userData.field;
    this.wasDone = this.field.done;
    this.remaining = this.wasDone ? 2.5 : 7;
    this.age = 0;
    this.refreshIn = 0;
    const { width, height, mask } = this.field.spec;
    const circle = mask?.kind === 'disc';
    this.fill = new THREE.Mesh(
      circle ? new THREE.CircleGeometry(width / 2, 64) : new THREE.PlaneGeometry(width, height),
      this.fillMaterial,
    );
    this.fill.position.z = 0.008;
    this.fill.renderOrder = 40;
    const points = circle
      ? Array.from(
          { length: 64 },
          (_, i) =>
            new THREE.Vector3(
              (Math.cos((i / 64) * Math.PI * 2) * width) / 2,
              (Math.sin((i / 64) * Math.PI * 2) * height) / 2,
              0.01,
            ),
        )
      : [
          [-width / 2, -height / 2],
          [width / 2, -height / 2],
          [width / 2, height / 2],
          [-width / 2, height / 2],
        ].map(([x, y]) => new THREE.Vector3(x, y, 0.01));
    this.outline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      this.lineMaterial,
    );
    this.outline.renderOrder = 41;
    this.group.add(this.fill, this.outline);
    surface.add(this.group);
    this.target = findCleaningHint(this.field);
    this.label.textContent = `${this.field.spec.name} · ${this.wasDone ? '已干净' : '擦这里'}`;
    this.element.dataset.surface = id;
    return true;
  }
  clear() {
    this.field = null;
    this.surface = null;
    this.target = null;
    this.remaining = 0;
    this.group.visible = false;
    this.element.hidden = true;
    delete this.element.dataset.surface;
    if (this.fill) {
      this.group.remove(this.fill);
      this.fill.geometry.dispose();
      this.fill = null;
    }
    if (this.outline) {
      this.group.remove(this.outline);
      this.outline.geometry.dispose();
      this.outline = null;
    }
    this.group.removeFromParent();
  }
  update(dt, { enabled, interacting = false }) {
    if (!this.field) return;
    if (!this.wasDone && this.field.done) {
      this.clear();
      return;
    }
    this.group.visible = enabled && this.remaining > 0;
    this.element.hidden = !this.group.visible;
    if (!enabled) return;
    this.age += dt;
    this.remaining -= dt;
    this.refreshIn -= dt;
    if (this.remaining <= 0) {
      this.clear();
      return;
    }
    if (!this.wasDone && !interacting && this.refreshIn <= 0) {
      const x = Math.round((this.target?.u ?? 0.5) * (this.field.size - 1)),
        y = Math.round((this.target?.v ?? 0.5) * (this.field.size - 1));
      if (!this.target || !this.field.mask[y * this.field.size + x])
        this.target = findCleaningHint(this.field);
      this.refreshIn = 0.5;
    }
    const target = this.target || { u: 0.5, v: 0.5, radius: 0.18 },
      spec = this.field.spec;
    const x = (target.u - 0.5) * spec.width,
      y = (target.v - 0.5) * spec.height;
    this.ring.position.set(x, y, 0.025);
    this.dot.position.set(x, y, 0.028);
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(this.age * 4) * 0.07;
    this.ring.scale.setScalar(target.radius * pulse);
    this.ring.visible = this.dot.visible = !this.wasDone;
    const fade = Math.min(1, this.remaining) * (interacting ? 0.45 : 1);
    this.fillMaterial.opacity =
      (this.reducedMotion ? 0.085 : 0.085 + Math.sin(this.age * 4) * 0.025) * fade;
    this.lineMaterial.opacity = 0.9 * fade;
    this.ringMaterial.opacity = 0.95 * fade;
    this.dotMaterial.opacity = fade;
    const p = this.surface.localToWorld(new THREE.Vector3(x, y, 0.028)).project(this.view.camera);
    if (p.z > 1 || p.z < -1) {
      this.element.hidden = true;
      return;
    }
    const px = ((p.x + 1) * innerWidth) / 2,
      py = ((1 - p.y) * innerHeight) / 2;
    const lx = Math.max(104, Math.min(innerWidth - 104, px));
    const edge = this.surface
      .localToWorld(new THREE.Vector3(x + target.radius, y, 0.028))
      .project(this.view.camera);
    const offset = Math.max(32, Math.abs(((edge.x - p.x) * innerWidth) / 2) + 14);
    let below = false,
      ly = Math.max(112, Math.min(innerHeight - 110, py - offset));
    const controlsBottom =
      innerWidth <= 700
        ? document.getElementById('surface-list')?.getBoundingClientRect().bottom
        : 0;
    if (controlsBottom && ly - this.label.offsetHeight < controlsBottom + 8) {
      below = true;
      ly = Math.min(innerHeight - 110, py + offset);
    }
    this.label.style.transform = below ? 'translate(-50%,0)' : 'translate(-50%,-100%)';
    this.label.style.left = `${lx}px`;
    this.label.style.top = `${ly}px`;
    this.path.setAttribute('d', `M ${lx} ${ly} L ${px} ${py - 5}`);
    this.element.style.opacity = String(fade);
  }
  dispose() {
    this.clear();
    this.element.remove();
    this.ring.geometry.dispose();
    this.dot.geometry.dispose();
    for (const material of [
      this.fillMaterial,
      this.lineMaterial,
      this.ringMaterial,
      this.dotMaterial,
    ])
      material.dispose();
  }
}
