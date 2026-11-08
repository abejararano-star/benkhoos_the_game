import { INFANTRY } from './equipment.js?v=8d54c297ea97';

export const ESTATES = [
  { id: 'hacienda_jegua', name: 'Hacienda del Paso de Jegua', x: -3510, side: -1, maxHp: 440, prisoners: 5,
    roster: ['SOLDADO_ESPANOL', 'PIQUERO', 'ARQUERO_COLONIAL'] },
  { id: 'hacienda_marea', name: 'Hacienda de la Boca de Marea', x: 3720, side: 1, maxHp: 530, prisoners: 6,
    roster: ['PIQUERO', 'SOLDADO_ESPANOL', 'ARQUERO_COLONIAL', 'ARCABUCERO'] }
];
const COMPANIONS = [...INFANTRY, 'CAZADOR', 'CAMPEON_REAL', 'CABALLERO_ALIADO'];
export const localHaciendas = state => state.haciendas.filter(h => !h.major);
export const estateById = id => ESTATES.find(site => site.id === id);
export function majorHaciendas() {
  return ESTATES.map(({ id, name, x, side, maxHp, prisoners }) => ({ id, name, x, side, hp: maxHp, maxHp, prisoners, major: true, destroyed: false }));
}

export function initialStory() {
  return { plan: '', treaty: '', finale: '', completed: [], expedition: null, finalWon: false };
}

export function restoreStory(state, legacy) {
  const value = state.story;
  const story = initialStory();
  story.plan = ['guides', 'assault'].includes(value.plan) ? value.plan : '';
  story.treaty = ['signed', 'refused'].includes(value.treaty) ? value.treaty : state.truceDays > 0 ? 'signed' : '';
  story.completed = ESTATES.filter(site => Array.isArray(value.completed) && value.completed.includes(site.id)).map(site => site.id);
  story.finale = story.completed.length === ESTATES.length && ['witnesses', 'network'].includes(value.finale) ? value.finale : '';
  story.finalWon = !!story.finale && value.finalWon === true;
  const mission = value.expedition;
  if (story.plan && mission && estateById(mission.site) && !story.completed.includes(mission.site) &&
      ['march', 'assault', 'return'].includes(mission.stage) && Array.isArray(mission.party) && Array.isArray(mission.rescued)) {
    story.expedition = { site: mission.site, stage: mission.stage,
      party: [...new Set(mission.party.filter(id => Number.isSafeInteger(id)))].slice(0, 3),
      rescued: [...new Set(mission.rescued.filter(id => Number.isSafeInteger(id)))].slice(0, 6) };
  }
  state.story = story;
  for (const site of majorHaciendas()) if (!state.haciendas.some(h => h.id === site.id)) state.haciendas.push(site);
  if (legacy && state.status === 'victory') {
    state.status = 'playing';
    state.campaign.governorDefeated = true;
    for (const hacienda of localHaciendas(state)) hacienda.destroyed = true;
  }
}

export function storyChapter(state) {
  if (state.story.completed.length === ESTATES.length) return 3;
  return localHaciendas(state).length >= 2 && localHaciendas(state).every(h => h.destroyed) ? 2 : 1;
}

export function beginExpedition(state, id) {
  if (storyChapter(state) !== 2 || !state.story.plan || state.story.expedition || state.story.completed.includes(id) || !estateById(id)) return false;
  const site = state.haciendas.find(h => h.id === id);
  if (site.destroyed && !site.reoccupied) return false;
  const available = state.units.filter(u => COMPANIONS.includes(u.role) && u.hp >= u.maxHp * .55 && !u.requestedRole && !u.kitOrder && Math.abs(u.x) < 650);
  const party = available.sort((a, b) => (b.role === 'ARQUERO') - (a.role === 'ARQUERO') || b.hp / b.maxHp - a.hp / a.maxHp).slice(0, 3).map(u => u.id);
  state.story.expedition = { site: id, stage: 'march', party, rescued: [] };
  return true;
}

export function expeditionPost(unit, state) {
  const mission = state.story.expedition;
  const slot = mission?.party.indexOf(unit.id) ?? -1;
  if (slot < 0) return null;
  const side = estateById(mission.site).side * (mission.stage === 'return' ? -1 : 1);
  const protectedPerson = mission.stage === 'return' && state.units.find(u => u.hp > 0 && u.escortHome &&
    mission.rescued.includes(u.id) && Math.abs(u.x) > Math.abs(state.benkos.x) + 90);
  return (protectedPerson?.x ?? state.benkos.x) - side * (38 + slot * 26);
}

export function onEstateLiberated(state, site, captives) {
  const mission = state.story.expedition;
  if (mission?.site !== site.id) return;
  mission.stage = 'return';
  mission.rescued = captives.map(u => u.id);
}

export function advanceExpedition(state) {
  const mission = state.story.expedition;
  if (!mission) return '';
  const site = estateById(mission.site);
  if (mission.stage === 'march' && Math.abs(state.benkos.x - site.x) < 355) {
    mission.stage = 'assault';
    return 'approach';
  }
  if (mission.stage !== 'return') return '';
  const people = state.units.filter(u => u.hp > 0 && mission.rescued.includes(u.id));
  if (people.some(u => u.escortHome)) return '';
  if (people.length && Math.abs(state.benkos.x) > 300) return '';
  if (people.length) {
    state.story.completed.push(site.id);
    state.treasuryCoins += 8;
    state.score += 600;
  }
  state.story.expedition = null;
  return people.length ? 'returned' : 'failed';
}

export function expeditionObjective(state) {
  const mission = state.story.expedition;
  if (!mission) return '';
  const site = estateById(mission.site);
  if (mission.stage === 'return') {
    const onRoad = state.units.filter(unit => unit.hp > 0 && unit.escortHome && mission.rescued.includes(unit.id)).length;
    return onRoad ? `Regresa a la Matuna · ${onRoad} personas aún en camino.` : 'Los rescatados llegaron. Reúnete con ellos en la casa central.';
  }
  if (mission.stage === 'assault') return `Derrota a la guarnición y rompe el portón de ${site.name}.`;
  const distance = Math.round(Math.abs(state.benkos.x - site.x) / 10) * 10;
  return `Marcha al ${site.side < 0 ? 'oeste' : 'este'} hacia ${site.name} · ${distance} pasos.`;
}

export function finalObjective(state) {
  const story = state.story;
  if (!story.finale) return 'Reúne al consejo frente a la casa central con E.';
  if (state.enemies.some(enemy => enemy.finalRaid && enemy.hp > 0) || state.campaign.orders.some(order => order.kind === 'final')) {
    return story.finale === 'witnesses' ? 'Defiende a los testigos de la última expedición colonial.' : 'Defiende los caminos de la Matuna del ataque en dos frentes.';
  }
  return 'Resiste la última ofensiva y derrota al gobernador.';
}
