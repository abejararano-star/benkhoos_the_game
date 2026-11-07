import { ALTAR_X, explorationHint, torchIsLit } from './exploration.js?v=e3b7c8bc5de3';
import { describeTraits } from './daily-life.js?v=e3b7c8bc5de3';
import { equipmentOffer, RANK_NAMES, ROYAL_ARMOR_COST } from './equipment.js?v=e3b7c8bc5de3';
import { relationshipsFor } from './community.js?v=e3b7c8bc5de3';
import { ecologyHint } from './ecology.js?v=e3b7c8bc5de3';
import { MATERIALS, HQ_NAMES, upgradeInfo, altarSprite } from './settlement.js?v=e3b7c8bc5de3';
import { BALANCE, WORLD_MIN_X, WORLD_MAX_X } from './config.js?v=e3b7c8bc5de3';
import { ROLE_NAMES, ATTRIBUTES, GIFT_NAMES, TEMPERAMENTS, WORK_ROLES, ensurePerson, affinity, proficiency, roleAvailable } from './people.js?v=e3b7c8bc5de3';
import { arrivalHint } from './campaign.js?v=e3b7c8bc5de3';

export function createUI({ state, session, settings, actions }) {
  const $ = id => document.getElementById(id);
  const text = (id, value) => { const el = $(id); if (el && el.textContent !== String(value)) el.textContent = value; };
  let lastPouch = '';
  let prices = [];
  const bagDots=[];for(let i=0;i<state.maxCoins;i++){const dot=document.createElement('i');$('hudBagSlots').append(dot);bagDots.push(dot);}
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
    if ($('modalGuide').open || $('modalLeaderboard').open || $('debugDialog').open || $('peopleDialog').open || $('campaignDialog').open || $('settlementDialog').open) { open(returnDialog); return; }
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
    if (session.mode === 'playing') prices = actions.worldPrices?.() ?? [];
    const node=actions.node?.();$('nodeHint').classList.toggle('hidden',!node||Math.abs(state.benkos.vx)>25||state.benkos.attackTimer>0||state.enemies.some(e=>e.hp>0&&Math.abs(e.x-state.benkos.x)<150));
    if(node){
      text('nodeHintTitle', node.title.trim());
      text('nodeHintDescription', node.sub.replaceAll('[S]', 'S').replace(/\(\d+ reales?\s*\)/g, '').trim());
      const remaining = Math.max(0, node.cost - (node.getFilled() || 0));
      const unit = remaining === 1 ? 'real' : 'reales';
      text('nodeHintCoins', node.cost === 0 ? 'Nivel máximo' : `${remaining === 1 ? 'Falta' : 'Faltan'} ${remaining} ${unit}`);
    }
    text('hudCoins', state.coins); text('hudMaxCoins', state.maxCoins); text('hudTreasury', state.treasuryCoins);
    const freeSlots = state.maxCoins - state.coins;
    text('hudBagFree', freeSlots === 0 ? 'Bolsa llena' : freeSlots === 1 ? '1 espacio libre' : `${freeSlots} espacios libres`);
    bagDots.forEach((dot,i)=>dot.classList.toggle('filled',i<state.coins));
    const bagSignature=`${Math.ceil(state.coins/state.maxCoins*4)}:${window.SpriteManager?.ready}`;
    if(bagSignature!==lastPouch){lastPouch=bagSignature;const g=$('hudPouchArt').getContext('2d');g.clearRect(0,0,72,72);window.SpriteManager?.drawPouch?.(g,36,69,64,state.coins/state.maxCoins);}
    text('hudMaterials', `${state.resources.wood} madera · ${state.resources.stone} piedra · ${state.resources.food} alimento`);
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
    text('hudNextTierHint', state.armyTier < 3 ? `Tótem junto a la casa central · ${BALANCE.tierCosts[state.armyTier]} reales para ascender.` : 'Rango Real · Encarga equipo en F. Armadura de Benkos en C.');
    const count = role => state.units.filter(u => u.role === role).length;
    for (const [suffix, role] of Object.entries({ Constructor:'CONSTRUCTOR', Aldeano:'ALDEANO', Lenador:'LENADOR', Agricultor:'AGRICULTOR', Minero:'MINERO', Cazador:'CAZADOR', Arquero:'ARQUERO', Guerrero:'GUERRERO', Espadachin:'ESPADACHIN', Caballero:'CABALLERO_ALIADO', Campeon:'CAMPEON_REAL' })) text(`pop${suffix}`, count(role));
    const mapPercent = x => (x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X) * 100;
    $('minimapBenkos').style.left = `${mapPercent(state.benkos.x)}%`;
    $('minimapAltar').style.left = `${mapPercent(ALTAR_X)}%`;
    $('minimapAltar').classList.toggle('hidden', !state.exploration.altarFound);
    state.haciendas.forEach((h, i) => {
      const marker = $(`minimapHacienda${i ? 'R' : 'L'}`);
      marker.style.left = `${mapPercent(h.x)}%`;
      marker.style.right = 'auto';
      marker.style.background = h.destroyed ? '#91c9a2' : '#dc8264';
    });
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
    const destroyed = state.haciendas.filter(h => h.destroyed).length;
    if (state.fugitivesFreed < 2) {
      text('objectiveTitle', 'Un pueblo que resiste');
      text('objectiveText', `Libera a dos fugitivos fuera de las murallas (${state.fugitivesFreed}/2). Mantén S cerca de ellos para lanzar plata.`);
    } else if (!state.exploration.altarFound) {
      text('objectiveTitle', 'Huellas de los ancestros');
      text('objectiveText', 'Cruza el riachuelo oeste, pasa la hacienda y busca el arco de piedra del santuario.');
    } else if (state.armyTier < 3) {
      text('objectiveTitle', 'Fortalece la Matuna'); text('objectiveText', 'Ofrenda en el santuario y vuelve a la casa central para abrir obras con E o B.');
    } else {
      text('objectiveTitle', 'Recupera el territorio'); text('objectiveText', `Haciendas: ${destroyed}/2. Gobernador: ${state.campaign.governorDefeated?'derrotado':'pendiente'}. Los mensajeros anuncian los siguientes movimientos.`);
    }
    $('objectiveProgress').style.width = `${Math.min(100, (Math.min(2, state.fugitivesFreed) + state.armyTier - 1 + destroyed + Math.min(2, state.bossesDefeated)) / 8 * 100)}%`;
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
    const crop = farm?.stage ? { PLANT: 'Siembra pendiente', GROW: `Creciendo · ${Math.floor(farm.cropProgress * 100)}%`, RIPE: 'Lista para cosechar', FALLOW: 'En descanso hasta mañana' }[farm.stage] : '';
    const messenger = state.messengers.find(m => m.state === 'WAIT' && !m.delivered && Math.abs(m.x-state.benkos.x)<65);
    text('contextHint', messenger?'E · Escuchar al mensajero de Cartagena':social||ecologyHint(state)||(neighbor ? `${neighbor.name.split(' ')[0]} · ${neighbor.mood}` : '')||(crop ? `Cultivo de yuca · ${crop}` : '')||explorationHint(state)||'B · Obras · F · Personas · E · Interactuar');
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
    $('btnLetterTreaty').classList.toggle('hidden',state.politicalEventSeen||!letters.some(l=>String(l.id??'').startsWith('letter_')&&String(l.text??'').includes('tregua')));
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
          const coins = Array.from({ length: price.cost }, (_, index) => {
            const coin = document.createElement('i');
            if (index < price.paid) coin.className = 'filled';
            return coin;
          });
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
    const notices=state.floatingTexts.filter(ft=>/^-\d+/.test(ft.text.trim())).slice(-2);
    notices.forEach((ft,i)=>{const line=ft.text.replace(/\s+/g,' ').replace('Cosecha Entregada','cosecha').replace('Plata de Mina','plata').trim();label('notice:'+i,'resource-label',layout.x(ft),layout.y(ft)-22+layout.ground-246,line,Math.max(100,Math.min(230,line.length*6+20)),true);});
    for(const [key,el]of worldLabels)if(!active.has(key))el.style.display='none';
  }
  function previewBuilding(){
    const level=Number($('previewLevel').value)||1,kind=$('previewKind').value||'hq',g=$('buildingPreview').getContext('2d');
    g.clearRect(0,0,560,240);const sky=g.createLinearGradient(0,0,0,240);sky.addColorStop(0,'#253f39');sky.addColorStop(1,'#677758');g.fillStyle=sky;g.fillRect(0,0,560,240);
    g.fillStyle='#192f23';g.fillRect(0,216,560,24);g.fillStyle='#8c8461';g.fillRect(20,216,520,2);
    window.SpriteManager?.draw?.(g, kind === 'altar' ? altarSprite(level) : `building_${kind}_${level}`,['idle'],280,218,1,kind==='hq'?228:210,0);
    text('previewCaption', kind === 'altar' ? `Altar de nivel ${level} · ${state.skills[level - 1].name}` : `Nivel ${level} · ${MATERIALS[level-1]}${kind==='hq'?' · '+HQ_NAMES[level-1]:''}`);
    text('evolutionPath', `Altar ${state.altarTier} → Casa central ${state.settlement.level} → Cuartel ${state.settlement.barracks.level} → Rango militar ${state.armyTier}`);
  }
  function renderBuildings(){
    text('settlementTitle',HQ_NAMES[state.settlement.level-1]);
    text('settlementResources',`${state.coins} reales en la bolsa · ${state.resources.wood} madera · ${state.resources.stone} piedra · ${state.units.filter(u=>u.role==='CONSTRUCTOR').length} constructores`);
    const cards=$('buildingCards');cards.replaceChildren();
    const entries=[['hq','hq','Casa central'],['barracks','barracks','Cuartel central'],...state.settlement.homes.map((h,i)=>['home',h.id,`Vivienda ${i+1}`])];
    for(const [kind,id,label] of entries){
      const info=upgradeInfo(state,kind,id),card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),btn=document.createElement('button');
      h.textContent=`${label} · ${info.target.level}/5`;p.textContent=MATERIALS[info.target.level-1];card.append(h);card.append(p);
      const job=state.settlement.projects.find(p=>p.targetId===id);
      const cost=document.createElement('p');cost.className='muted';cost.textContent=job?`Obra pagada · ${Math.floor(job.progress*100)}%`:(info.next?`${info.coins} reales · ${info.wood} madera · ${info.stone} piedra · ${info.duration} s de trabajo`:info.reason);card.append(cost);
      if (info.next && !job) {
        const balance = document.createElement('small');
        const missing = Math.max(0, info.coins - state.coins);
        balance.className = 'building-coin-balance';
        balance.textContent = missing === 0 ? 'Plata suficiente' : missing === 1 ? 'Falta 1 real en la bolsa' : `Faltan ${missing} reales en la bolsa`;
        card.append(balance);
      }
      btn.textContent=info.next?`Evolucionar a nivel ${info.next}`:'Evolución máxima';btn.disabled=!!info.reason;btn.title=info.reason||`Construir con ${MATERIALS[info.next-1]}`;
      btn.addEventListener('click',()=>{const result=actions.build(kind,id);text('buildingFeedback',result.message);renderBuildings();update();});card.append(btn);
      if(info.reason&&info.next){const why=document.createElement('small');why.textContent=info.reason;card.append(why);}cards.append(card);
    }
  }
  function openSettlement(){returnDialog='pauseDialog';open('settlementDialog');$('previewLevel').value=String(state.settlement.level);$('previewKind').value='hq';renderBuildings();previewBuilding();text('buildingFeedback', state.exploration.altarFound ? 'Las obras avanzan mientras juegas. Los constructores se refugian si hay peligro.' : 'El santuario está al oeste, más allá del riachuelo y de la hacienda. Su altar abre las obras de la casa central.');}
  on('btnSettlement',openSettlement);on('btnSettlementPause',openSettlement);on('btnCloseSettlement',resume);on('btnResumeConstruction',resume);
  $('previewKind').addEventListener('change',previewBuilding);$('previewLevel').addEventListener('change',previewBuilding);
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
  return { update, banner, open, closeAll, resume, menu, result, togglePause, applySettings, openPeople, openSettlement, renderWorldOverlay,
    isBlocking: () => dialogs.some(d => d.open),
    toggleArmy: () => $('armyPanel').classList.toggle('hidden'),
    connection: connected => { text('dbStatusLabel', connected ? 'Guardado en servidor' : 'Guardado local'); $('dbDot').classList.toggle('connected', connected); },
    busy: busy => { ['btnQuickSave', 'btnPauseSave', 'btnContinue', 'btnQuickLoad', 'btnResultLoad', 'btnNewGame', 'btnResultNew'].forEach(id => { $(id).disabled = busy; }); }
  };
}
