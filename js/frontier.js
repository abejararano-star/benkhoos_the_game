export const COLONIAL_POSTS = Object.freeze([
  { id: 'posta_jegua', side: -1, x: -2970, label: 'Posta del camino de Jegua', grade: 1 },
  { id: 'posta_manglar', side: 1, x: 2970, label: 'Posta del Manglar', grade: 1 },
  { id: 'reducto_loma', side: -1, x: -6850, label: 'Reducto rural de la Loma', grade: 2 },
  { id: 'reducto_estero', side: 1, x: 7020, label: 'Reducto rural del Estero', grade: 2 },
  { id: 'guardia_cartagena', side: -1, x: -9740, label: 'Guardia exterior de Cartagena', grade: 3 },
  { id: 'guardia_marea', side: 1, x: 9670, label: 'Guardia exterior del Puerto', grade: 2 }
]);

export const ROAD_GATES = COLONIAL_POSTS.slice(0, 2);
const ROSTERS = {
  1: ['CAMPESINO', 'SOLDADO_ESPANOL'],
  2: ['SOLDADO_ESPANOL', 'PIQUERO', 'ARQUERO_COLONIAL'],
  3: ['PIQUERO', 'ARCABUCERO', 'CABALLERO', 'SOLDADO_ESPANOL']
};

export function departurePost(side, kind, day, type) {
  const posts = COLONIAL_POSTS.filter(post => post.side === side);
  if (kind === 'final' || type === 'GOBERNADOR_GIRON' || kind === 'raid' && day >= 8) return posts[2];
  if (kind === 'raid' && day >= 5) return posts[1];
  return posts[0];
}

export function orderPost(campaign, order, day) {
  return COLONIAL_POSTS.find(post => post.id === order.postId && post.side === order.side) ??
    departurePost(order.side, order.kind, order.kind === 'raid' ? campaign.lastRaidDay : day, order.type);
}

export function strengthenPostGuard(enemy, grade) {
  if (grade === 1 || !Number.isFinite(enemy.maxHp) || !Number.isFinite(enemy.dmg)) return;
  const bonus = grade === 3 ? 1.35 : 1.14;
  enemy.hp = enemy.maxHp = Math.round(enemy.maxHp * bonus);
  enemy.dmg = Math.round(enemy.dmg * bonus);
}

export function advanceGarrisons(state, dt, spawnEnemy) {
  const garrisons = state.campaign.garrisons ??= {};
  for (const post of COLONIAL_POSTS) {
    const distance = Math.abs(state.benkos.x - post.x);
    const alive = state.enemies.some(enemy => enemy.hp > 0 && enemy.guardSite === post.id);
    if (alive) continue;
    const timer = garrisons[post.id];
    if (timer > 0) {
      if (distance > 620) garrisons[post.id] = Math.max(0, timer - dt);
      continue;
    }
    if (distance > 460) continue;
    garrisons[post.id] = 90;
    for (const [index, type] of ROSTERS[post.grade].entries()) {
      const enemy = spawnEnemy(type, post.side, post.x + post.side * (index * 19 - 20));
      strengthenPostGuard(enemy, post.grade);
      enemy.guardSite = post.id;
      enemy.guardX = enemy.x;
      enemy.appearTimer = .7 + index * .22;
    }
  }
}
