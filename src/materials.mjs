import * as THREE from 'three';
import { random } from './core.mjs';

export function canvasTexture(draw, width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
export function woodTexture() {
  return canvasTexture(
    (ctx, w, h) => {
      const rng = random(191);
      ctx.fillStyle = '#be9468';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1200; i++) {
        const y = rng() * h,
          tone = rng() > 0.5 ? '98,63,36' : '231,202,154';
        ctx.strokeStyle = `rgba(${tone},${0.025 + rng() * 0.15})`;
        ctx.lineWidth = 0.4 + rng() * 1.1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const yy = y + Math.sin(x * 0.009 + y * 0.03) * 2 + Math.sin(x * 0.034 + y) * 0.6;
          x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = 'rgba(80,48,27,.12)';
        ctx.beginPath();
        ctx.ellipse(rng() * w, rng() * h, 15 + rng() * 25, 0.6 + rng() * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    1024,
    512,
  );
}
export function trayTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#a4a8a8';
    ctx.fillRect(0, 0, w, h);
    for (let y = 40; y < h - 30; y += 38) {
      ctx.fillStyle = '#303537';
      ctx.beginPath();
      ctx.roundRect(35, y, w - 70, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#d6dada';
      ctx.fillRect(43, y + 12, w - 86, 2);
    }
  });
}
export function grainTexture() {
  return canvasTexture((ctx, w, h) => {
    const rng = random(658),
      data = ctx.createImageData(w, h);
    for (let i = 0; i < data.data.length; i += 4) {
      const n = 130 + Math.floor(rng() * 120);
      data.data.set([n, n, n, 255], i);
    }
    ctx.putImageData(data, 0, 0);
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = 'rgba(40,30,20,.15)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(rng() * w, rng() * h);
      ctx.lineTo(rng() * w, rng() * h);
      ctx.stroke();
    }
  });
}
export function gaugeTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#ece8d9';
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = '#353d39';
    ctx.fillStyle = '#313b35';
    for (let i = 0; i <= 48; i++) {
      const a = -Math.PI * 0.78 + (i / 48) * Math.PI * 1.56;
      ctx.save();
      ctx.rotate(a);
      ctx.lineWidth = i % 4 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.37);
      ctx.lineTo(0, -w * (i % 4 === 0 ? 0.3 : 0.335));
      ctx.stroke();
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.font = '34px Georgia';
    ctx.fillText('0', -132, 105);
    ctx.fillText('6', 0, -107);
    ctx.fillText('12', 132, 105);
    ctx.font = '20px sans-serif';
    ctx.fillText('BAR', 0, 85);
    ctx.font = '22px Georgia';
    ctx.fillText('RESTO', 0, 20);
  });
}
export function logoTexture() {
  return canvasTexture(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#374b45';
      ctx.font = '80px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('RESTO', w / 2, 88);
      ctx.font = '19px sans-serif';
      ctx.fillText('A SECOND LIFE  ·  1986', w / 2, 129);
    },
    512,
    160,
  );
}
export function grimeMaterial(field, settings, detail) {
  const material = new THREE.MeshPhysicalMaterial(settings);
  const mask = new THREE.DataTexture(
    field.mask,
    field.size,
    field.size,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  );
  mask.minFilter = mask.magFilter = THREE.LinearFilter;
  mask.needsUpdate = true;
  mask.flipY = false;
  const initial = new THREE.DataTexture(
    field.initial,
    field.size,
    field.size,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  );
  initial.minFilter = initial.magFilter = THREE.LinearFilter;
  initial.needsUpdate = true;
  const before = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.dirtMask = { value: mask };
    shader.uniforms.initialDirt = { value: initial };
    shader.uniforms.grainMap = { value: detail };
    shader.uniforms.showBefore = before;
    shader.vertexShader = 'varying vec2 scrubUv;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\n scrubUv=uv;',
    );
    shader.fragmentShader =
      'uniform sampler2D dirtMask; uniform sampler2D initialDirt; uniform sampler2D grainMap; uniform float showBefore; varying vec2 scrubUv;\n' +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      float stain=mix(texture2D(dirtMask,scrubUv).r,texture2D(initialDirt,scrubUv).r,showBefore);
      float grain=texture2D(grainMap,scrubUv*vec2(2.,3.)).r;
      float dirt=smoothstep(.045,.68,stain)*(.93+grain*.07);
      vec3 dirtColor=${field.spec.kind === 'paint' ? 'mix(vec3(.32,.23,.14),vec3(.43,.33,.21),grain)' : 'mix(vec3(.035,.021,.009),vec3(.115,.078,.038),grain)'};
      diffuseColor.rgb=mix(diffuseColor.rgb,dirtColor,dirt*.99);
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,.98,dirt);',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <metalnessmap_fragment>',
      '#include <metalnessmap_fragment>\n metalnessFactor*=1.-dirt;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      `#include <lights_physical_fragment>
      #ifdef USE_CLEARCOAT
      material.clearcoat*=1.-dirt;
      #endif
    `,
    );
  };
  material.customProgramCacheKey = () => `grime-${field.spec.id}`;
  return { material, mask, initial, before, revision: -1 };
}
