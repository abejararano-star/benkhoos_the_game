import { COLONIAL_POSTS, colonialShooter, fortTowers, towerHealth } from './frontier.js?v=6e8525fead6a';
import { CITIES } from './story.js?v=6e8525fead6a';
import { TOWER_TIERS } from './settlement.js?v=6e8525fead6a';

export const COLONIAL_TOWERS = [...COLONIAL_POSTS, ...CITIES].flatMap(fortTowers);
const towersById = new Map(COLONIAL_TOWERS.map(tower => [tower.id, tower]));

export function enemyTower(state, enemy) {
  const tower = towersById.get(enemy.towerId);
  return tower && towerHealth(state, tower) > 0 ? TOWER_TIERS[tower.level] : null;
}

export function resetEnemyAim(enemy) {
  enemy.windupTimer = 0;
  enemy.attackReady = false;
  delete enemy.aimId;
  delete enemy.aimFacing;
}

export function damageColonialTower(state, tower, amount) {
  const damage = state.campaign.towerDamage ??= {};
  const hp = towerHealth(state, tower);
  if (hp <= 0) return false;
  damage[tower.id] = Math.min(tower.maxHp, tower.maxHp - hp + amount);
  if (damage[tower.id] < tower.maxHp) return true;
  for (const enemy of state.enemies) {
    if (enemy.towerId !== tower.id || enemy.hp <= 0) continue;
    delete enemy.towerId;
    enemy.towerHeight = 0;
    enemy.hp -= 24;
    enemy.stunTimer = .55;
    enemy.hurtTimer = .24;
    resetEnemyAim(enemy);
  }
  return true;
}

export function restoreColonialTowers(state) {
  const old = state.campaign.towerDamage;
  if (old === undefined) return;
  state.campaign.towerDamage = Object.fromEntries(COLONIAL_TOWERS
    .filter(tower => Number.isFinite(old?.[tower.id]) && old[tower.id] > 0)
    .map(tower => [tower.id, Math.min(tower.maxHp, old[tower.id])]));
}

export function enemyTarget(enemy, player, allies, ranged) {
  let target = player.waterFall ? null : player;
  let distance = target ? Math.abs(player.x - enemy.x) : Infinity;
  if (enemy.aimId === 0 && target) return target;
  for (const ally of allies) {
    if (ally.hp <= 0 || ally.waterFall || !ranged && ally.towerHeight) continue;
    if (enemy.aimId === ally.id) return ally;
    const gap = Math.abs(ally.x - enemy.x);
    if (gap >= distance) continue;
    distance = gap;
    target = ally;
  }
  return target;
}

export function enemyReturnsToPost(enemy, target, range) {
  if (!enemy.guardSite || !Number.isFinite(enemy.guardX)) return false;
  const travel = 245 + Math.max(0, (enemy.guardGrade ?? 1) - 1) * 17;
  const currentGap = Math.abs(enemy.x - enemy.guardX);
  return currentGap > travel + 35 ||
    (!target || Math.abs(target.x - enemy.guardX) > travel && Math.abs(target.x - enemy.x) > range);
}

export function screenedRetreat(enemy, target, allies) {
  if (!colonialShooter(enemy) || !(enemy.guardGrade >= 2) || enemy.towerHeight || !target ||
      Math.abs(target.x - enemy.x) > 51 || Math.abs(enemy.x - enemy.guardX) > 135) return 0;
  const away = Math.sign(enemy.x - target.x);
  return allies.some(unit => unit !== enemy && unit.hp > 0 && unit.guardSite === enemy.guardSite &&
    !colonialShooter(unit) && (enemy.x - unit.x) * away > 0 && (unit.x - target.x) * away >= -22) ? away : 0;
}
