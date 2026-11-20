import { BOW_ROLES, WATER_LINE_Y } from './config.js?v=6e8525fead6a';
import { TOWER_TIERS } from './settlement.js?v=6e8525fead6a';
import { strikeWildlife, threatensMilitia } from './combat.js?v=6e8525fead6a';

export function towerAssignments(state, formation) {
  const assignments = new Map();
  for (const tower of state.settlement.towers) {
    if (!tower.level || tower.integrity <= 0) continue;
    const tier = TOWER_TIERS[tower.level];
    const people = state.units.filter(u => BOW_ROLES.includes(u.role) && u.assignedSide === tower.side &&
      u.hp >= u.maxHp * .32 && !u.requestedRole && !u.kitOrder && !u.waterFall && !u.escortHome && !formation?.has(u.id))
      .sort((a,b) => {
        const aAssigned=a.towerId===tower.id, bAssigned=b.towerId===tower.id;
        // Retain a crew member's slot while walking to it; distance sorting alone swaps adjacent archers every step.
        return Number(bAssigned)-Number(aAssigned) ||
          (aAssigned && bAssigned ? (a.towerSlot??0)-(b.towerSlot??0) : Math.abs(a.x-tower.x)-Math.abs(b.x-tower.x)) || a.id-b.id;
      }).slice(0, tier.capacity);
    for (const [slot, unit] of people.entries()) {
      const offset = tier.siege ? [-27,-9,12,29][slot] : [0,-18,18][slot];
      assignments.set(unit.id, { ...tower, id: tower.id, x: tower.x + offset, slot });
    }
  }
  return assignments;
}

export function towerCrew(state, tower) {
  return state.units.filter(u => u.hp > 0 && u.towerId === tower.id && u.towerHeight > 0 &&
    !u.hurtTimer && !u.requestedRole && !u.kitOrder && !u.pendingShot).sort((a,b)=>(a.towerSlot??0)-(b.towerSlot??0));
}

export function stepTowerWeapons(state, dt, onFire) {
  for (const tower of state.settlement.towers) {
    tower.siegeFlash = Math.max(0, (tower.siegeFlash ?? 0) - dt);
    tower.siegeCooldown = Math.max(0, (tower.siegeCooldown ?? 0) - dt);
    const tier = TOWER_TIERS[tower.level], crew = towerCrew(state, tower);
    if (!tier.siege || tower.integrity <= 0 || crew.length < tier.crew || tower.ammo <= 0) { tower.burst = null; continue; }
    const target = state.enemies.filter(e => e.hp > 0 && !(e.appearTimer > 0) && !e.waterFall &&
      Math.abs(e.x-tower.x) < tier.range && Math.abs(e.x-tower.x) > (tier.siege === 'ballista' ? 75 : 48))
      .sort((a,b) => Math.abs(a.x-tower.x)-Math.abs(b.x-tower.x))[0];
    if (!target) { tower.burst = null; continue; }
    for (const u of crew) { u.activity = 'SIEGE'; u.mood = `Sirviendo la ${tier.name.toLowerCase()}`; }
    if (!tower.burst && tower.siegeCooldown > 0) continue;
    if (!tower.burst) {
      tower.burst = { left: tier.siege === 'repeater' ? Math.min(4, tower.ammo) : 1, next: 0 };
      tower.siegeCooldown = tier.siege === 'repeater' ? 3.2 : 4.2;
    }
    tower.burst.next -= dt;
    if (tower.burst.next > 0) continue;
    const side = Math.sign(target.x-tower.x), speed = tier.siege === 'ballista' ? 360 : 310;
    const y = WATER_LINE_Y - tier.height - 18, flight = Math.max(.08, (Math.abs(target.x-tower.x)-25)/speed);
    const rank = Math.min(...crew.map(u=>u.equipment?.weapon ?? 1));
    state.projectiles.push({x:tower.x+side*25,y,vx:side*speed,
      vy:(WATER_LINE_Y-18-(target.towerHeight??0)-y)/flight-10*flight,gravity:20,
      dmg:(tier.siege==='ballista'?98:42)*(1+(rank-1)*.35),fromPlayerSide:true,
      siege:tier.siege,pierce:tier.siege==='ballista'?2:0,armorPierce:tier.siege==='ballista'?.5:.15,hitIds:[],life:2});
    tower.ammo--; tower.siegeFlash = .18; tower.burst.left--; tower.burst.next = .13;
    if (!tower.burst.left || !tower.ammo) tower.burst = null;
    onFire?.(tower);
  }
}

export function stepCannon(enemy, state, dt, onFire) {
  enemy.attackCooldown = Math.max(0,(enemy.attackCooldown??0)-dt);
  const candidates = [state.benkos,...state.units.filter(u=>u.hp>0 && u.role!=='FUGITIVO'&&!u.waterFall),
    ...state.wildlife.filter(a=>a.hp>0&&!a.waterFall&&(a.bonded||threatensMilitia(a,true)))];
  const victim = candidates.filter(t=>!t.waterFall).sort((a,b)=>Math.abs(a.x-enemy.x)-Math.abs(b.x-enemy.x))[0];
  if (!victim) return;
  const structures = [...state.walls.filter(w=>w.hp>0&&w.level>0),
    ...state.settlement.towers.filter(t=>t.level>0&&t.integrity>0)];
  const barrier = structures.filter(t=>Math.abs(t.x-enemy.x)<enemy.range &&
    Math.sign(t.x-enemy.x)===Math.sign(victim.x-enemy.x)).sort((a,b)=>Math.abs(a.x-enemy.x)-Math.abs(b.x-enemy.x))[0];
  const target = barrier ?? victim, gap = Math.abs(target.x-enemy.x);
  if (enemy.guardSite && Math.abs(target.x-enemy.guardX)>480) {
    enemy.windupTimer=0; enemy.x+=Math.sign(enemy.guardX-enemy.x)*Math.min(Math.abs(enemy.guardX-enemy.x),enemy.speed*dt);return;
  }
  enemy.facing=Math.sign(target.x-enemy.x)||enemy.facing;
  if (gap>enemy.range || gap<90&&!barrier) {
    enemy.windupTimer=0;
    enemy.x+=enemy.facing*(gap<90?-1:1)*enemy.speed*dt; return;
  }
  if(enemy.attackCooldown>0)return;
  if(!(enemy.windupTimer>0)){enemy.windupTimer=enemy.windupTotal=1.5;
    enemy.cannonAim={x:target.x,y:WATER_LINE_Y-18-(target.towerHeight??(target.integrity!==undefined?TOWER_TIERS[target.level].height*.65:0))};}
  enemy.windupTimer=Math.max(0,enemy.windupTimer-dt);
  if(enemy.windupTimer>0)return;
  const aim=enemy.cannonAim, y=WATER_LINE_Y-18, speed=225, flight=Math.max(.1,Math.abs(aim.x-enemy.x)/speed);
  state.projectiles.push({x:enemy.x+enemy.facing*24,y,vx:enemy.facing*speed,
    vy:(aim.y-y)/flight-35*flight,gravity:70,dmg:enemy.dmg,explosive:true,fromPlayerSide:false,ownerId:enemy.id,life:3});
  enemy.attackCooldown=6.8;enemy.attackAnimTimer=.6;enemy.muzzleFlash=.22;
  onFire?.(enemy);
}

export function explodeCannon(state, projectile, damagePlayer, damageAlly) {
  const radius=58, at=actor=>Math.hypot(actor.x-projectile.x,
    WATER_LINE_Y-18-(actor.towerHeight??0)-projectile.y);
  if(!state.benkos.waterFall&&at(state.benkos)<radius) damagePlayer(projectile.dmg,Math.sign(projectile.vx));
  for(const u of state.units)if(u.hp>0&&u.role!=='FUGITIVO'&&!u.waterFall&&at(u)<radius)
    damageAlly(u,projectile.dmg*(1-at(u)/radius*.4),Math.sign(projectile.vx),{splash:true});
  for(const a of state.wildlife)if(a.hp>0&&at(a)<radius)strikeWildlife(a,projectile.dmg,{colonial:true});
  for(const wall of state.walls)if(wall.hp>0&&Math.abs(wall.x-projectile.x)<radius) wall.hp=Math.max(0,wall.hp-60);
  for(const tower of state.settlement.towers)if(tower.level&&Math.abs(tower.x-projectile.x)<radius) {
    tower.integrity=Math.max(0,(tower.integrity??100)-24);
    if(!tower.integrity) for(const u of state.units.filter(u=>u.towerId===tower.id)) {
      damageAlly(u,18,Math.sign(projectile.vx));u.towerHeight=0;delete u.towerId;
    }
  }
}
