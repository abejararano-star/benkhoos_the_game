import { getUnitMaxHp, WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=af0647a73f93';
import { ensureEquipment, INFANTRY } from './equipment.js?v=af0647a73f93';
import { ensureTraits, griefEffect } from './daily-life.js?v=af0647a73f93';

export const ROLE_NAMES = Object.freeze({ FUGITIVO:'Persona cautiva', ALDEANO:'Habitante libre', CONSTRUCTOR:'Constructor', LENADOR:'Leñador', AGRICULTOR:'Agricultor', MINERO:'Minero', CAZADOR:'Cazador', ARQUERO:'Arquero', GUERRERO:'Lancero', ESPADACHIN:'Espadachín', CABALLERO_ALIADO:'Caballería', CAMPEON_REAL:'Campeón' });
export const ATTRIBUTES = Object.freeze({ strength:'Fuerza', endurance:'Resistencia', perception:'Percepción', dexterity:'Destreza', cultivation:'Cultivo' });
export const GIFT_NAMES = Object.freeze({ strength:'Brazos de ceiba', endurance:'Pulso incansable', perception:'Ojo del monte', dexterity:'Manos certeras', cultivation:'Manos de tierra' });
export const TEMPERAMENTS = Object.freeze({ BRAVE:'Valiente', CAUTIOUS:'Prudente', CARING:'Solidario', CALM:'Sereno', RESTLESS:'Inquieto' });
export const WORK_ROLES = ['LENADOR','AGRICULTOR','MINERO','CAZADOR','ARQUERO','GUERRERO','ESPADACHIN','CABALLERO_ALIADO','CONSTRUCTOR'];
export const MILITARY = ['GUERRERO','ESPADACHIN','CABALLERO_ALIADO','CAMPEON_REAL'];
const names=['Amara','Badu','Juana','Mateo','Nala','Kofi','Inés','Domingo','Amina','Manuel','Sira','Tomás','Adama','María','Lemba','Lucía','Samba','Ana','Binta','Gaspar','Dalia','Antonio','Zuri','Baltasar'];
const surnames=['del Monte','de la Ceiba','del Río','de la Matuna','del Sendero','del Manglar'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function random(seed){let n=(seed|0)||1;return ()=>{n=Math.imul(n^n>>>15,1|n);n^=n+Math.imul(n^n>>>7,61|n);return ((n^n>>>14)>>>0)/4294967296;};}

export function affinity(unit,role){
  const a=unit.attributes??{strength:3,endurance:3,perception:3,dexterity:3,cultivation:3};
  const weights={ CONSTRUCTOR:[.4,.2,0,.4,0], LENADOR:[.65,.35,0,0,0], AGRICULTOR:[0,.25,0,.1,.65], MINERO:[.5,.5,0,0,0], CAZADOR:[0,.1,.65,.25,0], ARQUERO:[0,.1,.35,.55,0], GUERRERO:[.55,.45,0,0,0], ESPADACHIN:[.35,.15,0,.5,0], CABALLERO_ALIADO:[.15,.5,.15,.2,0] }[role]??[.2,.2,.2,.2,.2];
  return Object.values(ATTRIBUTES).reduce((sum,_,i)=>sum+a[Object.keys(ATTRIBUTES)[i]]*weights[i],0);
}
export function ensurePerson(unit){
  if(!unit.personVersion){
    const healthRatio=(unit.hp??unit.maxHp??80)/(unit.maxHp??80);
    const rand=random(Number(unit.id)*193+311);
    const keys=Object.keys(ATTRIBUTES);
    unit.name=unit.name??`${names[Math.abs(Number(unit.id)||1)%names.length]} ${surnames[Math.floor(rand()*surnames.length)]}`;
    unit.attributes=Object.fromEntries(keys.map(k=>[k,1+Math.floor(rand()*4)]));
    unit.gift=keys[Math.floor(rand()*keys.length)];unit.attributes[unit.gift]=5;
    unit.temperament=Object.keys(TEMPERAMENTS)[Math.floor(rand()*5)];
    unit.preferredRole=WORK_ROLES.slice(0,6).map(role=>({role,score:affinity(unit,role)+rand()*.1})).sort((a,b)=>b.score-a.score)[0].role;
    unit.experience=Object.fromEntries(WORK_ROLES.map(role=>[role,0]));
    unit.fear=0;unit.fatigue=0;unit.hurtTimer=0;unit.speechTimer=0;unit.speechCooldown=2+rand()*5;
    unit.mood='Tranquilo';unit.activity='IDLE';unit.requestedRole=null;unit.personVersion=1;
    unit.maxHp=personMaxHp(unit,unit.role,unit.tier??1);
    unit.hp=Math.max(0,Math.round(unit.maxHp*healthRatio));
  }
  unit.experience??={};
  ensureTraits(unit, random(Number(unit.id) * 431 + 271));
  ensureEquipment(unit);
  return unit;
}
export function personMaxHp(unit,role=unit.role,tier=unit.tier??1){
  const armorRank = INFANTRY.includes(role) ? unit.equipment?.armor ?? tier : tier;
  return Math.round(getUnitMaxHp(role,armorRank)*(1+Math.max(0,(unit.attributes?.endurance??3)-3)*.09));
}
export function proficiency(unit,role=unit.role){
  const dedication = (unit.traits?.dedication ?? 3) - 3;
  return (1 + (affinity(unit, role) - 3) * .10 + Math.min(.25, (unit.experience?.[role] ?? 0) / 1200) + dedication * .035) * griefEffect(unit);
}
export function speak(unit,line){if(unit.speechCooldown>0)return;unit.speech=line;unit.speechTimer=3;unit.speechCooldown=11;}
export function reactToDamage(unit,damage,direction=1){
  ensurePerson(unit);
  unit.hp-=damage;unit.hurtTimer=.4;unit.hurtDirection=direction;
  unit.fear=clamp(unit.fear+22+(unit.temperament==='CAUTIOUS'?15:0),0,100);
  unit.mood=MILITARY.includes(unit.role)?'Bajo presión':'Asustado';
  unit.activity='HURT';unit.vx=direction*55;
  speak(unit,MILITARY.includes(unit.role)?'¡Mantengan la línea!':unit.role==='CAZADOR'?'¡Al monte, rápido!':'¡Necesito refugio!');
}
export function roleAvailable(role,tier){return WORK_ROLES.includes(role)&&(!['ESPADACHIN','CABALLERO_ALIADO'].includes(role)||tier>=2);}
export function requestProfession(unit,role,state){
  ensurePerson(unit);
  if(['FUGITIVO','CAMPEON_REAL'].includes(unit.role))return {success:false,message:'Esta persona aún no puede cambiar de oficio.'};
  if (unit.kitOrder) return { success: false, message: 'Recogerá primero el equipo que ya encargó.' };
  if (unit.recoveredCoins > 0) return { success: false, message: 'Primero llevará los reales recuperados al cofre.' };
  if(!roleAvailable(role,state.armyTier))return {success:false,message:'El oficio requiere el rango Élite.'};
  if(role===unit.role){unit.requestedRole=null;return {success:true,message:'Ya ejerce este oficio.'};}
  const rack=state.toolRacks.find(r=>r.role===role);
  if(!rack)return {success:false,message:'No existe un puesto de ese oficio.'};
  unit.requestedRole=role;unit.rackId=rack.id;unit.worksiteId=null;
  return {success:true,message: rack.stock>0?`${unit.name} irá al puesto para aprender ${ROLE_NAMES[role].toLowerCase()}.`:'Esperará equipo. Invierte en el puesto correspondiente manteniendo S.'};
}
export function completeProfession(unit,rack,state){
  if(rack.stock<=0||!roleAvailable(rack.role,state.armyTier))return false;
  const old=state.toolRacks.find(r=>r.role===unit.role);
  if(old&&old.stock<old.maxStock)old.stock++;
  const health=clamp(unit.hp/unit.maxHp,0,1);
  const armor = INFANTRY.includes(unit.role) ? unit.equipment?.armor ?? 1 : 1;
  rack.stock--;unit.role=rack.role;unit.tier=1;
  unit.equipment = INFANTRY.includes(unit.role) ? { weapon: 1, armor } : null;
  ensureEquipment(unit);
  unit.maxHp=personMaxHp(unit);unit.hp=Math.max(1,Math.round(unit.maxHp*health));
  unit.requestedRole=null;unit.worksiteId=null;unit.carryingSack=false;
  unit.activity='TRAINING';unit.mood=affinity(unit,unit.role)>=4?'En su elemento':'Aprendiendo';
  speak(unit,affinity(unit,unit.role)>=4?'¡Este oficio se me da bien!':'Aprenderé a hacerlo.');
  return true;
}

// Returns true when safety, rest or retraining takes priority over normal work.
export function updatePerson(unit,state,dt,recoveryMultiplier=1){
  ensurePerson(unit);
  unit.speechTimer=Math.max(0,unit.speechTimer-dt);unit.speechCooldown=Math.max(0,unit.speechCooldown-dt);
  const enemy=state.enemies.filter(e=>e.hp>0&&e.appearTimer<=0).sort((a,b)=>Math.abs(a.x-unit.x)-Math.abs(b.x-unit.x))[0];
  const distance=enemy?Math.abs(enemy.x-unit.x):Infinity;
  const military=MILITARY.includes(unit.role), ranged=['ARQUERO','CAZADOR'].includes(unit.role);
  unit.fear=clamp(unit.fear+dt*(distance<140?Math.max(2, (unit.temperament==='BRAVE'?5:13)-(unit.traits.courage-3)*2):-9),0,100);
  if(unit.hurtTimer>0){
    unit.hurtTimer=Math.max(0,unit.hurtTimer-dt);unit.activity='HURT';
    unit.x=clamp(unit.x+(unit.hurtDirection??1)*35*dt,WORLD_MIN_X+45,WORLD_MAX_X-45);return true;
  }
  const critical=unit.hp/unit.maxHp<(unit.temperament==='BRAVE'?.18:.32);
  const dangerRadius=critical?220:ranged?55:military?60:165;
  const flee=(distance<dangerRadius||unit.activity==='FLEE'&&distance<240)&&(!military&&!ranged||critical||unit.fear>85);
  if(flee){
    unit.activity='FLEE';unit.mood='Buscando refugio';unit.fear=Math.max(unit.fear,35);
    // Retreat toward the palenque; do not run beyond the map when surrounded.
    const away=Math.sign(unit.x-enemy.x)||-Math.sign(enemy.x)||1;
    const enemyBetweenTownAndWorker=Math.sign(unit.x)===Math.sign(enemy.x)&&Math.abs(enemy.x)<Math.abs(unit.x);
    const dir=enemyBetweenTownAndWorker?away:Math.abs(unit.x)>70?-Math.sign(unit.x):away;
    unit.vx=dir*(75+(unit.attributes.endurance??3)*3);unit.facing=dir;
    unit.x=clamp(unit.x+unit.vx*dt,WORLD_MIN_X+45,WORLD_MAX_X-45);
    speak(unit,unit.role==='LENADOR'?'¡El hacha puede esperar!':unit.role==='AGRICULTOR'?'¡La cosecha puede esperar!':'¡A las murallas!');
    return true;
  }
  if(ranged&&distance<90){unit.activity='KITE';unit.mood='Tomando distancia';unit.vx=-(Math.sign(enemy.x-unit.x)||1)*62;unit.x+=unit.vx*dt;unit.facing=-Math.sign(unit.vx);return false;}
  if(!military&&!ranged&&distance<260&&unit.fear>15){unit.activity='SHELTER';unit.mood='Esperando a salvo';unit.vx=0;unit.fear=Math.max(20,unit.fear);return true;}
  if(unit.fear>35&&distance>200||critical&&distance>180){
    unit.activity='RECOVER';unit.mood='Recuperándose';unit.vx=0;
    if(Math.abs(unit.x)>150){unit.vx=-Math.sign(unit.x)*58;unit.facing=Math.sign(unit.vx);unit.x+=unit.vx*dt;}
    else unit.hp=Math.min(unit.maxHp,unit.hp+dt*(1+(unit.attributes.endurance??3)*.3)*recoveryMultiplier);
    return true;
  }
  if(unit.requestedRole&&!unit.carryingSack){
    const rack=state.toolRacks.find(r=>r.role===unit.requestedRole);
    if(rack&&distance>180){
      unit.activity='TRAINING';unit.mood=rack.stock?'Cambiando de oficio':'Esperando herramientas';
      const dx=rack.x-unit.x;
      if(Math.abs(dx)>10){unit.vx=Math.sign(dx)*65;unit.facing=Math.sign(dx);unit.x+=unit.vx*dt;}
      else {unit.vx=0;completeProfession(unit,rack,state);}
      return true;
    }
  }
  const safe=distance>220;
  const working=['WORK','ATTACK','CHOP','HUNT','BUILD'].includes(unit.activity);
  unit.fatigue=clamp(unit.fatigue+dt*(working?.18:-.22),0,100);
  if(safe&&(unit.fatigue>75||unit.restTimer>0)){
    unit.activity='REST';unit.mood='Tomando un respiro';unit.vx=0;unit.fatigue=Math.max(0,unit.fatigue-dt*8);
    unit.hp=Math.min(unit.maxHp,unit.hp+dt*.5*recoveryMultiplier);
    unit.restTimer=(unit.restTimer??0)+dt;
    if(unit.restTimer<4)return true;
    unit.restTimer=0;unit.fatigue=45;
  }
  unit.activity=distance<220?(military?'GUARD':ranged?'HUNT':'ALERT'):'IDLE';
  unit.mood=distance<220?(military?'Protegiendo al pueblo':'Alerta'):affinity(unit,unit.role)>=4?'En su elemento':'Tranquilo';
  unit.experience[unit.role]=(unit.experience[unit.role]??0)+dt*(working?.8:.15)*(.76+unit.traits.intelligence*.08);
  if(safe&&Math.abs(unit.vx)<3&&unit.temperament==='CARING'){
    const wounded=state.units.find(other=>other!==unit&&other.hp<other.maxHp*.6&&Math.abs(other.x-unit.x)<35);
    if(wounded){wounded.hp=Math.min(wounded.maxHp,wounded.hp+dt*1.5);unit.activity='HELP';unit.mood='Cuidando a un vecino';speak(unit,'Respira. Aquí te cuidamos.');}
  }
  if(safe&&unit.activity==='IDLE')speak(unit,{BRAVE:'Hoy también resistiremos.',CAUTIOUS:'Conviene revisar las murallas.',CARING:'¿A quién le hace falta una mano?',CALM:'El río sigue su curso.',RESTLESS:'Quiero conocer otro oficio.'}[unit.temperament]);
  return false;
}
