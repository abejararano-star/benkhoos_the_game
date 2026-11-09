export const PLAYER_COMBOS=Object.freeze([
  {weapon:'SWORD',duration:.44,impact:.15,reach:40,damage:22},
  {weapon:'SPEAR',duration:.50,impact:.20,reach:56,damage:25},
  {weapon:'SWORD',duration:.60,impact:.25,reach:48,damage:34}
]);

export function playerAttackSpec(b, torch = false) {
  const index = (b.comboStep || 1) - 1;
  return index === 1 && (torch || b.weaponMode === 'SWORD') ? PLAYER_COMBOS[0] : PLAYER_COMBOS[index];
}

export function startPlayerAttack(b, torch = false){
  if(b.waterFall||b.hurtKneelTimer>0||b.hurtTimer>0||b.dashTimer>0)return false;
  if(b.attackTimer>0||b.attackCooldown>0){if(b.attackTimer>0&&b.attackTimer<.14)b.queuedAttack=true;return false;}
  b.comboStep=b.comboWindow>0?(b.comboStep%3)+1:1;
  const spec=PLAYER_COMBOS[b.comboStep-1].weapon === 'SPEAR' && torch ? PLAYER_COMBOS[0] : PLAYER_COMBOS[b.comboStep-1];
  const speed=b.jaguarTimer>0?.8:1;
  b.weaponMode=spec.weapon;b.attackDuration=spec.duration*speed;b.attackImpact=spec.impact*speed;
  b.attackTimer=b.attackDuration;b.attackElapsed=0;b.attackHit=false;b.attackFacing=b.facing;
  b.queuedAttack=false;
  b.attackCooldown=b.attackDuration;b.comboWindow=b.attackDuration+.85;b.resting=false;b.vx=0;
  b.interaction=null;return true;
}

export function advancePlayerAttack(b,dt){
  b.comboWindow=Math.max(0,(b.comboWindow??0)-dt);
  b.attackCooldown=Math.max(0,(b.attackCooldown??0)-dt);
  if(b.hurtTimer>0||b.hurtKneelTimer>0){b.attackTimer=0;b.queuedAttack=false;b.comboWindow=0;return false;}
  if(!(b.attackTimer>0))return false;
  b.attackElapsed=(b.attackElapsed??0)+dt;b.attackTimer=Math.max(0,b.attackTimer-dt);
  if(!b.attackHit&&b.attackElapsed>=(b.attackImpact??.15)){b.attackHit=true;return true;}
  return false;
}

export function inStrikeRange(attacker,target,reach,facing=attacker.facing){
  const dx=(target.x-attacker.x)*(facing||1);return dx>=-5&&dx<=reach;
}

export function strikeEnemy(enemy,damage,direction=1){
  if(enemy.hp<=0||enemy.appearTimer>0)return false;
  enemy.hp-=damage;enemy.hurtTimer=enemy.isBoss?.16:.24;
  enemy.stunTimer=Math.max(enemy.stunTimer??0,enemy.isBoss?.05:.14);
  enemy.vx=direction*(enemy.isBoss?30:75);enemy.windupTimer=0;enemy.attackReady=false;
  enemy.attackCooldown=Math.max(enemy.attackCooldown??0,enemy.isBoss?.2:.35);return true;
}

// An ally commits to a target during anticipation; moving away can make the blow miss.
export function advanceAllyAction(unit,state,dt,onHit){
  if(unit.hurtTimer>0||unit.hp<=0||['FLEE','RECOVER'].includes(unit.activity)){unit.pendingStrike=null;unit.pendingShot=null;return;}
  const strike=unit.pendingStrike;
  if(strike){
    strike.eta-=dt;
    if(strike.eta<=0){
      unit.pendingStrike=null;
      const enemy=state.enemies.find(e=>e.id===strike.targetId);
      if(enemy&&inStrikeRange(unit,enemy,strike.reach,strike.facing)&&strikeEnemy(enemy,strike.damage,strike.facing))onHit?.(enemy,strike.damage);
    }
  }
  const shot=unit.pendingShot;
  if(shot){shot.eta-=dt;if(shot.eta<=0){unit.pendingShot=null;const {eta,...projectile}=shot;state.projectiles.push({...projectile,x:unit.x+Math.sign(projectile.vx)*12});}}
}
