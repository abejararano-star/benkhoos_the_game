import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { createCampaign, dispatchRaid, announceBoss, raidSize, raidRoster, dispatchReinforcement, ROAD_GATES, startFinale, finaleWon } from '../js/campaign.js';
import { ESTATES } from '../js/story.js';
function harness(){const s=createInitialState(),arrivals=[],banners=[];let id=1,treaties=0;
  const campaign=createCampaign({state:s,nextId:()=>id++,spawnEnemy:(type,side,x)=>{const enemy={type,side,x};arrivals.push(enemy);return enemy;},showBanner:(...v)=>banners.push(v),onTreaty:()=>treaties++});
  return {s,campaign,arrivals,banners,treaties:()=>treaties};}
test('early waves start small and do not include cavalry or muskets',()=>{
  assert.equal(raidSize(1),2);assert.ok(raidSize(6)>raidSize(1));assert.ok(!raidRoster(1).includes('CABALLERO'));assert.ok(!raidRoster(1).includes('ARCABUCERO'));
});
test('patrols arrive gradually through real road gates, never at the player',()=>{
  const {s,campaign,arrivals}=harness();s.benkos.x=1580;assert.equal(dispatchRaid(s),2);assert.equal(arrivals.length,0);
  campaign.update(3.1);assert.equal(arrivals.length,1);assert.equal(arrivals[0].x,ROAD_GATES[1].x);assert.ok(arrivals[0].appearTimer>0);
  campaign.update(3);assert.equal(arrivals.length,2);
});
test('boss warnings precede their arrival and cannot be duplicated',()=>{
  const {s,campaign,arrivals}=harness();assert.equal(announceBoss(s,'HERALDO_ALADO',1,30),true);assert.equal(announceBoss(s,'HERALDO_ALADO',1,30),false);
  assert.ok(s.campaign.letters[0].title);campaign.update(29);assert.equal(arrivals.length,0);campaign.update(2);assert.equal(arrivals.length,1);
});
test('the final council changes the attack routes and victory waits for the remaining escort',()=>{
  for (const choice of ['witnesses', 'network']) {
    const {s,campaign}=harness();s.haciendas[0].destroyed=s.haciendas[1].destroyed=true;
    campaign.update(.1);assert.equal(startFinale(s,choice),false);
    assert.ok(!s.campaign.orders.some(o=>o.type==='GOBERNADOR_GIRON'));
    s.story.completed=ESTATES.map(site=>site.id);
    assert.equal(startFinale(s,choice),true);
    assert.equal(startFinale(s,choice),false);
    assert.equal(s.campaign.orders.find(o=>o.type==='GOBERNADOR_GIRON').side,choice==='witnesses'?-1:1);
    const flanks=new Set(s.campaign.orders.filter(o=>o.kind==='final').map(o=>o.side));
    assert.equal(flanks.size,choice==='witnesses'?1:2);
    s.campaign.governorDefeated=true;
    assert.equal(finaleWon(s),false);
    s.campaign.orders=[];
    s.enemies=[{finalRaid:true,hp:10}];
    assert.equal(finaleWon(s),false);
    s.enemies[0].hp=0;
    assert.equal(finaleWon(s),true);
  }
});
test('a noncombatant emissary physically travels, waits, delivers a letter and returns',()=>{
  const {s,campaign,treaties}=harness();campaign.sendMessenger('TREATY',-1);const m=s.messengers[0];assert.equal(m.x,ROAD_GATES[0].x);
  for(let i=0;i<1800&&m.state!=='WAIT';i++)campaign.update(1/60);
  assert.equal(m.state,'WAIT');assert.equal(campaign.readMessenger(m),true);assert.equal(treaties(),1);assert.equal(m.state,'RETURN');assert.ok(s.campaign.letters.length);
  assert.equal(campaign.readMessenger(m),false);
});
test('herald reinforcements are queued at the road rather than spawned next to him',()=>{
  const {s,campaign,arrivals}=harness();dispatchReinforcement(s,'ARQUERO_COLONIAL',-1);assert.equal(arrivals.length,0);campaign.update(5.1);assert.equal(arrivals[0].x,ROAD_GATES[0].x);
});
test('a signed truce freezes all pending attacks, including the final protected night',()=>{
  const {s,campaign,arrivals}=harness();announceBoss(s,'HERALDO_ALADO',1,5);s.truceDays=1;campaign.update(6);assert.equal(arrivals.length,0);
  s.truceDays=0;s.phase='TRUCE_NIGHT';campaign.update(6);assert.equal(arrivals.length,0);
  s.phase='DAY_EXPLORE';campaign.update(6);assert.equal(arrivals.length,1);
});
