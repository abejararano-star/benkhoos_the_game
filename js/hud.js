// Presentation preferences belong to this browser, independently of campaign saves.
const modes = ['minimal', 'full', 'clean'];
function preference(key, value) {
  try {
    if (value === undefined) return window.localStorage.getItem('benkhoos.' + key);
    window.localStorage.setItem('benkhoos.' + key, value);
  } catch { /* Private browsing can disable storage. */ }
}

export function createHud({ state, session, actions, resume }) {
  const get = id => document.getElementById(id);
  const root = get('gameUI');
  let lastPlayingMode, hintTimer;
  function exitHint(message = '') {
    clearTimeout(hintTimer);
    const hint = get('hudExitHint');
    hint.textContent = message;
    if (message) hintTimer = setTimeout(() => { hint.textContent = ''; }, 3000);
  }
  let mode = preference('hudMode');
  let held = false, objectiveUntil = 0, resourcesUntil = 0, threatUntil = 0;
  let objective = '', resources = '', context = '', since = 0, lastMotion = 0;
  let previousThreat, previousTreasury, previousSide = '', saveTimer;
  const setMode = value => {
    mode = modes.includes(value) ? value : 'minimal';
    root.dataset.hud = mode;
    get('hudMode').value = mode;
  };
  setMode(mode);
  const selectMode = value => { setMode(value); preference('hudMode', mode); };
  get('hudMode').addEventListener('change', event => selectMode(event.target.value));
  const expand = value => {
    root.classList.toggle('objective-open', value);
    get('btnObjective').setAttribute('aria-expanded', String(value));
  };
  get('btnObjective').addEventListener('click', () => {
    objectiveUntil = root.classList.contains('objective-open') ? 0 : performance.now() + 6000;
    expand(objectiveUntil > performance.now());
  });
  function photo() {
    actions.clearInput?.();
    if (session.mode === 'photo') { resume(); delete root.dataset.photo; lastPlayingMode = undefined; exitHint(); }
    else { resume(); session.mode = 'photo'; root.dataset.photo = 'true'; exitHint('Modo foto · Pulsa P o Esc para volver'); }
  }
  get('btnPhoto').addEventListener('click', photo);
  function tab(campaign) {
    get('pauseCampaign').classList.toggle('hidden', !campaign);
    get('pauseSettings').classList.toggle('hidden', campaign);
    get('btnTabSettings').setAttribute('aria-pressed', String(!campaign));
    get('btnTabCampaign').setAttribute('aria-pressed', String(campaign));
  }
  get('btnTabSettings').addEventListener('click', () => tab(false));
  get('btnTabCampaign').addEventListener('click', () => tab(true));
  function campaignStart(fresh) {
    lastPlayingMode = undefined;
    exitHint();
    root.classList.toggle('first-visit', fresh && preference('learnedControls') !== 'yes');
    if (fresh) preference('learnedControls', 'yes');
    objective = resources = previousSide = context = '';
    previousThreat = undefined;
    previousTreasury = undefined;
    held = false;
    objectiveUntil = resourcesUntil = threatUntil = 0;
    lastMotion = performance.now();
    delete root.dataset.photo;
  }
  function saveStatus(status) {
    clearTimeout(saveTimer);
    root.dataset.save = status;
    const label = {saving:'Guardando partida', saved:'Partida guardada', error:'Error al guardar'}[status];
    get('dbDot').title = label;
    get('dbStatusLabel').textContent = label;
    if (status === 'saved') saveTimer = setTimeout(() => { delete root.dataset.save; }, 2000);
  }
  function update(node, route, night, chapter) {
    if (session.mode !== 'playing') return;
    if (mode !== lastPlayingMode) {
      exitHint(mode === 'clean' ? 'Modo limpio · Pulsa H para recuperar la interfaz' : '');
      lastPlayingMode = mode;
    }
    const now = performance.now(), b = state.benkos;
    const goal = get('objectiveText').textContent;
    if (goal !== objective) { objective = goal; objectiveUntil = now + 6000; }
    expand(held || now < objectiveUntil);
    const destination = route ?? (chapter === 1 ? state.haciendas.filter(h => !h.major && !h.destroyed)
      .sort((a,c) => Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0] : {x:0});
    const delta = destination ? destination.x-b.x : 0;
    get('objectiveArrow').textContent = Math.abs(delta)<45 ? '◆' : delta<0 ? '◀' : '▶';
    const inventory = [state.coins,state.treasuryCoins,state.resources.wood,state.resources.stone,state.resources.food].join('/');
    if(resources && inventory !== resources) resourcesUntil = now + 2800;
    resources = inventory;
    if (state.treasuryCoins > previousTreasury && !document.body.classList.contains('reduce-motion')) {
      get('hudDepositCoin').animate?.([
        {opacity:0, transform:'translate(-44px,-10px)'},
        {opacity:1, transform:'translate(-26px,-18px)', offset:.45},
        {opacity:0, transform:'translate(-6px,-2px)'}
      ], {duration:480, easing:'ease-out'});
    }
    previousTreasury = state.treasuryCoins;
    root.classList.toggle('inventory-open', now < resourcesUntil || b.payTimer > 0);
    const moving = Math.abs(b.vx)>3 || b.attackTimer>0;
    if(moving) lastMotion = now;
    root.classList.toggle('hud-idle', now-lastMotion>3500);
    const next = node?.id ?? get('contextHint').textContent;
    if(next !== context || moving) { context = next; since = now; }
    root.classList.toggle('hint-ready', now-since>=500);
    const order = state.campaign.orders.find(o=>['boss','final','raid'].includes(o.kind));
    const enemy = state.enemies.filter(e=>e.hp>0 && !e.waterFall && (e.isBoss || !e.guardSite || Math.abs(e.x-b.x)<250))
      .sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];
    const side = enemy ? Math.sign(enemy.x-b.x) || 1 : order?.side;
    const direction = side < 0 ? 'oeste' : 'este';
    const warning = side ? (side<0?'◀ ':'')+(enemy?.isBoss || order?.kind==='boss'?'Jefe':'Ataque')+' al '+direction+(side>0?' ▶':'') : '';
    if (warning !== previousSide) {
      if (warning && !previousSide) actions.storySound?.('trumpet');
      previousSide = warning;
      get('hudDanger').textContent = warning;
    }
    root.dataset.danger = side ? direction : '';
    if(state.alertLevel>previousThreat) threatUntil = now+4000;
    previousThreat = state.alertLevel;
    root.classList.toggle('show-threat', (state.day>1 || night) && (night || now<threatUntil || !!side));
    root.classList.toggle('army-known', state.fugitivesFreed>0);
    const campaign = !!order && !node && !moving;
    root.dataset.hint = !get('nodeHint').classList.contains('hidden') ? 'node' : campaign ? 'campaign' : 'context';
  }
  return {update, campaignStart, saveStatus, photo, isPhoto:()=>session.mode==='photo',
    hold:value=>{held=value;expand(value || performance.now()<objectiveUntil);},
    cycle:()=>selectMode(modes[(modes.indexOf(mode)+1)%modes.length]), mode:()=>mode};
}
