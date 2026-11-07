import test from 'node:test';
import assert from 'node:assert/strict';
import {startPlayerAttack,advancePlayerAttack,inStrikeRange,strikeEnemy,advanceAllyAction} from '../js/combat.js';
import {createInitialState} from '../js/world-state.js';

test('a player blow deals its single impact after anticipation, with a complete recovery',()=>{
  const b=createInitialState().benkos;assert.equal(startPlayerAttack(b),true);
  assert.equal(advancePlayerAttack(b,.1),false);assert.equal(advancePlayerAttack(b,.06),true);
  assert.equal(advancePlayerAttack(b,.1),false);assert.ok(b.attackTimer>0);
  assert.equal(startPlayerAttack(b),false);advancePlayerAttack(b,.3);assert.equal(b.attackTimer,0);
});
test('late combo input queues once and the combo resets after a pause',()=>{
  const b=createInitialState().benkos;startPlayerAttack(b);advancePlayerAttack(b,.34);
  assert.equal(startPlayerAttack(b),false);assert.equal(b.queuedAttack,true);
  advancePlayerAttack(b,.15);b.queuedAttack=false;assert.equal(startPlayerAttack(b),true);assert.equal(b.comboStep,2);
  advancePlayerAttack(b,2);startPlayerAttack(b);assert.equal(b.comboStep,1);
});
test('attacks respect facing, reach and enemies that are still arriving',()=>{
  const b={x:0,facing:1};assert.equal(inStrikeRange(b,{x:35},40),true);assert.equal(inStrikeRange(b,{x:-25},40),false);assert.equal(inStrikeRange(b,{x:55},40),false);
  const e={hp:75,appearTimer:1};assert.equal(strikeEnemy(e,22,1),false);assert.equal(e.hp,75);
  e.appearTimer=0;assert.equal(strikeEnemy(e,22,1),true);assert.equal(e.hp,53);assert.ok(e.hurtTimer>0&&e.stunTimer>0);
});
test('allied melee waits for contact, can miss a retreating target, and is interrupted by injury',()=>{
  const state={enemies:[{id:1,x:25,hp:100,appearTimer:0}],projectiles:[]};
  const u={x:0,hp:100,activity:'ATTACK',pendingStrike:{targetId:1,damage:20,reach:44,facing:1,eta:.17}};
  advanceAllyAction(u,state,.1);assert.equal(state.enemies[0].hp,100);advanceAllyAction(u,state,.1);assert.equal(state.enemies[0].hp,80);
  u.pendingStrike={targetId:1,damage:20,reach:44,facing:1,eta:.1};state.enemies[0].x=100;advanceAllyAction(u,state,.2);assert.equal(state.enemies[0].hp,80);
  u.pendingShot={eta:.1,vx:200};u.hurtTimer=.2;advanceAllyAction(u,state,.2);assert.equal(state.projectiles.length,0);assert.equal(u.pendingShot,null);
});
