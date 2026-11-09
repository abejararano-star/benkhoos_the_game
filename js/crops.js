export const GROW_SECONDS = 125;
const CARE_POINTS = [.30, .65];

export function ensureCrop(farm) {
  farm.cropProgress = Number.isFinite(farm.cropProgress) ? Math.max(0, Math.min(1, farm.cropProgress)) : 0;
  if (!Number.isFinite(farm.tending)) farm.tending = 0;
  if (!Number.isInteger(farm.care)) {
    // Preserve the growth already earned in older saves.
    farm.care = CARE_POINTS.filter(point => farm.cropProgress > point).length;
  }
  farm.care = Math.max(0, Math.min(CARE_POINTS.length, farm.care));
  if (['PLANT', 'GROW', 'RIPE', 'FALLOW'].includes(farm.stage)) return;
  farm.stage = farm.cropProgress > 0 ? 'GROW' : 'PLANT';
  farm.tending = 0;
}

export function needsCropCare(farm) {
  return farm.stage === 'GROW' && farm.cropProgress >= (CARE_POINTS[farm.care] ?? Infinity);
}

export function canTendCrop(farm) {
  return farm.level > 0 && (farm.stage === 'PLANT' || farm.stage === 'RIPE' || needsCropCare(farm));
}

export function advanceCrops(state, dt) {
  for (const farm of state.farms) {
    if (farm.level === 0) continue;
    ensureCrop(farm);
    if (farm.stage === 'FALLOW' && farm.harvestDay < state.day) farm.stage = 'PLANT';
    if (farm.stage !== 'GROW') continue;
    if (state.phase !== 'DAY_EXPLORE') continue;
    farm.cropProgress = Math.min(CARE_POINTS[farm.care] ?? 1, farm.cropProgress + dt / GROW_SECONDS);
    if (farm.cropProgress === 1) farm.stage = 'RIPE';
  }
}

export function tendCrop(farm, state, dt, skill) {
  if (!canTendCrop(farm)) return null;
  farm.tending += dt * skill;
  const required = { PLANT: 3, GROW: 2.4, RIPE: 3.5 }[farm.stage];
  if (farm.tending < required) return null;
  farm.tending = 0;
  if (farm.stage === 'GROW') {
    farm.care++;
    return null;
  }
  farm.cropProgress = 0;
  farm.care = 0;
  if (farm.stage === 'PLANT') {
    farm.stage = 'GROW';
    return null;
  }
  farm.stage = 'FALLOW';
  farm.harvestDay = state.day;
  return { food: 3 + farm.level * 2, coins: 1 + farm.level };
}
