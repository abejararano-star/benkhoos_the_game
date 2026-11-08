import { proficiency } from './people.js?v=8d54c297ea97';
export const MATERIALS=['Palma y bejuco','Madera de ceiba','Bahareque y cal','Piedra y teja','Cantería tallada'];
export const HQ_NAMES=['Refugio de la Matuna','Casa del consejo','Casa de bahareque','Cabildo de piedra','Gran Palenque'];
export const ALTAR_HEIGHT = [0, 53, 57, 65, 73, 83];
export const altarSprite = level => level === 1 ? 'landmark_altar' : `altar_${level}`;
const UPGRADE_COSTS = [null, null, [6,4,0,10], [8,8,3,16], [12,12,8,23], [16,18,14,30]];
export function initialSettlement(){return {level:1,homes:[{id:'home_west',x:-530,level:1},{id:'home_inner',x:-245,level:1},{id:'home_east',x:550,level:1}],barracks:{id:'barracks',x:245,level:1},projects:[],completed:0};}
export function ensureSettlement(state){
  state.resources??={wood:8,stone:4,food:5};state.resources.food??=5;state.settlement??=initialSettlement();const s=state.settlement;
  if(typeof s!=='object'||Array.isArray(s)||typeof state.resources!=='object'||Array.isArray(state.resources))throw Error('Recursos del palenque inválidos.');
  const level=n=>Math.max(1,Math.min(5,Math.floor(Number(n)||1)));s.level=level(s.level);
  for(const k of ['wood','stone','food'])state.resources[k]=Math.max(0,Math.min(100000,Math.floor(Number(state.resources[k])||0)));
  if(!Array.isArray(s.homes)||s.homes.length!==3||!s.barracks||!Array.isArray(s.projects)||s.projects.length>5)throw Error('Las obras del palenque están dañadas.');
  const homeIds=initialSettlement().homes.map(h=>h.id);
  s.homes.forEach(h=>{if(!h||!homeIds.includes(h.id)||!Number.isFinite(h.x))throw Error('Vivienda inválida.');h.level=level(h.level);});
  if(new Set(s.homes.map(h=>h.id)).size!==3)throw Error('Viviendas duplicadas.');
  s.barracks.level=level(s.barracks.level);if(!Number.isFinite(s.barracks.x))throw Error('Cuartel inválido.');
  for(const p of s.projects)if(!['hq','home','barracks'].includes(p.kind)||!Number.isFinite(p.progress)||!Number.isFinite(p.duration)||p.duration<=0||!Number.isFinite(p.x)||!Number.isInteger(p.targetLevel)||p.targetLevel<2||p.targetLevel>5)throw Error('Proyecto de construcción inválido.');
  if(new Set(s.projects.map(p=>p.targetId)).size!==s.projects.length)throw Error('Obras duplicadas.');
  for(const p of s.projects){const target=buildingTarget(state,p.kind,p.targetId);if(!target||p.targetId!==target.id||p.targetLevel!==target.level+1||p.x!==target.x||p.progress<0||p.progress>1)throw Error('Destino de construcción inválido.');}
  s.completed=Math.max(0,Number(s.completed)||0);
  const paidHouse = s.projects.find(project => project.kind === 'hq');
  if (paidHouse) {
    s.level = paidHouse.targetLevel;
    s.projects.splice(s.projects.indexOf(paidHouse), 1);
    s.completed++;
  }
  return s;
}
export function buildingTarget(state,kind,id){
  if(kind==='hq' && (!id || id==='hq'))return {id:'hq',x:0,level:state.settlement.level};
  if(kind==='barracks' && (!id || id===state.settlement.barracks.id))return state.settlement.barracks;
  if(kind==='home')return state.settlement.homes.find(h=>h.id===id);
}
export function upgradeInfo(state,kind,id){
  const target=buildingTarget(state,kind,id);if(!target)return {reason:'No existe este edificio.'};
  const next=target.level+1,costs=UPGRADE_COSTS[next];
  if(!costs)return {target,reason:'Evolución máxima alcanzada.'};
  if (kind === 'hq') {
    const [coins] = costs;
    const missing = coins - state.coins;
    return { target, next, coins, reason: missing > 0 ? `Te faltan ${missing} ${missing === 1 ? 'real' : 'reales'} en la bolsa.` : '' };
  }
  const [coins,wood,stone,duration]=costs.map(v=>Math.ceil(v*.55));let reason='';
  if(state.settlement.projects.some(p=>p.targetId===target.id))reason='Este edificio ya tiene una obra en marcha.';
  else if(next>state.settlement.level)reason=`Requiere casa central de nivel ${next}.`;
  else if(!state.units.some(u=>u.role==='CONSTRUCTOR'&&u.hp>0))reason='Asigna una persona al oficio de constructor.';
  else if(state.coins<coins||state.resources.wood<wood||state.resources.stone<stone)reason='Faltan materiales o reales en la bolsa.';
  return {target,next,coins,wood,stone,duration,reason};
}
export function requestBuilding(state,kind,id){
  const info=upgradeInfo(state,kind,id);if(info.reason)return {success:false,message:info.reason};
  state.coins-=info.coins;
  if (kind === 'hq') {
    state.settlement.level = info.next;
    state.settlement.completed++;
    return { success: true, message: `Casa central de nivel ${info.next} · ${MATERIALS[info.next - 1]}.` };
  }
  state.resources.wood-=info.wood;state.resources.stone-=info.stone;
  state.settlement.projects.push({id:`${info.target.id}_${info.next}`,kind,targetId:info.target.id,x:info.target.x,targetLevel:info.next,progress:0,duration:info.duration});
  return {success:true,message:'Obra encargada. Reanuda la partida para que los constructores lleven los materiales y trabajen.'};
}
export function workConstruction(u,state,dt){
  const job=state.settlement.projects.slice().sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0];
  if(!job){u.vx=0;u.activity='IDLE';u.mood='Esperando una obra';return null;}
  const dx=job.x-u.x;
  if(Math.abs(dx)>20){u.activity='DELIVER';u.mood='Llevando materiales';u.vx=Math.sign(dx)*60;u.facing=Math.sign(dx);u.x+=u.vx*dt;return null;}
  u.vx=0;u.activity='BUILD';u.mood='Levantando el palenque';job.progress=Math.min(1,job.progress+dt*proficiency(u)/job.duration);
  if(job.progress<1)return null;
  buildingTarget(state,job.kind,job.targetId).level=job.targetLevel;
  state.settlement.projects.splice(state.settlement.projects.indexOf(job),1);state.settlement.completed++;return job;
}
export function homeRecovery(state){return 1+state.settlement.homes.reduce((sum,h)=>sum+h.level-1,0)*.15;}
