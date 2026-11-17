import { CAMP_EDGE } from './config.js?v=756398033889';
import { INFANTRY } from './equipment.js?v=756398033889';
import { COLONIAL_POSTS } from './frontier.js?v=756398033889';
import { PROLOGUE } from './chronicle.js?v=756398033889';

export const ESTATES = [
  { id: 'hacienda_jegua', name: 'Hacienda del Paso de Jegua', x: -3510, side: -1, maxHp: 440, prisoners: 5,
    roster: ['SOLDADO_ESPANOL', 'PIQUERO', 'ARQUERO_COLONIAL'] },
  { id: 'hacienda_marea', name: 'Hacienda de la Boca de Marea', x: 3720, side: 1, maxHp: 530, prisoners: 6,
    roster: ['PIQUERO', 'SOLDADO_ESPANOL', 'ARQUERO_COLONIAL', 'ARCABUCERO'] }
];
export const CITIES = [
  { id: 'cartagena', name: 'Cartagena de Indias', x: -10420, cityX: -11220, side: -1, grade: 5, maxHp: 775, prisoners: 6,
    sprite: 'city_cartagena', gateOffset: 26, envoy: 'Escribano de Cartagena',
    context: 'Las carretas de las haciendas pasan por aquí. El gobernador Girón ordenó retener a quienes venían del camino de Jegua.',
    roster: ['PIQUERO', 'ARCABUCERO', 'SOLDADO_ESPANOL', 'ARQUERO_COLONIAL', 'PIQUERO', 'CABALLERO', 'SOLDADO_ESPANOL', 'ARCABUCERO'],
    reserve: ['PIQUERO', 'ARQUERO_COLONIAL', 'CABALLERO'] },
  { id: 'puerto_marea', name: 'Puerto de la Marea', x: 10280, cityX: 11090, side: 1, grade: 4, maxHp: 700, prisoners: 6,
    sprite: 'city_marea', gateOffset: 9, envoy: 'Portera del cabildo',
    context: 'El gobernador del puerto cerró el paso por el estero. Desde entonces, las familias cautivas esperan en el patio exterior.',
    roster: ['ARQUERO_COLONIAL', 'PIQUERO', 'ARCABUCERO', 'SOLDADO_ESPANOL', 'BANDOLERO', 'PIQUERO', 'CABALLERO'],
    reserve: ['SOLDADO_ESPANOL', 'ARQUERO_COLONIAL'] }
];
export const OUTPOSTS = [
  { id: 'avanzada_jegua', name: 'Avanzada de la Loma', x: -7960, side: -1 },
  { id: 'avanzada_estero', name: 'Avanzada del Estero', x: 8170, side: 1 }
];
const SITES = [...ESTATES, ...CITIES];
const COMPANIONS = [...INFANTRY, 'CAZADOR', 'CAMPEON_REAL', 'CABALLERO_ALIADO'];
export const localHaciendas = state => state.haciendas.filter(h => !h.major);
export const estateById = id => SITES.find(site => site.id === id);
export function majorHaciendas() {
  return SITES.map(({ id, name, x, side, maxHp, prisoners }) => ({ id, name, x, side, hp: maxHp, maxHp, prisoners, major: true, destroyed: false }));
}

export function initialStory() {
  return { plan: '', treaty: '', finale: '', completed: [], outposts: [], rescuedTotal: 0, lostTotal: 0,
    expedition: null, finalWon: false, prologuePage: null, occupied: [] };
}

export function restoreStory(state, legacy) {
  const value = state.story;
  const story = initialStory();
  story.plan = ['guides', 'assault'].includes(value.plan) ? value.plan : '';
  story.treaty = ['signed', 'refused'].includes(value.treaty) ? value.treaty : state.truceDays > 0 ? 'signed' : '';
  story.completed = SITES.filter(site => Array.isArray(value.completed) && value.completed.includes(site.id)).map(site => site.id);
  story.outposts = OUTPOSTS.filter(post => Array.isArray(value.outposts) && value.outposts.includes(post.id)).map(post => post.id);
  for (const key of ['rescuedTotal', 'lostTotal']) if (Number.isSafeInteger(value[key]) && value[key] >= 0) story[key] = value[key];
  story.occupied = CITIES.filter(city => story.completed.includes(city.id) && Array.isArray(value.occupied) &&
    value.occupied.includes(city.id)).map(city => city.id);
  story.finale = ESTATES.every(site => story.completed.includes(site.id)) &&
    ['witnesses', 'network', 'accord', 'historical', 'conquest'].includes(value.finale) ? value.finale : '';
  if (story.finale === 'conquest' && story.occupied.length !== CITIES.length) story.finale = '';
  story.finalWon = !!story.finale && value.finalWon === true;
  if (state.status === 'playing' && Number.isInteger(value.prologuePage) &&
    value.prologuePage >= 0 && value.prologuePage < PROLOGUE.lines.length) story.prologuePage = value.prologuePage;
  const mission = value.expedition;
  if (story.plan && mission && estateById(mission.site) && !story.completed.includes(mission.site) &&
      ['march', 'assault', 'return'].includes(mission.stage) && Array.isArray(mission.party) && Array.isArray(mission.rescued)) {
    story.expedition = { site: mission.site, stage: mission.stage,
      party: [...new Set(mission.party.filter(id => Number.isSafeInteger(id)))].slice(0, estateById(mission.site).cityX ? 4 : 3),
      rescued: [...new Set(mission.rescued.filter(id => Number.isSafeInteger(id)))].slice(0, 6) };
  }
  state.story = story;
  for (const site of majorHaciendas()) {
    const saved = state.haciendas.find(h => h.id === site.id);
    if (!saved) state.haciendas.push(site);
    else if (CITIES.some(city => city.id === site.id)) {
      if (saved.maxHp > 0 && saved.maxHp < site.maxHp && Number.isFinite(saved.hp)) {
        saved.hp = Math.max(0, Math.round(saved.hp * site.maxHp / saved.maxHp));
        saved.maxHp = site.maxHp;
      }
      const offset = site.x - saved.x;
      if (!offset) continue;
      saved.x = site.x;
      for (const unit of state.units) if (unit.captiveHacienda === site.id) unit.x += offset;
      for (const guard of state.enemies) if (guard.guardSite === site.id && Number.isFinite(guard.guardX)) {
        guard.x += offset;
        guard.guardX += offset;
      }
    }
  }
  if (legacy && state.status === 'victory') {
    state.status = 'playing';
    state.campaign.governorDefeated = true;
    for (const hacienda of localHaciendas(state)) hacienda.destroyed = true;
  }
}

export function storyChapter(state) {
  if (ESTATES.every(site => state.story.completed.includes(site.id))) return 3;
  return localHaciendas(state).length >= 2 && localHaciendas(state).every(h => h.destroyed) ? 2 : 1;
}

export function hasOutpost(state, side) {
  return OUTPOSTS.some(post => post.side === side && state.story.outposts.includes(post.id));
}

export function establishOutpost(state, post) {
  if (storyChapter(state) < 2) return 'El consejo habilitará esta avanzada tras liberar las haciendas cercanas.';
  if (state.story.outposts.includes(post.id)) return 'Avanzada activa. Sirve de refugio a las escoltas y facilita el rescate en la ciudad.';
  if (state.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - post.x) < 130)) return 'Despeja el camino antes de levantar el refugio.';
  if (state.resources.wood < 4 || state.resources.food < 3) return 'El refugio requiere 4 de madera y 3 de alimento.';
  state.resources.wood -= 4;
  state.resources.food -= 3;
  state.story.outposts.push(post.id);
  return 'Avanzada establecida. Los vigías encontrarán un camino con menos guardias hacia la ciudad.';
}

export function frontierHint(state) {
  const x = state.benkos.x;
  const post = OUTPOSTS.find(outpost => Math.abs(outpost.x - x) < 42);
  if (post) return state.story.outposts.includes(post.id) ? `E · ${post.name} · Refugio activo` : `E · ${post.name} · 4 madera y 3 alimento`;
  const city = CITIES.find(place => Math.abs(place.cityX - x) < 65);
  if (city) return `E · ${city.name} · ${canOccupyCity(state, city) ? 'Tomar el mando' : 'Entrada de la ciudad'}`;
  const colonial = COLONIAL_POSTS.find(place => Math.abs(place.x - x) < 100);
  return colonial ? `${colonial.label} · Guarnición colonial` : '';
}

export function canNegotiateFinale(state) {
  return storyChapter(state) === 3 && !state.story.expedition &&
    CITIES.every(city => state.story.completed.includes(city.id)) && state.story.outposts.length > 0;
}

export function canOccupyCity(state, city) {
  return !state.story.finale && !state.story.expedition && state.story.completed.includes(city.id) &&
    !state.story.occupied.includes(city.id) && Math.abs(state.benkos.x - city.cityX) < 65 &&
    !state.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - city.cityX) < 160);
}

export function occupyCity(state, city) {
  if (!canOccupyCity(state, city)) return false;
  state.story.occupied.push(city.id);
  return true;
}

export function campaignOutcome(state, status) {
  if (status === 'defeat') return 'fallen';
  if (['historical', 'conquest', 'accord'].includes(state.story.finale)) return state.story.finale;
  if (state.story.lostTotal >= 3 && state.story.lostTotal * 2 > state.story.rescuedTotal) return 'fragile';
  return state.story.finale;
}

export function beginExpedition(state, id) {
  if (storyChapter(state) < 2 || !state.story.plan || state.story.finale || state.story.expedition || state.story.completed.includes(id) || !estateById(id)) return false;
  const site = state.haciendas.find(h => h.id === id);
  if (!site || site.destroyed && !site.reoccupied) return false;
  const city = !!estateById(id).cityX;
  const available = state.units.filter(u => COMPANIONS.includes(u.role) && u.hp >= u.maxHp * .55 && !u.waterFall &&
    !(u.wound > 0) && !u.requestedRole && !u.kitOrder && Math.abs(u.x) < CAMP_EDGE + 300);
  available.sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp || a.id - b.id);
  const ranged = available.find(u => u.role === 'ARQUERO');
  const melee = available.find(u => !['ARQUERO', 'CAZADOR'].includes(u.role));
  const party = [...new Set([ranged, melee, ...available].filter(Boolean))].slice(0, city ? 4 : 3).map(u => u.id);
  state.story.expedition = { site: id, stage: 'march', party, rescued: [] };
  return true;
}

export function expeditionFormation(state) {
  const mission = state.story.expedition;
  if (!mission?.party.length) return null;
  const ranged = unit => unit.role === 'ARQUERO' || unit.role === 'CAZADOR';
  const party = mission.party.map(id => state.units.find(unit => unit.id === id)).filter(unit => unit?.hp > 0);
  party.sort((a, b) => Number(ranged(a)) - Number(ranged(b)));
  const side = estateById(mission.site).side;
  const civilians = mission.stage === 'return' ? state.units.filter(unit => unit.hp > 0 && unit.escortHome && mission.rescued.includes(unit.id)) : [];
  if (!civilians.length) {
    const direction = mission.stage === 'return' ? -side : side;
    return new Map(party.map((unit, slot) => [unit.id, state.benkos.x - direction * (38 + slot * 26)]));
  }

  const positions = civilians.map(unit => unit.x * side);
  const rear = Math.max(...positions), front = Math.min(...positions);
  let meleeSlot = 0, rangedSlot = 0;
  return new Map(party.map(unit => {
    if (ranged(unit)) return [unit.id, side * (rear + 16 + rangedSlot++ * 21)];
    const offset = meleeSlot++;
    return [unit.id, side * (offset % 2 ? rear + 68 : front - 33 - offset * 13)];
  }));
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
  state.story.rescuedTotal += people.length;
  state.story.lostTotal += mission.rescued.length - people.length;
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
  if (!story.finale) return expeditionObjective(state) || (CITIES.every(city => story.completed.includes(city.id)) && story.occupied.length < CITIES.length
    ? `Vuelve a las puertas de las ciudades y pulsa E para tomarlas (${story.occupied.length}/2), o elige otra ruta en el consejo.`
    : 'Reúne al consejo con E. Puedes explorar las ciudades antes de decidir el desenlace.');
  if (story.finale === 'historical') return 'Viaja a la puerta de Cartagena bajo la tregua y pulsa E.';
  if (story.finale === 'conquest') return 'Las dos ciudades están bajo tu mando. Resiste la última ofensiva de Girón.';
  if (state.enemies.some(enemy => enemy.finalRaid && enemy.hp > 0) || state.campaign.orders.some(order => order.kind === 'final')) {
    return story.finale === 'witnesses' ? 'Defiende a los testigos de la última expedición colonial.' : 'Defiende los caminos de la Matuna del ataque en dos frentes.';
  }
  return 'Resiste la última ofensiva y derrota al gobernador.';
}
