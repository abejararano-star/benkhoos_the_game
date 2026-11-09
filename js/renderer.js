import { blend, color, daylightAt } from './daylight.js?v=290996c6041f';
import { drawSky } from './sky.js?v=290996c6041f';
import { drawCampEnclosure, drawWatchtower } from './terrain.js?v=290996c6041f';
import { ALTAR_X, TRAIL_CACHES, TRAIL_SIGNS } from './exploration.js?v=290996c6041f';
import { createLighting } from './lighting.js?v=290996c6041f';
import { RenderInterpolation } from './visual-motion.js?v=290996c6041f';
import { altarSprite, ALTAR_HEIGHT } from './settlement.js?v=290996c6041f';
import { drawLandscape, drawMist, drawAmbientMotes, drawVines, drawCaptiveGate, drawRiverbank, drawTrailScenery, drawVillage, drawConstructionSites, drawHacienda, drawEstateScenery, drawMarker, drawRoadGate, drawPersonStory, drawFortification, drawToolStand, drawStreams } from './terrain.js?v=290996c6041f';
import { drawParticle } from './effects.js?v=290996c6041f';
import { haciendaActive } from './haciendas.js?v=290996c6041f';
import { ROAD_GATES } from './campaign.js?v=290996c6041f';
import { WATER_LINE_Y } from './config.js?v=290996c6041f';
export function createRenderer({ state, canvas, ctx, sceneCanvas, sctx, view, settings }) {
const lightScene = createLighting();
const interpolation=new RenderInterpolation();let renderAlpha=1,renderCamera=state.cameraX;
const position=(e,key='x')=>interpolation.value(e,key,renderAlpha);
function drawKingdomClusterTree(g, sx, groundY, height, markedForChop, chopped, time=0, variant=0) {
  const treeClass=chopped?'forest_stump':['forest_ceiba','forest_hardwood','forest_mangrove','forest_palm'][Math.abs(variant)%4];
  if(window.SpriteManager?.has(treeClass)){
    window.SpriteManager.draw(g,treeClass,['idle'],sx,groundY,1,chopped?20:height+35,0);
    if(markedForChop){g.fillStyle='#c87952';g.fillRect(sx-7,groundY-26,14,3);g.fillStyle='#ebd3a4';g.fillRect(sx-2,groundY-28,4,7);}
    return;
  }
  if (chopped) {
    // Tocón de Ceiba talada
    g.fillStyle = '#451a03';
    g.fillRect(sx - 7, groundY - 14, 14, 14);
    g.fillStyle = '#78350f';
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
  g.fillStyle='#ab7a47';g.fillRect(sx-4,groundY-height,2,height);
  for(let y=8;y<height;y+=13){g.fillStyle='#2c281b';g.fillRect(sx+(y%3)-1,groundY-y,2,7);}
  g.strokeStyle='#826039';g.lineWidth=3;
  for(const side of [-1,1]){g.beginPath();g.moveTo(sx,groundY-height*.55);g.lineTo(sx+side*18,groundY-height+10);g.stroke();g.beginPath();g.moveTo(sx+side*3,groundY-12);g.lineTo(sx+side*15,groundY);g.stroke();}

  const cShadow = '#1b3b1a';
  const cMid = '#355e27';
  const cLight = '#588136';

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
    g.fillStyle='#80954c';
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
function renderWorldAboveWater(g, time, air) {
  const w = view.width;
  const h = view.waterLine;
  const GROUND_SURFACE_Y = h - 22;
  const camX = renderCamera;
  const toScreenX = (wx) => Math.round(wx - camX + w / 2);
  const wind = settings.reduce_motion ? 0 : time;
  drawSky(g, w, h, GROUND_SURFACE_Y, camX, wind, air);
  drawLandscape(g, w, GROUND_SURFACE_Y, camX, air);
  drawMist(g, w, GROUND_SURFACE_Y, camX, air, wind);

  drawCampEnclosure(g, w, GROUND_SURFACE_Y, camX, state.walls);
  drawRiverbank(g, w, GROUND_SURFACE_Y, camX);
  drawTrailScenery(g, toScreenX, GROUND_SURFACE_Y, w, TRAIL_SIGNS, ALTAR_X);
  drawEstateScenery(g, toScreenX, GROUND_SURFACE_Y, w);
  drawStreams(g,toScreenX,GROUND_SURFACE_Y,state.ecology.streams,time,settings.reduce_motion,w);
  drawVines(g, toScreenX, GROUND_SURFACE_Y, w, settings.reduce_motion ? 0 : time);
  drawVillage(g, toScreenX, GROUND_SURFACE_Y, air.shadow, time, state.settlement, state.armyTier, settings.reduce_motion);

  state.trees.forEach((tr) => {
    const sx = toScreenX(tr.x);
    if (sx < -70 || sx > w + 70) return;
    drawKingdomClusterTree(g, sx, GROUND_SURFACE_Y, tr.height, tr.markedForChop, tr.chopped, time,Number(String(tr.id).split('_').pop())||0);
  });

  state.mines.forEach((mn) => {
    const sx = toScreenX(mn.x);
    if (sx < -50 || sx > w + 50) return;
    window.SpriteManager?.draw?.(g,'landmark_mine',['idle'],sx,GROUND_SURFACE_Y,1,50,0);
  });

  state.haciendas.forEach((hac) => {
    const sx = toScreenX(hac.x);
    if (sx < -150 || sx > w + 150) return;
    if (hac.major) {
      g.save(); g.translate(sx, GROUND_SURFACE_Y); g.scale(1.47, 1.27);
      drawHacienda(g, 0, 0, !haciendaActive(hac));
      g.restore();
    } else drawHacienda(g, sx, GROUND_SURFACE_Y, !haciendaActive(hac));
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
    drawToolStand(g,sx,GROUND_SURFACE_Y,rk,state.armyTier);
  });

  window.SpriteManager?.draw?.(g,'landmark_totem',['idle'],toScreenX(-48),GROUND_SURFACE_Y,1,57,0);
  window.SpriteManager?.draw?.(g,altarSprite(state.altarTier),['idle'],toScreenX(ALTAR_X),GROUND_SURFACE_Y,1,ALTAR_HEIGHT[state.altarTier],0);
  for (const cache of TRAIL_CACHES) {
    const x = toScreenX(cache.x);
    if (x > -40 && x < w + 40) {
      const opened = state.exploration.opened.includes(cache.id);
      if (cache.hidden && !opened && !state.exploration.revealed.includes(cache.id)) {
        window.SpriteManager?.draw?.(g, 'trail_fern', ['idle'], x, GROUND_SURFACE_Y, 1, 22, 0);
        continue;
      }
      window.SpriteManager?.draw?.(g, 'currency_chest', ['open'], x, GROUND_SURFACE_Y, 1, 21, 0, 0, opened ? .9 : 0);
    }
  }
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
      drawFortification(g,sx,GROUND_SURFACE_Y,wall,settings.reduce_motion?0:time);
    }
  });
  for (const tower of state.settlement.towers) {
    const x = toScreenX(tower.x);
    if (x > -55 && x < w + 55) drawWatchtower(g, x, GROUND_SURFACE_Y, tower);
  }
  drawConstructionSites(g, toScreenX, GROUND_SURFACE_Y, w, state);

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
    const feet = GROUND_SURFACE_Y - (u.towerHeight || 0);
    drawMarker(g, sx, feet, u);
    window.SpriteManager?.drawAlly?.(g, sx, feet, u.facing, u, time);
    if (u.activity === 'BATHE') {
      g.fillStyle = '#558f8d98';
      g.fillRect(sx - 10, GROUND_SURFACE_Y - 1, 20, 5);
      g.fillStyle = '#abd4c5';
      g.fillRect(sx - 9, GROUND_SURFACE_Y + 3 + Math.round(Math.sin(time * 5)), 7, 1);
      g.fillRect(sx + 4, GROUND_SURFACE_Y + 1, 8, 1);
    }
    drawPersonStory(g,sx,feet,u,false);
  });
  for (const hacienda of state.haciendas) {
    const x = toScreenX(hacienda.x);
    if (x > -100 && x < w + 100 && haciendaActive(hacienda)) {
      const prisoners = state.units.filter(unit => unit.captiveHacienda === hacienda.id).length;
      drawCaptiveGate(g, x, GROUND_SURFACE_Y, hacienda, prisoners);
    }
  }

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

  for (const particle of state.particles) {
    const x = toScreenX(position(particle));
    if (x < -20 || x > w + 20) continue;
    drawParticle(g, particle, x, Math.round(position(particle, 'y') + GROUND_SURFACE_Y - WATER_LINE_Y));
  }

  drawTrailScenery(g, toScreenX, GROUND_SURFACE_Y, w, TRAIL_SIGNS, ALTAR_X, true);
  lightScene(g, state, toScreenX, bsx, GROUND_SURFACE_Y, w, time, settings.reduce_motion, air);
  drawAmbientMotes(g, w, GROUND_SURFACE_Y, camX, air, wind);
}

function renderFrame(time,alpha=1) {
  if (window.SpriteManager) window.SpriteManager.reduceMotion = settings.reduce_motion;
  renderAlpha=alpha;renderCamera=interpolation.cameraX(state,alpha);
  const w = view.width;
  const h = view.height;
  const waterHeight = h - view.waterLine;

  const air = daylightAt(state.timeOfDay, state.phase === 'RED_NIGHT');
  renderWorldAboveWater(sctx, time, air);

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
  riverGrad.addColorStop(0, color(blend([27, 51, 58], air.horizon, .27), .25 + air.shadow * .24));
  riverGrad.addColorStop(1, color(blend([15, 31, 40], air.zenith, .27), .50 + air.shadow * .22));
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, view.waterLine, w, waterHeight);
  ctx.fillStyle = color(blend(air.horizon, [194, 221, 204], .45), .44 - air.shadow * .37);
  for (let i = 0; i < 16; i++) {
    const drift = settings.reduce_motion ? 0 : time * (4 + i % 3);
    const x = ((i * 67 - renderCamera * .56 + drift) % w + w) % w;
    ctx.fillRect(Math.round(x), view.waterLine + 2 + (i * 13 % Math.max(1, waterHeight - 3)), 5 + i % 7, 1);
  }

  ctx.restore();
}


renderFrame.capturePrevious=()=>interpolation.capture(state);
renderFrame.projection=()=>({width:view.width,height:view.height,camera:renderCamera,ground:view.waterLine-22,scale:view.scale,offsetX:(window.innerWidth-view.width*view.scale)/2,offsetY:(window.innerHeight-view.height*view.scale)/2,x:e=>position(e),y:e=>position(e,'y')});
return renderFrame;
}
