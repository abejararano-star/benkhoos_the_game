import { PLAZA } from './config.js?v=ee79ef434f2b';

export function drawPlaza(g, toScreen, ground) {
  const left = toScreen(PLAZA.left), right = toScreen(PLAZA.right);
  // A low, worn earth floor leaves the playable riverbank intact.
  g.fillStyle = '#7f6e4580'; g.fillRect(left, ground - 3, right - left, 4);
  for (let x = left + 3; x < right; x += 13) {
    g.fillStyle = '#b49c6255'; g.fillRect(x, ground - 3 + x % 2, 6, 1);
  }
  for (const wx of [PLAZA.right - 18, PLAZA.left + 34]) {
    const x = toScreen(wx);
    g.fillStyle = '#493729'; g.fillRect(x - 11, ground - 6, 3, 6); g.fillRect(x + 8, ground - 6, 3, 6);
    g.fillStyle = '#98754a'; g.fillRect(x - 14, ground - 9, 28, 4);
    g.fillStyle = '#c09b60'; g.fillRect(x - 13, ground - 9, 26, 1);
  }
}

function caption(g, x, y, message) {
  const words = message.split(' '), lines = [''];
  for (const word of words) {
    if ((lines.at(-1) + word).length > 43) lines.push('');
    lines[lines.length - 1] += (lines.at(-1) ? ' ' : '') + word;
  }
  g.font = '7px monospace'; g.textAlign = 'center';
  const width = Math.max(...lines.map(line => g.measureText(line).width)) + 14;
  g.fillStyle = '#10241be8'; g.fillRect(x - width / 2, y - 10, width, 9 + lines.length * 10);
  g.fillStyle = '#d8ba7b'; g.fillRect(x - width / 2, y - 10, width, 1);
  for (let i = 0; i < lines.length; i++) g.fillText(lines[i], x, y + i * 10);
}

export function drawFestival(g, toScreen, ground, width, state, reduceMotion) {
  const f = state.festivity;
  const x = toScreen(f.x), sprites = window.SpriteManager;
  if (x < -120 || x > width + 120) return;
  const target = state.timeOfDay >= .68 ? PLAZA.nightX : PLAZA.dayX;
  const active = f.mode === 'MUSIC' || f.mode === 'PROCLAIM';
  const clock = reduceMotion ? 0 : f.clock;
  if (!active || Math.abs(f.x - target) > 3) {
    if (f.x > -100) {
      for (const [index, sex] of ['m', 'f'].entries()) sprites?.draw?.(g, 'actor_identity_' + sex, ['walk'],
        x + index * 28, ground - 3, active ? 1 : -1, 39, clock, 7);
    }
    return;
  }
  if (f.mode === 'MUSIC') {
    sprites?.draw?.(g, 'festival_drummer', ['play'], x - 14, ground - 3, 1, 41, clock, 6);
    sprites?.draw?.(g, 'festival_shaker', ['play'], x + 20, ground - 3, 1, 43, clock, 6);
    if (!reduceMotion) {
      // Small notes identify the source of the local percussion.
      const phase = (clock * .6) % 1;
      g.fillStyle = `rgba(220,196,131,${1 - phase})`;
      const nx = x + 8 + Math.round(phase * 13), ny = ground - 48 - Math.round(phase * 11);
      g.fillRect(nx, ny, 2, 6); g.fillRect(nx - 2, ny + 4, 3, 2); g.fillRect(nx, ny, 4, 1);
    }
  } else {
    const talking = (clock % 3) < 2;
    sprites?.draw?.(g, 'stall_vendor_m', [talking ? 'offer' : 'idle'], x, ground - 3, 1, 43, 0);
  }
  if (Math.abs(state.benkos.x - f.x) < 310) {
    caption(g, x + 42, ground - 90, f.line || 'Plaza de la Matuna');
    if (f.mode === 'MUSIC' && !state.benkos.festivalDance && state.amara.leads &&
        Math.abs(state.benkos.x - 255) < 95) {
      caption(g, toScreen(255), ground - 130, 'A pie, mira a los músicos junto a Amara unos segundos para bailar.');
    }
  }
}

export function drawFestivalKiss(g, sprites, state, toScreen, ground, reduceMotion) {
  const f = state.festivity;
  if (!f.kiss || !state.benkos.festivalDance) return false;
  const x = toScreen(state.benkos.x + 12);
  const drawn = sprites?.draw?.(g, 'festival_couple', ['kiss'], x, ground, 1, 49, 0, 0,
    reduceMotion ? .65 : 1 - f.kiss / 2.4);
  if (drawn) {
    const rise = reduceMotion ? 0 : Math.round((1 - f.kiss / 2.4) * 10);
    g.fillStyle = '#e4a5a0';
    for (const [dx, dy, w, h] of [[-3, 0, 2, 2], [1, 0, 2, 2], [-4, 2, 8, 2], [-2, 4, 4, 2], [-1, 6, 2, 1]]) {
      g.fillRect(x + dx, ground - 56 - rise + dy, w, h);
    }
  }
  return drawn;
}
