import { needsCropCare } from './crops.js?v=3daf42021c75';
import { bridgeHint, bridgePost, crossingAt } from './crossings.js?v=3daf42021c75';
import { daylightLabel, NIGHT_START } from './daylight.js?v=3daf42021c75';
import { ALTAR_X, explorationHint, torchIsLit } from './exploration.js?v=3daf42021c75';
import { describeTraits } from './daily-life.js?v=3daf42021c75';
import { armyRequirement, equipmentOffer, INFANTRY, RANK_NAMES, ROYAL_ARMOR_COST } from './equipment.js?v=3daf42021c75';
import { canMediate, relationshipsFor } from './community.js?v=3daf42021c75';
import { gateRequirement, haciendaActive } from './haciendas.js?v=3daf42021c75';
import { ecologyHint } from './ecology.js?v=3daf42021c75';
import { MATERIALS, HQ_NAMES, upgradeInfo, altarSprite, constructionStatus } from './settlement.js?v=3daf42021c75';
import { BALANCE, WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=3daf42021c75';
import { ROLE_NAMES, ATTRIBUTES, GIFT_NAMES, TEMPERAMENTS, WORK_ROLES, ensurePerson, affinity, proficiency, roleAvailable } from './people.js?v=3daf42021c75';
import { arrivalHint } from './campaign.js?v=3daf42021c75';
import { ESTATES, expeditionObjective, finalObjective, localHaciendas, storyChapter } from './story.js?v=3daf42021c75';
import { mapDistance, mapLocations, mapX, missionDestination } from './route-map.js?v=3daf42021c75';

export function createUI({ state, session, settings, actions }) {
  const $ = id => document.getElementById(id);
  const text = (id, value) => { const el = $(id); if (el && el.textContent !== String(value)) el.textContent = value; };
  let lastPouch = '';
  let prices = [];
  const bagDots=[];for(let i=0;i<state.maxCoins;i++){const dot=document.createElement('i');$('hudBagSlots').append(dot);bagDots.push(dot);}
  let bannerTimer, returnDialog = 'pauseDialog';
  let cinematic, storyPage = 0;
  let armoryFromWorks = false;
  let chartSites = [], selectedSite, mapFromPause = false;
  const chartMarkers = new Map();
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
    if ($('armoryDialog').open) { closeArmory(); return; }
    if ($('storyDialog').open) { closeStory(); return; }
    if ($('mapDialog').open) { closeMap(); return; }
    if (session.mode === 'menu' && $('menuDialog').open) return;
    if (session.mode === 'victory' || session.mode === 'defeat') return;
    if ($('modalGuide').open || $('modalLeaderboard').open || $('debugDialog').open || $('peopleDialog').open || $('campaignDialog').open || $('settlementDialog').open) { open(returnDialog); return; }
    if ($('modalPolitics').open) return;
    if ($('pauseDialog').open) resume();
    else { session.mode = 'paused'; open('pauseDialog'); }
  }

  function trackedSite(sites) {
    return sites.find(site => site.id === state.exploration.waypoint) ?? missionDestination(state, sites);
  }
  function renderMapSelection() {
    const playerX = mapX(state.benkos.x);
    const route = trackedSite(chartSites);
    $('mapPlayerPin').style.left = `${playerX}%`;
    $('mapActiveRoute').setAttribute('x1', String(playerX * 10));
    $('mapActiveRoute').setAttribute('x2', String(mapX((route ?? selectedSite).x) * 10));
    for (const [id, button] of chartMarkers) {
      button.setAttribute('aria-pressed', String(id === selectedSite.id));
      button.classList.toggle('map-destination', id === route?.id);
    }
    text('mapSelectedDistance', mapDistance(state.benkos.x, selectedSite.x));
    text('mapSelectedName', selectedSite.name);
    text('mapSelectedDetail', selectedSite.detail);
    text('btnMapWaypoint', state.exploration.waypoint === selectedSite.id ? 'Quitar marca' : 'Marcar ruta');
  }
  function openMap() {
    mapFromPause = $('pauseDialog').open;
    chartSites = mapLocations(state);
    selectedSite = trackedSite(chartSites) ?? chartSites.find(site => site.id === 'matuna');
    const markers = $('mapMarkers');
    markers.replaceChildren();
    chartMarkers.clear();
    for (const site of chartSites) {
      const button = document.createElement('button');
      button.className = `map-marker ${site.row} ${site.kind}`;
      button.style.left = `${mapX(site.x)}%`;
      button.textContent = site.label;
      button.setAttribute('aria-label', site.name);
      button.addEventListener('click', () => { selectedSite = site; renderMapSelection(); });
      markers.append(button);
      chartMarkers.set(site.id, button);
    }
    renderMapSelection();
    open('mapDialog');
  }
  function closeMap() {
    if (mapFromPause) open('pauseDialog'); else resume();
    update();
  }
  function toggleMap(playing) {
    if ($('mapDialog').open) closeMap();
    else if (playing || $('pauseDialog').open) openMap();
    else return false;
    return true;
  }

  function openStory(scene) {
    cinematic = scene;
    storyPage = 0;
    open('storyDialog');
    renderStory();
  }
  function renderStory() {
    const [speaker, line] = cinematic.lines[storyPage];
    text('storyChapter', cinematic.chapter);
    text('storyTitle', cinematic.title);
    text('storySpeaker', speaker);
    text('storyLine', line);
    text('storyProgress', `${storyPage + 1} / ${cinematic.lines.length}`);
    const g = $('storyPortrait').getContext('2d');
    g.clearRect(0, 0, 156, 164);
    const cls = { Benkos: 'actor_hero', Wiwa: 'actor_civil', Vigía: 'actor_archer', 'Cautiva liberada': 'actor_captive' }[speaker];
    if (cls) window.SpriteManager?.draw?.(g, cls, ['idle'], 78, 158, 1, 134, 0);
    const last = storyPage === cinematic.lines.length - 1;
    const choices = $('storyChoices');
    choices.replaceChildren();
    if (last) for (const [label, action] of cinematic.choices ?? []) {
      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', action);
      choices.append(button);
    }
    $('btnStoryNext').classList.toggle('hidden', last && !!cinematic.choices?.length);
    text('btnStoryNext', last ? 'Volver al juego' : 'Continuar');
    text('btnStorySkip', cinematic.choices?.length ? 'Cerrar consejo' : 'Saltar escena');
  }
  function closeStory() {
    const done = cinematic?.onDone;
    cinematic = null;
    if (done) done(); else resume();
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
    text('resultDescription', status === 'defeat' && state.benkos.waterFall ? 'Benkos cayó al río y la corriente lo arrastró.' : status === 'victory'
      ? state.story.finale === 'witnesses' ? 'Los testimonios de las personas liberadas ya viajan por los caminos.' : 'La Matuna y sus aliados mantienen abiertos los caminos de refugio.'
      : `Benkos cayó sin plata en la bolsa y el cofre no tenía los ${BALANCE.rescueCost} reales necesarios para rescatarlo.`);
    text('resultStats', `Día ${state.day} · ${state.fugitivesFreed} personas liberadas · ${state.enemiesDefeated} enemigos derrotados · ${state.score} puntos${state.sandbox ? ' · Campaña de prueba' : ''}`);
    open('resultDialog');
  }
  function update() {
    if (session.mode === 'playing') prices = actions.worldPrices?.() ?? [];
    const route = (state.exploration.waypoint || state.story.expedition) ? trackedSite(mapLocations(state)) : null;
    const direction = route ? mapDistance(state.benkos.x, route.x) : '';
    text('mapShortcutText', route ? `${route.label} · ${direction}` : 'Mapa');
    const node=actions.node?.();$('nodeHint').classList.toggle('hidden',!node||Math.abs(state.benkos.vx)>25||state.benkos.attackTimer>0||state.enemies.some(e=>e.hp>0&&Math.abs(e.x-state.benkos.x)<150));
    if(node){
      text('nodeHintTitle', node.title.trim());
      text('nodeHintDescription', node.sub.replaceAll('[S]', 'S').replace(/\(\d+ reales?\s*\)/g, '').trim());
      const remaining = Math.max(0, node.cost - (node.getFilled() || 0));
      const unit = remaining === 1 ? 'real' : 'reales';
      text('nodeHintCoins', node.job ? `${Math.ceil((1 - node.job.progress) * node.job.duration)} s de labor` :
        node.cost === 0 ? 'Nivel máximo' : node.purchase ? `${node.getFilled()}/${node.cost} reales` : `${remaining === 1 ? 'Falta' : 'Faltan'} ${remaining} ${unit}`);
    }
    text('hudCoins', state.coins); text('hudMaxCoins', state.maxCoins); text('hudTreasury', state.treasuryCoins);
    const freeSlots = state.maxCoins - state.coins;
    text('hudBagFree', freeSlots === 0 ? 'Bolsa llena' : freeSlots === 1 ? '1 espacio libre' : `${freeSlots} espacios libres`);
    bagDots.forEach((dot,i)=>dot.classList.toggle('filled',i<state.coins));
    const bagSignature=`${Math.ceil(state.coins/state.maxCoins*4)}:${window.SpriteManager?.ready}`;
    if(bagSignature!==lastPouch){lastPouch=bagSignature;const g=$('hudPouchArt').getContext('2d');g.clearRect(0,0,72,72);window.SpriteManager?.drawPouch?.(g,36,69,64,state.coins/state.maxCoins);}
    text('hudMaterials', `${state.resources.wood} madera · ${state.resources.stone} piedra · ${state.resources.food} alimento`);
    text('hudDay', `DÍA ${state.day}`); text('hudAlertLevel', `${state.alertLevel}%`);
    const night = state.timeOfDay >= NIGHT_START;
    const label = daylightLabel(state.timeOfDay);
    text('hudPhaseBadge', state.phase === 'TRUCE_NIGHT' ? 'Noche de tregua' : state.phase === 'RED_NIGHT' && label === 'Noche' ? 'Noche roja' : label);
    const phaseUse = $('phaseIcon').querySelector('use');
    const icon = `assets/ui/icons.svg#${night ? 'moon' : 'sun'}`;
    if (phaseUse.getAttribute('href') !== icon) phaseUse.setAttribute('href', icon);
    const seconds = Math.ceil(((night ? 1 : NIGHT_START) - state.timeOfDay) * BALANCE.dayDuration);
    text('phaseCountdown', `${Math.max(0, seconds)} s · ${night ? 'al alba' : 'a la noche'}`);
    $('phaseProgress').style.width = `${state.timeOfDay * 100}%`;
    text('hudSpiritText', `${Math.floor(state.benkos.spirit)} / ${state.benkos.maxSpirit}`);
    $('hudSpiritBar').style.width = `${state.benkos.spirit / state.benkos.maxSpirit * 100}%`;
    text('hudCrownStatus', state.coins ? `Protegido por ${state.coins} reales` : `Sin escudo · Rescate: ${BALANCE.rescueCost} del cofre`);
    $('hudCrownStatus').classList.toggle('danger', state.coins === 0);
    $('hudMountBadge').classList.toggle('hidden', !state.benkos.mounted);
    $('hudRoyalArmorBadge').classList.toggle('hidden', !state.benkos.royalArmor);
    const ranks = ['Cimarrón', 'Élite', 'Real'];
    text('hudArmyTierBadge', `Rango ${['I', 'II', 'III'][state.armyTier - 1]} · ${ranks[state.armyTier - 1]}`);
    text('hudNextTierHint', state.armyTier < 3 ? armyRequirement(state) || `Mantén S en el tótem · ${BALANCE.tierCosts[state.armyTier]} reales para ascender.` : 'Rango Real · Abre la Armería con G. Armadura de Benkos en C.');
    const count = role => state.units.filter(u => u.role === role).length;
    for (const [suffix, role] of Object.entries({ Constructor:'CONSTRUCTOR', Aldeano:'ALDEANO', Lenador:'LENADOR', Agricultor:'AGRICULTOR', Minero:'MINERO', Cazador:'CAZADOR', Arquero:'ARQUERO', Guerrero:'GUERRERO', Espadachin:'ESPADACHIN', Caballero:'CABALLERO_ALIADO', Campeon:'CAMPEON_REAL' })) text(`pop${suffix}`, count(role));
    const mapPercent = x => (x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X) * 100;
    $('minimapBenkos').style.left = `${mapPercent(state.benkos.x)}%`;
    $('minimapAltar').style.left = `${mapPercent(ALTAR_X)}%`;
    $('minimapAltar').classList.toggle('hidden', !state.exploration.altarFound);
    localHaciendas(state).forEach((h, i) => {
      const marker = $(`minimapHacienda${i ? 'R' : 'L'}`);
      marker.style.left = `${mapPercent(h.x)}%`;
      marker.style.right = 'auto';
      marker.style.background = haciendaActive(h) ? '#dc8264' : '#91c9a2';
    });
    for (const site of ESTATES) {
      const marker = $(site.side < 0 ? 'minimapEstateWest' : 'minimapEstateEast');
      marker.style.left = `${mapPercent(site.x)}%`;
      marker.classList.toggle('hidden', storyChapter(state) < 2);
      marker.classList.toggle('expedition-target', state.story.expedition?.site === site.id);
      marker.style.background = state.story.completed.includes(site.id) ? '#91c9a2' : '#dcb06f';
    }
    $('torchStatus').classList.toggle('hidden', state.phase === 'DAY_EXPLORE' && !torchIsLit(state));
    text('torchStatus', torchIsLit(state) ? 'Antorcha encendida · T' : 'Antorcha apagada · T');
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
    const chapter = storyChapter(state);
    const destroyed = localHaciendas(state).filter(h => h.destroyed).length;
    if (chapter === 1) {
      text('objectiveTitle', 'I · Un pueblo que resiste');
      text('objectiveText', `Libera las haciendas cercanas (${destroyed}/2). Rompe el portón con Espacio tras vencer a sus guardias.`);
    } else if (chapter === 2) {
      text('objectiveTitle', 'II · Tierra adentro');
      text('objectiveText', expeditionObjective(state) || 'Vuelve a la casa central y pulsa E para convocar una expedición.');
    } else {
      text('objectiveTitle', 'III · La palabra y el hierro');
      text('objectiveText', finalObjective(state));
    }
    $('objectiveProgress').style.width = `${(destroyed + state.story.completed.length + Number(!!state.story.finale) + Number(state.story.finalWon)) / 6 * 100}%`;
    const armor = $('btnToggleRoyalArmor');
    armor.disabled = !state.armorUnlocked && state.armyTier < 3;
    armor.title = state.armorUnlocked ? 'Alternar armadura · C' : state.armyTier >= 3 ? `Comprar por ${ROYAL_ARMOR_COST} reales · C` : 'Requiere rango Real';
    text('btnToggleRoyalArmor', state.armorUnlocked ? 'Alternar armadura real · C' : `Armadura real · ${ROYAL_ARMOR_COST} reales · C`);
    text('btnChoiceAccept', `Aceptar tregua · 15 reales (${state.coins} disponibles)`);
    $('btnChoiceAccept').disabled = state.coins < 15;
    text('campaignNotice',arrivalHint(state));
    $('campaignNotice').classList.toggle('quiet',!state.campaign.orders.some(o=>o.kind==='boss')||!!node);
    const encounter = state.community.encounter;
    const neighbors = encounter?.people.map(id => state.units.find(unit => unit.id === id));
    const nearTalk = neighbors?.every(Boolean) && neighbors.some(unit => Math.abs(unit.x - state.benkos.x) < 115);
    let social = '';
    if (nearTalk) {
      const speaker = neighbors[Math.floor(encounter.elapsed / 1.8) % 2];
      const line = {
        CHAT: speaker.traits?.curiosity >= 4 ? '¿Has visto los animales del riachuelo?' :
          speaker.traits?.dedication >= 4 ? 'Mañana quiero empezar temprano.' : '¿Cómo te ha ido hoy?',
        LAUGH: '¡Eso sí que me hizo reír!',
        SCUFFLE: 'Necesito que me escuches.',
        ROMANCE: 'Me alegra encontrarte después del trabajo.'
      }[encounter.kind];
      social = `${speaker.name.split(' ')[0]} · «${line}»`;
    }
    const neighbor = state.units.find(unit => Math.abs(unit.x - state.benkos.x) < 66 && ['BATHE','PLAY','LEAVE','MOURN'].includes(unit.activity));
    const farm = state.farms.find(field => field.level > 0 && Math.abs(field.x - state.benkos.x) < 45);
    const crop = farm?.stage ? { PLANT: 'Espera siembra', GROW: needsCropCare(farm) ? 'Espera cuidados' : `Creciendo · ${Math.floor(farm.cropProgress * 100)}%`, RIPE: 'Espera cosecha', FALLOW: 'En descanso hasta mañana' }[farm.stage] : '';
    const messenger = state.messengers.find(m => m.state === 'WAIT' && !m.delivered && Math.abs(m.x-state.benkos.x)<65);
    const hacienda = state.haciendas.find(h => haciendaActive(h) && Math.abs(h.x - state.benkos.x) < 88);
    const context = Math.abs(state.benkos.x) < 23 && chapter > 1 ? 'E · Convocar al consejo · B · Obras' :
      hacienda ? gateRequirement(state, hacienda) || 'Espacio · Romper el portón para liberar a los cautivos' : '';
    const bridge = bridgePost(state.benkos.x) ?? crossingAt(state.benkos.x);
    text('contextHint', state.benkos.waterFall ? 'La corriente arrastra a Benkos' : bridge ? bridgeHint(state, bridge) : messenger?'E · Escuchar al mensajero de Cartagena':canMediate(state)?'E · Mediar en la discusión':context||social||ecologyHint(state)||(neighbor ? `${neighbor.name.split(' ')[0]} · ${neighbor.mood}` : '')||(crop ? `Cultivo de yuca · ${crop}` : '')||explorationHint(state)||'B · Obras · F · Personas · E · Interactuar');
  }
  const on = (id, fn) => $(id).addEventListener('click', fn);
  on('btnStoryNext', () => { if (++storyPage < cinematic.lines.length) renderStory(); else closeStory(); });
  on('btnStorySkip', closeStory);
  on('btnWorldMap', openMap); on('btnMapPause', openMap); on('btnCloseMap', closeMap);
  on('btnMapWaypoint', () => {
    state.exploration.waypoint = state.exploration.waypoint === selectedSite.id ? '' : selectedSite.id;
    renderMapSelection();
    update();
  });
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
  on('btnOpenPeople', () => actions.inspectNpc());
  on('btnPeoplePause', () => actions.inspectNpc());
  on('btnClosePeople', () => open('pauseDialog'));
  on('btnOpenCampaign', () => {
    returnDialog='pauseDialog';open('campaignDialog');
    const list=$('campaignLetters');list.replaceChildren();
    const letters=state.campaign.letters;
    if(!letters.length){const p=document.createElement('p');p.textContent='Los mensajeros aún no han traído cartas. Observa los caminos y las señales de los vigías.';list.append(p);}
    for(const letter of [...letters].reverse()){
      const article=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');
      h.textContent=`Día ${letter.day} · ${letter.title}`;p.textContent=letter.text;article.append(h);article.append(p);list.append(article);letter.read=true;
    }
    $('btnLetterTreaty').classList.toggle('hidden',!!state.story.finale||state.politicalEventSeen||!letters.some(l=>String(l.id??'').startsWith('letter_')&&String(l.text??'').includes('tregua')));
  });
  on('btnLetterTreaty', () => open('modalPolitics'));
  on('btnCloseCampaign', () => open('pauseDialog'));
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
    for (const id of ['btnUpgradeTier','btnSpawnChampion','btnSpawnAllAllies','btnSimWave','btnSpawnGovernor','btnSimCoins']) on(id, () => { state.sandbox = true; actions.debug(id); update(); });
  }
  on('btnCloseDebug', () => open('pauseDialog'));
  function applySettings() {
    $('audioEnabled').checked = settings.audio_enabled;
    $('audioVolumeSlider').value = Math.round(settings.audio_volume * 100);
    $('reduceMotion').checked = settings.reduce_motion;
    document.body.classList.toggle('reduce-motion', settings.reduce_motion);
  }
  const worldLabels=new Map();
  function renderWorldOverlay(layout){
    const root=$('worldLabels');
    const hidden=session.mode==='menu'||dialogs.some(d=>d.open);root.style.visibility=hidden?'hidden':'visible';if(hidden)return;
    const active=new Set(),placed=[];
    const projectX=x=>layout.offsetX+(x-layout.camera+layout.width/2)*layout.scale;
    const projectY=y=>layout.offsetY+y*layout.scale;
    function label(key,kind,x,y,content,width=160,avoid=false){
      const px=projectX(x);let py=projectY(y);
      if(px<24||px>window.innerWidth-24)return;
      if(avoid){for(let pass=0;pass<6;pass++){if(!placed.some(p=>Math.abs(p.x-px)<(p.width+width)/2+8&&Math.abs(p.y-py)<30))break;py-=31;}}
      placed.push({x:px,y:py,width});active.add(key);
      let el=worldLabels.get(key);if(!el){el=document.createElement('div');root.append(el);worldLabels.set(key,el);}
      el.className=`world-label ${kind}`;if(el.textContent!==content)el.textContent=content;
      el.style.width=`${width}px`;el.style.transform=`translate3d(${Math.round(px-width/2)}px,${Math.round(py)}px,0)`;el.style.display='';
    }
    const fightNearby = state.enemies.some(enemy => enemy.hp > 0 && Math.abs(enemy.x - state.benkos.x) < 140);
    if (!fightNearby && !state.benkos.attackTimer) {
      for (const price of prices) {
        const px = projectX(price.x);
        const py = projectY(layout.ground - price.height);
        if (px < 16 || px > window.innerWidth - 16 || py < 90) continue;
        const key = 'price:' + price.id;
        active.add(key);
        let el = worldLabels.get(key);
        if (!el) {
          el = document.createElement('div');
          root.append(el);
          worldLabels.set(key, el);
        }
        const nearby = state.activeNodeId === price.id && !price.locked;
        const signature = `${price.cost}:${price.paid}:${price.locked}:${nearby}`;
        if (el.dataset.signature !== signature) {
          el.dataset.signature = signature;
          el.className = 'world-label world-price' + (price.locked ? ' price-locked' : '') + (nearby ? ' price-active' : '');
          el.title = `${price.title} · ${price.paid}/${price.cost} reales`;
          const coins = Array.from({ length: price.cost > 8 ? 1 : price.cost }, (_, index) => {
            const coin = document.createElement('i');
            if (price.cost > 8 ? price.paid === price.cost : index < price.paid) coin.className = 'filled';
            return coin;
          });
          if (price.cost > 8) {
            const count = document.createElement('b');
            count.textContent = price.paid ? `${price.paid}/${price.cost}` : `×${price.cost}`;
            coins.push(count);
          }
          if (price.works || price.locked) {
            const sign = document.createElement('span');
            sign.textContent = price.works ? 'B' : '×';
            coins.unshift(sign);
          }
          el.replaceChildren(...coins);
        }
        el.style.transform = `translate3d(${Math.round(px)}px,${Math.round(py)}px,0) translate(-50%,-100%)`;
        el.style.display = '';
      }
    }
    const notices=state.floatingTexts.filter(ft=>/^(-\d+|\+2 moral|Brillo entre|Casa central|.* llegó a salvo)/.test(ft.text.trim())).slice(-2);
    notices.forEach((ft,i)=>{const line=ft.text.replace(/\s+/g,' ').replace('Cosecha Entregada','cosecha').replace('Plata de Mina','plata').trim();label('notice:'+i,'resource-label',layout.x(ft),layout.y(ft)-22+layout.ground-246,line,Math.max(100,Math.min(230,line.length*6+20)),true);});
    for(const [key,el]of worldLabels)if(!active.has(key))el.style.display='none';
  }
  function previewBuilding(){
    const level=Number($('previewLevel').value)||1,kind=$('previewKind').value||'hq',g=$('buildingPreview').getContext('2d');
    g.clearRect(0,0,560,240);const sky=g.createLinearGradient(0,0,0,240);sky.addColorStop(0,'#253f39');sky.addColorStop(1,'#677758');g.fillStyle=sky;g.fillRect(0,0,560,240);
    g.fillStyle='#192f23';g.fillRect(0,216,560,24);g.fillStyle='#8c8461';g.fillRect(20,216,520,2);
    window.SpriteManager?.draw?.(g, kind === 'altar' ? altarSprite(level) : `building_${kind}_${level}`,['idle'],280,218,1,kind==='hq'?228:210,0);
    text('previewCaption', kind === 'altar' ? `Altar de nivel ${level} · ${state.skills[level - 1].name}` : `Nivel ${level} · ${MATERIALS[level-1]}${kind==='hq'?' · '+HQ_NAMES[level-1]:''}`);
    text('evolutionPath', `Casa del Cuartel ${state.settlement.level} → Tótem ${state.armyTier} · Santuario ${state.altarTier}: poderes`);
  }
  function renderBuildings(focusId){
    text('settlementTitle',HQ_NAMES[state.settlement.level-1]);
    text('settlementResources',`${state.coins} reales en la bolsa · ${state.resources.wood} madera · ${state.resources.stone} piedra · ${state.units.filter(u=>u.role==='CONSTRUCTOR').length} constructores`);
    const cards=$('buildingCards');cards.replaceChildren();
    const entries=[['hq','hq','Casa del Cuartel'],...state.settlement.homes.map((h,i)=>['home',h.id,`Vivienda ${i+1}`]),
      ...state.settlement.towers.map(tower => ['tower', tower.id, `Torre ${tower.side < 0 ? 'oeste' : 'este'}`])];
    for(const [kind,id,label] of entries){
      const info=upgradeInfo(state,kind,id),card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),btn=document.createElement('button');
      const towerMaterials = ['Puesto para un arquero', 'Madera y bejuco', 'Ceiba reforzada', 'Base de piedra'];
      const materials = kind === 'tower' ? towerMaterials.slice(1) : MATERIALS;
      h.textContent=`${label} · ${info.target.level}/${materials.length}`;
      p.textContent=materials[info.target.level-1] ?? towerMaterials[0];card.append(h);card.append(p);
      const job=info.job;
      const cost=document.createElement('p');cost.className='muted';cost.textContent=job?`${constructionStatus(state, job)} · ${Math.ceil((1-job.progress)*job.duration)} s de labor`:(info.next?kind==='hq'?`${info.coins} reales · ${info.duration} s de obra`:`${info.coins} reales · ${info.wood} madera · ${info.stone} piedra · ${info.duration} s de obra`:info.reason);card.append(cost);
      if (info.next && !job) {
        const balance = document.createElement('small');
        balance.className = 'building-coin-balance';
        balance.textContent = `${info.paid} de ${info.coins} reales aportados`;
        card.append(balance);
      }
      btn.textContent=job?'En construcción':info.next?'Aportar 1 real':'Evolución máxima';btn.disabled=!!info.reason || state.coins<1;btn.title=info.reason||`Construir con ${materials[info.next-1]}`;
      btn.addEventListener('click',()=>{const result=actions.build(kind,id);text('buildingFeedback',result.message);renderBuildings(id);update();});card.append(btn);
      if(info.reason&&info.next){const why=document.createElement('small');why.textContent=info.reason;card.append(why);}cards.append(card);
      if (focusId === id && !btn.disabled) btn.focus?.();
    }
  }
  function openSettlement(){returnDialog='pauseDialog';open('settlementDialog');$('previewLevel').value=String(state.settlement.level);$('previewKind').value='hq';renderBuildings();previewBuilding();text('buildingFeedback','Aporta un real por vez. Mantén S frente a la Casa del Cuartel para aportarlos seguidos.');}
  on('btnSettlement',openSettlement);on('btnSettlementPause',openSettlement);on('btnCloseSettlement',resume);on('btnResumeConstruction',resume);
  $('previewKind').addEventListener('change',previewBuilding);$('previewLevel').addEventListener('change',previewBuilding);
  function armoryUnit() {
    return state.units.find(unit => unit.id === Number($('armoryPerson').value) && unit.hp > 0 && INFANTRY.includes(unit.role));
  }
  function renderArmory() {
    const unit = armoryUnit();
    const rank = Number($('armoryRank').value);
    const model = unit ?? { role: 'GUERRERO', equipment: { weapon: 1, armor: 1 } };
    text('armoryStatus', `Rango desbloqueado: ${RANK_NAMES[state.armyTier - 1]} · ${state.coins} reales en la bolsa`);
    for (const [piece, key] of [['weapon', 'Weapon'], ['armor', 'Armor']]) {
      const offer = equipmentOffer(model, piece, state, rank);
      const preview = $('armory' + key + 'Preview').getContext('2d');
      preview.clearRect(0, 0, 184, 145);
      const appearance = { ...model.equipment, [piece]: rank };
      const sprite = window.SpriteManager?.personClass?.(model.role, appearance.armor, appearance.weapon);
      if (sprite) window.SpriteManager.draw(preview, sprite, ['idle'], 92, 139, 1, 128, 0);
      text('armory' + key + 'Title', `${offer.item} · ${RANK_NAMES[rank - 1]}`);
      const pending = unit?.kitOrder;
      const note = !unit ? 'Hace falta un arquero, lancero o espadachín.' : pending ?
        `Encargo pendiente: ${pending.item} ${RANK_NAMES[pending.rank - 1]}${pending.remaining > 0 ? ' · en la forja' : ' · listo para recoger'}.` :
        offer.reason || `Equipo actual: ${RANK_NAMES[unit.equipment[piece] - 1]}.`;
      text('armory' + key + 'Note', note);
      const button = $('btnArmory' + key);
      button.disabled = !unit || !!offer.reason;
      text('btnArmory' + key, `Encargar · ${offer.cost} reales`);
    }
  }
  function openArmory() {
    armoryFromWorks = $('settlementDialog').open;
    const people = $('armoryPerson');
    const ranks = $('armoryRank');
    people.replaceChildren(); ranks.replaceChildren();
    const eligible = state.units.filter(unit => unit.hp > 0 && INFANTRY.includes(unit.role));
    for (const unit of eligible) {
      const option = document.createElement('option');
      option.value = unit.id; option.textContent = `${unit.name} · ${ROLE_NAMES[unit.role]}`; people.append(option);
    }
    people.value = eligible[0]?.id ?? '';
    for (let rank = 1; rank <= state.armyTier; rank++) {
      const option = document.createElement('option');
      option.value = rank; option.textContent = RANK_NAMES[rank - 1]; ranks.append(option);
    }
    ranks.value = String(state.armyTier);
    text('armoryFeedback', 'Los combatientes recogen su pieza en la Casa del Cuartel cuando termina la forja.');
    renderArmory(); open('armoryDialog');
  }
  function closeArmory() { if (armoryFromWorks) openSettlement(); else resume(); }
  function toggleArmory(playing) {
    if ($('armoryDialog').open) closeArmory();
    else if (playing || $('settlementDialog').open) openArmory();
    else return false;
    return true;
  }
  on('btnArmyArmory', openArmory); on('btnWorksArmory', openArmory); on('btnCloseArmory', closeArmory);
  $('armoryPerson').addEventListener('change', renderArmory); $('armoryRank').addEventListener('change', renderArmory);
  for (const [piece, id] of [['weapon', 'btnArmoryWeapon'], ['armor', 'btnArmoryArmor']]) on(id, () => {
    const result = actions.orderKit(armoryUnit(), piece, Number($('armoryRank').value));
    text('armoryFeedback', result.message); renderArmory(); update();
  });
  let selectedPersonId=null;
  function renderPerson(){
    const u=state.units.find(n=>n.id===selectedPersonId);if(!u)return;
    ensurePerson(u);
    text('personName',u.name);text('personRole',`${ROLE_NAMES[u.role]} · Rango ${u.tier}`);
    text('personTemperament',`${TEMPERAMENTS[u.temperament]} · ${u.mood}`);
    text('personGift',GIFT_NAMES[u.gift]);
    text('personPreference',`Prefiere: ${ROLE_NAMES[u.preferredRole]} · Salud ${Math.ceil(u.hp)}/${u.maxHp}`);
    text('personExperience',`Afinidad con su oficio: ${affinity(u,u.role).toFixed(1)}/5 · Eficacia ${Math.round(proficiency(u)*100)}% · Experiencia ${Math.floor(u.experience[u.role]??0)}`);
    text('personCondition',`Miedo ${Math.round(u.fear)}% · Cansancio ${Math.round(u.fatigue)}%${u.requestedRole?' · Preparando cambio a '+ROLE_NAMES[u.requestedRole]:''}`);
    const links = relationshipsFor(u, state).slice(0, 4);
    text('personRelations', links.length ? links.map(link => {
      const label = link.partner ? 'Pareja' : link.score >= 3 ? 'Amistad' : link.score <= -2 ? 'Rivalidad' : 'Conoce a';
      return `${label} · ${link.name}`;
    }).join('  /  ') : 'Aún no tiene vínculos en el palenque.');
    text('personTraits', describeTraits(u));
    text('personGrief', u.grief ? `De luto por ${u.grief.name} · ${Math.ceil(u.grief.remaining)} s` : '');
    const kit = $('personEquipment');
    kit.classList.toggle('hidden', !u.equipment);
    if (u.equipment) {
      text('personKitStatus', u.kitOrder ? `Encargo pagado · ${u.kitOrder.item} ${RANK_NAMES[u.kitOrder.rank - 1]} pendiente de recoger` :
        `Arma de rango ${RANK_NAMES[u.equipment.weapon - 1]} · Armadura de rango ${RANK_NAMES[u.equipment.armor - 1]}`);
      for (const [piece, id] of [['weapon','btnOrderWeapon'], ['armor','btnOrderArmor']]) {
        const offer = equipmentOffer(u, piece, state);
        $(id).disabled = !offer || !!offer.reason;
        $(id).title = offer?.reason ?? '';
        text(id, !offer || offer.rank > 3 ? 'Nivel máximo' : `${offer.item} ${RANK_NAMES[offer.rank - 1]} · ${offer.cost} reales`);
      }
    }
    const attributes=$('personAttributes');attributes.replaceChildren();
    for(const [key,label]of Object.entries(ATTRIBUTES)){
      const row=document.createElement('div'),name=document.createElement('span'),bar=document.createElement('i'),value=document.createElement('b');
      row.className='attribute-row';name.textContent=label;bar.style.width=`${u.attributes[key]/5*100}%`;value.textContent=`${u.attributes[key]}/5`;
      row.append(name);row.append(bar);row.append(value);attributes.append(row);
    }
    const role=$('personNewRole');role.replaceChildren();
    for(const key of WORK_ROLES){const option=document.createElement('option');option.value=key;option.textContent=`${ROLE_NAMES[key]} · afinidad ${affinity(u,key).toFixed(1)}/5`;option.disabled=!roleAvailable(key,state.armyTier);role.append(option);}
    role.value=u.requestedRole??u.preferredRole;
    $('btnAssignProfession').disabled=['FUGITIVO','CAMPEON_REAL'].includes(u.role);
    $('btnPersonAuto').disabled=['FUGITIVO','CAMPEON_REAL'].includes(u.role);
    const portrait=$('personPortrait').getContext('2d');portrait.clearRect(0,0,128,160);portrait.save();portrait.scale(2.5,2.5);
    window.SpriteManager?.drawAlly?.(portrait,25,60,1,{...u,vx:0,hurtTimer:0,activity:'IDLE',animSeed:0,carryingSack:false},0);portrait.restore();
  }
  function openPeople(id){
    returnDialog='pauseDialog';selectedPersonId=Number(id);open('peopleDialog');
    const select=$('personSelect');select.replaceChildren();
    for(const u of state.units){ensurePerson(u);const option=document.createElement('option');option.value=u.id;option.textContent=`${u.name} · ${ROLE_NAMES[u.role]}`;select.append(option);}
    select.value=selectedPersonId;text('personKitFeedback','');renderPerson();text('personFeedback','El don permanece cuando cambia de oficio. Se conserva la experiencia y la proporción de salud.');
  }
  $('personSelect').addEventListener('change',e=>{selectedPersonId=Number(e.target.value);text('personKitFeedback','');renderPerson();});
  for (const [piece, id] of [['weapon','btnOrderWeapon'], ['armor','btnOrderArmor']]) {
    on(id, () => {
      const unit = state.units.find(person => person.id === selectedPersonId);
      if (!unit) return;
      const result = actions.orderKit(unit, piece);
      text('personKitFeedback', result.message);
      renderPerson();
      update();
    });
  }
  on('btnAssignProfession',()=>{const res=actions.assignRole(selectedPersonId,$('personNewRole').value);renderPerson();text('personFeedback',res.message);});
  on('btnPersonAuto',()=>{actions.autoRole(selectedPersonId);renderPerson();text('personFeedback','Elegirá su oficio preferido cuando haya herramientas y el camino sea seguro.');});
  return { update, banner, open, openStory, closeAll, resume, menu, result, togglePause, toggleMap, toggleArmory, applySettings, openPeople, openSettlement, renderWorldOverlay,
    isBlocking: () => dialogs.some(d => d.open),
    toggleArmy: () => $('armyPanel').classList.toggle('hidden'),
    connection: connected => { text('dbStatusLabel', connected ? 'Guardado en servidor' : 'Guardado local'); $('dbDot').classList.toggle('connected', connected); },
    busy: busy => { ['btnQuickSave', 'btnPauseSave', 'btnContinue', 'btnQuickLoad', 'btnResultLoad', 'btnNewGame', 'btnResultNew'].forEach(id => { $(id).disabled = busy; }); }
  };
}
