import test from 'node:test';
import assert from 'node:assert/strict';
import { bindInput } from '../js/input.js';
test('menus keep native Tab/Space navigation, game keys clear on blur, global save works in settings',()=>{
  const events={},docEvents={};let playing=false,saves=0,army=0,attacks=0;
  globalThis.window={addEventListener:(t,f)=>{events[t]=f;}};globalThis.document={addEventListener:(t,f)=>{docEvents[t]=f;}};
  const keys={};bindInput({keys,isPlaying:()=>playing,attack:()=>attacks++,interact(){},useSkill(){},toggleArmor(){},togglePause:()=>{playing=false;},save:()=>saves++,load(){},toggleArmy:()=>army++,toggleFullscreen(){},rest(){},torch(){}});
  const event=(code,tag='BUTTON')=>{let prevented=false;events.keydown({code,target:{tagName:tag},preventDefault(){prevented=true;}});return prevented;};
  assert.equal(event('Tab'),false);assert.equal(event('Space'),false);assert.equal(army,0);assert.equal(attacks,0);
  assert.equal(event('F5','INPUT'),true);assert.equal(saves,1);
  playing=true;assert.equal(event('Tab','BODY'),true);assert.equal(army,1);event('KeyD','BODY');assert.equal(keys.KeyD,true);
  events.blur();assert.equal(Object.keys(keys).length,0);assert.equal(playing,false);
});
