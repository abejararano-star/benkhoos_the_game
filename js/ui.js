import { BALANCE, WORLD_MIN_X, WORLD_MAX_X } from './config.js';

export function createUI({ state, session, settings, actions }) {
  const $ = id => document.getElementById(id);
  const text = (id, value) => { const el = $(id); if (el && el.textContent !== String(value)) el.textContent = value; };
  let bannerTimer, returnDialog = 'pauseDialog';
  const dialogs = [...document.querySelectorAll('dialog')];
  function closeAll() {
    dialogs.forEach(d => { if (d.open) d.close(); });
    document.body.classList.remove('modal-open');
  }
  function open(id) {
    actions.clearInput?.();
    closeAll();
    $(id).showModal();
    document.body.classList.add('modal-open');
  }
  function resume() {
    if (state.status !== 'playing') { result(state.status); return; }
    closeAll(); session.mode = 'playing'; document.body.dataset.mode = 'playing';
  }
  function menu() { session.mode = 'menu'; document.body.dataset.mode = 'menu'; open('menuDialog'); }
  function togglePause() {
    if (session.mode === 'menu' && $('menuDialog').open) return;
    if (session.mode === 'victory' || session.mode === 'defeat') return;
    if ($('modalGuide').open || $('modalLeaderboard').open || $('debugDialog').open) { open(returnDialog); return; }
    if ($('modalPolitics').open) return;
    if ($('pauseDialog').open) resume();
    else { session.mode = 'paused'; open('pauseDialog'); }
  }
  function banner(title, description = '') {
    text('loreBannerMain', title); text('loreBannerSub', description);
    $('loreBanner').classList.add('visible');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => $('loreBanner').classList.remove('visible'), 4500);
  }
  function result(status) {
    session.mode = status;
    text('resultTitle', status === 'victory' ? 'La Matuna permanece libre' : 'La resistencia necesita un nuevo comienzo');
    text('resultDescription', status === 'victory'
      ? 'Las dos haciendas han caído y sus gobernadores han sido derrotados. Tu pueblo tiene un futuro.'
      : `Benkos cayó sin plata en la bolsa y el cofre no tenía los ${BALANCE.rescueCost} reales necesarios para rescatarlo.`);
    text('resultStats', `Día ${state.day} · ${state.fugitivesFreed} personas liberadas · ${state.enemiesDefeated} enemigos derrotados · ${state.score} puntos${state.sandbox ? ' · Campaña de prueba' : ''}`);
    open('resultDialog');
  }
  function update() {
    text('hudCoins', state.coins); text('hudMaxCoins', state.maxCoins); text('hudTreasury', state.treasuryCoins);
    text('hudDay', `DÍA ${state.day}`); text('hudAlertLevel', `${state.alertLevel}%`);
    const night = state.timeOfDay >= .68;
    text('hudPhaseBadge', state.phase === 'TRUCE_NIGHT' ? 'Noche de tregua' : night ? 'Defensa nocturna' : 'Exploración');
    const phaseUse = $('phaseIcon').querySelector('use');
    const icon = `assets/ui/icons.svg#${night ? 'moon' : 'sun'}`;
    if (phaseUse.getAttribute('href') !== icon) phaseUse.setAttribute('href', icon);
    const seconds = Math.ceil(((night ? 1 : .68) - state.timeOfDay) * BALANCE.dayDuration);
    text('phaseCountdown', `${Math.max(0, seconds)} s · ${night ? 'amanecer' : 'anochecer'}`);
    $('phaseProgress').style.width = `${state.timeOfDay * 100}%`;
    text('hudSpiritText', `${Math.floor(state.benkos.spirit)} / ${state.benkos.maxSpirit}`);
    $('hudSpiritBar').style.width = `${state.benkos.spirit / state.benkos.maxSpirit * 100}%`;
    text('hudCrownStatus', state.coins ? `Protegido por ${state.coins} reales` : `Sin escudo · Rescate: ${BALANCE.rescueCost} del cofre`);
    $('hudCrownStatus').classList.toggle('danger', state.coins === 0);
    $('hudMountBadge').classList.toggle('hidden', !state.benkos.mounted);
    $('hudRoyalArmorBadge').classList.toggle('hidden', !state.benkos.royalArmor);
    const ranks = ['Cimarrón', 'Élite', 'Real'];
    text('hudArmyTierBadge', `Rango ${['I', 'II', 'III'][state.armyTier - 1]} · ${ranks[state.armyTier - 1]}`);
    text('hudNextTierHint', state.armyTier < 3 ? `Tótem al oeste del altar · ${BALANCE.tierCosts[state.armyTier]} reales para ascender.` : 'Ejército Real · Armadura desbloqueada.');
    const count = role => state.units.filter(u => u.role === role).length;
    for (const [suffix, role] of Object.entries({ Aldeano:'ALDEANO', Agricultor:'AGRICULTOR', Minero:'MINERO', Cazador:'CAZADOR', Arquero:'ARQUERO', Guerrero:'GUERRERO', Espadachin:'ESPADACHIN', Caballero:'CABALLERO_ALIADO', Campeon:'CAMPEON_REAL' })) text(`pop${suffix}`, count(role));
    const pct = (state.benkos.x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X) * 100;
    $('minimapBenkos').style.left = `${pct}%`;
    state.haciendas.forEach((h, i) => { $(`minimapHacienda${i ? 'R' : 'L'}`).style.background = h.destroyed ? '#91c9a2' : '#dc8264'; });
    for (const [i, skill] of state.skills.slice(1).entries()) {
      const btn = document.querySelector(`[data-skill="${skill.id}"]`);
      const active = state.benkos[({dash:'dashTimer', ceiba:'ceibaTimer', roar:'roarWave', jaguar:'jaguarTimer'})[skill.id]] > 0;
      btn.classList.toggle('locked', !skill.unlocked); btn.classList.toggle('active', active);
      btn.disabled = skill.unlocked && state.benkos.spirit < skill.spiritCost;
      text(`badgeSkill${i + 2}`, skill.unlocked ? `${skill.spiritCost} espíritu` : `${skill.cost} reales · altar`);
    }
    const boss = state.enemies.find(e => e.isBoss && e.hp > 0);
    $('bossHudContainer').classList.toggle('hidden', !boss);
    if (boss) {
      text('bossHudTitle', boss.type === 'HERALDO_ALADO' ? 'Heraldo de la Corona' : `García Girón · ${boss.phase === 1 ? 'A caballo' : 'Duelo a pie'}`);
      text('bossHudStateBadge', boss.windupTimer > 0 ? 'PREPARA UN ATAQUE' : 'EN COMBATE');
      $('bossHudBar').style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
    }
    const destroyed = state.haciendas.filter(h => h.destroyed).length;
    if (state.fugitivesFreed < 2) {
      text('objectiveTitle', 'Un pueblo que resiste');
      text('objectiveText', `Libera a dos fugitivos fuera de las murallas (${state.fugitivesFreed}/2). Mantén S cerca de ellos para lanzar plata.`);
    } else if (state.armyTier < 3) {
      text('objectiveTitle', 'Fortalece la Matuna'); text('objectiveText', 'Invierte en las defensas y asciende a tu ejército en el tótem. La armadura se gana con el rango Real.');
    } else {
      text('objectiveTitle', 'Recupera el territorio'); text('objectiveText', `Haciendas destruidas: ${destroyed}/2. Gobernadores derrotados: ${state.bossesDefeated}/2. Avanza hacia los extremos del territorio.`);
    }
    $('objectiveProgress').style.width = `${Math.min(100, (Math.min(2, state.fugitivesFreed) + state.armyTier - 1 + destroyed + Math.min(2, state.bossesDefeated)) / 8 * 100)}%`;
    const armor = $('btnToggleRoyalArmor'); armor.disabled = !state.armorUnlocked;
    armor.title = state.armorUnlocked ? 'Alternar armadura · C' : 'Alcanza el rango Real para desbloquearla';
    text('btnChoiceAccept', `Aceptar tregua · 15 reales (${state.coins} disponibles)`);
    $('btnChoiceAccept').disabled = state.coins < 15;
  }
  const on = (id, fn) => $(id).addEventListener('click', fn);
  // Escape is managed centrally; let form controls keep normal focus navigation.
  for (const d of dialogs) d.addEventListener('cancel', e => { e.preventDefault(); togglePause(); });
  on('btnNewGame', actions.newGame); on('btnContinue', actions.continueGame);
  on('btnPause', togglePause); on('btnResume', resume);
  on('btnQuickSave', actions.save); on('btnPauseSave', actions.save);
  on('btnQuickLoad', actions.load); on('btnMainMenu', menu);
  on('btnResultMenu', menu); on('btnResultLoad', actions.load); on('btnResultNew', actions.newGame);
  const guide = () => { returnDialog = session.mode === 'menu' ? 'menuDialog' : 'pauseDialog'; open('modalGuide'); };
  on('btnOpenGuide', guide); on('btnGuidePause', guide); on('btnCloseGuide', () => open(returnDialog));
  on('btnArmy', () => $('armyPanel').classList.toggle('hidden'));
  on('btnCloseArmy', () => $('armyPanel').classList.add('hidden'));
  on('btnToggleRoyalArmor', actions.toggleArmor); on('btnFullscreen', actions.fullscreen);
  document.querySelectorAll('[data-skill]').forEach(b => b.addEventListener('click', () => actions.useSkill(b.dataset.skill)));
  $('audioEnabled').addEventListener('change', e => actions.settings({ audio_enabled: e.target.checked }));
  let volumeTimer;
  $('audioVolumeSlider').addEventListener('input', e => {
    const value = Number(e.target.value) / 100;
    actions.volume(value);
    clearTimeout(volumeTimer); volumeTimer = setTimeout(() => actions.settings({ audio_volume: value }), 180);
  });
  $('reduceMotion').addEventListener('change', e => actions.settings({ reduce_motion: e.target.checked }));
  on('btnChoiceAccept', () => actions.politics(true)); on('btnChoiceReject', () => actions.politics(false));
  on('btnOpenLeaderboard', async () => {
    returnDialog = 'pauseDialog'; open('modalLeaderboard');
    const tbody = $('leaderboardTbody'); tbody.replaceChildren();
    const message = value => { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 6; td.textContent = value; tr.append(td); tbody.append(tr); };
    message('Consultando la crónica…');
    const list = await actions.leaderboard(); tbody.replaceChildren();
    if (!list.length) message('Aún no hay campañas registradas. Los récords se conservan también en este navegador.');
    for (const row of list) {
      const tr = document.createElement('tr');
      for (const value of [row.jugador ?? 'Comandante', row.dias_sobrevividos, row.tropas_reclutadas, row.oleadas_repelidas, row.puntuacion_final, (row.fecha_registro ?? '').split(/[T ]/)[0]]) {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      }
      tbody.append(tr);
    }
  });
  on('btnCloseLeaderboard', () => open('pauseDialog'));
  if (new URLSearchParams(location.search).get('debug') === '1') {
    $('btnOpenDebug').classList.remove('hidden');
    on('btnOpenDebug', () => { returnDialog = 'pauseDialog'; open('debugDialog'); });
    for (const id of ['btnUpgradeTier','btnSpawnChampion','btnSpawnAllAllies','btnSimWave','btnSpawnGovernor','btnSimCoins','btnToggleSpriteMode']) on(id, () => { state.sandbox = true; actions.debug(id); update(); });
  }
  on('btnCloseDebug', () => open('pauseDialog'));
  function applySettings() {
    $('audioEnabled').checked = settings.audio_enabled;
    $('audioVolumeSlider').value = Math.round(settings.audio_volume * 100);
    $('reduceMotion').checked = settings.reduce_motion;
    document.body.classList.toggle('reduce-motion', settings.reduce_motion);
  }
  return { update, banner, open, closeAll, resume, menu, result, togglePause, applySettings,
    isBlocking: () => dialogs.some(d => d.open),
    toggleArmy: () => $('armyPanel').classList.toggle('hidden'),
    connection: connected => { text('dbStatusLabel', connected ? 'Guardado en servidor' : 'Guardado local'); $('dbDot').classList.toggle('connected', connected); },
    busy: busy => { ['btnQuickSave', 'btnPauseSave', 'btnContinue', 'btnQuickLoad', 'btnResultLoad', 'btnNewGame', 'btnResultNew'].forEach(id => { $(id).disabled = busy; }); }
  };
}
