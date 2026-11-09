export const NIGHT_START = .68;

const palettes = [
  // Clock, zenith, horizon, cloud light, cloud shade, world shadow, warmth
  [0,    [21, 36, 61],   [79, 89, 117],  [94, 111, 137], [49, 63, 90],    .49, 0],
  [.06,  [71, 103, 145], [244, 177, 134], [245, 199, 163], [137, 132, 160], .20, .15],
  [.17,  [77, 145, 184], [210, 222, 188], [250, 241, 208], [164, 185, 185], .02, .04],
  [.39,  [66, 133, 180], [184, 218, 210], [255, 244, 214], [151, 181, 192], 0, 0],
  [.49,  [78, 133, 173], [228, 213, 168], [255, 228, 183], [162, 168, 173], 0, .06],
  [.58,  [98, 113, 157], [250, 163, 105], [255, 195, 137], [156, 131, 158], .08, .22],
  [.65,  [62, 74, 124],  [224, 124, 111], [230, 151, 142], [110, 91, 128],  .28, .17],
  [.74,  [20, 32, 61],   [94, 98, 133],  [105, 116, 146], [52, 63, 95],    .55, .03],
  [.85,  [11, 21, 43],   [49, 66, 96],   [77, 95, 127],  [36, 51, 79],    .64, 0],
];

export const clamp01 = value => Math.max(0, Math.min(1, value));
export const mix = (a, b, weight) => a + (b - a) * weight;
export const smooth = (start, end, value) => {
  const weight = clamp01((value - start) / (end - start));
  return weight * weight * (3 - 2 * weight);
};
export const color = (rgb, alpha = 1) => `rgba(${rgb.map(Math.round).join(',')},${alpha})`;
export const blend = (a, b, weight) => a.map((channel, i) => mix(channel, b[i], weight));

export function daylightAt(time, redNight = false) {
  const t = time - Math.floor(time);
  const next = palettes.findIndex(row => row[0] > t);
  const from = next < 0 ? palettes.at(-1) : palettes[next - 1];
  const to = next < 0 ? palettes[0] : palettes[next];
  const fade = smooth(from[0], next < 0 ? 1 : to[0], t);
  const red = redNight ? smooth(NIGHT_START, .79, t) * (1 - smooth(.93, 1, t)) : 0;
  return {
    t,
    zenith: blend(blend(from[1], to[1], fade), [48, 19, 43], red),
    horizon: blend(blend(from[2], to[2], fade), [156, 66, 65], red),
    cloudLight: blend(blend(from[3], to[3], fade), [147, 77, 83], red),
    cloudShade: blend(blend(from[4], to[4], fade), [69, 36, 58], red),
    shadow: mix(from[5], to[5], fade),
    warmth: mix(from[6], to[6], fade),
    stars: t < .5 ? 1 - smooth(0, .12, t) : smooth(.62, .81, t),
    red,
  };
}

export function daylightLabel(t) {
  if (t < .12) return 'Amanecer';
  if (t < .32) return 'Mañana';
  if (t < .44) return 'Mediodía';
  if (t < .54) return 'Tarde';
  if (t < .64) return 'Atardecer';
  if (t < .76) return 'Crepúsculo';
  if (t < .94) return 'Noche';
  return 'Antes del alba';
}
