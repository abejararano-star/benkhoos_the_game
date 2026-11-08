import test from 'node:test';
import assert from 'node:assert/strict';
import {GaitClock,RenderInterpolation,pixelViewport} from '../js/visual-motion.js';
import {createInitialState} from '../js/world-state.js';
import {FixedStepper} from '../js/clock.js';
import {defensePostX} from '../js/ai.js';
import {patrolOffset} from '../js/daily-life.js';

test('foot phase follows travelled distance equally at 30, 60 and 144 frames per second',()=>{
  const phases=[];
  for(const fps of [30,60,144]){
    const clock=new GaitClock(),actor={x:0,facing:1};clock.sample(actor,0);
    for(let i=1;i<=fps;i++){actor.x=60*i/fps;clock.sample(actor,i/fps);}
    phases.push(clock.sample(actor,1).phase);
  }
  assert.ok(phases.every(p=>Math.abs(p-phases[0])<1e-8));assert.ok(Math.abs(phases[0]-2/3)<1e-8);
});
test('a stationary worker stops stepping despite stale vx, and teleports do not advance a walk',()=>{
  const clock=new GaitClock(),actor={x:0,vx:60,facing:1};clock.sample(actor,0);
  actor.x=9;assert.equal(clock.sample(actor,.15).moving,true);
  const stopped=clock.sample(actor,.3);assert.equal(stopped.moving,false);assert.equal(stopped.phase,.25);
  actor.x=1000;const teleported=clock.sample(actor,.4);assert.equal(teleported.moving,false);assert.equal(teleported.phase,0);
});
test('walking backwards reverses gait, and paused samples keep the same phase',()=>{
  const clock=new GaitClock(),actor={x:0,facing:1};clock.sample(actor,0);actor.x=-9;
  const gait=clock.sample(actor,.15);assert.equal(gait.phase,.75);assert.equal(clock.sample(actor,.15).phase,.75);
});
test('interpolation smooths presentation without changing simulation or saves',()=>{
  const state=createInitialState(),interpolation=new RenderInterpolation();state.benkos.x=0;state.cameraX=0;
  interpolation.capture(state);state.benkos.x=2;state.cameraX=1;
  assert.equal(interpolation.value(state.benkos,'x',.5),1);assert.equal(interpolation.cameraX(state,.5),.5);
  assert.equal(state.benkos.x,2);state.benkos.x=900;assert.equal(interpolation.value(state.benkos,'x',.5),900);
});
test('PC viewports use complete source pixels while retaining room for the river',()=>{
  for(const [w,h] of [[1366,768],[1920,1080],[1920,902],[2560,1440]]){
    const v=pixelViewport(w,h);assert.equal(v.scale,Math.floor(v.scale));
    assert.ok(w-v.width*v.scale<v.scale);assert.ok(h-v.height*v.scale<v.scale);
    assert.ok(v.waterLine<v.height&&v.waterLine>v.height*.7);
  }
  const stepper=new FixedStepper();stepper.advance(1/120,()=>{});assert.equal(stepper.alpha,.5);
});

test('idle guards occupy stable spaced posts and ranged troops stay behind infantry',()=>{
  const units=['GUERRERO','GUERRERO','ESPADACHIN','ARQUERO','ARQUERO'].map((role,id)=>({id,role,hp:100,assignedSide:1}));
  const wall={x:355};const posts=units.map(u=>defensePostX(u,units,wall));
  assert.equal(new Set(posts).size,units.length);
  assert.ok(posts.every((x,i)=>!i||Math.abs(x-posts[i-1])>=26));
  assert.ok(posts[3]<posts[0]);assert.equal(defensePostX(units[1],[...units].reverse(),wall),posts[1]);
  const state=createInitialState(), guard=units[0];
  const stops=Array.from({length:36},(_,i)=>{
    state.community.time=i/2;
    return patrolOffset(guard,state);
  });
  assert.deepEqual(stops,[...Array(18).fill(0),...Array(18).fill(-22)]);
  state.phase='NIGHT_DEFENSE';
  assert.equal(patrolOffset(guard,state),0);
});
