import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BOOK_FINALE_LEVELS, BOOK_PROJECTOR, BOOK_SLIDES, BOOK_OPENING } from '../src/book-finale-levels.mjs';
import { buildBookFinaleScene, BOOK_OVERVIEW_IDS } from '../src/book-finale-scenes.mjs';
import { GrimeField, makeState, packState, unpackState, stageFor, beginFinale } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue } from '../src/task-actions.mjs';
import { buildBookEnvironment } from '../src/book-environment.mjs';
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
for (const level of BOOK_FINALE_LEVELS) {
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
    assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true);
  });
}
for (const level of [BOOK_PROJECTOR, BOOK_SLIDES]) {
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
  const model = buildBookFinaleScene(view), environment = withEnvironment ? buildBookEnvironment(view) : null;
  const extra = { update(...args) { environment?.update(...args); model.update(...args); } };
  return { view, extra, restore() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    view.scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); });
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
    globalThis.document = oldDocument;
  } };
}
for (const level of BOOK_FINALE_LEVELS) {
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
      assert.ok(meshes > 40 && meshes < (level.bookOverview ? 350 : 150), `${meshes} meshes`);
      assert.ok(triangles < (level.bookOverview ? 150000 : 100000), `${triangles} triangles`);
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
for (const level of [BOOK_PROJECTOR, BOOK_SLIDES]) {
  test(`${level.id}: phone tidy camera contains and can directly pick each loose prop`, async () => {
    const { view, restore } = fixture(level); view.state.placed.clear();
    const physics = await createPropsPhysics(view.state);
    try {
      const camera = cameraFor(level.cameras.mobile.tidy);
      for (const phase of ['initial', 'fitted']) {
        if (phase === 'fitted') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const model = view.items.get(item.id), body = physics.bodies.get(item.id); model.position.copy(body.translation()); model.quaternion.copy(body.rotation());
        }
        view.scene.updateMatrixWorld(true);
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
      // The item/cleaning-model swap is a real render behavior, not a test-only hide.
      const paired = level === BOOK_PROJECTOR ? ['projector-lens'] : ['slides-greenhouse', 'slides-train'];
      for (const item of level.items) assert.equal(view.items.get(item.id).visible, !paired.includes(item.id));
      extra.update(.016, 3, { stage: 'tidy' });
      for (const item of level.items) assert.equal(view.items.get(item.id).visible, true);
      extra.update(.016, 3, { stage: 'done', before: true });
      for (const id of paired) assert.equal(view.items.get(id).visible, false);
      extra.update(.016, 3, { stage: 'operate' });
      for (const item of level.items) assert.equal(view.items.get(item.id).visible, true);
    } finally { physics.dispose(); restore(); }
  });
}

test('projector and slides restore exact saved effects and comparison does not mutate task state',()=>{
  for(const level of [BOOK_PROJECTOR,BOOK_SLIDES]){
    const{view,extra,restore}=fixture(level);
    try{
      const read=()=>level===BOOK_PROJECTOR
        ? [view.scene.getObjectByName('book-projector-fan').rotation.z,view.scene.getObjectByName('book-projector-picture').material.opacity]
        : [view.scene.getObjectByName('book-slide-greenhouse').rotation.x,view.scene.getObjectByName('book-slide-greenhouse').children.find(child=>child.userData.story).material.opacity];
      extra.update(.1,2,{before:true,stage:'operate'});const initial=read();
      for(const task of level.operation.tasks)finish(view.state,task);
      if(level===BOOK_SLIDES)view.state.taskValues['slides-sort']=.42;
      extra.update(.1,2,{stage:'operate'});const changed=read();assert.notDeepEqual(changed,initial);
      const encoded=JSON.stringify(packState(view.state));view.state=makeState(unpackState(packState(view.state),level),level);
      extra.update(.1,2,{stage:'operate'});assert.deepEqual(read(),changed);assert.equal(JSON.stringify(packState(view.state)),encoded);
      extra.update(.1,2,{before:true,stage:'operate'});assert.deepEqual(read(),initial);assert.equal(JSON.stringify(packState(view.state)),encoded);
    }finally{restore();}
  }
});
test('book overview shows 0, 3, 6 and 8 earned fixtures, preserves collection and withholds projection until all eight exist',()=>{
  const{view,extra,restore}=fixture(BOOK_OPENING);
  try{
    for(const count of[0,3,6,8]){
      view.state.seasonRestored=new Set(BOOK_OVERVIEW_IDS.slice(0,count));view.state.chapterHighlights=new Set(BOOK_OVERVIEW_IDS.slice(Math.max(0,count-3),count));
      const encoded=JSON.stringify(packState(view.state)),earned=[...view.state.seasonRestored],highlighted=[...view.state.chapterHighlights];
      extra.update(.1,2,{stage:'overview'});
      for(const[i,id]of BOOK_OVERVIEW_IDS.entries()){
        assert.equal(view.scene.getObjectByName(`restored-${id}`).visible,i<count);
        assert.equal(view.scene.getObjectByName(`placeholder-${id}`).visible,i>=count);
        assert.equal(view.scene.getObjectByName(`chapter-highlight-${id}`).visible,highlighted.includes(id));
      }
      assert.equal(view.scene.getObjectByName('book-overview-projection').userData.pictureCount,count===8?3:0);
      assert.equal(JSON.stringify(packState(view.state)),encoded);assert.deepEqual([...view.state.seasonRestored],earned);assert.deepEqual([...view.state.chapterHighlights],highlighted);
      extra.update(.1,2,{stage:'overview',before:true});
      for(const id of BOOK_OVERVIEW_IDS)assert.equal(view.scene.getObjectByName(`restored-${id}`).visible,false);
      assert.equal(view.scene.getObjectByName('book-overview-projection').userData.pictureCount,0);
    }
  }finally{restore();}
});
test('projection unfolds in saved stages from soft light to greenhouse, lighthouse and train',()=>{
  const{view,extra,restore}=fixture(BOOK_OPENING);
  try{
    view.state.seasonRestored=new Set(BOOK_OVERVIEW_IDS);
    const images=['greenhouse','lighthouse','train'].map(id=>view.scene.getObjectByName(`book-overview-picture-${id}`));
    const values=()=>images.map(image=>image.material.opacity);
    extra.update(.1,1,{stage:'operate'});assert.deepEqual(values(),[0,0,0]);
    view.state.taskValues['library-curtain']=1;view.state.taskValues['library-load']=1;view.state.taskValues['library-focus']=.43;
    extra.update(.1,2,{stage:'operate'});assert.deepEqual(values(),[.43,0,0]);assert.equal(view.scene.getObjectByName('book-overview-curtains').userData.closedAmount,1);
    const saved=makeState(unpackState(packState(view.state),BOOK_OPENING),BOOK_OPENING);saved.seasonRestored=new Set(BOOK_OVERVIEW_IDS);view.state=saved;
    extra.update(.1,3,{stage:'operate'});assert.deepEqual(values(),[.43,0,0]);
    view.state.taskValues['library-focus']=1;view.state.taskValues['library-stories']=.25;extra.update(.1,4,{stage:'operate'});assert.deepEqual(values(),[1,.5,0]);
    view.state.taskValues['library-stories']=.75;extra.update(.1,5,{stage:'operate'});assert.deepEqual(values(),[1,1,.5]);
    view.state.taskValues['library-stories']=1;extra.update(.1,6,{stage:'done'});assert.deepEqual(values(),[1,1,1]);
    assert.equal(view.scene.getObjectByName('book-overview-projection').userData.pictureCount,3);
    extra.update(.1,6,{stage:'done',before:true});assert.deepEqual(values(),[0,0,0]);assert.equal(view.scene.getObjectByName('book-overview-curtains').userData.closedAmount,0);
  }finally{restore();}
});
test('all eight final accomplishments and the complete projection fit the phone viewport',()=>{
  const{view,extra,restore}=fixture(BOOK_OPENING);
  try{
    view.state.seasonRestored=new Set(BOOK_OVERVIEW_IDS);const camera=cameraFor(BOOK_OPENING.cameras.mobile.overview);
    for(const chapter of[0,.5,1]){
      view.state.taskValues['library-stories']=chapter;extra.update(.1,3,{stage:'operate'});view.scene.updateMatrixWorld(true);
      for(const name of [...BOOK_OVERVIEW_IDS.map(id=>`restored-${id}`),'book-overview-projection']){
        const bounds=projectedBounds(view.scene.getObjectByName(name),camera);
        assert.ok(bounds.minX>=6&&bounds.maxX<=384,`${name} x: ${bounds.minX}..${bounds.maxX}`);
        assert.ok(bounds.minY>=185&&bounds.maxY<=680,`${name} y: ${bounds.minY}..${bounds.maxY}`);
      }
    }
  }finally{restore();}
});
test('all four book final controls are actually reachable through opaque geometry on desktop and phone',()=>{
  const{view,extra,restore}=fixture(BOOK_OPENING,true);
  try{
    view.state.seasonRestored=new Set(BOOK_OVERVIEW_IDS);extra.update(.1,1,{stage:'operate'});view.scene.updateMatrixWorld(true);
    for(const screen of['desktop','mobile']){
      const camera=cameraFor(BOOK_OPENING.cameras[screen].default,screen==='mobile'?390:1280,screen==='mobile'?844:720);
      for(const[id,{object}]of view.actionTargets){
        let reached=false;
        object.traverse(child=>{
          if(!child.isMesh)return;const vertices=child.geometry.getAttribute('position');
          for(let i=0;i<vertices.count&&!reached;i+=Math.max(1,Math.floor(vertices.count/40))){
            const target=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(child.matrixWorld);
            const ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(target)+.02;
            const hit=ray.intersectObjects(view.scene.children,true).find(entry=>visible(entry.object));if(hit?.object.userData.actionId===id)reached=true;
          }
        });assert.ok(reached,`${screen} ${id} is blocked by opaque geometry`);
      }
    }
  }finally{restore();}
});

test('the three final projected pictures remain unobstructed and readable inside their frames',()=>{
  const{view,extra,restore}=fixture(BOOK_OPENING);
  try{
    view.state.seasonRestored=new Set(BOOK_OVERVIEW_IDS);extra.update(.1,1,{stage:'done'});view.scene.updateMatrixWorld(true);
    for(const screen of['desktop','mobile']){
      const camera=cameraFor(BOOK_OPENING.cameras[screen].default,screen==='mobile'?390:1280,screen==='mobile'?844:720);
      for(const story of['greenhouse','lighthouse','train']){
        const picture=view.scene.getObjectByName(`book-overview-picture-${story}`);
        let clear=0;
        for(const[x,y]of[[.03,.017],[-.35,-.3],[.35,-.3],[-.35,.3],[.35,.3]]){
          const target=new THREE.Vector3(x,y,0).applyMatrix4(picture.matrixWorld),ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(target)+.02;
          const hit=ray.intersectObjects(view.scene.children,true).find(entry=>visible(entry.object));if(hit?.object===picture)clear++;
        }
        assert.equal(clear,5,`${screen} ${story}: ${clear}/5 clear picture points`);
      }
    }
  }finally{restore();}
});

for(const level of [BOOK_PROJECTOR,BOOK_SLIDES])test(`${level.id}: fitted finishing controls can be touched directly on phone`,async()=>{
  const{view,extra,restore}=fixture(level,true);const physics=await createPropsPhysics(view.state);
  try{
    for(const item of level.items){const model=view.items.get(item.id),body=physics.bodies.get(item.id);model.position.copy(body.translation());model.quaternion.copy(body.rotation());}
    extra.update(.1,2,{stage:'operate'});view.scene.updateMatrixWorld(true);const camera=cameraFor(level.cameras.mobile.default);
    for(const[id,{object}]of view.actionTargets){
      let reached=false;
      object.traverse(child=>{if(!child.isMesh)return;const vertices=child.geometry.getAttribute('position');
        for(let i=0;i<vertices.count&&!reached;i+=Math.max(1,Math.floor(vertices.count/30))){
          const target=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(child.matrixWorld),ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(target)+.02;
          const hit=ray.intersectObjects(view.scene.children,true).find(entry=>visible(entry.object));if(hit?.object.userData.actionId===id)reached=true;
        }
      });assert.ok(reached,`${id}: fitted operation target hidden by opaque geometry`);
    }
  }finally{physics.dispose();restore();}
});

test('completed story-slide pictures face the player and stay visible after standing upright', async()=>{
  for(const level of [BOOK_SLIDES,BOOK_OPENING]){
    const{view,extra,restore}=fixture(level,true);view.state.seasonRestored=new Set(BOOK_OVERVIEW_IDS);
    const physics=await createPropsPhysics(view.state);
    try{
      for(const item of level.items){const model=view.items.get(item.id),body=physics.bodies.get(item.id);model.position.copy(body.translation());model.quaternion.copy(body.rotation());}
      for(const task of level.operation.tasks)finish(view.state,task);
      extra.update(.016,2,{stage:'done'});view.scene.updateMatrixWorld(true);
      const pictures=[];
      const scope=level===BOOK_SLIDES?view.scene:view.scene.getObjectByName('restored-book-slides');
      scope.traverse(object=>{if(object.isMesh&&object.userData.story)pictures.push(object);});
      assert.equal(pictures.length,3);
      for(const screen of['desktop','mobile']){
        const camera=cameraFor(level.cameras[screen].finale,screen==='mobile'?390:1280,screen==='mobile'?844:720);
        for(const picture of pictures){
          assert.equal(picture.material.opacity,1);
          const center=picture.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).transformDirection(picture.matrixWorld);
          assert.ok(normal.dot(camera.position.clone().sub(center).normalize())>.1,`${level.id} ${screen} ${picture.userData.story}: image front faces away`);
          let clear=0;
          for(const[x,y]of[[.023,.017],[-.17,-.12],[.17,-.12],[-.17,.12],[.17,.12]]){
            const target=new THREE.Vector3(x,y,0).applyMatrix4(picture.matrixWorld),ray=new THREE.Raycaster(camera.position,target.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(target)+.005;
            const hit=ray.intersectObjects(view.scene.children,true).find(entry=>visible(entry.object));if(hit?.object===picture)clear++;
          }
          assert.ok(clear>=4,`${level.id} ${screen} ${picture.userData.story}: ${clear}/5 picture points clear`);
        }
      }
    }finally{physics.dispose();restore();}
  }
});
