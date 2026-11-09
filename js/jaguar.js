import { inStrikeRange, strikeEnemy } from './combat.js?v=3daf42021c75';

const DURATION = { CROUCH: .28, POUNCE: .36, SWIPE: .4, RECOVER: .32 };

function action(a, kind, targetId = null, speed = 0) {
  a.jaguarAction = { kind, targetId, speed, elapsed: 0, hit: false };
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
  const target = targetId === 'player' ? state.benkos : state.enemies.find(enemy => enemy.id === targetId);
  const available = target && !target.waterFall && !(target.hp <= 0) && !(target.appearTimer > 0)
    && (targetId !== 'player' || !a.trust);
  const gap = available ? target.x - a.x : 0;
  const previous = current.elapsed;
  current.elapsed = Math.min(DURATION[kind], previous + dt);
  if (kind === 'CROUCH') {
    if (!available || Math.abs(gap) > 95) a.jaguarAction = null;
    else if (current.elapsed >= DURATION.CROUCH) {
      a.facing = Math.sign(gap) || a.facing;
      action(a, 'POUNCE', targetId, Math.max(65, (Math.abs(gap) - 9) / DURATION.POUNCE));
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
    else if (strikeEnemy(target, (a.trust >= 2 ? 24 : 17) + (kind === 'POUNCE' ? 4 : 0), a.facing)) {
      notice(target.x, kind === 'POUNCE' ? 'Salto del jaguar' : 'Zarpazo del jaguar');
    }
  }
  if (current.elapsed < DURATION[kind]) return;
  if (kind === 'RECOVER') a.jaguarAction = null;
  else {
    action(a, 'RECOVER');
    a.attackCooldown = 1.35;
  }
}

// Return false to use the usual following and wandering behaviors.
export function updateJaguar(a, state, dt, speed, { damagePlayer, notice, torchLit, hurt }) {
  const b = state.benkos;
  const dist = Math.abs(b.x - a.x);
  const enemies = state.enemies.filter(enemy =>
    enemy.hp > 0 && !(enemy.appearTimer > 0) && !enemy.waterFall && Math.abs(enemy.x - a.x) < 120);
  const enemy = enemies.reduce((closest, candidate) =>
    !closest || Math.abs(candidate.x - a.x) < Math.abs(closest.x - a.x) ? candidate : closest, null);
  const playerNear = !a.trust && !b.waterFall && dist < (a.aggression > 0 ? 92 : 58);
  const threat = playerNear && (!enemy || dist <= Math.abs(enemy.x - a.x)) ? b : enemy;
  const wounded = a.hp <= a.maxHp * .36;
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
  if (!threat || a.hurtTimer > 0) return false;
  const gap = threat.x - a.x;
  const targetId = threat === b ? 'player' : threat.id;
  a.facing = Math.sign(gap) || a.facing;
  a.state = 'STALK';
  a.vx = Math.abs(gap) > 22 ? a.facing * speed * .67 : 0;
  if (a.attackCooldown <= 0) {
    if (Math.abs(gap) <= 24) action(a, 'SWIPE', targetId);
    else if (Math.abs(gap) <= 70) action(a, 'CROUCH', targetId);
  }
  a.x += a.vx * dt;
  return true;
}
