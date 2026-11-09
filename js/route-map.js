import { WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=89d5690bb102';
import { ALTAR_X, TRAIL_CACHES } from './exploration.js?v=89d5690bb102';
import { haciendaActive } from './haciendas.js?v=89d5690bb102';
import { ESTATES, storyChapter } from './story.js?v=89d5690bb102';
import { CROSSINGS } from './crossings.js?v=89d5690bb102';

export const mapX = x => 7 + 86 * Math.max(0, Math.min(1, (x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)));

export function mapLocations(state) {
  const sites = [{ id: 'matuna', x: 0, label: 'La Matuna', name: 'Palenque de la Matuna', row: 'upper',
    kind: 'palenque', detail: 'Aquí está la casa central. Pulsa E en su entrada para convocar al consejo cuando avances al capítulo II.' }];
  if (state.exploration.altarFound) sites.push({ id: 'santuario', x: ALTAR_X, label: 'Santuario', name: 'Santuario de los Ancestros',
    row: 'upper', kind: 'sanctuary', detail: 'Ofrenda con S para aprender los poderes del jaguar.' });
  for (const [id, label, detail] of [
    ['ridge_cache', 'Loma del Vigía', 'Más allá de Jegua quedan escalones de piedra y un alijo entre las ruinas.'],
    ['marsh_cache', 'Estero', 'Al oriente de Boca de Marea, el camino sigue hasta un riachuelo y un cofre.']
  ]) {
    const cache = TRAIL_CACHES.find(entry => entry.id === id);
    sites.push({ id, x: cache.x, label, name: label, row: 'upper', kind: 'sanctuary', detail });
  }
  for (const bridge of CROSSINGS) {
    const cut = state.crossings[bridge.id].cut;
    sites.push({ id: bridge.id, x: bridge.x, row: 'lower', kind: 'sanctuary',
      label: bridge.kind === 'rope' ? 'Puente colgante' : 'Puente fijo', name: bridge.name,
      detail: cut ? 'El paso está cortado. Repara desde un poste con E y 3 de madera.' :
        bridge.kind === 'rope' ? 'La madera cede con el peso. Desde un poste puedes cortar las cuerdas con Mayús + E.' :
          'Los pilotes sostienen un paso seguro a pie o a caballo.' });
  }
  const chapter = storyChapter(state);
  for (const h of state.haciendas) {
    if (h.major && chapter < 2) continue;
    const estate = ESTATES.find(site => site.id === h.id);
    const label = estate ? (h.side < 0 ? 'Jegua' : 'Boca de Marea') : h.side < 0 ? 'Hacienda oeste' : 'Hacienda este';
    const secured = state.story.completed.includes(h.id) || !haciendaActive(h);
    const detail = secured ? 'Las personas de esta hacienda ya fueron liberadas.' : h.major ?
      'Convoca la expedición en La Matuna. Derrota a la guarnición, abre el portón y escolta a la gente de regreso.' :
      'Derrota a los guardias que haya y rompe el portón con Espacio para liberar a las personas cautivas.';
    sites.push({ id: h.id, x: h.x, label, name: estate?.name ?? label, row: 'lower', kind: secured ? 'secured' : 'estate', detail });
  }
  return sites.sort((a, b) => a.x - b.x);
}

export function missionDestination(state, sites) {
  const mission = state.story.expedition;
  if (!mission) return null;
  return sites.find(site => site.id === (mission.stage === 'return' ? 'matuna' : mission.site)) ?? null;
}

export function mapDistance(playerX, siteX) {
  const distance = siteX - playerX;
  if (Math.abs(distance) < 45) return 'Estás aquí';
  return `${Math.round(Math.abs(distance) / 10) * 10} pasos al ${distance < 0 ? 'oeste' : 'este'}`;
}
