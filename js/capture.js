export const CAPTURE_DURATION = 16;

export function capturePose(time) {
  const march = Math.max(0, Math.min(1, (time - 4) / 6));
  const x = 155 + march * 335;
  if (time < 2) return { stage: 'arrest', x, action: 'arrest', label: 'La guardia inmoviliza a Benkos.' };
  if (time < 4) return { stage: 'chain', x, action: 'bound', label: 'Cierran los grilletes sobre sus muñecas.' };
  if (time < 10) return { stage: 'escort', x, action: 'walk', label: 'Los guardias lo llevan encadenado a la plaza.' };
  if (time < 12.5) return { stage: 'scaffold', x, action: 'kneel', label: 'La escolta lo hace arrodillarse ante la guillotina.' };
  return { stage: 'execution', x, action: 'kneel', label: 'Benkos fue ejecutado. La campaña ha terminado.' };
}

function drawScaffold(ctx) {
  const beams = [
    [412, 286, 166, 10], [422, 296, 9, 4], [555, 296, 9, 4],
    [465, 137, 12, 149], [532, 137, 12, 149], [461, 131, 87, 12],
    [470, 172, 68, 8], [444, 269, 87, 6], [439, 275, 8, 11],
    [391, 292, 23, 8], [401, 285, 13, 7]
  ];
  for (const [x, y, width, height] of beams) {
    ctx.fillStyle = '#30251c'; ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
    ctx.fillStyle = '#795330'; ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#a47743'; ctx.fillRect(x, y, width, 2);
    ctx.fillStyle = '#513920'; ctx.fillRect(x + 1, y + 3, Math.max(1, width - 3), 1);
    if (height > width) {
      ctx.fillStyle = '#b18752'; ctx.fillRect(x + 2, y + 5, 2, height - 7);
      ctx.fillStyle = '#5f4228'; ctx.fillRect(x + 7, y + 8, 2, height - 10);
      for (let cut = y + 18; cut < y + height; cut += 23) ctx.fillRect(x + 3, cut, 4, 2);
    }
  }
  for (const x of [468, 536]) {
    for (const y of [136, 175, 262, 290]) {
      ctx.fillStyle = '#282a26'; ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = '#b5ae94'; ctx.fillRect(x, y, 2, 1);
    }
  }
  ctx.fillStyle = '#333b37'; ctx.fillRect(480, 144, 49, 20);
  ctx.fillStyle = '#a8b0a5'; ctx.beginPath();
  ctx.moveTo(482, 146); ctx.lineTo(527, 146); ctx.lineTo(527, 158); ctx.lineTo(482, 174); ctx.fill();
  ctx.strokeStyle = '#d0d1b8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(483, 173); ctx.lineTo(527, 157); ctx.stroke();
  ctx.strokeStyle = '#b19a6c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(505, 145); ctx.lineTo(505, 128); ctx.lineTo(552, 128); ctx.lineTo(552, 237); ctx.stroke();
  ctx.fillStyle = '#433628'; ctx.fillRect(548, 235, 8, 11);
  ctx.fillStyle = '#a68a58'; ctx.fillRect(549, 236, 6, 2);
}

export function drawCapture(ctx, sprites, time, reducedMotion) {
  const pose = capturePose(time);
  const ground = 300;
  const clock = reducedMotion ? 0 : time;
  const walk = pose.stage === 'escort';
  const guardAction = walk ? 'walk' : 'idle';
  const left = pose.x - 48, right = pose.x + 51;

  ctx.fillStyle = 'rgba(18,17,15,.42)';
  ctx.fillRect(0, 0, 640, 360);
  // A fixed ground line keeps feet, shackles and scaffold on the same plane.
  ctx.fillStyle = '#433e34'; ctx.fillRect(0, ground - 2, 640, 62);
  ctx.fillStyle = '#8f8066'; ctx.fillRect(0, ground - 2, 640, 2);
  for (let row = 0; row < 3; row++) {
    for (let stone = 0; stone < 15; stone++) {
      const offset = row % 2 ? 19 : 0;
      ctx.fillStyle = (stone + row) % 3 ? '#635c4b' : '#6e6450';
      ctx.fillRect(stone * 45 + offset, ground + 4 + row * 17, 40, 12);
    }
  }
  drawScaffold(ctx);
  sprites?.draw?.(ctx, 'actor_SOLDADO_ESPANOL', [guardAction, 'idle'], left, ground, 1, 56, clock, 7);

  if (pose.stage === 'arrest') {
    const progress = Math.min(1, time / 1.6);
    sprites?.draw?.(ctx, 'actor_SOLDADO_ESPANOL', ['idle'], pose.x + 32 - progress * 15, ground, -1, 56, 0);
    sprites?.draw?.(ctx, 'actor_hero', ['rest'], pose.x, ground, 1, 54, 0);
    ctx.fillStyle = '#363c3a'; ctx.fillRect(pose.x + 9, ground - 23, 7, 4);
    ctx.fillStyle = '#aaa99b'; ctx.fillRect(pose.x + 10, ground - 23, Math.ceil(5 * progress), 1);
  } else {
    const chained = pose.stage === 'escort' || pose.stage === 'chain';
    const heroY = ground - Math.max(0, Math.min(14, (time - 9.5) * 28));
    const action = pose.action === 'kneel' ? 'rest' : pose.action === 'bound' ? 'idle' : pose.action;
    sprites?.draw?.(ctx, 'actor_hero', [action], pose.x, heroY, 1, 54, clock, 7);
    const hand = Math.round(pose.x + 8);
    ctx.fillStyle = '#373c39'; ctx.fillRect(hand, heroY - 24, 6, 4);
    ctx.fillStyle = '#b8b8a4'; ctx.fillRect(hand + 1, heroY - 24, 4, 1);
    ctx.strokeStyle = '#aaa996'; ctx.lineWidth = 1;
    ctx.strokeRect(hand - 6, heroY - 22, 5, 3);
    ctx.beginPath(); ctx.moveTo(hand - 1, heroY - 21); ctx.lineTo(hand + 1, heroY - 21); ctx.stroke();
    if (chained) {
      const handY = heroY - 22;
      ctx.strokeStyle = '#2a2726'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(pose.x + 8, handY); ctx.quadraticCurveTo(pose.x + 30, handY + 9, right - 7, ground - 25); ctx.stroke();
      ctx.strokeStyle = '#b3aca0'; ctx.lineWidth = 1; ctx.stroke();
      for (let link = 0; link < 6; link++) {
        ctx.strokeRect(pose.x + 11 + link * 5, handY + 2 + Math.sin(link / 5 * Math.PI) * 3, 4, 2);
      }
    }
    sprites?.draw?.(ctx, 'actor_SOLDADO_ESPANOL', [guardAction, 'idle'], right, ground, walk ? 1 : -1, 56, clock + .22, 7);
  }
  if (time >= 11.8) {
    const darkness = reducedMotion ? 1 : Math.min(1, (time - 11.8) / .7);
    ctx.fillStyle = `rgba(8,10,9,${darkness})`; ctx.fillRect(0, 0, 640, 360);
    if (time >= 13) {
      ctx.fillStyle = '#e4cda2'; ctx.font = '22px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('La campaña ha terminado', 320, 174);
      ctx.fillStyle = '#ab9e85'; ctx.font = '12px monospace';
      ctx.fillText('Benkos fue capturado y ejecutado', 320, 203);
    }
  }
  return pose.label;
}

export function capturedEnding(onDone) {
  return {
    chapter: 'Derrota · La captura', title: 'La última guardia',
    lines: [['Benkos', 'La bolsa quedó vacía. La guardia lo rodea y se lo lleva encadenado.']],
    art: ['puerto'], capture: true,
    notes: { 0: 'Desenlace ficticio con guillotina. La ejecución histórica de Benkos fue por ahorcamiento.' },
    onDone
  };
}
