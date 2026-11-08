import { WORLD_MAX_X, WORLD_MIN_X } from './config.js?v=2e3f4f93fc28';
export const ROAD_GATES = Object.freeze([{side:-1,x:WORLD_MIN_X+65,label:'Camino de Cartagena'},{side:1,x:WORLD_MAX_X-65,label:'Camino de la hacienda oriental'}]);
export function ensureCampaign(state){
  state.messengers??=[];
  if (state.campaign?.version===1 && ['orders','letters','warnedDays','sentDays','bossAnnouncements','defeatedBosses'].every(key=>Array.isArray(state.campaign[key]))) return state.campaign;
  state.campaign={version:1,orders:[],letters:[],warnedDays:[],sentDays:[],bossAnnouncements:[],defeatedBosses:[],lastRaidDay:0,heraldDefeated:false,governorDefeated:false,...state.campaign};
  return state.campaign;
}
export function raidSize(day){return Math.min(12,2+Math.floor(Math.max(0,day-1)*.8));}
export function raidRoster(day){
  const roster=['CAMPESINO','SOLDADO_ESPANOL'];
  if(day>=3)roster.push('ARQUERO_COLONIAL');
  if(day>=4)roster.push('PIQUERO');
  if(day>=5)roster.push('ARCABUCERO','BANDOLERO');
  if(day>=7)roster.push('CABALLERO');
  return roster;
}
export function dispatchRaid(state,mult=1){
  const c=ensureCampaign(state),roster=raidRoster(state.day);
  state.waveNumber++;
  const count=Math.max(2,Math.round(raidSize(state.day)*mult));
  // Early patrols follow a single road; flanking assaults are earned later.
  const primary=state.day%2?1:-1;
  for(let i=0;i<count;i++){
    const side=state.day<4?primary:(i%2?primary:-primary);
    c.orders.push({id:`raid_${state.waveNumber}_${i}`,type:roster[i%roster.length],side,eta:3+i*3,kind:'raid'});
  }
  c.lastRaidDay=state.day;
  return count;
}
export function announceBoss(state,type,side=1,delay=32){
  const c=ensureCampaign(state);
  if(c.bossAnnouncements.includes(type)||c.defeatedBosses.includes(type)||state.enemies.some(e=>e.type===type))return false;
  c.bossAnnouncements.push(type);
  c.orders.push({id:`boss_${type}`,type,side,eta:delay,kind:'boss'});
  c.letters.push({id:`notice_${type}`,day:state.day,title:type==='GOBERNADOR_GIRON'?'El gobernador marcha hacia la Matuna':'Se oyen las trompetas del Heraldo',text:type==='GOBERNADOR_GIRON'?'García Girón reúne su escolta en el camino de Cartagena. Un mensajero confirma su salida.':'Un explorador vio al Heraldo y su estandarte. Primero llegarán sus señales; después, el combate.',read:false});
  return true;
}
export function dispatchReinforcement(state,type,side=1){
  const c=ensureCampaign(state);c.orders.push({id:`reinforcement_${state.day}_${c.orders.length}`,type,side,eta:5,kind:'reinforcement'});
}
export function arrivalHint(state){
  const c=ensureCampaign(state),order=c.orders.slice().sort((a,b)=>a.eta-b.eta)[0];
  if(order)return `${order.kind==='boss'?'Un jefe se aproxima':order.kind==='raid'?'Una patrulla está en marcha':'Llegan refuerzos'} · camino ${order.side<0?'oeste':'este'} · ${Math.ceil(Math.max(0,order.eta))} s hasta el puesto de entrada`;
  if(state.enemies.length)return `${state.enemies.length===1?'Un enemigo avanza':state.enemies.length+' enemigos avanzan'} por los caminos. Las murallas contienen su marcha.`;
  if(state.truceDays>0)return `Tregua: ${state.truceDays} noches protegidas.`;
  return 'Los vigías observan los caminos. Los estandartes anuncian las expediciones.';
}
export function createCampaign({state,spawnEnemy,nextId,showBanner,onTreaty}){
  function sendMessenger(kind,side=-1){
    const gate=ROAD_GATES.find(g=>g.side===side);
    state.messengers.push({id:nextId(),kind,x:gate.x,y:268,vx:0,facing:-side,side,state:'TRAVEL',delivered:false,animTime:0,waitTimer:0,
      name:kind==='TREATY'?'Emisario del gobernador':'Mensajero de Cartagena',
      text:kind==='TREATY'?'El gobernador de Cartagena ofrece tres noches de tregua a cambio de quince reales.':kind==='BOSS'?'La escolta del gobernador ha partido. Prepara tus defensas y busca aliados.':`El gobernador anuncia una patrulla de ${raidSize(state.day)} hombres por el camino ${state.day%2?'este':'oeste'}. Antes de la noche verás sus estandartes.`});
  }
  function readMessenger(m){
    if(m.state!=='WAIT'||m.delivered)return false;
    m.delivered=true;m.state='RETURN';
    const c=ensureCampaign(state);
    c.letters.push({id:`letter_${m.id}`,day:state.day,title:m.name,text:m.text,read:true});
    if(m.kind==='TREATY'&&!state.politicalEventSeen)onTreaty();
    else showBanner(m.name.toUpperCase(),m.text);
    return true;
  }
  function update(dt){
    const c=ensureCampaign(state);
    if(state.timeOfDay>=.48&&!c.warnedDays.includes(state.day)&&state.truceDays===0){
      c.warnedDays.push(state.day);sendMessenger('SCOUT',state.day%2?1:-1);
      showBanner('SEÑALES EN EL CAMINO',`Los vigías anuncian ${raidSize(state.day)} hombres para esta noche. Observa los estandartes de la frontera.`);
    }
    if(state.day>=2&&!state.politicalEventSeen&&!c.sentDays.includes('TREATY')){
      c.sentDays.push('TREATY');sendMessenger('TREATY',-1);
      showBanner('UN EMISARIO SALE DE CARTAGENA','Trae una propuesta del gobernador. Podrás hablar con él cuando alcance el palenque.');
    }
    const destroyed=state.haciendas.filter(h=>h.destroyed).length;
    if((state.day>=4||destroyed>=1)&&announceBoss(state,'HERALDO_ALADO',1,35)){
      showBanner('TROMPETAS AL OTRO LADO DEL BOSQUE','El Heraldo prepara su entrada por el camino oriental. Tienes tiempo para reagruparte.');
    }
    if(destroyed===2&&announceBoss(state,'GOBERNADOR_GIRON',-1,45)){
      sendMessenger('BOSS',-1);showBanner('EL GOBERNADOR HA RECIBIDO NOTICIAS','Su estandarte parte de Cartagena. La batalla final llegará por el camino oeste.');
    }
    for(let i=c.orders.length-1;i>=0;i--){
      if (state.truceDays>0 || state.phase==='TRUCE_NIGHT') continue;
      const order=c.orders[i];order.eta-=dt;
      if(order.eta<=0){
        const gate=ROAD_GATES.find(g=>g.side===order.side);
        const enemy=spawnEnemy(order.type,order.side,gate.x);
        enemy.originSide=order.side;enemy.arrivalTimer=1.2;enemy.appearTimer=1.2;
        if(order.kind==='boss')showBanner('UN ESTANDARTE CRUZA LA FRONTERA',order.type==='GOBERNADOR_GIRON'?'García Girón entra por el camino de Cartagena.':'El Heraldo ha llegado al puesto oriental.');
        c.orders.splice(i,1);
      }
    }
    for(let i=state.messengers.length-1;i>=0;i--){
      const m=state.messengers[i];m.animTime+=dt;
      if(m.state==='TRAVEL'){
        const target=m.side*90,dx=target-m.x;m.vx=Math.sign(dx)*105;m.facing=Math.sign(dx)||1;m.x+=m.vx*dt;
        if(Math.abs(dx)<8){m.state='WAIT';m.vx=0;m.waitTimer=0;showBanner('UN MENSAJERO ESPERA EN EL PALENQUE','Acércate al estandarte blanco y pulsa E para escuchar su mensaje.');}
      }else if(m.state==='WAIT'){
        m.waitTimer+=dt;m.vx=0;
        // Letters remain available even when the player chooses not to approach.
        if(m.waitTimer>90){m.state='RETURN';if(!m.delivered){c.letters.push({id:`letter_${m.id}`,day:state.day,title:m.name,text:m.text,read:false});m.delivered=true;}}
      }else{
        m.vx=m.side*100;m.facing=m.side;m.x+=m.vx*dt;
        if(m.x < WORLD_MIN_X - 70 || m.x > WORLD_MAX_X + 70)state.messengers.splice(i,1);
      }
    }
  }
  return {update,readMessenger,sendMessenger};
}
