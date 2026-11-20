import { advancePlayerAttack, inStrikeRange, startPlayerAttack } from './combat.js?v=ea931d367785';

export const PROLOGUE_WIDTH = 640;
export const PROLOGUE_HEIGHT = 360;
const ground = 302;
const enemyTypes = { scout: 'SOLDADO_ESPANOL', guard: 'PIQUERO' };

export function createExercise(night) {
  return {
    night, clock: 0, moves: 0, dodges: 0, vigor: 100, finished: false, ending: 0,
    dodgeCooldown: 0, hero: { x: 138, facing: 1, weaponMode: 'SWORD', vx: 0, hurtTimer: 0, dashTimer: 0 },
    attacks: [{ x: 420, at: .4, type: 'scout' }, { x: 548, at: night === 2 ? 4 : 2, type: 'guard' },
      { x: 565, at: 5, type: 'scout' }, { x: 32, at: 8, type: 'guard' }]
      .slice(0, night === 1 ? 1 : night === 2 ? 2 : 4)
      .map(({ x, at, type }) => ({ x, at, type: enemyTypes[type], hp: night === 1 ? 22 : 40, facing: -1, cooldown: .6, windup: 0 }))
  };
}

export function stepExercise(stage, dt, controls, sound) {
  if (stage.finished) return;
  const { hero } = stage;
  stage.clock += dt;
  if (stage.ending > 0) {
    stage.ending += dt;
    stage.finished = stage.ending >= 1.65;
    return;
  }
  const direction = Number(!!controls.right) - Number(!!controls.left);
  hero.hurtTimer = Math.max(0, hero.hurtTimer - dt);
  hero.dashTimer = Math.max(0, hero.dashTimer - dt);
  stage.dodgeCooldown = Math.max(0, stage.dodgeCooldown - dt);
  if (direction && !hero.attackTimer && !hero.dashTimer) hero.facing = direction;
  if (controls.dodge && stage.dodgeCooldown === 0 && !hero.hurtTimer) {
    hero.attackTimer = 0;
    hero.dashTimer = .22;
    stage.dodgeCooldown = .8;
    stage.dodges++;
  }
  if (controls.attack && startPlayerAttack(hero, true)) sound?.('slash');
  hero.vx = hero.dashTimer > 0 ? hero.facing * 235 : hero.attackTimer > 0 || hero.hurtTimer > 0 ? 0 : direction * 115;
  const x = hero.x;
  hero.x = Math.max(26, Math.min(PROLOGUE_WIDTH - 26, x + hero.vx * dt));
  if (direction) stage.moves += Math.abs(hero.x - x);
  const connects = advancePlayerAttack(hero, dt);

  for (const enemy of stage.attacks) {
    if (stage.clock < enemy.at || enemy.hp <= 0) continue;
    if (connects && inStrikeRange(hero, enemy, 60, hero.attackFacing)) {
      enemy.hp = Math.max(0, enemy.hp - 22);
      enemy.windup = 0;
      enemy.cooldown = .5;
      enemy.x = Math.max(17, Math.min(PROLOGUE_WIDTH - 17, enemy.x + 21 * hero.attackFacing));
      continue;
    }
    const gap = Math.abs(enemy.x - hero.x);
    enemy.cooldown -= dt;
    if (enemy.windup > 0) {
      enemy.windup = Math.max(0, enemy.windup - dt);
      if (enemy.windup === 0) {
        enemy.cooldown = .9;
        enemy.swing = stage.clock;
        if (inStrikeRange(enemy, hero, 49) && hero.dashTimer === 0 && hero.hurtTimer === 0) {
          stage.vigor = Math.max(0, stage.vigor - (stage.night === 1 ? 12 : 22));
          hero.hurtTimer = .36;
          sound?.('slash');
        }
      }
      continue;
    }
    enemy.facing = Math.sign(hero.x - enemy.x) || enemy.facing;
    if (gap > 37) enemy.x += enemy.facing * (stage.night === 3 ? 69 : 55) * dt;
    else if (enemy.cooldown <= 0) enemy.windup = .62;
  }
  if (stage.night === 3 && (stage.clock >= 16 || stage.vigor <= 0)) {
    stage.ending = dt;
    hero.vx = 0;
    for (const offset of [-78, -47, 47, 78]) {
      stage.attacks.push({ x: Math.max(12, Math.min(PROLOGUE_WIDTH - 12, hero.x + offset)), at: 0,
        type: 'PIQUERO', hp: 1, facing: -Math.sign(offset), windup: 0 });
    }
    sound?.('trumpet');
  } else if (stage.vigor <= 0) {
    Object.assign(stage, createExercise(stage.night), { retried: true });
  } else if (stage.attacks.every(enemy => enemy.hp <= 0) && stage.night !== 3 && stage.moves >= 12 &&
    (stage.night === 1 || stage.dodges > 0)) stage.finished = true;
}

export function exerciseCue(stage) {
  if (stage.ending) return stage.finished ? 'El sendero ha quedado atrás. Continúa la historia.' : 'Amanece. Lo han rodeado.';
  if (stage.finished) return 'El sendero está a salvo. Continúa a la noche siguiente.';
  if (stage.night === 3) return `Cubre la retirada · ${Math.ceil(Math.max(0, 16 - stage.clock))} s · Vigor ${stage.vigor}`;
  const remaining = stage.attacks.filter(enemy => enemy.hp > 0).length;
  if (!remaining && stage.moves < 12) return 'Camina unos pasos para comprobar que el sendero está libre.';
  if (!remaining && !stage.dodges) return 'Pulsa Mayús o Esquivar para ensayar la retirada.';
  return `${stage.retried ? 'Vuelve a intentarlo · ' : ''}${remaining} por rechazar · Vigor ${stage.vigor}`;
}

export function drawExercise(ctx, stage, sprites, reduced) {
  const { hero, clock } = stage;
  for (const enemy of stage.attacks) {
    if (enemy.hp <= 0 || clock < enemy.at) continue;
    const swing = clock - (enemy.swing ?? -10) < .32;
    const pose = { ...enemy, animTime: clock, attackAnimTimer: swing ? .25 : 0,
      windupTimer: enemy.windup, windupTotal: .62, isMoving: !stage.ending && !enemy.windup && Math.abs(enemy.x - hero.x) > 37 };
    if (!sprites?.drawEnemy?.(ctx, enemy.x, ground, enemy.facing, pose, clock)) {
      ctx.fillStyle = '#8c6353'; ctx.fillRect(enemy.x - 9, ground - 35, 18, 35);
    }
    if (enemy.windup) {
      ctx.fillStyle = '#ffcf83'; ctx.fillRect(enemy.x - 1, ground - 57, 3, 7);
      ctx.fillRect(enemy.x - 1, ground - 48, 3, 2);
    }
  }
  const action = stage.ending ? 'kneel' : hero.dashTimer ? 'dodge' : hero.hurtTimer > 0 ? 'hurt' :
    hero.attackTimer > 0 ? 'strike' : Math.abs(hero.vx) > 2 ? 'walk' : 'idle';
  const phase = action === 'strike' ? hero.attackElapsed / hero.attackDuration :
    action === 'dodge' ? 1 - hero.dashTimer / .22 : null;
  if (!sprites?.draw?.(ctx, 'actor_prologue_father', [action, 'idle'], hero.x, ground, hero.facing, 56, reduced ? 0 : clock, 7, phase) &&
      !sprites?.draw?.(ctx, 'actor_hero', ['idle'], hero.x, ground, hero.facing, 56, 0)) {
    ctx.fillStyle = '#c38a52'; ctx.fillRect(hero.x - 8, ground - 39, 16, 39);
  }
  if (stage.ending) {
    ctx.fillStyle = `rgba(20,13,11,${Math.min(.65, stage.ending * .42)})`;
    ctx.fillRect(0, 0, PROLOGUE_WIDTH, PROLOGUE_HEIGHT);
  }
}
