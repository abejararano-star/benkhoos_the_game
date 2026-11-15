export const COLONIAL_POSTS = Object.freeze([
  { id: 'posta_jegua', side: -1, x: -2970, label: 'Posta del camino de Jegua', grade: 1 },
  { id: 'posta_manglar', side: 1, x: 2970, label: 'Posta del Manglar', grade: 1 },
  { id: 'reducto_loma', side: -1, x: -6850, label: 'Reducto rural de la Loma', grade: 2 },
  { id: 'reducto_estero', side: 1, x: 7020, label: 'Reducto rural del Estero', grade: 2 },
  { id: 'guardia_cartagena', side: -1, x: -9740, label: 'Guardia exterior de Cartagena', grade: 3 },
  { id: 'guardia_marea', side: 1, x: 9670, label: 'Guardia exterior del Puerto', grade: 3 }
]);

export const ROAD_GATES = COLONIAL_POSTS.slice(0, 2);
const ROSTERS = {
  1: ['CAMPESINO', 'SOLDADO_ESPANOL'],
  2: ['PIQUERO', 'SOLDADO_ESPANOL', 'ARQUERO_COLONIAL', 'BANDOLERO'],
  3: ['PIQUERO', 'SOLDADO_ESPANOL', 'ARCABUCERO', 'ARQUERO_COLONIAL', 'PIQUERO', 'CABALLERO']
};
export const colonialShooter = unit => unit.type === 'ARQUERO_COLONIAL' || unit.type === 'ARCABUCERO';

export function fortTowers(site) {
  const offsets = site.grade >= 4 ? [-132, 123] : site.grade >= 2 ? [78] : [];
  const level = Math.min(3, site.grade - 1);
  return offsets.map((offset, i) => ({
    id: `${site.id}_tower_${i}`, x: site.x + site.side * offset, side: site.side, level,
    maxHp: [0, 95, 145, 195][level]
  }));
}

export const towerHealth = (state, tower) => Math.max(0, tower.maxHp - (state.campaign.towerDamage?.[tower.id] ?? 0));

export function deployGuards(state, site, roster, spawnEnemy, stagger = 0) {
  const towers = (site.towers === false ? [] : fortTowers(site)).filter(tower => towerHealth(state, tower) > 0 &&
    !state.enemies.some(enemy => enemy.hp > 0 && enemy.towerId === tower.id));
  let foot = 0;
  for (const [index, type] of roster.entries()) {
    const tower = colonialShooter({ type }) ? towers.shift() : null;
    const offset = [-72, -22, 45, 93, 157, 182, 208, 233, 254][foot] ?? 264;
    const x = tower?.x ?? site.x + site.side * offset;
    if (!tower) foot++;
    const enemy = spawnEnemy(type, site.side, x);
    strengthenPostGuard(enemy, site.grade);
    enemy.guardSite = site.id;
    enemy.guardGrade = site.grade;
    enemy.guardX = x;
    enemy.attackCooldown = Math.max(enemy.attackCooldown ?? 0, .45 + index * .23);
    if (stagger) enemy.appearTimer = stagger + index * .16;
    if (tower) enemy.towerId = tower.id;
  }
}

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
  const bonus = [1, 1, 1.16, 1.36, 1.48, 1.6][grade] ?? 1;
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
    deployGuards(state, post, ROSTERS[post.grade], spawnEnemy, .7);
  }
}
