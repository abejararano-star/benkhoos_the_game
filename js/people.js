import { CAMP_EDGE, getUnitMaxHp, STATION_X, WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=763cc8e52309';
import { ensureEquipment, INFANTRY } from './equipment.js?v=763cc8e52309';
import { ensureTraits, griefEffect } from './daily-life.js?v=763cc8e52309';
import { addWound, healerAtCamp, recoverHealth } from './care.js?v=763cc8e52309';

export const ROLE_NAMES = Object.freeze({ FUGITIVO:'Persona cautiva', ALDEANO:'Habitante libre', CONSTRUCTOR:'Constructor', LENADOR:'Leñador', AGRICULTOR:'Agricultor', MINERO:'Minero', CAZADOR:'Cazador', ARQUERO:'Arquero', GUERRERO:'Lancero', ESPADACHIN:'Espadachín', CABALLERO_ALIADO:'Caballería', CAMPEON_REAL:'Campeón', CURANDERO:'Curandero', BRUJO:'Brujo' });
export const ATTRIBUTES = Object.freeze({ strength:'Fuerza', endurance:'Resistencia', perception:'Percepción', dexterity:'Destreza', cultivation:'Cultivo' });
export const GIFT_NAMES = Object.freeze({ strength:'Brazos de ceiba', endurance:'Pulso incansable', perception:'Ojo del monte', dexterity:'Manos certeras', cultivation:'Manos de tierra' });
export const TEMPERAMENTS = Object.freeze({ BRAVE:'Valiente', CAUTIOUS:'Prudente', CARING:'Solidario', CALM:'Sereno', RESTLESS:'Inquieto' });
export const BUILD_NAMES = Object.freeze({
  SLENDER: ['Delgado', 'Delgada'], BALANCED: ['Complexión media', 'Complexión media'],
  ROBUST: ['Fornido', 'Fornida'], CURVED: ['De formas redondeadas', 'De formas redondeadas']
});
const STATURE_NAMES = ['Estatura baja', 'Estatura media', 'Estatura alta'];
export const WORK_ROLES = ['LENADOR','AGRICULTOR','MINERO','CAZADOR','ARQUERO','GUERRERO','ESPADACHIN','CABALLERO_ALIADO','CONSTRUCTOR','CURANDERO','BRUJO'];
export const MILITARY = ['GUERRERO','ESPADACHIN','CABALLERO_ALIADO','CAMPEON_REAL'];
const names=['Amara','Badu','Juana','Mateo','Nala','Kofi','Inés','Domingo','Amina','Manuel','Sira','Tomás','Adama','María','Lemba','Lucía','Samba','Ana','Binta','Gaspar','Dalia','Antonio','Zuri','Baltasar'];
const femaleNames = new Set(['Amara', 'Juana', 'Nala', 'Inés', 'Amina', 'Sira', 'Adama', 'María', 'Lucía', 'Ana', 'Binta', 'Dalia', 'Zuri']);
const nameSex = name => femaleNames.has(name) ? 'F' : 'M';
const surnames=['del Monte','de la Ceiba','del Río','de la Matuna','del Sendero','del Manglar'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function random(seed){let n=(seed|0)||1;return ()=>{n=Math.imul(n^n>>>15,1|n);n^=n+Math.imul(n^n>>>7,61|n);return ((n^n>>>14)>>>0)/4294967296;};}

export function affinity(unit,role){
  const a=unit.attributes??{strength:3,endurance:3,perception:3,dexterity:3,cultivation:3};
  const weights={ CONSTRUCTOR:[.4,.2,0,.4,0], LENADOR:[.65,.35,0,0,0], AGRICULTOR:[0,.25,0,.1,.65], MINERO:[.5,.5,0,0,0], CAZADOR:[0,.1,.65,.25,0], ARQUERO:[0,.1,.35,.55,0], GUERRERO:[.55,.45,0,0,0], ESPADACHIN:[.35,.15,0,.5,0], CABALLERO_ALIADO:[.15,.5,.15,.2,0] }[role]??[.2,.2,.2,.2,.2];
  return Object.values(ATTRIBUTES).reduce((sum,_,i)=>sum+a[Object.keys(ATTRIBUTES)[i]]*weights[i],0);
}
export function ensurePerson(unit){
  if (unit.role !== 'CABALLERO_ALIADO' || unit.escortBenkos !== true) delete unit.escortBenkos;
  const index = Math.abs(Number(unit.id) || 1) % names.length;
  if (unit.sex !== 'F' && unit.sex !== 'M') {
    const givenName = unit.name?.split(' ')[0];
    unit.sex = nameSex(names.includes(givenName) ? givenName : names[index]);
  }
  if(!unit.personVersion){
    const healthRatio=(unit.hp??unit.maxHp??80)/(unit.maxHp??80);
    const rand=random(Number(unit.id)*193+311);
    const keys=Object.keys(ATTRIBUTES);
    const pool = names.filter(name => nameSex(name) === unit.sex);
    const given = nameSex(names[index]) === unit.sex ? names[index] : pool[index % pool.length];
    unit.name=unit.name??`${given} ${surnames[Math.floor(rand()*surnames.length)]}`;
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
  if (!Object.hasOwn(BUILD_NAMES, unit.physique?.build) || ![0, 1, 2].includes(unit.physique.stature)) {
    const genes = random(Number(unit.id) * 479 + 659);
    const build = unit.sex === 'F' ? ['SLENDER', 'BALANCED', 'CURVED', 'ROBUST'] : ['SLENDER', 'BALANCED', 'ROBUST', 'ROBUST'];
    unit.physique = { build: build[Math.floor(genes() * build.length)], stature: Math.floor(genes() * 3) };
  }
  ensureTraits(unit, random(Number(unit.id) * 431 + 271));
  ensureEquipment(unit);
  return unit;
}

export function describePhysique(unit) {
  return `${BUILD_NAMES[unit.physique.build][unit.sex === 'F' ? 1 : 0]} · ${STATURE_NAMES[unit.physique.stature]}`;
}

export function toggleMountedEscort(unit, state) {
  if (unit.role !== 'CABALLERO_ALIADO' || unit.hp <= 0 || unit.requestedRole) return 'Solo un jinete disponible puede escoltar a Benkos.';
  if (unit.escortBenkos) {
    delete unit.escortBenkos;
    return `${unit.name} vuelve a defender el palenque.`;
  }
  if (state.units.filter(person => person.escortBenkos && person.role === 'CABALLERO_ALIADO' && person.hp > 0).length >= 2) {
    return 'La escolta personal ya tiene dos jinetes.';
  }
  unit.escortBenkos = true;
  return `${unit.name} cabalgará junto a Benkos.`;
}

export function mountedEscortPosts(state) {
  const { x, facing } = state.benkos;
  const riders = state.units.filter(unit => unit.escortBenkos && unit.role === 'CABALLERO_ALIADO' && unit.hp > 0 &&
    !unit.requestedRole && !unit.escortHome && !unit.waterFall).slice(0, 2);
  return new Map(riders.map((unit, index) => [unit.id,
    clamp(x + facing * (index === 0 ? -72 : 63), WORLD_MIN_X + 40, WORLD_MAX_X - 40)]));
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
export function reactToDamage(unit,damage,direction=1,projectile=false){
  ensurePerson(unit);
  const defender = MILITARY.includes(unit.role) || unit.role === 'ARQUERO';
  unit.hp-=damage;unit.hurtTimer=defender ? .2 : .4;unit.hurtDirection=direction;
  if (projectile || damage >= unit.maxHp * .15 || unit.hp < unit.maxHp * .7) {
    addWound(unit, damage >= unit.maxHp * .22 ? 1.5 : 1);
  }
  unit.fear=clamp(unit.fear+(defender?12:22)+(unit.temperament==='CAUTIOUS'?12:0),0,100);
  unit.mood=defender?'Bajo presión':'Asustado';
  unit.activity='HURT';unit.vx=direction*55;
  speak(unit,MILITARY.includes(unit.role)?'¡Mantengan la línea!':unit.role==='CAZADOR'?'¡Al monte, rápido!':'¡Necesito refugio!');
}
export function roleAvailable(role,tier){return WORK_ROLES.includes(role)&&(!['ESPADACHIN','CABALLERO_ALIADO'].includes(role)||tier>=2);}
export function requestProfession(unit,role,state){
  ensurePerson(unit);
  if (unit.namedAmara) return { success: false, message: 'Habla con Amara para acordar dónde ayudará.' };
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
export function updatePerson(unit,state,dt,recoveryMultiplier=1,onWatch=false,enemies=state.enemies){
  ensurePerson(unit);
  unit.speechTimer=Math.max(0,unit.speechTimer-dt);unit.speechCooldown=Math.max(0,unit.speechCooldown-dt);
  let enemy = null, distance = Infinity;
  for (const candidate of enemies) {
    const gap = Math.abs(candidate.x - unit.x);
    if (gap >= distance || candidate.hp <= 0 || candidate.waterFall || candidate.appearTimer > 0) continue;
    enemy = candidate;
    distance = gap;
  }
  const military=MILITARY.includes(unit.role), ranged=['ARQUERO','CAZADOR'].includes(unit.role);
  unit.fear=clamp(unit.fear+dt*(distance<140?Math.max(2, (unit.temperament==='BRAVE'?5:13)-(unit.traits.courage-3)*2):-9),0,100);
  if(unit.hurtTimer>0){
    unit.hurtTimer=Math.max(0,unit.hurtTimer-dt);unit.activity='HURT';
    if(!onWatch)unit.x=clamp(unit.x+(unit.hurtDirection??1)*35*dt,WORLD_MIN_X+45,WORLD_MAX_X-45);
    return true;
  }
  const critical=unit.hp/unit.maxHp<(unit.temperament==='BRAVE'?.18:.32);
  const dangerRadius=critical?220:ranged?55:military?60:165;
  const defender = military || unit.role === 'ARQUERO';
  const flee=(distance<dangerRadius||unit.activity==='FLEE'&&distance<240)&&(!military&&!ranged||critical||!defender&&unit.fear>85);
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
  if(ranged&&!onWatch&&distance<90){unit.activity='KITE';unit.mood='Tomando distancia';unit.vx=-(Math.sign(enemy.x-unit.x)||1)*62;unit.x+=unit.vx*dt;unit.facing=-Math.sign(unit.vx);return false;}
  if(!military&&!ranged&&distance<260&&unit.fear>15){unit.activity='SHELTER';unit.mood='Esperando a salvo';unit.vx=0;unit.fear=Math.max(20,unit.fear);return true;}
  const needsClinic = unit.wound > 0 && !unit.requestedRole && !unit.escortHome && distance > 240 &&
    (critical || Math.abs(unit.x) <= CAMP_EDGE + 380) && healerAtCamp(state);
  if(!defender&&unit.fear>35&&distance>200||critical&&distance>180||needsClinic){
    unit.activity='RECOVER';unit.mood='Recuperándose';unit.vx=0;
    const dx = needsClinic ? STATION_X.CURANDERO - unit.x : -unit.x;
    if(Math.abs(dx)>(needsClinic?18:150)){
      unit.vx=Math.sign(dx)*58;unit.facing=Math.sign(unit.vx);unit.x+=unit.vx*dt;
      if (needsClinic) unit.mood = 'Camino a la botica';
    } else {
      recoverHealth(unit,dt*(1+(unit.attributes.endurance??3)*.3)*recoveryMultiplier);
      if (needsClinic) unit.mood = 'Esperando un vendaje';
    }
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
  if (safe && defender) recoverHealth(unit, dt * .85 * recoveryMultiplier);
  const working=['WORK','ATTACK','CHOP','HUNT','BUILD'].includes(unit.activity);
  unit.fatigue=clamp(unit.fatigue+dt*(working?.18:-.22),0,100);
  if(safe&&(unit.fatigue>75||unit.restTimer>0)){
    unit.activity='REST';unit.mood='Tomando un respiro';unit.vx=0;unit.fatigue=Math.max(0,unit.fatigue-dt*8);
    recoverHealth(unit,dt*.5*recoveryMultiplier);
    unit.restTimer=(unit.restTimer??0)+dt;
    if(unit.restTimer<4)return true;
    unit.restTimer=0;unit.fatigue=45;
  }
  unit.activity=distance<220?(military?'GUARD':ranged?'HUNT':'ALERT'):'IDLE';
  unit.mood=distance<220?(military?'Protegiendo al pueblo':'Alerta'):affinity(unit,unit.role)>=4?'En su elemento':'Tranquilo';
  unit.experience[unit.role]=(unit.experience[unit.role]??0)+dt*(working?.8:.15)*(.76+unit.traits.intelligence*.08);
  if(safe&&Math.abs(unit.vx)<3&&unit.temperament==='CARING'){
    const tired=state.units.find(other=>other!==unit&&other.hp>0&&!(other.wound>0)&&other.hp<other.maxHp*.6&&Math.abs(other.x-unit.x)<35);
    if(tired){recoverHealth(tired,dt*1.5);unit.activity='HELP';unit.mood='Cuidando a un vecino';speak(unit,'Respira. Aquí te cuidamos.');}
  }
  if(safe&&unit.activity==='IDLE'&&!unit.namedAmara)speak(unit,{BRAVE:'Hoy también resistiremos.',CAUTIOUS:'Conviene revisar las murallas.',CARING:'¿A quién le hace falta una mano?',CALM:'El río sigue su curso.',RESTLESS:'Quiero conocer otro oficio.'}[unit.temperament]);
  return false;
}
