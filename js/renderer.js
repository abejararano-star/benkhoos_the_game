import { RenderInterpolation } from './visual-motion.js?v=d67d25007032';
import { altarSprite, ALTAR_HEIGHT } from './settlement.js?v=d67d25007032';
import { drawLandscape, drawVillage, drawHacienda, drawMarker, drawRoadGate, drawPersonStory, drawFortification, drawToolStand, drawStreams } from './terrain.js?v=d67d25007032';
import { ROAD_GATES } from './campaign.js?v=d67d25007032';
import { WATER_LINE_Y } from './config.js?v=d67d25007032';
export function createRenderer({ state, canvas, ctx, sceneCanvas, sctx, view, settings }) {
const interpolation=new RenderInterpolation();let renderAlpha=1,renderCamera=state.cameraX;
const position=(e,key='x')=>interpolation.value(e,key,renderAlpha);
function drawKingdomClusterTree(g, sx, groundY, height, isNight, markedForChop, chopped, time=0, variant=0) {
  const treeClass=chopped?'forest_stump':['forest_ceiba','forest_hardwood','forest_mangrove','forest_palm'][Math.abs(variant)%4];
  if(window.SpriteManager?.has(treeClass)){
    window.SpriteManager.draw(g,treeClass,['idle'],sx,groundY,1,chopped?20:height+35,0);
    if(markedForChop){g.fillStyle='#c87952';g.fillRect(sx-7,groundY-26,14,3);g.fillStyle='#ebd3a4';g.fillRect(sx-2,groundY-28,4,7);}
    return;
  }
  if (chopped) {
    // Tocón de Ceiba talada
    g.fillStyle = isNight ? '#27170e' : '#451a03';
    g.fillRect(sx - 7, groundY - 14, 14, 14);
    g.fillStyle = isNight ? '#5c3a21' : '#78350f';
    g.fillRect(sx - 5, groundY - 15, 10, 3);
    g.fillStyle = '#b45309';
    g.fillRect(sx - 2, groundY - 15, 4, 1);
    // Pequeño brote verde
    g.fillStyle = '#84cc16';
    g.fillRect(sx + 5, groundY - 6, 3, 4);
    return;
  }

  g.fillStyle='#14291b66';g.beginPath();g.ellipse(sx,groundY,24,4,0,0,Math.PI*2);g.fill();
  g.fillStyle = '#3b2314';
  g.fillRect(sx-5,groundY-height,10,height);
  g.fillStyle=isNight?'#715137':'#ab7a47';g.fillRect(sx-4,groundY-height,2,height);
  for(let y=8;y<height;y+=13){g.fillStyle='#2c281b';g.fillRect(sx+(y%3)-1,groundY-y,2,7);}
  g.strokeStyle=isNight?'#57402a':'#826039';g.lineWidth=3;
  for(const side of [-1,1]){g.beginPath();g.moveTo(sx,groundY-height*.55);g.lineTo(sx+side*18,groundY-height+10);g.stroke();g.beginPath();g.moveTo(sx+side*3,groundY-12);g.lineTo(sx+side*15,groundY);g.stroke();}

  const cShadow = isNight ? '#0a2618' : '#1b3b1a';
  const cMid = isNight ? '#133c26' : '#355e27';
  const cLight = isNight ? '#1e5235' : '#588136';

  const puffs = [
    { dx: -18, dy: -height + 8, r: 16 },
    { dx: 18, dy: -height + 6, r: 15 },
    { dx: -8, dy: -height - 6, r: 18 },
    { dx: 10, dy: -height - 4, r: 17 },
    { dx: 0, dy: -height - 14, r: 16 }
  ];

  puffs.forEach((pf,index)=>{
    const wind=settings.reduce_motion?0:Math.round(Math.sin(time*1.1+height+index*.4));
    const cx=sx+pf.dx+wind,cy=groundY+pf.dy,r=pf.r;
    for(let dy=-r;dy<=r;dy+=3){
      const span=Math.round(Math.sqrt(Math.max(0,r*r-dy*dy)));
      g.fillStyle=dy>r*.35?cShadow:dy>-r*.4?cMid:cLight;
      g.fillRect(cx-span,cy+dy,span*2,4);
      if(span>8){g.fillStyle=dy<0?cLight:cShadow;g.fillRect(cx-span+3+(index*7+dy*dy)%Math.max(1,span),cy+dy,4,2);}
    }
    g.fillStyle=isNight?'#2e6040':'#80954c';
    for(let k=0;k<5;k++){const dx=((k*13+index*7)%25)-12,dy=((k*11+index*3)%19)-12;g.fillRect(cx+dx,cy+dy,3,1);}
  });

  if (markedForChop) {
    g.fillStyle = '#ef4444';
    g.fillRect(sx - 6, groundY - 22, 12, 4);
    g.fillStyle = '#ffffff';
    g.fillRect(sx - 2, groundY - 26, 4, 4); // ícono hacha
  }
}

// ==================== 10. HD-2D SCENE & REFLECTION RENDERER ====================
function renderWorldAboveWater(g, time) {
  const w = view.width;
  const h = view.waterLine;
  const GROUND_SURFACE_Y = h - 22;
  const camX = renderCamera;
  const toScreenX = (wx) => Math.round(wx - camX + w / 2);
  const isNight = state.phase !== 'DAY_EXPLORE';

  const skyGrad = g.createLinearGradient(0, 0, 0, GROUND_SURFACE_Y);
  if (state.phase === 'RED_NIGHT') {
    skyGrad.addColorStop(0, '#1f050a');
    skyGrad.addColorStop(0.55, '#5c111b');
    skyGrad.addColorStop(1, '#991b1b');
  } else if (state.phase === 'NIGHT_DEFENSE' || state.phase === 'TRUCE_NIGHT') {
    skyGrad.addColorStop(0, '#142a31');
    skyGrad.addColorStop(0.6, '#2a4449');
    skyGrad.addColorStop(1, '#607b75');
  } else {
    skyGrad.addColorStop(0, '#688b8d');
    skyGrad.addColorStop(0.58, '#adc0b1');
    skyGrad.addColorStop(1, '#e0cda7');
  }
  g.fillStyle = skyGrad;
  g.fillRect(0, 0, w, h);

  if(!window.SpriteManager?.has('jungle_far')){
  const sunX = Math.round(w * 0.54 + Math.cos(state.timeOfDay * Math.PI * 2 - Math.PI / 2) * (w * 0.25));
  const sunY = Math.round(78 + Math.sin(state.timeOfDay * Math.PI) * 18);
  const haze=g.createRadialGradient(sunX,sunY,12,sunX,sunY,55);haze.addColorStop(0,isNight?'#dce6cc30':'#f6e7bb70');haze.addColorStop(1,'#e8cf9800');g.fillStyle=haze;g.fillRect(sunX-55,sunY-55,110,110);
  g.fillStyle=state.phase==='RED_NIGHT'?'#dda39a':isNight?'#dce0c8':'#f1dfad';g.beginPath();g.arc(sunX,sunY,isNight?16:19,0,Math.PI*2);g.fill();
  g.fillStyle=isNight?'#c2d2c40a':'#f0e1c128';
  for(let i=0;i<5;i++){const cloudX=((i*193-camX*.07+(settings.reduce_motion?0:time*.8))%(w+160)+w+160)%(w+160)-80;for(let band=0;band<3;band++)g.fillRect(Math.round(cloudX+band*7),35+i%3*25+band*4,45+band*13,3);}

  }

  drawLandscape(g, w, GROUND_SURFACE_Y, camX, isNight, time);

  g.fillStyle = isNight ? '#271911' : '#4a321e';
  g.fillRect(0, GROUND_SURFACE_Y, w, h - GROUND_SURFACE_Y);
  g.fillStyle=isNight?'#364733':'#738349';g.fillRect(0,GROUND_SURFACE_Y-1,w,2);
  for(let bx=-((Math.round(camX)%11+11)%11);bx<w;bx+=11){
    const seed=Math.abs((Math.floor((bx+camX)/11)*1667)^0x3531);
    g.fillStyle=isNight?'#4a3829':'#765335';g.fillRect(bx,GROUND_SURFACE_Y+5+seed%11,3+seed%7,1);
    g.fillStyle=isNight?'#253729':'#596b3b';g.fillRect(bx+3,GROUND_SURFACE_Y-3,2+seed%4,3);
    if(seed%3===0){g.fillStyle='#a28b60';g.fillRect(bx+5,GROUND_SURFACE_Y+2,2,1);}
  }

  // Fine clay strata and gravel replace the uniform blocks along the riverbank.
  for(let i=0;i<Math.ceil(w/9)+2;i++){
    const wx=Math.floor(camX/9)+i-Math.ceil(w/18),sx=toScreenX(wx*9),seed=Math.abs((wx*71)^0x4a31);
    g.fillStyle=isNight?'#776348':'#a48a59';g.fillRect(sx,GROUND_SURFACE_Y+3+(seed%12),1+seed%3,1);
    if(seed%4===0){g.fillStyle='#294c2e';g.fillRect(sx,GROUND_SURFACE_Y-4,1,5);g.fillRect(sx+2,GROUND_SURFACE_Y-6,1,6);}
  }
  drawStreams(g,toScreenX,GROUND_SURFACE_Y,state.ecology.streams,time,settings.reduce_motion);
  drawVillage(g, toScreenX, GROUND_SURFACE_Y, isNight, time, state.settlement, settings.reduce_motion);

  state.trees.forEach((tr) => {
    const sx = toScreenX(tr.x);
    if (sx < -70 || sx > w + 70) return;
    drawKingdomClusterTree(g, sx, GROUND_SURFACE_Y, tr.height, isNight, tr.markedForChop, tr.chopped, time,Number(String(tr.id).split('_').pop())||0);
  });

  state.mines.forEach((mn) => {
    const sx = toScreenX(mn.x);
    if (sx < -50 || sx > w + 50) return;
    window.SpriteManager?.draw?.(g,'landmark_mine',['idle'],sx,GROUND_SURFACE_Y,1,50,0);
  });

  state.haciendas.forEach((hac) => {
    const sx = toScreenX(hac.x);
    if (sx < -120 || sx > w + 120) return;
    drawHacienda(g, sx, GROUND_SURFACE_Y, hac.destroyed, isNight);
  });

  state.farms.forEach((f) => {
    const sx = toScreenX(f.x);
    if (sx < -60 || sx > w + 60) return;
    if(f.level>0&&f.cropProgress>.37&&window.SpriteManager?.has('landmark_farm')){
      window.SpriteManager.draw(g,'landmark_farm',['idle'],sx,GROUND_SURFACE_Y,1,31+f.cropProgress*10,0);return;
    }
    if (f.level > 0) {
      g.fillStyle = '#3f2e18';
      g.fillRect(sx - 28, GROUND_SURFACE_Y - 6, 56, 6);
      const cropH = Math.round(6 + f.cropProgress * 16);
      for (let cx = -22; cx <= 22; cx += 11) {
        g.fillStyle = '#15803d';
        const sway=settings.reduce_motion?0:Math.round(Math.sin(time*2+f.x+cx)*1.5);
        g.fillRect(sx+cx-1,GROUND_SURFACE_Y-6-cropH,2,cropH);
        g.fillStyle=f.cropProgress>.7?'#d0b75a':'#79a353';g.fillRect(sx+cx+sway-4,GROUND_SURFACE_Y-7-cropH,5,3);g.fillRect(sx+cx+sway,GROUND_SURFACE_Y-3-cropH,5,2);
      }
      g.fillStyle = '#a16207';
      g.fillRect(sx + 24, GROUND_SURFACE_Y - 11, 10, 11);
      g.fillStyle = '#eab308';
      g.fillRect(sx + 25, GROUND_SURFACE_Y - 14, 8, 4);
    }
  });

  state.toolRacks.forEach((rk) => {
    const sx = toScreenX(rk.x);
    if (sx < -50 || sx > w + 50) return;
    drawToolStand(g,sx,GROUND_SURFACE_Y,rk,state.armyTier,isNight);
  });

  window.SpriteManager?.draw?.(g,'landmark_totem',['idle'],toScreenX(-48),GROUND_SURFACE_Y,1,57,0);
  window.SpriteManager?.draw?.(g,altarSprite(state.altarTier),['idle'],toScreenX(0),GROUND_SURFACE_Y,1,ALTAR_HEIGHT[state.altarTier],0);
  const chestProgress=Math.abs(state.benkos.x-48)<35?.9:0;
  window.SpriteManager?.draw?.(g,'currency_chest',['open'],toScreenX(48),GROUND_SURFACE_Y,1,26,0,0,chestProgress);

  state.horses.forEach((hr) => {
    const hsx = toScreenX(position(hr));
    if (hsx < -50 || hsx > w + 50) return;
    window.SpriteManager?.drawHorse?.(g, hsx, GROUND_SURFACE_Y, hr, time);
  });

  state.walls.forEach((wall) => {
    const sx = toScreenX(wall.x);
    if (sx < -50 || sx > w + 50) return;
    if (wall.level > 0) {
      drawFortification(g,sx,GROUND_SURFACE_Y,wall,isNight,settings.reduce_motion?0:time);
    }
  });

  state.droppedCoins.forEach((c) => {
    const sx = toScreenX(position(c));
    const cy = c.fallsInRiver ? Math.round(position(c,'y')+view.waterLine-WATER_LINE_Y) : Math.min(GROUND_SURFACE_Y, Math.round(position(c,'y')+view.waterLine-WATER_LINE_Y));
    if(!window.SpriteManager?.draw?.(g,'currency_coin',['spin'],sx,cy,1,9,settings.reduce_motion?0:time+(Number(c.id)||0)*.17,10)){g.fillStyle='#d8d1aa';g.beginPath();g.arc(sx,cy-4,4,0,Math.PI*2);g.fill();}
  });

  state.wildlife.forEach(an=>{
    const sx=toScreenX(position(an));if(sx < -65 || sx>w+65)return;
    const ay=GROUND_SURFACE_Y+(position(an,'y')-WATER_LINE_Y);
    if(window.SpriteManager?.drawAnimal?.(g,sx,ay,an,time)){
      if(an.inWater){g.fillStyle='#528d8888';g.fillRect(sx-10,GROUND_SURFACE_Y,20,4);}
      if(an.trapped||an.nettedTimer>0){g.strokeStyle='#c2ac70';g.lineWidth=1;g.strokeRect(sx-9,ay-9,18,9);for(let i=-6;i<9;i+=4){g.beginPath();g.moveTo(sx+i,ay-9);g.lineTo(sx+i+6,ay);g.stroke();}}
      if(an.trust>=2){g.fillStyle='#a8c984';g.fillRect(sx-1,ay+2,3,2);}
    }
  });
  for(const corpse of state.corpses)window.SpriteManager?.drawCorpse?.(g,toScreenX(corpse.x),GROUND_SURFACE_Y,corpse);

  ROAD_GATES.forEach(gate => drawRoadGate(g,toScreenX(gate.x),GROUND_SURFACE_Y,gate.side,state.campaign.orders.some(o=>o.side===gate.side)));
  state.units.forEach((u) => {
    const sx = toScreenX(position(u));
    if (sx < -50 || sx > w + 50) return;
    drawMarker(g, sx, GROUND_SURFACE_Y, u);
    window.SpriteManager?.drawAlly?.(g, sx, GROUND_SURFACE_Y, u.facing, u, time);
    if (u.activity === 'BATHE') {
      g.fillStyle = '#558f8d98';
      g.fillRect(sx - 10, GROUND_SURFACE_Y - 1, 20, 5);
      g.fillStyle = '#abd4c5';
      g.fillRect(sx - 9, GROUND_SURFACE_Y + 3 + Math.round(Math.sin(time * 5)), 7, 1);
      g.fillRect(sx + 4, GROUND_SURFACE_Y + 1, 8, 1);
    }
    drawPersonStory(g,sx,GROUND_SURFACE_Y,u,false);
  });

  state.messengers.forEach(m=>{
    const sx=toScreenX(position(m));if(sx < -50 || sx > w+50)return;
    window.SpriteManager?.drawMessenger?.(g,sx,GROUND_SURFACE_Y,m,time);
    g.fillStyle='#e2dfc7';g.fillRect(sx+m.facing*12,GROUND_SURFACE_Y-49,2,23);g.fillRect(sx+m.facing*12,GROUND_SURFACE_Y-49,12,7);

  });

  state.enemies.forEach((en) => {
    const sx = toScreenX(position(en));
    if (sx < -70 || sx > w + 70) return;
    g.save();
    if(en.appearTimer>0)g.globalAlpha=Math.max(0,Math.min(1,1-en.appearTimer/1.2));
    window.SpriteManager?.drawEnemy?.(g, sx, GROUND_SURFACE_Y, en.facing, en, time);
    g.restore();
    drawMarker(g, sx, GROUND_SURFACE_Y, en, true);
  });

  const b = state.benkos;
  const bsx = toScreenX(position(b));
  const by = GROUND_SURFACE_Y;

  if (b.jaguarTimer > 0) {
    g.fillStyle = 'rgba(253, 224, 71, 0.28)';
    g.beginPath();
    g.arc(bsx, by - 16, 22, 0, Math.PI * 2);
    g.fill();
  }
  if (b.roarWave > 0) {
    g.strokeStyle = `rgba(251, 191, 36, ${b.roarWave})`;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(bsx, by - 16, (1 - b.roarWave) * 180, 0, Math.PI * 2);
    g.stroke();
  }

  window.SpriteManager?.drawBenkos?.(g, bsx, by, b.facing, b, time);
  if(b.inStream){g.strokeStyle='#84b9ae';g.lineWidth=1;g.beginPath();g.ellipse(bsx,by+2,12,2,0,0,Math.PI*2);g.stroke();}
  g.fillStyle = '#e6c486';
  g.fillRect(bsx - 3, by + 2, 6, 2);
  g.fillRect(bsx - 1, by + 4, 2, 2);

  state.projectiles.forEach(p=>{
    const x=toScreenX(position(p)),y=Math.round(position(p,'y')-22+view.waterLine-WATER_LINE_Y),side=Math.sign(p.vx)||1;
    g.save();g.translate(x,y);g.scale(side,1);
    if(p.isNet){
      g.strokeStyle='#c6b177';g.lineWidth=1;g.beginPath();g.ellipse(0,0,6,5,0,0,Math.PI*2);g.moveTo(-4,-3);g.lineTo(4,3);g.moveTo(-4,3);g.lineTo(4,-3);g.stroke();
    }else if(p.vy!==0){
      g.fillStyle='#bc9a60';g.fillRect(-7,0,13,1);g.fillStyle='#d0d3c1';g.beginPath();g.moveTo(9,0);g.lineTo(4,-2);g.lineTo(4,2);g.fill();g.fillStyle='#b3bd9c';g.fillRect(-7,-2,3,1);g.fillRect(-7,2,3,1);
    }else{g.fillStyle=p.color||'#b4c7b9';g.fillRect(-5,0,6,1);g.fillStyle='#ebe1c4';g.fillRect(1,-1,2,2);}
    g.restore();
  });

  state.particles.forEach((pt) => {
    g.fillStyle = pt.color;
    g.fillRect(toScreenX(position(pt)), Math.round(position(pt,'y')-22+view.waterLine-WATER_LINE_Y), pt.size, pt.size);
  });

  if (state.phase === 'DAY_EXPLORE' && state.timeOfDay > .56) {
    g.fillStyle = `rgba(121, 57, 29, ${Math.min(.22, (state.timeOfDay - .56) * 1.8)})`;
    g.fillRect(0, 0, w, h);
  }
  // ==================== DYNAMIC 2.5D TORCH & NIGHT LIGHTING ====================
  if (isNight || state.benkos.torchManual) {
    g.save();
    const torchFlicker = settings.reduce_motion ? 0 : Math.sin(time * 6) * 1.5;
    const bsx = toScreenX(position(state.benkos));
    const bsy = GROUND_SURFACE_Y - 24;

    // 1. Torch on Benkos
    const torchGrad = g.createRadialGradient(bsx, bsy, 8, bsx, bsy, 75 + torchFlicker);
    torchGrad.addColorStop(0, 'rgba(251, 146, 60, 0.16)');
    torchGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
    torchGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
    g.fillStyle = torchGrad;
    g.beginPath();
    g.arc(bsx, bsy, 75 + torchFlicker, 0, Math.PI * 2);
    g.fill();

    // 2. Altar of Wiwa Campfire (x = 0)
    const altarSx = toScreenX(0);
    const altarGrad = g.createRadialGradient(altarSx, GROUND_SURFACE_Y - 20, 10, altarSx, GROUND_SURFACE_Y - 20, 95 + torchFlicker * 1.5);
    altarGrad.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
    altarGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.06)');
    altarGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
    g.fillStyle = altarGrad;
    g.beginPath();
    g.arc(altarSx, GROUND_SURFACE_Y - 20, 95 + torchFlicker * 1.5, 0, Math.PI * 2);
    g.fill();

    // 3. Wall Torches
    state.walls.forEach(wall => {
      if (wall.level > 0 && wall.hp > 0) {
        const wsx = toScreenX(wall.x);
        const wGrad = g.createRadialGradient(wsx, GROUND_SURFACE_Y - 30, 4, wsx, GROUND_SURFACE_Y - 30, 45 + torchFlicker);
        wGrad.addColorStop(0, 'rgba(253, 224, 71, 0.38)');
        wGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
        wGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        g.fillStyle = wGrad;
        g.beginPath();
        g.arc(wsx, GROUND_SURFACE_Y - 30, 45 + torchFlicker, 0, Math.PI * 2);
        g.fill();
      }
    });

    // 4. Arcabucero Muzzle Flashes
    state.enemies.forEach(en => {
      if (en.muzzleFlash > 0 && !settings.reduce_motion) {
        const esx = toScreenX(position(en));
        const mGrad = g.createRadialGradient(esx + en.facing * 18, GROUND_SURFACE_Y - 20, 2, esx + en.facing * 18, GROUND_SURFACE_Y - 20, 50);
        mGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        mGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.6)');
        mGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        g.fillStyle = mGrad;
        g.beginPath();
        g.arc(esx + en.facing * 18, GROUND_SURFACE_Y - 20, 50, 0, Math.PI * 2);
        g.fill();
      }
    });

    g.restore();
  }
}

function renderFrame(time,alpha=1) {
  if (window.SpriteManager) window.SpriteManager.reduceMotion = settings.reduce_motion;
  renderAlpha=alpha;renderCamera=interpolation.cameraX(state,alpha);
  const w = view.width;
  const h = view.height;
  const waterHeight = h - view.waterLine;

  renderWorldAboveWater(sctx, time);

  ctx.save();
  if (state.screenShake > 0 && !settings.reduce_motion) {
    ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
  }

  ctx.drawImage(sceneCanvas, 0, 0);

  for (let wy = 0; wy < waterHeight; wy++) {
    const destY = view.waterLine + wy;
    const progress = wy / waterHeight;
    const srcY = Math.max(0, Math.min(view.waterLine - 1, Math.floor(view.waterLine - 1 - wy * 1.15)));
    const rippleX = settings.reduce_motion ? 0 : Math.round(Math.sin(wy * 0.35 - time * 2) * (0.8 + progress * 2));
    ctx.drawImage(sceneCanvas, 0, srcY, w, 1, rippleX, destY, w, 1);
  }

  const riverGrad = ctx.createLinearGradient(0, view.waterLine, 0, h);
  riverGrad.addColorStop(0, state.phase === 'RED_NIGHT' ? 'rgba(69, 10, 10, 0.32)' : 'rgba(28, 45, 52, 0.28)');
  riverGrad.addColorStop(1, 'rgba(14, 24, 32, 0.58)');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, view.waterLine, w, waterHeight);

  ctx.restore();
}


renderFrame.capturePrevious=()=>interpolation.capture(state);
renderFrame.projection=()=>({width:view.width,height:view.height,camera:renderCamera,ground:view.waterLine-22,scale:view.scale,offsetX:(window.innerWidth-view.width*view.scale)/2,offsetY:(window.innerHeight-view.height*view.scale)/2,x:e=>position(e),y:e=>position(e,'y')});
return renderFrame;
}
