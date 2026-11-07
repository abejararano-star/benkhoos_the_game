import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeSave } from '../js/save-system.js';
import { ENEMY_CATALOG } from '../js/config.js';

// Run the real game modules against a small browser shell. No logic is copied.
class Element {
  constructor(id='') { this.id=id; this.tagName='DIV'; this.listeners={}; this.children=[]; this.dataset={}; this.style={}; this.textContent=''; this.attributes={}; this.open=false; const classes=new Set(); this.classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:v=>classes.has(v),toggle:(v,force)=>{const on=force??!classes.has(v);on?classes.add(v):classes.delete(v);return on;}}; }
  addEventListener(type, fn){(this.listeners[type]??=[]).push(fn);}
  dispatch(type,event={}){for(const fn of this.listeners[type]??[]) fn({target:this,preventDefault(){},...event});}
  click(){this.dispatch('click');}
  setAttribute(key,v){this.attributes[key]=v;} getAttribute(key){return this.attributes[key]??null;}
  querySelector(){return this.child??=new Element();}
  showModal(){this.open=true;} close(){this.open=false;}
  append(child){this.children.push(child);} replaceChildren(){this.children=[];}
  getContext(){return context;}
}
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:t=>({width:t.length*5})},{get:(o,k)=>o[k]??(()=>{})});
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
const skills=['dash','ceiba','roar','jaguar'].map(id=>{const el=new Element();el.dataset.skill=id;return el;});
const dialogs=[...html.matchAll(/<dialog id="([^"]+)"/g)].map(m=>elements.get(m[1]));
let raf, now=performance.now(), saved=null, records=[];
const windowEvents={};
globalThis.location={search:''};
globalThis.document={body:new Element('body'),documentElement:new Element(),hidden:false,baseURI:'http://localhost/benkhoos/',
  getElementById:id=>{if(!elements.has(id))throw Error(`Missing DOM id: ${id}`);return elements.get(id);},
  createElement:tag=>new Element(tag),addEventListener(){},
  querySelectorAll:selector=>selector==='dialog'?dialogs:selector==='[data-skill]'?skills:[],
  querySelector:selector=>skills.find(s=>selector.includes(s.dataset.skill))};
globalThis.window={innerWidth:1366,innerHeight:768,addEventListener:(event,fn)=>{(windowEvents[event]??=[]).push(fn);},matchMedia:()=>({matches:false}),
  SpriteManager:{ready:false,has:()=>false,draw:()=>false,drawAlly:()=>false,drawEnemy:()=>false,drawBenkos:()=>false},BenkosDB:{onStatusChange(){},loadConfig:async()=>({}),checkConnection:async()=>true,saveConfig:async()=>({success:true}),
    saveGame:async value=>{saved=structuredClone(value);return {success:true,storage:'local'};},loadGame:async()=>structuredClone(saved),
    recordVictory:async value=>{records.push(value);},getLeaderboard:async()=>records,lastLoadStorage:'local'}};
globalThis.requestAnimationFrame=fn=>{raf=fn;};
await import('../js/game.js');
const inspect=()=>window.gameApp.inspect();
function key(code,up=false,repeat=false){for(const fn of windowEvents[up?'keyup':'keydown']??[])fn({code,repeat,target:document.body,preventDefault(){}});}
function advance(seconds){for(let i=0;i<Math.ceil(seconds*60);i++){now+=1000/60;raf(now);}}
async function loadState(mutator){const s=inspect().state;mutator(s);saved=makeSave(s,1000);await window.gameApp.load();}

test('real runtime: campaign, controls, pause, progression, save/load, combat and end states',async()=>{
  assert.equal(inspect().mode,'menu');
  elements.get('btnNewGame').click(); assert.equal(inspect().mode,'playing');
  assert.equal(inspect().state.units.length,10); assert.equal(inspect().state.benkos.royalArmor,false);
  await loadState(s=>{s.benkos.x=510;s.benkos.vx=0;});key('KeyS');advance(.3);key('KeyS',true);
  assert.ok(inspect().state.fugitivesFreed>=1);assert.equal(inspect().state.trees.find(t=>t.x===535).markedForChop,false);
  key('KeyC');assert.equal(inspect().state.benkos.royalArmor,false);
  const startX=inspect().state.benkos.x;key('KeyD');advance(1);key('KeyD',true);const moved=inspect().state.benkos.x;assert.ok(moved-startX>60);
  key('Escape');const frozen=inspect().state.timeOfDay;advance(2);assert.equal(inspect().state.timeOfDay,frozen);
  key('Escape');key('KeyD');advance(.2);for(const fn of windowEvents.blur??[])fn();
  assert.equal(inspect().mode,'paused');key('Escape');advance(.5);assert.ok(Math.abs(inspect().state.benkos.vx)<1);
  const positionBeforeMenu=inspect().state.benkos.x;key('Escape');elements.get('btnMainMenu').click();
  assert.equal(inspect().mode,'menu');elements.get('btnContinue').click();assert.equal(inspect().mode,'playing');assert.equal(inspect().state.benkos.x,positionBeforeMenu);
  key('KeyF');assert.equal(elements.get('peopleDialog').open,true);assert.ok(elements.get('personName').textContent);
  const selectedId=Number(elements.get('personSelect').value);elements.get('personNewRole').value='MINERO';elements.get('btnAssignProfession').click();
  assert.equal(inspect().state.units.find(u=>u.id===selectedId).requestedRole,'MINERO');
  elements.get('btnClosePeople').click();key('Escape');
  key('KeyB');assert.equal(elements.get('settlementDialog').open,true);
  const beforeBuild=inspect().state.coins;elements.get('buildingCards').children[0].children.find(c=>c.listeners.click)?.click();
  assert.equal(inspect().state.coins,beforeBuild-6);assert.equal(inspect().state.settlement.projects.length,1);
  const buildingTime=inspect().state.timeOfDay;advance(1);assert.equal(inspect().state.timeOfDay,buildingTime);
  elements.get('btnResumeConstruction').click();advance(15);assert.equal(inspect().state.settlement.level,2);
  await loadState(s=>{s.enemies=[];s.resources={wood:0,stone:0};s.units=['LENADOR','MINERO'].map(role=>s.units.find(u=>u.role===role));for(const u of s.units){u.x=48;u.vx=0;u.carryingSack=true;u.requestedRole=null;if(u.role==='LENADOR')u.cargoWood=6;}});
  advance(.05);assert.equal(inspect().state.resources.wood,6);assert.equal(inspect().state.resources.stone,2);
  assert.ok(inspect().state.units.every(u=>!u.carryingSack));
  // Pay for two upgrades through the normal S interaction at the totem.
  await loadState(s=>{s.benkos.x=-48;s.benkos.vx=0;s.coins=24;s.armyTier=1;});
  assert.equal(elements.get('nodeHintCoins').textContent, 'Faltan 6 reales');
  key('KeyS');advance(.23);key('KeyS',true);
  assert.equal(elements.get('nodeHintCoins').textContent, 'Faltan 5 reales');
  key('KeyS');advance(3.4);key('KeyS',true);
  assert.equal(inspect().state.armyTier,3);assert.equal(inspect().state.armorUnlocked,true);
  assert.equal(inspect().state.units.filter(u=>u.role==='CAMPEON_REAL').length,1);
  window.BenkosDB.currentSaveId=77;
  elements.get('btnNewGame').click();assert.equal(window.BenkosDB.currentSaveId,null);
  await loadState(s=>{s.armyTier=3;s.armorUnlocked=true;});
  await window.gameApp.save(); const tier=inspect().state.armyTier;
  await window.gameApp.load();assert.equal(inspect().state.armyTier,tier);
  // Manual pause and guide both freeze the clock.
  key('Escape');elements.get('btnGuidePause').click();const guideTime=inspect().state.timeOfDay;advance(1);assert.equal(inspect().state.timeOfDay,guideTime);
  elements.get('btnCloseGuide').click();key('Escape');
  // Waves originate at haciendas, not next to the player.
  await loadState(s=>{s.day=1;s.timeOfDay=.67999;s.enemies=[];s.benkos.x=0;});
  advance(.02);assert.equal(inspect().state.enemies.length,0);assert.equal(inspect().state.campaign.orders.length,2);
  advance(6.2);assert.equal(inspect().state.enemies.length,2);assert.ok(inspect().state.enemies.every(e=>Math.abs(e.x)>1200));
  advance(5);assert.ok(inspect().state.enemies.every(e=>Number.isFinite(e.x)));
  // A telegraphed enemy attack spends reserves rather than minting free money.
  const enemy=()=>({id:500,type:'SOLDADO_ESPANOL',...ENEMY_CATALOG.SOLDADO_ESPANOL,maxHp:75,x:0,y:268,vx:0,facing:1,phase:1,attackCooldown:0,attackAnimTimer:0,tauntTimer:0,appearTimer:0,stunTimer:0,nettedTimer:0,bleedTimer:0,animTime:0,stolenCoins:0,muzzleFlash:0,trumpetRing:0});
  await loadState(s=>{s.units=[];s.timeOfDay=.2;s.phase='DAY_EXPLORE';s.benkos.x=0;s.benkos.vx=0;s.benkos.facing=1;s.benkos.attackTimer=0;s.benkos.attackCooldown=0;s.benkos.comboWindow=0;s.benkos.hurtTimer=0;s.benkos.hurtKneelTimer=0;s.enemies=[{...enemy(),x:32,attackCooldown:10},{...enemy(),id:501,x:-20,attackCooldown:10}];});
  key('Space');assert.equal(inspect().state.enemies[0].hp,75);advance(.1);assert.equal(inspect().state.enemies[0].hp,75);
  advance(.13);assert.ok(inspect().state.enemies[0].hp<75);assert.equal(inspect().state.enemies[1].hp,75);
  key('KeyA');advance(.05);key('KeyA',true);assert.equal(inspect().state.benkos.facing,1);
  while(inspect().state.benkos.attackTimer>.12)advance(.02);key('Space');assert.equal(inspect().state.benkos.queuedAttack,true);advance(.2);assert.equal(inspect().state.benkos.comboStep,2);advance(1);
  await loadState(s=>{s.timeOfDay=.2;s.phase='DAY_EXPLORE';s.benkos.x=0;s.benkos.invulnTimer=0;s.benkos.ceibaTimer=0;s.benkos.dashTimer=0;s.coins=0;s.treasuryCoins=12;s.units=[];s.enemies=[enemy()];});
  advance(.2);assert.equal(inspect().state.treasuryCoins,12);assert.ok(inspect().state.enemies[0].windupTimer>0);
  advance(.3);assert.equal(inspect().state.treasuryCoins,4);assert.equal(inspect().state.coins,3);assert.equal(inspect().state.rescueCount,1);
  await loadState(s=>{s.benkos.invulnTimer=0;s.coins=0;s.treasuryCoins=0;s.enemies=[enemy()];});
  advance(.5);assert.equal(inspect().mode,'defeat');const overTime=inspect().state.timeOfDay;advance(1);assert.equal(inspect().state.timeOfDay,overTime);
  // A completed campaign can award victory only once.
  await loadState(s=>{s.status='playing';s.benkos.invulnTimer=0;s.coins=16;s.haciendas.forEach(h=>h.destroyed=true);s.bossesDefeated=1;s.enemies=[{...enemy(),type:'GOBERNADOR_GIRON',isBoss:true,phase:2,hp:0}];});
  advance(.02);assert.equal(inspect().mode,'victory');const count=records.length;advance(1);assert.equal(records.length,count);
});
