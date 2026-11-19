import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeSave } from '../js/save-system.js';
import { ENEMY_CATALOG, STATION_X } from '../js/config.js';
import { ensurePerson } from '../js/people.js';
import { createAnimal } from '../js/ecology.js';
import { ALTAR_X } from '../js/exploration.js';
import { CITIES, ESTATES } from '../js/story.js';
import { CROSSINGS } from '../js/crossings.js';
import { TOWER_TIERS } from '../js/settlement.js';

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
const context=new Proxy({
  createLinearGradient: (...args) => { assert.equal(args.length, 4); return gradient; },
  createRadialGradient: (...args) => { assert.equal(args.length, 6); return gradient; },
  measureText:t=>({width:t.length*5})
},{get:(o,k)=>o[k]??(()=>{})});
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
  assert.equal(elements.get('storyDialog').open,true);
  elements.get('btnStoryNext').click();assert.equal(elements.get('storySpeaker').textContent,'Benkos');
  elements.get('btnStorySkip').click();
  key('KeyM');assert.equal(elements.get('mapDialog').open,true);
  const markers=elements.get('mapMarkers').children;
  assert.equal(markers.some(button=>button.getAttribute('aria-label')===ESTATES[0].name),false);
  markers.find(button=>button.getAttribute('aria-label')==='Hacienda este').click();
  assert.equal(elements.get('mapSelectedName').textContent,'Hacienda este');
  elements.get('btnMapWaypoint').click();
  key('KeyM');assert.equal(elements.get('mapDialog').open,false);
  assert.match(elements.get('mapShortcutText').textContent,/Hacienda este.*pasos al este/);
  await loadState(()=>{});assert.equal(inspect().state.exploration.waypoint,'hac_east');
  key('KeyM');elements.get('btnMapWaypoint').click();key('KeyM');
  assert.equal(inspect().state.units.length,14); assert.equal(inspect().state.benkos.royalArmor,false);
  assert.equal(inspect().state.units.filter(u=>u.role==='FUGITIVO'&&Math.abs(u.x)>1400).length,6);
  await loadState(s=>{s.benkos.x=510;s.benkos.vx=0;});
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
  await loadState(s => { s.benkos.x = 0; s.coins = 24; s.units.find(u => u.role === 'CONSTRUCTOR').x = 0; });
  key('KeyE');assert.equal(elements.get('settlementDialog').open,true);
  elements.get('btnResumeConstruction').click();
  key('KeyS');advance(.23);key('KeyS',true);advance(.02);
  assert.equal(inspect().state.settlement.deposits.hq, 1);
  assert.equal(inspect().state.coins, 23);
  key('KeyS');advance(1.2);key('KeyS',true);advance(.02);
  assert.equal(inspect().state.altarTier, 1);
  assert.equal(inspect().state.settlement.level, 1);
  assert.equal(inspect().state.coins, 18);
  assert.equal(inspect().state.settlement.projects[0].targetLevel, 2);
  for (let second = 0; second < 10 && inspect().state.settlement.level < 2; second++) advance(1);
  assert.equal(inspect().state.settlement.level,2);
  await loadState(s => {
    s.benkos.x = s.walls[0].x;
    s.enemies = [];
    s.droppedCoins = [];
    Object.assign(s.units.find(unit => unit.role === 'CONSTRUCTOR'), {
      x: s.benkos.x, leisure: null, nextLeisure: 10000, recoveredCoins: 0
    });
  });
  key('KeyS');advance(1.2);key('KeyS',true);
  assert.equal(inspect().state.walls[0].level,1);
  assert.equal(inspect().state.settlement.projects[0].kind,'wall');
  advance(5.1);assert.equal(inspect().state.walls[0].level,2);
  await loadState(s => {
    const tower = s.settlement.towers.find(t => t.side === 1);
    const archer = s.units.find(unit => unit.role === 'ARQUERO');
    s.benkos.x = tower.x;
    s.units.find(u => u.role === 'CONSTRUCTOR').x = tower.x;
    s.coins = 24;
    archer.assignedSide = 1;
    archer.x = tower.x;
    archer.leisure = null;
    archer.requestedRole = null;
    archer.rackId = null;
  });
  key('KeyS');advance(1.22);key('KeyS',true);
  assert.equal(inspect().state.settlement.towers[1].level, 0);
  assert.equal(inspect().state.settlement.projects[0].kind, 'tower');
  await loadState(() => {});
  advance(6);
  assert.equal(inspect().state.settlement.towers[1].level, 1);
  assert.ok(inspect().state.units.find(unit => unit.role === 'ARQUERO').towerHeight > 0);
  await loadState(s => {
    s.benkos.x = ALTAR_X + 12;
    const builder = s.units.find(u => u.role === 'CONSTRUCTOR');
    Object.assign(builder, { x: ALTAR_X, leisure: null, nextLeisure: 10000, recoveredCoins: 0 });
  });
  key('KeyS');advance(1.48);key('KeyS',true);
  assert.equal(inspect().state.altarTier, 1);
  advance(4.1);
  assert.equal(inspect().state.altarTier, 2);
  assert.equal(inspect().state.exploration.altarFound, true);
  await loadState(s => { s.benkos.x = 0; s.coins = 16; s.units.find(u => u.role === 'CONSTRUCTOR').x = 0; });
  key('KeyB');assert.equal(elements.get('settlementDialog').open,true);
  const beforeBuild=inspect().state.coins;
  for(let i=0;i<8;i++)elements.get('buildingCards').children[0].children.find(c=>c.listeners.click)?.click();
  assert.equal(inspect().state.coins,beforeBuild-8);assert.equal(inspect().state.settlement.projects.length,1);
  const buildingTime=inspect().state.timeOfDay;advance(1);assert.equal(inspect().state.timeOfDay,buildingTime);
  elements.get('btnResumeConstruction').click();advance(6.1);assert.equal(inspect().state.settlement.level,3);
  await loadState(s => { s.benkos.x = s.haciendas[0].x + 45; s.benkos.facing = -1; s.haciendas[0].hp = 10; });
  const captiveIds = inspect().state.units.filter(u=>u.captiveHacienda==='hac_west').map(u=>u.id);
  assert.equal(captiveIds.length,3);
  key('KeyS');advance(.65);key('KeyS',true);
  assert.equal(inspect().state.fugitivesFreed,0);
  key('Space');advance(.4);
  assert.equal(inspect().state.fugitivesFreed,3);
  assert.ok(inspect().state.units.filter(u=>captiveIds.includes(u.id)).every(u=>u.escortHome));
  await loadState(s => { s.benkos.x = 0; });
  await loadState(s=>{s.enemies=[];s.resources={wood:0,stone:0};s.units=['LENADOR','MINERO'].map(role=>s.units.find(u=>u.role===role));for(const u of s.units){u.x=48;u.vx=0;u.carryingSack=true;u.requestedRole=null;if(u.role==='LENADOR')u.cargoWood=6;}});
  advance(.05);assert.equal(inspect().state.resources.wood,6);assert.equal(inspect().state.resources.stone,2);
  assert.ok(inspect().state.units.every(u=>!u.carryingSack));
  await loadState(s => {
    s.treasuryCoins = 10;
    s.units = [{ id: 88, role: 'CAZADOR', tier: 1, x: 100, hp: 80, maxHp: 80, assignedSide: 1, attackCooldown: 0 }];
    s.wildlife = [createAnimal(89, 'CAPYBARA', 142, { hp: 1 })];
  });
  advance(2.4);
  assert.equal(inspect().state.treasuryCoins, 11);
  assert.equal(inspect().state.wildlife.length, 0);
  // Pay for two upgrades through the normal S interaction at the totem.
  await loadState(s=>{s.benkos.x=-48;s.benkos.vx=0;s.coins=24;s.armyTier=1;s.altarTier=1;s.skills.slice(1).forEach(sk=>sk.unlocked=false);s.settlement.level=3;});
  const beforeRanks = inspect().state.units.map(unit => [unit.id, unit.tier]);
  assert.equal(elements.get('nodeHintCoins').textContent, 'Faltan 6 reales');
  key('KeyS');advance(.23);key('KeyS',true);
  assert.equal(elements.get('nodeHintCoins').textContent, 'Faltan 5 reales');
  key('KeyS');advance(3.4);key('KeyS',true);
  assert.equal(inspect().state.armyTier,3);assert.equal(inspect().state.armorUnlocked,false);
  assert.deepEqual(inspect().state.units.map(unit => [unit.id, unit.tier]), beforeRanks);
  const beforeArmor = inspect().state.coins;
  key('KeyC');assert.equal(inspect().state.benkos.royalArmor,true);
  assert.equal(inspect().state.coins,beforeArmor - 8);
  await loadState(s=>{s.coins=18;s.enemies=[];s.units=[{id:89,role:'GUERRERO',tier:1,hp:90,maxHp:90,x:10,y:268,assignedSide:1}];});
  key('KeyG');assert.equal(elements.get('armoryDialog').open,true);
  assert.match(elements.get('armoryWeaponTitle').textContent,/Real/);
  elements.get('btnArmoryWeapon').click();
  assert.equal(inspect().state.units[0].kitOrder.rank,3);
  key('KeyG');advance(1);assert.equal(inspect().state.units[0].equipment.weapon,1);
  advance(8);assert.equal(inspect().state.units[0].equipment.weapon,3);
  window.BenkosDB.currentSaveId=77;
  elements.get('btnNewGame').click();assert.equal(window.BenkosDB.currentSaveId,null);
  elements.get('btnStorySkip').click();
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
  // A telegraphed enemy attack spends coins from the bag.
  const enemy=()=>({id:500,type:'SOLDADO_ESPANOL',...ENEMY_CATALOG.SOLDADO_ESPANOL,maxHp:75,x:0,y:268,vx:0,facing:1,phase:1,attackCooldown:0,attackAnimTimer:0,tauntTimer:0,appearTimer:0,stunTimer:0,nettedTimer:0,bleedTimer:0,animTime:0,stolenCoins:0,muzzleFlash:0,trumpetRing:0});
  await loadState(s=>{s.benkos.x=0;s.timeOfDay=.24;s.phase='DAY_EXPLORE';s.haciendas[0].destroyed=s.haciendas[1].destroyed=true;s.enemies=[];});
  key('KeyE');assert.equal(elements.get('storyTitle').textContent,'Los caminos de la libertad');
  elements.get('btnStoryNext').click();elements.get('storyChoices').children[0].click();
  elements.get('storyChoices').children[0].click();
  advance(.04);
  assert.equal(inspect().state.story.expedition.site,ESTATES[0].id);
  assert.match(elements.get('mapShortcutText').textContent,/Jegua.*pasos al oeste/);
  assert.equal(inspect().state.enemies.filter(e=>e.guardSite===ESTATES[0].id).length,3);
  const siteX=ESTATES[0].x;
  await loadState(s=>{s.benkos.x=siteX+42;s.benkos.facing=-1;s.benkos.attackTimer=0;s.benkos.attackCooldown=0;s.enemies.forEach(e=>e.attackCooldown=90);s.haciendas[2].hp=5;});
  advance(.03);assert.equal(elements.get('storyDialog').open,true);elements.get('btnStorySkip').click();
  key('Space');advance(.5);assert.equal(inspect().state.haciendas[2].hp,5);
  await loadState(s=>{s.enemies=[];s.benkos.attackTimer=0;s.benkos.attackCooldown=0;});
  key('Space');advance(.5);assert.equal(inspect().state.story.expedition.stage,'return');
  assert.equal(inspect().state.story.expedition.rescued.length,5);
  elements.get('btnStorySkip').click();
  await loadState(s=>{s.benkos.x=100;for(const u of s.units)if(s.story.expedition.rescued.includes(u.id)){u.x=180;u.liberateAnimTimer=0;} });
  advance(.06);assert.deepEqual(inspect().state.story.completed,[ESTATES[0].id]);elements.get('btnStorySkip').click();
  await loadState(s=>{s.units=[];s.timeOfDay=.2;s.phase='DAY_EXPLORE';s.benkos.x=0;s.benkos.vx=0;s.benkos.facing=1;s.benkos.attackTimer=0;s.benkos.attackCooldown=0;s.benkos.comboWindow=0;s.benkos.hurtTimer=0;s.benkos.hurtKneelTimer=0;s.enemies=[{...enemy(),x:32,attackCooldown:10},{...enemy(),id:501,x:-20,attackCooldown:10}];});
  key('Space');assert.equal(inspect().state.enemies[0].hp,75);advance(.1);assert.equal(inspect().state.enemies[0].hp,75);
  advance(.13);assert.ok(inspect().state.enemies[0].hp<75);assert.equal(inspect().state.enemies[1].hp,75);
  key('KeyA');advance(.05);key('KeyA',true);assert.equal(inspect().state.benkos.facing,1);
  while(inspect().state.benkos.attackTimer>.12)advance(.02);key('Space');assert.equal(inspect().state.benkos.queuedAttack,true);advance(.2);assert.equal(inspect().state.benkos.comboStep,2);advance(1);
  await loadState(s=>{s.timeOfDay=.2;s.phase='DAY_EXPLORE';s.benkos.x=0;s.benkos.invulnTimer=0;s.benkos.ceibaTimer=0;s.benkos.dashTimer=0;s.coins=2;s.treasuryCoins=12;s.droppedCoins=[];s.units=[];s.enemies=[enemy()];});
  advance(.2);assert.equal(inspect().state.treasuryCoins,12);assert.ok(inspect().state.enemies[0].windupTimer>0);
  advance(.23);
  assert.equal(inspect().state.treasuryCoins,12);assert.equal(inspect().state.coins,0);assert.equal(inspect().state.rescueCount,0);
  assert.equal(inspect().state.status,'playing');
  assert.ok(inspect().state.droppedCoins.length>0);
  assert.ok(inspect().state.droppedCoins.every(coin=>coin.fallsInRiver&&!coin.recoverable&&coin.vy>0));
  advance(.35);
  assert.equal(inspect().state.droppedCoins.length,0);assert.equal(inspect().state.coins,0);
  await loadState(s=>{s.benkos.invulnTimer=0;s.coins=0;s.enemies=[enemy()];});
  advance(.5);assert.equal(inspect().mode,'defeat');
  assert.equal(inspect().state.treasuryCoins,12);assert.equal(inspect().state.defeatReason,'captured');
  assert.equal(elements.get('storyTitle').textContent,'La última guardia');
  const overTime=inspect().state.timeOfDay;
  advance(1);assert.equal(inspect().state.timeOfDay,overTime);
  assert.match(elements.get('storyLine').textContent,/inmoviliza/);
  advance(2);assert.match(elements.get('storyLine').textContent,/grilletes/);
  advance(3);assert.match(elements.get('storyLine').textContent,/encadenado/);
  advance(4);assert.match(elements.get('storyLine').textContent,/guillotina/);
  advance(6);
  assert.equal(elements.get('resultDialog').open,true);
  assert.match(elements.get('resultDescription').textContent,/capturado y ejecutado/);
  // A completed campaign can award victory only once.
  await loadState(s=>{s.status='playing';s.benkos.invulnTimer=0;s.coins=16;s.haciendas.forEach(h=>h.destroyed=true);s.story.completed=ESTATES.map(site=>site.id);s.story.finale='witnesses';s.bossesDefeated=1;s.enemies=[{...enemy(),type:'GOBERNADOR_GIRON',isBoss:true,phase:2,hp:0}];});
  advance(.02);assert.equal(inspect().mode,'victory');assert.equal(elements.get('storyTitle').textContent,'Quienes dieron testimonio');const count=records.length;advance(1);assert.equal(records.length,count);
});

test('tower levels improve the real sentry attack and keep the archer at deck height', async () => {
  let previousDamage = 0;
  for (const [level, gap] of [[1, 240], [2, 280], [3, 320], [1, 320], [3, 44]]) {
    await loadState(s => {
      s.status = 'playing';
      s.benkos.x = 0;
      s.hitStopTimer = 0;
      s.timeOfDay = .25;
      s.phase = 'DAY_EXPLORE';
      s.story.finale = '';
      s.story.finalWon = false;
      s.story.expedition = null;
      s.projectiles = [];
      s.campaign.orders = [];
      const tower = s.settlement.towers[1];
      tower.level = level;
      s.units = [{ id: 45, x: tower.x, y: 268, role: 'ARQUERO', tier: 1, hp: 80, maxHp: 80, assignedSide: 1, attackCooldown: 0 }];
      s.enemies = [{
        ...ENEMY_CATALOG.SOLDADO_ESPANOL, id: 50, type: 'SOLDADO_ESPANOL', x: tower.x + gap, y: 268,
        hp: 75, maxHp: 75, vx: 0, facing: -1, speed: 0, appearTimer: 0, attackCooldown: 9, guardSite: 'test', guardX: tower.x + gap
      }];
    });
    advance(.1);
    const {state} = inspect();
    const archer = state.units.find(unit => unit.id === 45);
    const tier = TOWER_TIERS[level];
    assert.equal(archer.x, state.settlement.towers[1].x);
    assert.equal(archer.towerHeight, tier.height);
    if (gap >= tier.range) assert.equal(archer.pendingShot, undefined);
    else {
      assert.equal(archer.pendingShot.y, 268 - 19 - tier.height);
      assert.ok(Math.abs(archer.attackCooldown - 1.1 * tier.cooldown) < .12);
      if (gap >= 240) {
        assert.ok(archer.pendingShot.dmg > previousDamage);
        previousDamage = archer.pendingShot.dmg;
      }
    }
  }
});

test('paying the last coin stocks a tool rack immediately with no builder or project', async () => {
  await loadState(s => {
    const rack = s.toolRacks.find(tool => tool.id === 'rack_hammer');
    rack.stock = 0;
    rack.filledSlots = 0;
    s.status = 'playing';
    s.phase = 'DAY_EXPLORE';
    s.timeOfDay = .25;
    s.benkos.x = rack.x;
    s.benkos.waterFall = null;
    s.coins = rack.cost;
    s.units = [];
    s.enemies = [];
    s.droppedCoins = [];
    s.settlement.projects = [];
  });
  const rack = () => inspect().state.toolRacks.find(tool => tool.id === 'rack_hammer');
  key('KeyS'); advance(.24); key('KeyS', true);
  assert.equal(rack().stock, 0);
  assert.equal(rack().filledSlots, 1);
  key('KeyS'); advance(.24); key('KeyS', true);
  assert.equal(rack().stock, 1);
  assert.equal(rack().filledSlots, 0);
  assert.equal(inspect().state.coins, 0);
  assert.deepEqual(inspect().state.settlement.projects, []);
});

test('a guard under arrow fire closes the distance and lands a blow', async () => {
  await loadState(s => {
    Object.assign(s, { status: 'playing', phase: 'DAY_EXPLORE', timeOfDay: .25, hitStopTimer: 0,
      walls: [], wildlife: [], projectiles: [], morale: 100 });
    s.benkos.x = -200;
    s.story.expedition = null;
    s.campaign.orders = [];
    const guard = ensurePerson({ id: 55, role: 'GUERRERO', x: 287, y: 268, vx: 0, hp: 115, maxHp: 115,
      tier: 1, assignedSide: 1, facing: 1, attackCooldown: 0 });
    guard.fear = 95;
    s.units = [guard];
    s.enemies = [{ ...ENEMY_CATALOG.ARQUERO_COLONIAL, id: 56, type: 'ARQUERO_COLONIAL', x: 435,
      y: 268, maxHp: 45, vx: 0, speed: 0, facing: -1, appearTimer: 0, attackCooldown: 0 }];
  });
  advance(.52);
  const first = inspect().state;
  assert.ok(first.projectiles.some(p => !p.fromPlayerSide));
  assert.equal(first.units[0].wound ?? 0, 0);
  advance(1);
  assert.ok(inspect().state.units[0].wound > 0);
  advance(1.3);
  assert.ok(inspect().state.enemies[0].hp < 45);
});

test('care stalls accept coins before Elite and staff restore recovery after wounds are treated', async () => {
  await loadState(s => {
    Object.assign(s, { status: 'playing', phase: 'DAY_EXPLORE', timeOfDay: .25, hitStopTimer: 0, armyTier: 1,
      units: [], enemies: [], wildlife: [], projectiles: [], droppedCoins: [], coins: 12 });
    s.campaign.orders = [];
    s.benkos.x = STATION_X.CURANDERO;
    s.benkos.wound = 1;
    s.benkos.spirit = 25;
    s.toolRacks.find(rack => rack.role === 'CURANDERO').stock = 0;
  });
  assert.match(elements.get('nodeHintTitle').textContent, /Botica/);
  key('KeyS'); advance(.49); key('KeyS', true);
  assert.equal(inspect().state.toolRacks.find(rack => rack.role === 'CURANDERO').stock, 1);
  assert.equal(inspect().state.benkos.spirit, 25);
  await loadState(s => {
    const unit = (id, role, x = STATION_X.CURANDERO) => ensurePerson({ id, role, x, y: 268, tier: 1,
      vx: 0, facing: 1, assignedSide: 1, hp: 80, maxHp: 80, attackCooldown: 0 });
    const patient = unit(61, 'GUERRERO');
    patient.hp = 50;
    patient.wound = 1;
    s.units = [patient, unit(62, 'CURANDERO'), unit(63, 'BRUJO', STATION_X.BRUJO)];
  });
  advance(2);
  assert.equal(inspect().state.units[0].hp, 50);
  assert.equal(inspect().state.benkos.spirit, 25);
  advance(4.5);
  assert.equal(inspect().state.units[0].wound, 0);
  assert.ok(inspect().state.units[0].hp > 50);
  assert.equal(inspect().state.benkos.wound, 0);
  assert.ok(inspect().state.benkos.spirit > 25);
  await loadState(s => {
    s.benkos.x = STATION_X.BRUJO;
    s.benkos.spirit = 25;
    s.toolRacks.find(rack => rack.role === 'BRUJO').stock = 3;
  });
  assert.match(elements.get('nodeHintTitle').textContent, /Puesto ritual/);
  assert.equal(elements.get('nodeHintCoins').textContent, 'Completo');
  advance(1);
  assert.ok(inspect().state.benkos.spirit > 33);
});

test('Amara spends only the delegated reais, hires ordinary work and respects player decisions', async () => {
  await loadState(s => {
    Object.assign(s, { status: 'playing', phase: 'DAY_EXPLORE', timeOfDay: .25, hitStopTimer: 0, armyTier: 1,
      enemies: [], wildlife: [], projectiles: [], droppedCoins: [], coins: 12, treasuryCoins: 12 });
    s.campaign.orders = [];
    s.benkos.x = 150;
    s.story.expedition = null;
    s.story.finale = '';
    s.settlement.level = 1;
    s.settlement.projects = [];
    s.settlement.deposits = {};
    const make = (id, role, x) => ensurePerson({ id, role, x, hp: 80, maxHp: 80, y: 268, tier: 1, vx: 0 });
    const leader = make(601, 'ALDEANO', 150);
    const applicant = make(602, 'LENADOR', 120);
    applicant.requestedRole = 'CONSTRUCTOR';
    s.units = [leader, applicant, make(603, 'CONSTRUCTOR', 0)];
    s.amara = { ...s.amara, id: 601, leads: true, bond: 'friends', budget: 0, managing: false };
    s.toolRacks.find(rack => rack.role === 'CONSTRUCTOR').stock = 0;
  });
  key('KeyF');
  assert.equal(elements.get('amaraManagement').classList.contains('hidden'), false);
  elements.get('amaraAmount').value = '9';
  elements.get('btnFundAmara').click();
  assert.equal(inspect().state.coins, 3);
  assert.equal(inspect().state.amara.budget, 9);
  elements.get('btnClosePeople').click();
  key('Escape');
  for (let second = 0; second < 20 && inspect().state.amara.budget > 1; second++) advance(1);
  const state = inspect().state;
  assert.equal(state.units.find(unit => unit.id === 602).role, 'CONSTRUCTOR');
  assert.equal(state.amara.budget, 1);
  assert.equal(state.coins, 3);
  assert.equal(state.treasuryCoins, 12);
  assert.equal(state.story.expedition, null);
  assert.equal(state.story.finale, '');
  assert.ok(state.settlement.projects.some(job => job.kind === 'hq') || state.settlement.level === 2);
  await loadState(() => {});
  assert.equal(inspect().state.amara.budget, 1);
});

test('the prologue checkpoints and Cartagena plays the historical ending from the actual council choice', async () => {
  elements.get('btnNewGame').click();
  elements.get('btnStoryNext').click();
  elements.get('btnStoryNext').click();
  assert.match(elements.get('storyNote').textContent, /Primera noche.*Espacio/);
  assert.equal(elements.get('btnStoryNext').disabled, true);
  key('KeyD'); advance(.55); key('KeyD', true);
  for (let i = 0; i < 24 && elements.get('btnStoryNext').disabled; i++) {
    key('Space'); key('Space', true); advance(.52);
  }
  assert.equal(elements.get('btnStoryNext').disabled, false);
  elements.get('btnStoryNext').click();
  assert.equal(inspect().state.story.prologuePage, 3);
  await window.gameApp.save();
  await window.gameApp.load();
  assert.match(elements.get('storyNote').textContent, /Segunda noche.*Mayús/);
  assert.equal(elements.get('btnStoryNext').disabled, true);
  elements.get('btnStorySkip').click();
  assert.equal(inspect().state.story.prologuePage, null);
  await loadState(s => {
    s.story.plan = 'guides';
    s.story.completed = ESTATES.map(estate => estate.id);
    s.benkos.x = 0;
    s.campaign.governorDefeated = false;
    s.haciendas = s.haciendas.map(site => ({ ...site, destroyed: !site.major || s.story.completed.includes(site.id) }));
  });
  key('KeyE');
  elements.get('btnStoryNext').click();
  elements.get('storyChoices').children.find(button => /ruta histórica/.test(button.textContent)).click();
  assert.equal(inspect().state.story.finale, 'historical');
  elements.get('btnStorySkip').click();
  await loadState(s => { s.benkos.x = CITIES[0].cityX; });
  key('KeyE');
  assert.equal(elements.get('storyTitle').textContent, 'La palabra quebrada');
  elements.get('btnStoryNext').click();
  assert.match(elements.get('storyLine').textContent, /ahorcado/);
  elements.get('btnStorySkip').click();
  assert.equal(elements.get('resultTitle').textContent, 'La memoria de Benkos Biohó');
  assert.equal(inspect().state.story.finalWon, true);
});

test('the hanging bridge can be cut and repaired at a post and the river ends the run', async () => {
  const site = CROSSINGS[1];
  await loadState(s => {
    s.status = 'playing';
    s.story.finale = '';
    s.units = [];
    s.enemies = [];
    s.resources.wood = 8;
    s.benkos.x = site.x - site.half - 5;
    s.benkos.hurtTimer = 0;
    s.benkos.hurtKneelTimer = 0;
    s.benkos.dashTimer = 0;
    s.benkos.mounted = false;
  });
  key('ShiftLeft'); key('KeyE'); key('KeyE', true); key('ShiftLeft', true);
  assert.equal(inspect().state.crossings[site.id].cut, true);
  key('KeyE'); key('KeyE', true);
  assert.equal(inspect().state.crossings[site.id].cut, false);
  assert.equal(inspect().state.resources.wood, 5);
  key('ShiftLeft'); key('KeyE'); key('KeyE', true); key('ShiftLeft', true);
  key('KeyD'); advance(.75); key('KeyD', true);
  assert.equal(inspect().state.benkos.waterFall.site, site.id);
  advance(2);
  assert.equal(inspect().mode, 'defeat');
  assert.match(elements.get('resultDescription').textContent, /cayó al río/);
});

test('the live town gathers, Benkos dances and kisses Amara, and movement or attacks cancel immediately', async () => {
  elements.get('btnNewGame').click();
  elements.get('btnStorySkip').click();
  await loadState(s => {
    Object.assign(s, { sandbox: true, status: 'playing', day: 1, phase: 'DAY_EXPLORE', timeOfDay: .31,
      enemies: [], wildlife: [], projectiles: [], droppedCoins: [] });
    Object.assign(s.benkos, { x: 265, facing: -1, vx: 0, mounted: false });
    s.campaign.orders = [];
    s.units = [ensurePerson({ id: 901, role: 'ALDEANO', sex: 'F', x: 290, hp: 80, maxHp: 80, tier: 1, vx: 0 }),
      ensurePerson({ id: 902, role: 'CONSTRUCTOR', x: 210, hp: 90, maxHp: 90, tier: 1, vx: 0 })];
    s.amara = { ...s.amara, id: 901, leads: true, bond: 'partners' };
    s.settlement.projects = [];
  });
  advance(4.2);
  assert.equal(inspect().state.festivity.mode, 'MUSIC');
  assert.equal(inspect().state.benkos.festivalDance, true);
  assert.equal(inspect().state.units.find(u => u.namedAmara).activity, 'DANCE');
  advance(12.2);
  assert.ok(inspect().state.festivity.kiss > 0);
  key('KeyD'); advance(.05); key('KeyD', true);
  assert.equal(inspect().state.benkos.festivalDance, false);
  assert.equal(inspect().state.festivity.kiss, 0);
  await loadState(s => { s.benkos.x = 265; s.benkos.vx = 0; s.benkos.facing = -1; });
  for (let second = 0; second < 10 && !inspect().state.benkos.festivalDance; second++) advance(1);
  assert.equal(inspect().state.benkos.festivalDance, true);
  key('Space'); advance(.05); key('Space', true);
  assert.equal(inspect().state.benkos.festivalDance, false);
  assert.equal(inspect().state.benkos.festivalKiss, 0);
});
