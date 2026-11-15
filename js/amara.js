import { canTendCrop } from './crops.js?v=51123491eb40';
import { speak } from './people.js?v=51123491eb40';

export const AMARA_NAME = 'Amara de la Ceiba';
const COUNCIL_X = -104;
const BONDS = ['new', 'friends', 'courtship', 'partners'];
export const initialAmara = () => ({ id: null, bond: 'new', leads: false, duty: 'crops', proposalDay: 0 });

export function restoreAmara(state) {
  const saved = state.amara;
  state.amara = {
    id: Number.isSafeInteger(saved?.id) && saved.id > 0 ? saved.id : null,
    bond: BONDS.includes(saved?.bond) ? saved.bond : 'new',
    leads: saved?.leads === true,
    duty: saved?.duty === 'works' ? 'works' : 'crops',
    proposalDay: Number.isSafeInteger(saved?.proposalDay) ? Math.max(0, saved.proposalDay) : 0
  };
  for (const unit of state.units) {
    if (unit.id === state.amara.id) markAmara(unit);
    else delete unit.namedAmara;
  }
}

function markAmara(unit) {
  unit.name = AMARA_NAME;
  unit.namedAmara = true;
  unit.sex = 'F';
  unit.gender = 'woman';
  unit.temperament = 'CARING';
  unit.requestedRole = null;
}

export function nominateAmara(state, hacienda) {
  if (state.amara.id !== null) return;
  const captive = state.units.find(unit => unit.role === 'FUGITIVO' && unit.sex === 'F' &&
    unit.hp > 0 && unit.captiveHacienda === hacienda.id);
  if (!captive) return;
  markAmara(captive);
  state.amara.id = captive.id;
}

export function amaraNearby(state) {
  if (state.benkos.waterFall || state.benkos.interaction || state.benkos.attackTimer > 0) return null;
  const unit = state.units.find(person => person.id === state.amara.id && person.hp > 0);
  if (!unit || unit.role === 'FUGITIVO' || unit.escortHome || unit.waterFall || unit.liberateAnimTimer > 0 ||
      Math.abs(unit.x - state.benkos.x) >= 46 ||
      state.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - unit.x) < 165)) return null;
  return unit;
}

export function amaraConversation(state) {
  const bond = state.amara;
  const title = bond.bond === 'partners' ? 'Nuestro hogar en la Matuna' : 'Amara de la Ceiba';
  if (bond.bond === 'new') return { title, lines: [
    ['Amara', 'Pensé que al llegar aquí solo querría descansar. Luego vi a las mujeres repartiéndose las semillas y me dieron ganas de ayudar.'],
    ['Benkos', 'El consejo escucha a quien conoce el trabajo. ¿Quieres reunir a las cuadrillas?'],
    ['Amara', 'Sí. Y luego me cuentas cómo te las arreglaste para encontrar la hacienda. Me gustaría oírtelo contar sin una patrulla detrás.']
  ], choices: [
    ['Invitar a Amara a dirigir las cuadrillas', 'lead'],
    ['Darle tiempo para instalarse', 'later']
  ] };
  if (bond.bond === 'courtship') return state.day < bond.proposalDay ? { title, lines: [
    ['Amara', 'Ya tenemos una conversación pendiente para mañana. Por ahora, ven a ver cómo avanza el trabajo.']
  ], choices: [] } : { title: 'Una promesa junto al fuego', lines: [
    ['Amara', 'He pensado en lo que dijiste. Quiero seguir reuniendo a mi gente y tener una casa contigo, si a ti también te nace.'],
    ['Benkos', 'Me gusta cómo hablas cuando defiendes algo. Si nos casamos, quiero que sigamos escuchándonos así.'],
    ['Amara', 'Entonces dime qué quieres y yo te diré lo que quiero yo.']
  ], choices: [
    ['Pedirle que se case con Benkos', 'marry'],
    ['Seguir como amigos', 'friends']
  ] };
  return { title, lines: [
    ['Amara', bond.bond === 'partners' ? 'Te guardé un lugar junto al fuego. Antes debo saber qué cuadrilla necesita manos.' :
      'Llegaste temprano. ¿Vienes a preguntar por las cuadrillas o querías verme a mí?'],
    ['Benkos', bond.bond === 'partners' ? 'Te acompaño. Veamos dónde hace falta ayuda.' : 'Por las dos cosas, si tienes tiempo.']
  ], choices: [
    ...(bond.bond === 'friends' ? [['Decirle que te gustaría cortejarla', 'court']] : []),
    ['Organizar a las agricultoras', 'crops'],
    ['Acompañar a la cuadrilla de construcción', 'works']
  ] };
}

export function chooseAmara(state, choice) {
  if (!amaraConversation(state).choices.some(([, available]) => available === choice)) return;
  const { amara } = state;
  if (choice === 'lead') {
    amara.leads = true;
    amara.bond = 'friends';
  } else if (choice === 'court') {
    amara.bond = 'courtship';
    amara.proposalDay = state.day + 1;
  } else if (choice === 'marry' || choice === 'friends') {
    amara.bond = choice === 'marry' ? 'partners' : 'friends';
  } else if (choice === 'works' || choice === 'crops') {
    amara.duty = choice;
  }
}

export function amaraCrew(state) {
  const leader = state.units.find(unit => unit.id === state.amara.id && unit.hp > 0 && !unit.escortHome &&
    !(unit.liberateAnimTimer > 0) && !unit.waterFall && unit.role !== 'FUGITIVO');
  if (!leader) return null;
  const works = state.amara.duty === 'works';
  const role = works ? 'CONSTRUCTOR' : 'AGRICULTOR';
  const sites = works ? state.settlement.projects : state.farms.filter(canTendCrop);
  const workers = state.amara.leads && state.phase === 'DAY_EXPLORE'
    ? state.units.filter(unit => unit.role === role && unit.hp > 0 && !unit.hurtTimer && !unit.waterFall &&
      !unit.carryingSack && !unit.requestedRole && unit.fear < 30) : [];
  const crew = workers.find(unit => unit.sex === 'F') ?? workers[0];
  const site = crew && (sites.find(entry => entry.id === crew.worksiteId || entry.id === crew.constructionJob) ??
    sites.reduce((closest, entry) => !closest || Math.abs(crew.x - entry.x) < Math.abs(crew.x - closest.x) ? entry : closest, null));
  return { leader, site, crew, role };
}

export function updateAmara(assignment, state, dt) {
  const { leader, site, crew, role } = assignment;
  const target = site ? site.x + 31 : COUNCIL_X;
  const dx = target - leader.x;
  leader.vx = Math.abs(dx) > 4 ? Math.sign(dx) * 63 : 0;
  if (leader.vx) {
    leader.x += Math.sign(dx) * Math.min(Math.abs(dx), Math.abs(leader.vx) * dt);
    leader.facing = Math.sign(dx);
    leader.activity = 'WALK';
    leader.mood = site ? 'Camino a la cuadrilla' : 'Camino a la casa del consejo';
    return;
  }
  if (site && Math.abs(crew.x - leader.x) < 88) {
    leader.facing = Math.sign(crew.x - leader.x) || -1;
    leader.activity = 'LEAD';
    leader.mood = role === 'AGRICULTOR' ? 'Organizando la siembra' : 'Coordinando la obra';
    speak(leader, role === 'AGRICULTOR' ? 'Dejen un surco para mañana.' : 'Primero aseguremos los apoyos.');
    if (leader.speechTimer > 0 && leader.speechTimer < 1.4) speak(crew, 'De acuerdo, Amara.');
  } else if (Math.abs(state.benkos.x - leader.x) < 55 && state.amara.bond === 'courtship') {
    leader.facing = Math.sign(state.benkos.x - leader.x) || 1;
    leader.activity = 'FLIRT';
    leader.mood = 'Esperando a Benkos';
    speak(leader, 'Benkos, ven. Quiero hablar contigo.');
  } else {
    leader.activity = 'IDLE';
    leader.mood = state.amara.leads ? 'Reuniendo a la comunidad' : 'Instalándose en la Matuna';
  }
}

export function amaraSupport(assignment, role, x) {
  return assignment?.role === role && assignment.leader.activity === 'LEAD' &&
    !assignment.leader.hurtTimer && assignment.leader.fear < 35 &&
    assignment.site && Math.abs(assignment.site.x - x) < 1 &&
    Math.abs(assignment.leader.x - x) < 50 ? 1.2 : 1;
}
