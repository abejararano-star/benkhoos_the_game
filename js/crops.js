const GROW_SECONDS = 42;

export function ensureCrop(farm) {
  farm.cropProgress = Number.isFinite(farm.cropProgress) ? Math.max(0, Math.min(1, farm.cropProgress)) : 0;
  if (!Number.isFinite(farm.tending)) farm.tending = 0;
  if (['PLANT', 'GROW', 'RIPE', 'FALLOW'].includes(farm.stage)) return;
  farm.stage = farm.cropProgress > 0 ? 'GROW' : 'PLANT';
  farm.tending = 0;
}

export function advanceCrops(state, dt) {
  for (const farm of state.farms) {
    if (farm.level === 0) continue;
    ensureCrop(farm);
    if (farm.stage === 'FALLOW' && farm.harvestDay < state.day) farm.stage = 'PLANT';
    if (farm.stage !== 'GROW') continue;
    const sunlight = state.phase === 'DAY_EXPLORE' ? 1 : .22;
    farm.cropProgress = Math.min(1, farm.cropProgress + sunlight * dt / GROW_SECONDS);
    if (farm.cropProgress === 1) farm.stage = 'RIPE';
  }
}

export function tendCrop(farm, state, dt, skill) {
  if (!['PLANT', 'RIPE'].includes(farm.stage)) return null;
  farm.tending += dt * skill;
  if (farm.tending < (farm.stage === 'PLANT' ? 3 : 3.5)) return null;
  farm.tending = 0;
  farm.cropProgress = 0;
  if (farm.stage === 'PLANT') {
    farm.stage = 'GROW';
    return null;
  }
  farm.stage = 'FALLOW';
  farm.harvestDay = state.day;
  return { food: 3 + farm.level * 2, coins: 1 + farm.level };
}
