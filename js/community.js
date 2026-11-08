const INTERVAL = 8;
const MAX_DISTANCE = 58;
const SAFE_DISTANCE = 230;
const SOCIABLE = ['CALM', 'CARING'];

export function initialCommunity() {
  return { time: 0, nextAt: 6, relations: [], memorial: [], encounter: null };
}

function pairKey(a, b) {
  return [a.id, b.id].sort((left, right) => left - right).join(':');
}

function firstImpression(a, b) {
  if (a.temperament === 'CARING' || b.temperament === 'CARING') return 1;
  if (a.temperament === b.temperament && a.temperament !== 'RESTLESS') return 1;
  if ([a, b].some(person => person.temperament === 'RESTLESS')) {
    return [a, b].some(person => person.temperament === 'BRAVE' || person.temperament === 'CAUTIOUS') ? -2 : -1;
  }
  return 0;
}

function available(unit, state) {
  return unit.role !== 'FUGITIVO' && unit.role !== 'CABALLERO_ALIADO' && unit.hp >= unit.maxHp * .75 &&
    Math.abs(unit.x) < 610 && unit.fear < 25 && !unit.hurtTimer && !unit.requestedRole &&
    !unit.escortHome && !unit.carryingSack && !unit.recoveredCoins && !unit.pendingShot && !unit.pendingStrike && !unit.liberateAnimTimer && !unit.kitOrder && !unit.leisure &&
    !(unit.attackAnimTimer > 0) && !['BUILD', 'CHOP', 'TRAINING', 'FLEE', 'KITE', 'REST', 'RECOVER'].includes(unit.activity) &&
    !state.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - unit.x) < SAFE_DISTANCE);
}

export function restoreCommunity(state) {
  const community = state.community;
  if (!Array.isArray(community?.relations)) {
    state.community = initialCommunity();
    return;
  }
  const ids = new Set(state.units.map(unit => unit.id));
  const seen = new Set();
  community.relations = community.relations.filter(relation => {
    if (!relation || !Array.isArray(relation.people) || relation.people.length !== 2) return false;
    const [first, second] = relation.people;
    const key = pairKey({ id: first }, { id: second });
    if (first === second || !ids.has(first) || !ids.has(second) || seen.has(key) || !Number.isFinite(relation.score)) return false;
    seen.add(key);
    relation.key = key;
    relation.score = Math.max(-5, Math.min(5, relation.score));
    relation.lastAt = Number.isFinite(relation.lastAt) ? relation.lastAt : 0;
    relation.meetings = Number.isFinite(relation.meetings) ? Math.max(0, relation.meetings) : 0;
    relation.partner = relation.partner === true;
    return true;
  });
  community.time = Number.isFinite(community.time) ? community.time : 0;
  community.memorial = Array.isArray(community.memorial) ? community.memorial.slice(-24) : [];
  community.nextAt = community.time + 4;
  // A conversation is ephemeral. Its relationship and any damage already applied survive reload.
  community.encounter = null;
  for (const unit of state.units) {
    delete unit.socialPose;
    if (unit.activity === 'SOCIAL') unit.activity = 'IDLE';
  }
}

export function updateCommunity(state, dt, onSupport) {
  const community = state.community;
  community.time += dt;
  const encounter = community.encounter;
  if (encounter) {
    const participants = encounter.people.map(id => state.units.find(unit => unit.id === id));
    if (participants.some(unit => !unit || !available(unit, state)) || state.phase !== 'DAY_EXPLORE' || encounter.elapsed >= encounter.duration) {
      for (const unit of participants) {
        if (unit) delete unit.socialPose;
      }
      community.encounter = null;
      community.nextAt = community.time + INTERVAL;
      return;
    }
    encounter.elapsed += dt;
    if (['LAUGH', 'ROMANCE'].includes(encounter.kind) && encounter.elapsed >= 2.5) {
      const relation = community.relations.find(link => link.key === pairKey(...participants));
      if (relation && relation.supportDay !== state.day) {
        relation.supportDay = state.day;
        for (const unit of participants) {
          unit.fatigue = Math.max(0, unit.fatigue - 12);
          unit.fear = Math.max(0, unit.fear - 8);
        }
        state.morale = Math.min(125, state.morale + 2);
        onSupport?.(participants[0].x);
      }
    }
    if (encounter.kind === 'SCUFFLE' && !encounter.hit && encounter.elapsed >= 1.15) {
      encounter.hit = true;
      for (const unit of participants) {
        unit.lastScuffleDay = state.day;
        const damage = Math.min(3, Math.max(1, Math.floor(unit.maxHp * .03)));
        const floor = Math.ceil(unit.maxHp * .75);
        unit.hp -= Math.min(damage, Math.max(0, unit.hp - floor));
      }
    }
    return;
  }

  if (state.phase !== 'DAY_EXPLORE' || community.time < community.nextAt) return;
  community.nextAt = community.time + 2;
  const people = state.units.filter(unit => available(unit, state));
  const links = new Map(community.relations.map(relation => [relation.key, relation]));
  let chosen;
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      const distance = Math.abs(a.x - b.x);
      if (distance > MAX_DISTANCE) continue;
      const key = pairKey(a, b);
      const relation = links.get(key);
      const age = relation ? community.time - relation.lastAt : 52;
      if (age < 26) continue;
      const priority = Math.min(age, 120) - distance * .1 + Math.max(0, relation?.score ?? 0) * 4 + (relation?.partner ? 15 : 0);
      if (!chosen || priority > chosen.priority) {
        chosen = { a, b, key, relation, priority };
      }
    }
  }
  if (!chosen) return;

  const { a, b, key } = chosen;
  let relation = chosen.relation;
  if (!relation) {
    relation = { key, people: [a.id, b.id], score: firstImpression(a, b), lastAt: 0 };
    community.relations.push(relation);
  }
  const hotheaded = [a, b].some(unit => unit.temperament === 'RESTLESS' || unit.traits?.impulse === 5);
  const rested = [a, b].every(unit => unit.lastScuffleDay !== state.day);
  let kind = 'CHAT';
  const hasPartner = unit => community.relations.some(link => link.partner && link.people.includes(unit.id));
  const mutualInterest = a.gender !== b.gender && !a.grief && !b.grief &&
    (a.traits?.charm ?? 2) + (b.traits?.charm ?? 2) >= 6;
  if (relation.score <= -2 && hotheaded && rested) {
    kind = 'SCUFFLE';
  } else if (relation.partner || (relation.score >= 4 && relation.meetings >= 3 && mutualInterest && !hasPartner(a) && !hasPartner(b))) {
    relation.partner = true;
    kind = 'ROMANCE';
  } else if (relation.score >= 2 && [a, b].some(unit => SOCIABLE.includes(unit.temperament))) {
    kind = 'LAUGH';
  }
  relation.score = Math.max(-5, Math.min(5, relation.score + (kind === 'SCUFFLE' ? -1 : 1)));
  relation.meetings = (relation.meetings ?? 0) + 1;
  relation.lastAt = community.time;
  const center = (a.x + b.x) / 2;
  const direction = Math.sign(b.x - a.x) || 1;
  const halfSpacing = kind === 'SCUFFLE' ? 12 : 15;
  community.encounter = { people: [a.id, b.id], positions: [center - direction * halfSpacing, center + direction * halfSpacing],
    kind, elapsed: 0, duration: kind === 'SCUFFLE' ? 2.25 : 4.4, hit: false };
}

export function joinEncounter(unit, state, dt) {
  const encounter = state.community.encounter;
  const index = encounter?.people.indexOf(unit.id) ?? -1;
  if (index < 0) return false;
  const target = encounter.positions[index];
  const delta = target - unit.x;
  const step = Math.sign(delta) * Math.min(Math.abs(delta), dt * 34);
  unit.x += step;
  unit.vx = dt > 0 ? step / dt : 0;
  unit.facing = Math.abs(delta) > 1 ? Math.sign(delta) : Math.sign(encounter.positions[1 - index] - target);
  unit.activity = 'SOCIAL';
  unit.socialPose = { kind: encounter.kind, time: encounter.elapsed, index };
  unit.mood = { CHAT: 'Conversando', LAUGH: 'Riendo con una amistad', SCUFFLE: 'En un altercado', ROMANCE: 'Compartiendo un rato con su pareja' }[encounter.kind];
  return true;
}

export function canMediate(state) {
  const encounter = state.community.encounter;
  return encounter?.kind === 'SCUFFLE' && !encounter.hit && encounter.positions.some(x => Math.abs(x - state.benkos.x) < 52);
}

export function mediateEncounter(state) {
  if (!canMediate(state)) return false;
  const { community } = state;
  const encounter = community.encounter;
  const relation = community.relations.find(link => link.people.every(id => encounter.people.includes(id)));
  if (relation) relation.score = Math.min(5, relation.score + 2);
  for (const unit of state.units) if (encounter.people.includes(unit.id)) {
    delete unit.socialPose;
    unit.activity = 'IDLE';
    unit.lastScuffleDay = state.day;
  }
  community.encounter = null;
  community.nextAt = community.time + INTERVAL;
  return true;
}

export function relationshipsFor(unit, state) {
  return state.community.relations.flatMap(relation => {
    if (!relation.people.includes(unit.id)) return [];
    const other = state.units.find(person => person.id === relation.people.find(id => id !== unit.id));
    return other ? [{ name: other.name, score: relation.score, lastAt: relation.lastAt, partner: relation.partner }] : [];
  }).sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || b.lastAt - a.lastAt);
}
