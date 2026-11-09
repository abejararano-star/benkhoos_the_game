import { WATER_LINE_Y, WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=c08e58e7c55c';
import { strikeEnemy } from './combat.js?v=c08e58e7c55c';

export const SPECIES=Object.freeze({
  CAPYBARA:{name:'Chigüiro',hp:28,speed:27,food:2,huntable:true},
  DEER:{name:'Venado',hp:30,speed:55,food:3,huntable:true},
  BOAR:{name:'Jabalí',hp:58,speed:44,food:3,huntable:true,predator:true},
  MONKEY:{name:'Mono capuchino',hp:22,speed:42,food:0},
  MACAW:{name:'Guacamaya',hp:18,speed:48,food:0,flying:true},
  TURTLE:{name:'Tortuga de río',hp:40,speed:12,food:0},
  JAGUAR:{name:'Jaguar',hp:95,speed:62,food:0,predator:true},
  SNAKE:{name:'Culebra',hp:12,speed:38,food:0}
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function initialEcology(){return {version:1,seeded:false,time:0,streams:[{id:'creek_west',x:-850,fishStock:3,regrow:0},{id:'creek_east',x:820,fishStock:3,regrow:0}]};}
export function ensureAnimal(a){
  a.species??='CAPYBARA';const spec=SPECIES[a.species];if(!spec)throw Error('Especie desconocida en la partida.');
  a.maxHp??=spec.hp;a.hp??=spec.hp;if(!Number.isFinite(a.hp)||!Number.isFinite(a.maxHp)||a.maxHp<=0)throw Error('Salud de animal inválida.');a.homeX??=a.x;a.facing??=1;a.vx??=0;
  a.fear??=0;a.trust??=0;a.feedCooldown??=0;a.aggression??=0;a.attackCooldown??=0;a.animTime??=0;
  a.moveTimer??=0;a.state??='IDLE';a.nettedTimer??=0;a.y??=WATER_LINE_Y;
  return a;
}
export function ensureEcology(state){
  state.ecology??=initialEcology();const e=state.ecology;
  if(!e||Array.isArray(e)||!Array.isArray(e.streams)||![2,4,6].includes(e.streams.length))throw Error('Riachuelos inválidos.');
  if(!Number.isFinite(e.time)||e.time<0)e.time=0;
  if(new Set(e.streams.map(c=>c.id)).size!==e.streams.length)throw Error('Riachuelos duplicados.');
  for(const creek of e.streams){if(!Number.isFinite(creek.x)||!Number.isFinite(creek.fishStock)||!Number.isFinite(creek.regrow))throw Error('Riachuelo dañado.');creek.fishStock=clamp(Math.floor(creek.fishStock),0,3);}
  state.resources.food??=5;state.wildlife.forEach(ensureAnimal);return e;
}
export function createAnimal(id,species,x,extra={}){return ensureAnimal({id,species,x,y:WATER_LINE_Y,...extra});}
export function seedEcology(state,nextId){
  ensureEcology(state);if(state.ecology.seeded)return;
  const seeds=[['CAPYBARA',-560],['CAPYBARA',560],['DEER',-1070],['DEER',1040],['BOAR',1140],['MONKEY',-690],['MACAW',640],['MACAW',-1140],['TURTLE',-870],['TURTLE',800],['JAGUAR',1310]];
  for(const [species,x]of seeds)if(!state.wildlife.some(a=>a.species===species&&Math.abs(a.homeX-x)<55))state.wildlife.push(createAnimal(nextId(),species,x,{trapped:species==='TURTLE'&&x<0}));
  state.ecology.seeded=true;
}
export function isHuntable(a){return a.hp > 0 && !!SPECIES[a.species??'CAPYBARA']?.huntable&&!(a.trust>0)&&!a.trapped;}
export function nearestEcology(state){
  const b=state.benkos;
  const animal=state.wildlife.filter(a=>a.hp>0&&Math.abs(a.x-b.x)<38).sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];
  const creek=state.ecology?.streams.find(c=>Math.abs(c.x-b.x)<46);
  const fruit=state.ecology?.streams.find(c=>Math.abs(c.x+110-b.x)<28);
  return animal?{kind:'animal',target:animal}:creek?{kind:'creek',target:creek}:fruit?{kind:'fruit',target:fruit}:null;
}
export function ecologyHint(state){
  if(state.benkos.interaction)return 'Pescando… Muévete o ataca para cancelar.';
  const item=nearestEcology(state);if(!item)return '';
  if(item.kind==='fruit')return 'E · Recoger frutos del bosque';
  if(item.kind==='creek')return 'E · Beber del riachuelo · Mayús + E · Pescar';
  const a=item.target,name=SPECIES[a.species].name;
  if (a.species === 'SNAKE') return 'Culebra · Deja espacio al cruzar';
  return a.trapped?`E · Liberar ${name.toLowerCase()} de la trampa`:a.species==='MACAW'&&a.trust?`E · Escuchar a la guacamaya`:`E · Alimentar ${name.toLowerCase()} · ${a.species==='JAGUAR'?2:1} alimento`;
}
export function interactEcology(state,{fish=false}={}){
  if(state.benkos.interaction)return {handled:true,message:'Ya estás pescando.'};
  const forced=fish&&state.ecology?.streams.find(c=>Math.abs(c.x-state.benkos.x)<46);
  const item=forced?{kind:'creek',target:forced}:nearestEcology(state);if(!item)return {handled:false};
  const b=state.benkos;
  if(item.kind==='fruit'){if(item.target.berryDay===state.day)return {handled:true,message:'Los frutos ya se recogieron hoy.'};item.target.berryDay=state.day;state.resources.food++;return {handled:true,message:'+1 alimento · frutos del bosque'};}
  if(item.kind==='creek'){
    const creek=item.target;
    if(!fish&&b.spirit<b.maxSpirit-3){creek.drinkCooldown??=0;if(creek.drinkCooldown>0){return {handled:true,message:'El agua se está aclarando. Espera unos segundos.'};}b.spirit=Math.min(b.maxSpirit,b.spirit+18);creek.drinkCooldown=15;return {handled:true,message:'Agua fresca · +18 espíritu'};}
    if(creek.fishStock<=0)return {handled:true,message:'El remanso necesita recuperarse. Los peces volverán.'};
    b.interaction={kind:'fish',streamId:creek.id,x:b.x,timer:1.6,duration:1.6};b.resting=false;b.vx=0;
    return {handled:true,message:'Lanza el sedal. Muévete o ataca para cancelar.'};
  }
  const a=item.target,spec=SPECIES[a.species];
  if (a.species === 'SNAKE') return { handled: true, message: 'Dale espacio a la culebra. Con la antorcha se aparta.' };
  if(a.trapped){a.trapped=false;a.rescued=true;a.trust=1;state.score+=25;state.morale=Math.min(125,state.morale+2);return {handled:true,message:`${spec.name} libre · +25 puntos`};}
  if(a.species==='MACAW'&&a.trust>0){const order=state.campaign?.orders?.[0];const enemy=state.enemies[0];return {handled:true,message:order?`La guacamaya mira al ${order.side<0?'occidente':'oriente'}: una expedición está en camino.`:enemy?`La guacamaya avisa de movimiento al ${enemy.x<0?'occidente':'oriente'}.`:'La guacamaya no distingue enemigos por los senderos.'};}
  if(a.feedCooldown>0)return {handled:true,message:`${spec.name} ya ha comido. Acércate con calma.`};
  const cost=a.species==='JAGUAR'?2:1;
  if(state.resources.food<cost)return {handled:true,message:`Necesitas ${cost} de alimento. Los agricultores y cazadores abastecen el palenque.`};
  state.resources.food-=cost;a.trust=Math.min(5,a.trust+(a.species==='MACAW'?2:1));a.feedCooldown=15;a.aggression=0;a.fear=0;a.state='EAT';a.eatTimer=2;
  let coins=0;if(a.species==='MONKEY'&&a.lastGiftDay!==state.day&&state.coins<state.maxCoins){coins=1;state.coins++;a.lastGiftDay=state.day;}
  return {handled:true,message:coins?'El mono te entrega una moneda que encontró.':a.trust>=2?`${spec.name} confía en ti. Te acompañará si avanzas con calma.`:`${spec.name} acepta el alimento. Su confianza aumenta.`};
}

export function updateEcology(state,dt,{damagePlayer=()=>{},notice=()=>{},dropCoin=()=>{},collectHunt=()=>false,torchLit=false}={}){
  const e=state.ecology,b=state.benkos;e.time+=dt;
  for(const creek of e.streams){
    creek.drinkCooldown=Math.max(0,(creek.drinkCooldown??0)-dt);
    if(creek.fishStock<3){creek.regrow+=dt;if(creek.regrow>=28){creek.regrow-=28;creek.fishStock++;}}
  }
  if(b.interaction){
    const action=b.interaction;
    if(Math.abs(b.x-action.x)>10||b.attackTimer>0||b.hurtTimer>0)b.interaction=null;
    else{action.timer-=dt;if(action.timer<=0){const creek=e.streams.find(c=>c.id===action.streamId);if(creek?.fishStock>0){creek.fishStock--;state.resources.food++;notice(b.x,'+1 alimento · pesca');}b.interaction=null;}}
  }
  for(let i=state.wildlife.length-1;i>=0;i--){
    const a=ensureAnimal(state.wildlife[i]),spec=SPECIES[a.species];a.animTime+=dt;
    a.feedCooldown=Math.max(0,a.feedCooldown-dt);a.attackCooldown=Math.max(0,a.attackCooldown-dt);a.aggression=Math.max(0,a.aggression-dt);
    if(a.hp<=0){if(spec.huntable&&!collectHunt(a,spec.food)){state.resources.food+=spec.food;dropCoin(a.x);notice(a.x,`+${spec.food} alimento · caza`);}state.wildlife.splice(i,1);continue;}
    if(a.hp<(a.lastHp??a.hp)){a.aggression=spec.predator?8:0;a.fear=90;a.hurtTimer=.3;}a.lastHp=a.hp;a.hurtTimer=Math.max(0,(a.hurtTimer??0)-dt);
    if(a.trapped||a.nettedTimer>0){a.nettedTimer=Math.max(0,a.nettedTimer-dt);a.vx=0;a.state='TRAPPED';continue;}
    if(a.eatTimer>0){a.eatTimer-=dt;a.vx=0;a.state='EAT';continue;}
    const dx=b.x-a.x,dist=Math.abs(dx);
    const enemy = state.enemies.reduce((closest, candidate) => {
      const gap = Math.abs(candidate.x - a.x);
      return candidate.hp > 0 && !(candidate.appearTimer > 0) && gap < (closest ? Math.abs(closest.x - a.x) : 120) ? candidate : closest;
    }, null);
    const danger = !!enemy;
    const threatened=danger||dist<100&&(Math.abs(b.vx)>115||b.attackTimer>0);
    if(a.trust>0)a.aggression=0;
    if (a.species === 'SNAKE' && (dist < 45 || danger)) {
      const retreat = torchLit || danger || a.attackCooldown > 0;
      a.facing = Math.sign(dx) || a.facing;
      a.state = retreat ? 'FLEE' : 'WARN';
      a.vx = retreat ? -(danger ? Math.sign(enemy.x - a.x) || 1 : a.facing) * spec.speed : 0;
      if (a.vx) a.facing = Math.sign(a.vx);
      a.warningTime = !retreat && dist < 17 ? (a.warningTime || 0) + dt : 0;
      if (a.warningTime >= .5) {
        a.attackCooldown = 4;
        a.warningTime = 0;
        damagePlayer(8, a.facing);
      }
    } else if (a.species === 'JAGUAR' && enemy && (a.trust > 0 || dist > 55 || Math.abs(enemy.x - a.x) < dist)) {
      const gap = enemy.x - a.x;
      a.state = 'HUNT_ENEMY';
      a.facing = Math.sign(gap) || a.facing;
      a.vx = Math.abs(gap) > 21 ? a.facing * spec.speed * 1.35 : 0;
      if (Math.abs(gap) <= 24 && a.attackCooldown <= 0 && strikeEnemy(enemy, a.trust >= 2 ? 24 : 17, a.facing)) {
        a.attackCooldown = 2.4;
        a.pounceTimer = .32;
        notice(enemy.x, 'Zarpazo del jaguar');
      }
    }else if(spec.predator&&a.trust===0&&(a.aggression>0||a.species==='JAGUAR'&&dist<55)){
      a.state='CHARGE';a.vx=Math.sign(dx)*spec.speed*1.35;a.facing=Math.sign(dx)||1;
      if(dist<24&&a.attackCooldown<=0){a.attackCooldown=1.8;damagePlayer(a.species==='JAGUAR'?16:10,a.facing);}
    }else if(threatened&&a.trust<2||a.fear>30){a.state='FLEE';a.vx=-(Math.sign(dx)||1)*spec.speed*1.5;a.facing=Math.sign(a.vx);a.fear=Math.max(0,a.fear-dt*25);}
    else if(a.trust>=2&&dist<350){
      const target=b.x-b.facing*(48+(Number(a.id)%3)*22);a.vx=Math.abs(target-a.x)>22?Math.sign(target-a.x)*spec.speed*1.3:0;a.state=a.vx?'FOLLOW':'IDLE';if(a.vx)a.facing=Math.sign(a.vx);
    }else{
      if (a.species === 'SNAKE') a.warningTime = 0;
      a.moveTimer-=dt;
      if(a.moveTimer<=0){a.moveTimer=2+(Number(a.id)%4);const phase=Math.floor(e.time/3)+(Number(a.id)||1);a.vx=phase%3?((phase%2)?1:-1)*spec.speed*.45:0;}
      if(Math.abs(a.x-a.homeX)>150)a.vx=-Math.sign(a.x-a.homeX)*spec.speed*.6;
      a.state=a.vx?'WALK':'IDLE';if(a.vx)a.facing=Math.sign(a.vx);
    }
    a.pounceTimer = Math.max(0, (a.pounceTimer ?? 0) - dt);
    a.x=clamp(a.x+a.vx*dt,WORLD_MIN_X+50,WORLD_MAX_X-50);a.inWater=['CAPYBARA','TURTLE'].includes(a.species)&&e.streams.some(c=>Math.abs(c.x-a.x)<30);a.y=WATER_LINE_Y+(a.inWater?3:0)-(spec.flying?25+Math.sin(e.time*2+(Number(a.id)||1))*7:0);
  }
}
