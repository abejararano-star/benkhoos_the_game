import { inStrikeRange, strikeEnemy } from './combat.js?v=c2813accfb42';

const DURATION = { CROUCH: .28, POUNCE: .36, SWIPE: .4, RECOVER: .32 };

function action(a, kind, targetId = null, speed = 0, prey = false) {
  a.jaguarAction = { kind, targetId, speed, elapsed: 0, hit: false, prey };
  a.state = kind;
  a.vx = 0;
}

export function jaguarPose(a) {
  const current = a.jaguarAction;
  const duration = current?.kind === a.state ? DURATION[current.kind] : 0;
  const progress = duration ? Math.min(1, current.elapsed / duration) : 0;
  return { progress, lift: current?.kind === 'POUNCE' ? 64 * progress * (1 - progress) : 0 };
}

function advanceAttack(a, state, dt, damagePlayer, notice) {
  const current = a.jaguarAction;
  const { kind, targetId } = current;
  const target = targetId === 'player' ? state.benkos :
    (current.prey ? state.wildlife : state.enemies).find(actor => actor.id === targetId);
  const available = target && !target.waterFall && !(target.hp <= 0) && !(target.appearTimer > 0)
    && (targetId !== 'player' || !a.trust);
  const gap = available ? target.x - a.x : 0;
  const previous = current.elapsed;
  current.elapsed = Math.min(DURATION[kind], previous + dt);
  if (kind === 'CROUCH') {
    if (!available || Math.abs(gap) > 95) a.jaguarAction = null;
    else if (current.elapsed >= DURATION.CROUCH) {
      a.facing = Math.sign(gap) || a.facing;
      const lead = current.prey ? Math.max(0, Math.min(20, (target.vx ?? 0) * a.facing * .3)) : 0;
      action(a, 'POUNCE', targetId, Math.max(65, (Math.abs(gap) + lead - 9) / DURATION.POUNCE), current.prey);
    }
    return;
  }
  if (kind === 'POUNCE') {
    a.vx = a.facing * current.speed;
    a.x += a.vx * (current.elapsed - previous);
  }
  const contact = kind === 'SWIPE' ? current.elapsed >= .10 && previous < .10
    : kind === 'POUNCE' && current.elapsed >= .17 && previous < .32;
  if (available && contact && !current.hit && inStrikeRange(a, target, kind === 'SWIPE' ? 26 : 25)) {
    current.hit = true;
    if (targetId === 'player') damagePlayer(kind === 'POUNCE' ? 20 : 16, a.facing);
    else if (current.prey) {
      target.hp -= kind === 'POUNCE' ? 32 : 22;
      target.lastHp = target.hp;
      target.hurtTimer = .26;
      target.fear = 90;
      if (target.hp <= 0) {
        target.predatorKill = true;
        a.lastMeal = state.ecology.time;
        current.meal = true;
      }
    } else if (strikeEnemy(target, (a.trust >= 2 ? 24 : 17) + (kind === 'POUNCE' ? 4 : 0), a.facing)) {
      notice(target.x, kind === 'POUNCE' ? 'Salto del jaguar' : 'Zarpazo del jaguar');
    }
  }
  if (current.elapsed < DURATION[kind]) return;
  if (current.meal) {
    a.jaguarAction = null;
    a.eatTimer = 2.8;
    a.vx = 0;
    a.state = 'EAT';
  } else if (kind === 'RECOVER') a.jaguarAction = null;
  else {
    action(a, 'RECOVER');
    a.attackCooldown = 1.35;
  }
}

// Return false to use the usual following and wandering behaviors.
export function updateJaguar(a, state, dt, speed, { damagePlayer, notice, torchLit, hurt, prey }) {
  const b = state.benkos;
  const dist = Math.abs(b.x - a.x);
  const enemies = state.enemies.filter(enemy =>
    enemy.hp > 0 && !(enemy.appearTimer > 0) && !enemy.waterFall && Math.abs(enemy.x - a.x) < 120);
  const enemy = enemies.reduce((closest, candidate) =>
    !closest || Math.abs(candidate.x - a.x) < Math.abs(closest.x - a.x) ? candidate : closest, null);
  const playerNear = !a.trust && !b.waterFall && dist < (a.aggression > 0 ? 92 : 58);
  const threat = playerNear && (!enemy || dist <= Math.abs(enemy.x - a.x)) ? b : enemy;
  const wounded = a.hp <= a.maxHp * .36 || a.bornAt !== undefined;
  const outnumbered = enemies.length >= (a.trust >= 2 ? 4 : 3);
  const deterred = torchLit && !a.trust && !b.waterFall && dist < 47;
  if (threat && (wounded || outnumbered || deterred) && a.jaguarAction?.kind !== 'POUNCE') {
    if (!(a.fleeTime > 0)) a.fleeDirection = Math.sign(a.x - (deterred ? b.x : threat.x)) || -a.facing;
    a.fleeTime = .95;
  }
  if (a.fleeTime > 0) {
    a.fleeTime = Math.max(0, a.fleeTime - dt);
    a.jaguarAction = null;
    a.state = 'FLEE';
    a.facing = a.fleeDirection;
    a.vx = a.facing * speed * 1.8;
    a.x += a.vx * dt;
    a.moveTimer = 0;
    return true;
  }
  if (hurt && a.jaguarAction?.kind !== 'POUNCE') action(a, 'RECOVER');
  if (a.jaguarAction && DURATION[a.jaguarAction.kind]) {
    advanceAttack(a, state, dt, damagePlayer, notice);
    return true;
  }
  const target = threat ?? (!wounded ? prey : null);
  if (!target || a.hurtTimer > 0) return false;
  const hunting = target === prey;
  const gap = target.x - a.x;
  const targetId = target === b ? 'player' : target.id;
  a.facing = Math.sign(gap) || a.facing;
  a.state = 'STALK';
  a.vx = Math.abs(gap) > 22 ? a.facing * speed * (hunting ? 1.1 : .67) : 0;
  if (a.attackCooldown <= 0) {
    if (Math.abs(gap) <= 24) action(a, 'SWIPE', targetId, 0, hunting);
    else if (Math.abs(gap) <= 70) action(a, 'CROUCH', targetId, 0, hunting);
  }
  a.x += a.vx * dt;
  return true;
}
