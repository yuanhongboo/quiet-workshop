import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BAKE_FINALE_LEVELS, BAKE_PEEL, BAKE_DISPLAY, BAKE_OPENING } from '../src/bake-finale-levels.mjs';
import { buildBakeFinaleScene, BAKE_OVERVIEW_IDS } from '../src/bake-finale-scenes.mjs';
import { GrimeField, makeState, packState, unpackState, stageFor, beginFinale, advanceFinale } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue } from '../src/task-actions.mjs';
import { buildBakeEnvironment } from '../src/bake-environment.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function organized(level) {
  const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
  level.items.forEach(item => state.placed.add(item.id)); return state;
}
function finish(state, task) {
  if (task.mode === 'tap') return completeTask(state, task.id);
  if (task.mode === 'dial') return setTaskValue(state, task.id, task.target);
  for (let i = 0; i < 90; i++) advanceTask(state, task.id, 0.1);
  return state.taskValues[task.id] >= task.target;
}
for (const level of BAKE_FINALE_LEVELS) {
  test(`${level.id}: ordered task chain saves midway and reaches the real finale`, () => {
    let state = organized(level);
    assert.equal(beginFinale(state), false);
    const last = level.operation.tasks.at(-1);
    assert.equal(last.mode === 'dial' ? setTaskValue(state, last.id, last.target) : completeTask(state, last.id), false);
    for (const task of level.operation.tasks) {
      if (task.mode === 'hold') {
        for (let i = 0; i < 7; i++) advanceTask(state, task.id, 0.1);
        const partial = state.taskValues[task.id]; assert.ok(partial > 0 && partial < 1);
        state = makeState(unpackState(packState(state), level), level); assert.equal(state.taskValues[task.id], partial);
      }
      assert.equal(finish(state, task), true, task.id);
    }
    assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true); for(let i=0;i<100;i++)advanceFinale(state,.1); assert.equal(stageFor(state),'done'); assert.equal(state.completed,true);
  });
}
for (const level of [BAKE_PEEL, BAKE_DISPLAY]) {
  test(`${level.id}: cleaning and Rapier placements complete and survive reload`, async () => {
    for (const spec of level.surfaces) {
      const field = new GrimeField(spec);
      for (let pass = 0; pass < 6 && !field.done; pass++) for (let v = 0; v <= 1.025; v += 0.035) for (let u = 0; u <= 1.025; u += 0.035) field.scrub(u, v, 0.18, 0.05);
      assert.equal(field.done, true, spec.id);
    }
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        assert.equal(physics.recoveryReason(physics.bodies.get(item.id)), null);
        assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 180; i++) physics.step();
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 60; i++) physics.step();
        assert.ok(Math.abs(physics.bodies.get(item.id).translation().y - item.slot[1]) < 0.001);
      }
      assert.equal(state.placed.size, level.items.length);
      assert.equal(physics.events.filter(event => event.type === 'recover').length, 0);
    } finally { physics.dispose(); }
    const resumedPhysics = await createPropsPhysics(makeState(unpackState(packState(state), level), level));
    try { for (const item of level.items) assert.ok(Math.abs(resumedPhysics.bodies.get(item.id).translation().x - item.slot[0]) < 0.001); }
    finally { resumedPhysics.dispose(); }
  });
  test(`${level.id}: dependent parts cannot attach early or unlock an operation`, async () => {
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      const item = level.items.find(item => item.requires?.length); physics.pick(item.id);
      physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
      assert.equal(physics.release(), null); assert.equal(state.placed.size, 0);
      assert.ok(physics.events.some(event => event.type === 'placement-hint'));
      assert.equal(advanceTask(state, level.operation.tasks[0].id, 0.1), false);
    } finally { physics.dispose(); }
  });
}
function fixture(level, withEnvironment = false) {
  const oldDocument = globalThis.document;
  const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const state = organized(level);
  const view = {
    level, state, scene: new THREE.Scene(), wood: new THREE.Texture(), renderer: { toneMappingExposure: 1 }, angle: 0.28, items: new Map(), slots: new Map(), actionTargets: new Map(), dirtyMeshes: [],
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position); object.rotation.set(...rotation); object.name = id;
      this.scene.add(object); this.dirtyMeshes.push(object); return object;
    },
  };
  const model = buildBakeFinaleScene(view), environment = withEnvironment ? buildBakeEnvironment(view) : null;
  const extra = { update(...args) { environment?.update(...args); model.update(...args); } };
  return { view, extra, restore() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    view.scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); });
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
    globalThis.document = oldDocument;
  } };
}
for (const level of BAKE_FINALE_LEVELS) {
  test(`${level.id}: all interaction meshes exist within the phone geometry budget`, () => {
    const { view, extra, restore } = fixture(level);
    try {
      assert.equal(view.items.size, level.items.length); assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      level.operation.tasks.forEach(task => assert.ok(view.actionTargets.has(task.id), task.id));
      extra.update(0.016, 2, { before: false, stage: 'operate' });
      let meshes = 0, triangles = 0;
      view.scene.traverse(object => {
        if (!object.isMesh) return; meshes++;
        assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
        triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
      });
      assert.ok(meshes > 25 && meshes < (level.bakeOverview ? 350 : 150), `${meshes} meshes`);
      assert.ok(triangles < (level.bakeOverview ? 150000 : 100000), `${triangles} triangles`);
    } finally { restore(); }
  });
}
function cameraFor(settings, width = 390, height = 844) {
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 60), angle = settings.angle ?? 0.28;
  camera.position.set(Math.sin(angle) * settings.distance + (settings.lookX || 0), settings.height, Math.cos(angle) * settings.distance + (settings.lookZ || 0));
  camera.lookAt(settings.lookX || 0, settings.lookY, settings.lookZ || 0); camera.updateMatrixWorld(true); return camera;
}
function projectedBounds(object, camera) {
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  object.traverse(child => {
    if (!child.isMesh) return;
    const vertices = child.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(child.matrixWorld).project(camera), x = (v.x + 1) * 195, y = (1 - v.y) * 422;
      bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x); bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
    }
  }); return bounds;
}
function visible(object) {
  for (let current = object; current; current = current.parent) if (!current.visible) return false;
  return !object.material?.transparent || object.material.opacity > 0.8;
}
for (const level of [BAKE_PEEL, BAKE_DISPLAY]) {
  test(`${level.id}: phone tidy camera contains and can directly pick each loose prop`, async () => {
    const { view, extra, restore } = fixture(level, true); view.state.placed.clear();
    const physics = await createPropsPhysics(view.state);
    try {
      const camera = cameraFor(level.cameras.mobile.tidy);
      for (const phase of ['initial', 'fitted']) {
        if (phase === 'fitted') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const model = view.items.get(item.id), body = physics.bodies.get(item.id); model.position.copy(body.translation()); model.quaternion.copy(body.rotation());
        }
        extra.update(.016,2,{stage:'tidy'}); view.scene.updateMatrixWorld(true);
        for (const item of level.items) {
          const model = view.items.get(item.id), bounds = projectedBounds(model, camera);
          assert.ok(bounds.minX >= 8 && bounds.maxX <= 382, `${phase} ${item.id} x: ${bounds.minX}..${bounds.maxX}`);
          assert.ok(bounds.minY >= 190 && bounds.maxY <= 690, `${phase} ${item.id} y: ${bounds.minY}..${bounds.maxY}`);
          if (phase === 'initial') {
            let pickable = false;
            model.traverse(child => {
              if (!child.isMesh) return;
              const target = child.getWorldPosition(new THREE.Vector3()), ray = new THREE.Raycaster(camera.position, target.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(target) + 0.04;
              const hit = ray.intersectObjects(view.scene.children, true).find(entry => visible(entry.object));
              if (hit?.object.userData.itemId === item.id) pickable = true;
            });
            assert.ok(pickable, `${item.id} is behind opaque geometry`);
          }
        }
      }
    } finally { physics.dispose(); restore(); }
  });
  test(`${level.id}: real cleaning representations are reachable with initial Rapier props and the full room`, async () => {
    const { view, extra, restore } = fixture(level, true);
    view.state = makeState(null, level);
    const physics = await createPropsPhysics(view.state);
    try {
      for (const item of level.items) { const body = physics.bodies.get(item.id), object = view.items.get(item.id); object.position.copy(body.translation()); object.quaternion.copy(body.rotation()); }
      extra.update(0.016, 2, { stage: 'clean' });
      view.scene.updateMatrixWorld(true);
      for (const spec of level.surfaces) {
        const patch = view.scene.getObjectByName(spec.id), camera = cameraFor(spec.camera);
        let open = 0;
        for (const [u, v] of [[0, 0], [-0.28, 0], [0.28, 0], [0, -0.25], [0, 0.25]]) {
          const target = new THREE.Vector3(u * spec.width, v * spec.height, 0).applyMatrix4(patch.matrixWorld);
          const ray = new THREE.Raycaster(camera.position, target.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(target) + 0.025;
          const hit = ray.intersectObjects(view.scene.children, true).find(entry => visible(entry.object));
          if (hit?.object === patch) open++;
        }
        assert.ok(open >= 4, `${spec.id}: ${open}/5 clear samples with real initial props`);
      }
    } finally { physics.dispose(); restore(); }
  });
}


function pose(view, physics) { for(const item of view.level.items){const body=physics.bodies.get(item.id),model=view.items.get(item.id);model.position.copy(body.translation());model.quaternion.copy(body.rotation());} }
function reachable(view, camera, id, object) {
  let reached=false;object.traverse(child=>{if(!child.isMesh)return;const vertices=child.geometry.getAttribute('position');
    for(let i=0;i<vertices.count&&!reached;i+=Math.max(1,Math.floor(vertices.count/45))){const target=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(child.matrixWorld),ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(target)+.02;const hit=ray.intersectObjects(view.scene.children,true).find(entry=>visible(entry.object));if(hit?.object.userData.actionId===id)reached=true;}
  });return reached;
}
for(const level of BAKE_FINALE_LEVELS)test(`${level.id}: every fitted operation is touchable on phone and desktop`,async()=>{
  const{view,extra,restore}=fixture(level,true);view.state.seasonRestored=new Set(BAKE_OVERVIEW_IDS);const physics=await createPropsPhysics(view.state);
  try{
    for(const task of level.operation.tasks){
      pose(view,physics);extra.update(.016,2,{stage:'operate',actionId:task.id});view.scene.updateMatrixWorld(true);
      for(const screen of['desktop','mobile']){const camera=cameraFor(level.cameras[screen].default,screen==='mobile'?390:1280,screen==='mobile'?844:720);assert.ok(reachable(view,camera,task.id,view.actionTargets.get(task.id).object),`${screen} ${task.id} is behind opaque geometry`);}
      assert.equal(finish(view.state,task),true);
    }
    assert.equal(beginFinale(view.state),true);for(let i=0;i<100;i++)advanceFinale(view.state,.1);assert.equal(stageFor(view.state),'done');
  }finally{physics.dispose();restore();}
});
for(const level of[BAKE_PEEL,BAKE_DISPLAY])test(`${level.id}: saved finishing effects and comparison restore without state mutation`,async()=>{
  const{view,extra,restore}=fixture(level,true);const physics=await createPropsPhysics(view.state);
  try{
    const read=()=>level===BAKE_PEEL?[view.scene.getObjectByName('bake-peel-loaf').position.toArray(),view.scene.getObjectByName('bake-peel-loaf').userData.scored]:[view.scene.getObjectByName('bake-display-door-hinge').rotation.z,...[0,1,2].map(i=>view.scene.getObjectByName(`bake-display-loaf-${i}`).visible)];
    pose(view,physics);extra.update(.016,2,{stage:'operate',before:true});const initial=read();
    for(const task of level.operation.tasks.slice(0,-1))finish(view.state,task);for(let i=0;i<14;i++)advanceTask(view.state,level.operation.tasks.at(-1).id,.1);
    extra.update(.016,2,{stage:'operate'});const changed=read();assert.notDeepEqual(changed,initial);const saved=packState(view.state);view.state=makeState(unpackState(saved,level),level);
    extra.update(.016,2,{stage:'operate'});assert.deepEqual(read(),changed);assert.equal(packState(view.state),saved);
    extra.update(.016,2,{stage:'operate',before:true});assert.deepEqual(read(),initial);assert.equal(packState(view.state),saved);
  }finally{physics.dispose();restore();}
});
test('bakery overview accumulates 0, 3, 6 and 8 repairs with isolated chapter rings and no early bread',()=>{
  const{view,extra,restore}=fixture(BAKE_OPENING);
  try{for(const count of[0,3,6,8]){
    view.state.seasonRestored=new Set(BAKE_OVERVIEW_IDS.slice(0,count));view.state.chapterHighlights=new Set(BAKE_OVERVIEW_IDS.slice(Math.max(0,count-3),count));const saved=packState(view.state),collection=[...view.state.seasonRestored],chapter=[...view.state.chapterHighlights];
    extra.update(.1,2,{stage:'overview'});
    for(const[i,id]of BAKE_OVERVIEW_IDS.entries()){assert.equal(view.scene.getObjectByName(`restored-${id}`).visible,i<count);assert.equal(view.scene.getObjectByName(`placeholder-${id}`).visible,i>=count);assert.equal(view.scene.getObjectByName(`chapter-highlight-${id}`).visible,chapter.includes(id));}
    assert.equal(view.scene.getObjectByName('bake-final-loaf').visible,count===8);assert.equal(packState(view.state),saved);assert.deepEqual([...view.state.seasonRestored],collection);assert.deepEqual([...view.state.chapterHighlights],chapter);
    extra.update(.1,2,{stage:'overview',before:true});for(const id of BAKE_OVERVIEW_IDS)assert.equal(view.scene.getObjectByName(`restored-${id}`).visible,false);assert.equal(view.scene.getObjectByName('bake-final-loaf').visible,false);
  }}finally{restore();}
});
test('oven bread moves, rises, turns golden and arrives at the counter exactly from saved progress',()=>{
  const{view,extra,restore}=fixture(BAKE_OPENING);view.state.seasonRestored=new Set(BAKE_OVERVIEW_IDS);
  try{
    const bread=view.scene.getObjectByName('bake-final-loaf'),root=view.scene.getObjectByName('evening-bakery-overview');
    extra.update(.016,3,{stage:'operate'});const start=bread.position.clone();assert.equal(bread.userData.gold,0);
    finish(view.state,BAKE_OPENING.operation.tasks[0]);for(let i=0;i<25;i++)advanceTask(view.state,'bakery-bake',.1);
    extra.update(.016,3,{stage:'operate'});assert.ok(bread.position.z<start.z-1);assert.ok(bread.userData.gold>0&&bread.userData.gold<1);assert.equal(bread.userData.rise,bread.userData.gold);
    const saved=packState(view.state),position=bread.position.toArray(),gold=bread.userData.gold;view.state=makeState(unpackState(saved,BAKE_OPENING),BAKE_OPENING);view.state.seasonRestored=new Set(BAKE_OVERVIEW_IDS);
    extra.update(.016,3,{stage:'operate'});assert.deepEqual(bread.position.toArray(),position);assert.equal(bread.userData.gold,gold);
    finish(view.state,BAKE_OPENING.operation.tasks[1]);finish(view.state,BAKE_OPENING.operation.tasks[2]);finish(view.state,BAKE_OPENING.operation.tasks[3]);assert.equal(beginFinale(view.state),true);for(let i=0;i<100;i++)advanceFinale(view.state,.1);assert.equal(view.state.completed,true);
    extra.update(.016,3,{stage:'done'});assert.equal(root.userData.served,1);assert.equal(bread.userData.gold,1);assert.equal(bread.position.x,.94);assert.equal(view.scene.getObjectByName('bake-sign-open').visible,true);assert.equal(view.scene.getObjectByName('bake-final-steam').visible,true);
    const finished=packState(view.state);extra.update(.016,3,{stage:'done',before:true});assert.equal(bread.visible,false);assert.equal(root.userData.baked,0);assert.equal(packState(view.state),finished);
  }finally{restore();}
});
test('all eight collected fixtures and the complete oven to counter motion fit a 390 by 844 viewport',()=>{
  const{view,extra,restore}=fixture(BAKE_OPENING);view.state.seasonRestored=new Set(BAKE_OVERVIEW_IDS);
  try{const camera=cameraFor(BAKE_OPENING.cameras.mobile.overview);
    for(const[load,serve]of[[0,0],[.5,0],[1,0],[1,.25],[1,.5],[1,.75],[1,1]]){
      view.state.taskValues['bakery-load']=load;view.state.taskValues['bakery-bake']=load;view.state.taskValues['bakery-serve']=serve;extra.update(.016,2,{stage:'operate'});view.scene.updateMatrixWorld(true);
      for(const name of[...BAKE_OVERVIEW_IDS.map(id=>`restored-${id}`),'bake-final-loaf','bake-final-moving-peel','bake-final-sign']){const bounds=projectedBounds(view.scene.getObjectByName(name),camera);assert.ok(bounds.minX>=6&&bounds.maxX<=384,`${name}: x ${bounds.minX}..${bounds.maxX}`);assert.ok(bounds.minY>=185&&bounds.maxY<=680,`${name}: y ${bounds.minY}..${bounds.maxY}`);}
    }
  }finally{restore();}
});
test('front labels face the camera and stay readable in the completed scenes',async()=>{
  for(const level of[BAKE_DISPLAY,BAKE_OPENING]){const{view,extra,restore}=fixture(level,true);view.state.seasonRestored=new Set(BAKE_OVERVIEW_IDS);const physics=await createPropsPhysics(view.state);
    try{pose(view,physics);for(const task of level.operation.tasks)finish(view.state,task);beginFinale(view.state);for(let i=0;i<100;i++)advanceFinale(view.state,.1);extra.update(.016,2,{stage:'done'});view.scene.updateMatrixWorld(true);
      const labels=[];view.scene.traverse(o=>{if(o.userData.readable&&visible(o))labels.push(o);});assert.ok(labels.length>0);
      for(const label of labels){assert.equal(label.material.isMeshBasicMaterial,true,'labels must not wash out under bakery lighting');assert.equal(label.material.toneMapped,false,'exposure must not alter the dark label ink');const shape=label.geometry.parameters,canvas=label.material.map.image;assert.ok(Math.abs(canvas.width/canvas.height-shape.width/shape.height)<.02,'lettering texture matches its actual board aspect ratio');}
      for(const screen of['desktop','mobile']){const camera=cameraFor(level.cameras[screen].finale,screen==='mobile'?390:1280,screen==='mobile'?844:720);
        for(const label of labels){const center=label.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).transformDirection(label.matrixWorld);assert.ok(normal.dot(camera.position.clone().sub(center).normalize())>.1,`${level.id} label faces away`);let clear=0;for(const[x,y]of[[.015,.015],[-.12,0],[.12,0]]){const target=new THREE.Vector3(x,y,0).applyMatrix4(label.matrixWorld),ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(target)+.004;const hit=ray.intersectObjects(view.scene.children,true).find(entry=>visible(entry.object));if(hit?.object===label)clear++;}assert.ok(clear>=2,`${level.id} ${label.name}: ${clear}/3 label points unobstructed`);}
      }
    }finally{physics.dispose();restore();}
  }
});

test('the main bread remains visible through the open oven and on arrival at the front counter',()=>{
  const{view,extra,restore}=fixture(BAKE_OPENING,true);view.state.seasonRestored=new Set(BAKE_OVERVIEW_IDS);
  try{
    const bread=view.scene.getObjectByName('bake-final-loaf');
    for(const[load,bake,serve]of[[0,0,0],[.5,0,0],[1,0,0],[1,.5,0],[1,1,0],[1,1,.5],[1,1,1]]){
      Object.assign(view.state.taskValues,{'bakery-load':load,'bakery-bake':bake,'bakery-serve':serve});extra.update(.016,2,{stage:'operate'});view.scene.updateMatrixWorld(true);
      for(const screen of['desktop','mobile']){
        const camera=cameraFor(BAKE_OPENING.cameras[screen].default,screen==='mobile'?390:1280,screen==='mobile'?844:720);let visibleSamples=0;
        for(const[x,y,z]of[[0,.13,.18],[-.2,.1,.18],[.2,.1,.18],[0,.20,.02],[0,0,.29]]){
          const target=new THREE.Vector3(x,y,z).applyMatrix4(bread.matrixWorld),ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(target)+.04;
          const hit=ray.intersectObjects(view.scene.children,true).find(entry=>visible(entry.object));let object=hit?.object;while(object&&object!==bread)object=object.parent;if(object===bread)visibleSamples++;
        }
        assert.ok(visibleSamples>=2,`${screen} load ${load}, bake ${bake}, serve ${serve}: ${visibleSamples}/5 visible bread samples`);
      }
    }
  }finally{restore();}
});
