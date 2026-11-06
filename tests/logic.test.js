import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedStepper } from '../js/clock.js';
import { chooseToolRack, chooseWorksite, nearest } from '../js/ai.js';
test('simulation runs the same number of steps at 30, 60 and 144 FPS', () => {
  for (const fps of [30,60,144]) {
    const c = new FixedStepper(); let distance=0, ticks=0;
    for(let i=0;i<fps*10;i++) c.advance(1/fps,dt=>{distance+=100*dt; ticks++;});
    assert.equal(ticks,600); assert.ok(Math.abs(distance-1000)<1e-8);
  }
});
test('a background stall is bounded and pause clears accumulated simulation', () => {
  const c = new FixedStepper(); let ticks=0;
  c.advance(100,()=>ticks++); assert.equal(ticks,15);
  c.advance(.005,()=>ticks++); c.reset(); c.advance(.012,()=>ticks++); assert.equal(ticks,15);
});
test('workers spread across sites with capacity and retain their assignments', () => {
  const sites=[{id:'west',x:-20,level:1},{id:'east',x:50,level:1}], workers=[1,2,3,4].map(id=>({id,role:'AGRICULTOR',x:0}));
  const assigned=workers.map(u=>chooseWorksite(u,sites,workers,'AGRICULTOR',2).id);
  assert.deepEqual(assigned,['west','west','east','east']);
  assert.equal(chooseWorksite(workers[3],sites,workers,'AGRICULTOR',2).id,'east');
  assert.equal(chooseWorksite({id:5,x:0},sites,workers,'AGRICULTOR',2),null);
});
test('tool selection accounts for reservations, distance and progression', () => {
  const a={id:1,role:'ALDEANO',x:0},b={id:2,role:'ALDEANO',x:0};
  const state={armyTier:1,units:[a,b],toolRacks:[{id:'sword',role:'ESPADACHIN',x:1,stock:1},{id:'hoe',role:'AGRICULTOR',x:10,stock:1},{id:'bow',role:'ARQUERO',x:20,stock:1}]};
  assert.equal(chooseToolRack(a,state).id,'hoe'); assert.equal(chooseToolRack(b,state).id,'bow');
  assert.equal(nearest({x:9},[{x:30},{x:10},{x:0}]).x,10);
});
