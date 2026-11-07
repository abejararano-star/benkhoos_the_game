const DUTY_ROLES = ['GUERRERO', 'ESPADACHIN', 'ARQUERO', 'CABALLERO_ALIADO', 'CAMPEON_REAL', 'CAZADOR'];
const FEMININE_NAMES = new Set(['Amara', 'Juana', 'Nala', 'Inés', 'Amina', 'Sira', 'María', 'Lucía', 'Ana', 'Binta', 'Dalia', 'Zuri']);
const TRAITS = ['intelligence', 'dedication', 'impulse', 'courage', 'curiosity', 'charm', 'appearance'];

export function ensureTraits(unit, random) {
  unit.gender ??= FEMININE_NAMES.has(unit.name?.split(' ')[0]) ? 'woman' : 'man';
  if (unit.traits && TRAITS.every(key => Number.isInteger(unit.traits[key]) && unit.traits[key] >= 1 && unit.traits[key] <= 5)) return;
  unit.traits = Object.fromEntries(TRAITS.map(key => [key, 1 + Math.floor(random() * 5)]));
}

export function describeTraits(unit) {
  const { intelligence, dedication, impulse, courage, curiosity, charm, appearance } = unit.traits;
  return [
    intelligence >= 4 ? 'Ingenio agudo' : intelligence <= 2 ? 'Aprende con práctica' : 'Práctico',
    dedication >= 4 ? 'Constante' : dedication <= 2 ? 'Le cuesta ponerse a trabajar' : 'Aplicación variable',
    impulse >= 5 ? 'Peleonero' : impulse >= 4 ? 'Impetuoso' : impulse <= 2 ? 'Prudente' : 'Equilibrado',
    courage >= 5 && impulse >= 4 ? 'Temerario' : courage >= 4 ? 'Valiente' : courage <= 2 ? 'Asustadizo' : 'Cautela normal',
    curiosity >= 4 ? 'Curioso' : curiosity <= 2 ? 'Apegado a sus rutinas' : 'Observador',
    charm >= 4 ? 'Carismático' : charm <= 2 ? 'Reservado' : 'Afable',
    appearance >= 4 ? 'Rostro agraciado' : appearance <= 2 ? 'Rasgos poco convencionales' : 'Aspecto corriente'
  ].join(' · ');
}

export function recordLoss(unit, state) {
  const { community } = state;
  community.memorial.push({ id: unit.id, name: unit.name, day: state.day });
  if (community.memorial.length > 24) community.memorial.shift();
  for (const relation of community.relations) {
    if (!relation.people.includes(unit.id) || (relation.score < 2 && !relation.partner)) continue;
    const other = state.units.find(person => person.id !== unit.id && relation.people.includes(person.id));
    if (!other || other.hp <= 0) continue;
    const duration = relation.partner ? 135 : 65 + relation.score * 8;
    if ((other.grief?.remaining ?? 0) < duration) other.grief = { name: unit.name, remaining: duration, duration };
    other.leisure = null;
    other.nextLeisure = community.time + 2;
  }
  community.relations = community.relations.filter(relation => !relation.people.includes(unit.id));
  if (unit.kitOrder) state.treasuryCoins += unit.kitOrder.cost;
}

export function updateGrief(unit, dt) {
  if (!unit.grief) return;
  unit.grief.remaining -= dt;
  if (unit.grief.remaining <= 0) unit.grief = null;
}

export function griefEffect(unit) {
  const grief = unit.grief;
  return grief ? 1 - .27 * (grief.remaining / grief.duration) : 1;
}

export function patrolOffset(unit, state) {
  if (state.phase !== 'DAY_EXPLORE') return 0;
  const phase = (state.community.time + Number(unit.id) * 2.3) % 24;
  return Math.round(23 * Math.sin(phase * Math.PI / 12));
}

export function takeLeisure(unit, state, dt) {
  const now = state.community.time;
  const interrupted = state.phase !== 'DAY_EXPLORE' || unit.role === 'FUGITIVO' || DUTY_ROLES.includes(unit.role) ||
    unit.carryingSack || unit.requestedRole || unit.kitOrder || unit.fear > 20 ||
    state.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - unit.x) < 250);
  if (interrupted) {
    if (unit.leisure) unit.nextLeisure = now + 20;
    unit.leisure = null;
    return false;
  }

  unit.nextLeisure ??= now + 14 + (unit.id % 11) * 3;
  if (!unit.leisure && now >= unit.nextLeisure) {
    if (unit.role === 'CONSTRUCTOR' && state.settlement.projects.length || unit.role === 'LENADOR' && state.trees.some(tree => tree.markedForChop)) return false;
    const cycle = (unit.id + state.day + (unit.breaksTaken ?? 0)) % 4;
    const creek = state.ecology.streams.reduce((best, stream) => Math.abs(stream.x - unit.x) < Math.abs(best.x - unit.x) ? stream : best);
    const pet = state.wildlife.find(animal => animal.hp > 0 && !animal.trapped && !animal.aggression && Math.abs(animal.x - unit.x) < 280 &&
      (animal.trust >= 1 || ['TURTLE', 'MONKEY'].includes(animal.species) && animal.fear < 20));
    let kind = 'STROLL';
    let x = unit.x < 0 ? -365 : 360;
    if (unit.grief && unit.grief.remaining > unit.grief.duration * .52) {
      kind = 'MOURN';
      x = 71;
    } else if (pet && unit.traits.curiosity >= 3 && cycle !== 3) {
      kind = 'PLAY';
      x = pet.x;
    } else if (cycle === 1 && Math.abs(creek.x - unit.x) < 680) {
      kind = 'BATHE';
      x = creek.x;
    } else if (cycle === 3) {
      kind = 'LEAVE';
      x = unit.x < 0 ? -533 : 550;
    }
    unit.breaksTaken = (unit.breaksTaken ?? 0) + 1;
    unit.leisure = { kind, x, remaining: kind === 'LEAVE' ? 12 : 4.5, expiresAt: now + 28, petId: kind === 'PLAY' ? pet.id : null };
  }
  const breakTime = unit.leisure;
  if (!breakTime) return false;

  const pet = state.wildlife.find(animal => animal.id === breakTime.petId && animal.hp > 0);
  if (breakTime.kind === 'PLAY' && pet) breakTime.x = pet.x + (unit.x < pet.x ? -17 : 17);
  if (breakTime.kind === 'PLAY' && !pet) breakTime.remaining = 0;
  if (breakTime.remaining <= 0 || now >= breakTime.expiresAt) {
    unit.leisure = null;
    unit.nextLeisure = now + 32 + unit.traits.dedication * 8 + unit.id % 13;
    return false;
  }
  const delta = breakTime.x - unit.x;
  const traveling = Math.abs(delta) > 5;
  unit.activity = traveling ? 'WALK' : breakTime.kind;
  unit.mood = { STROLL: 'Paseando', PLAY: 'Jugando con un animal', BATHE: 'Bañándose en el riachuelo', LEAVE: 'De descanso', MOURN: `Llorando a ${unit.grief?.name ?? 'una persona querida'}` }[breakTime.kind];
  unit.vx = traveling ? Math.sign(delta) * 53 * griefEffect(unit) : 0;
  if (traveling) unit.facing = Math.sign(delta);
  else {
    breakTime.remaining -= dt;
    unit.fatigue = Math.max(0, unit.fatigue - dt * 2);
    if (pet) {
      pet.eatTimer = Math.max(pet.eatTimer, .2);
      pet.facing = Math.sign(unit.x - pet.x) || 1;
    }
  }
  unit.x += unit.vx * dt;
  return true;
}
