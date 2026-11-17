import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { PROLOGUE } from '../js/chronicle.js';

const output = new URL('../assets/prologue-local/', import.meta.url);
const localEnv = new URL('../.work/elevenlabs-env.mjs', import.meta.url);
const localVoices = new URL('../.work/elevenlabs-voices.json', import.meta.url);
const entries = Object.entries(PROLOGUE.voice);
const present = async (id, extension) => {
  const file = await stat(new URL(id + extension, output)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  return file?.isFile() && file.size > 0;
};

async function indexMedia() {
  const manifest = { videos: [], voices: [], localVoices: [] };
  for (const id of new Set(Object.values(PROLOGUE.clips).map(clip => clip.id))) {
    if (await present(id, '.mp4')) manifest.videos.push(id);
  }
  for (const { id } of Object.values(PROLOGUE.voice)) {
    if (await present(id, '.mp3')) manifest.voices.push(id);
    if (await present(id, '.wav')) manifest.localVoices.push(id);
  }
  await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n');
}

async function synthesize(text, voice, role, keys) {
  const endpoint = new URL('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice));
  endpoint.searchParams.set('output_format', 'mp3_44100_64');
  const failures = [];
  for (const [index, key] of keys.entries()) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: .56, similarity_boost: .76, speed: role === 'nino' ? 1.07 : role === 'abuelo' ? .94 : 1 } }),
      signal: AbortSignal.timeout(35_000)
    });
    if (response.ok && response.headers.get('content-type')?.startsWith('audio/')) {
      return Buffer.from(await response.arrayBuffer());
    }
    const detail = (await response.json().catch(() => ({}))).detail;
    const status = detail?.status;
    const reason = /^[a-z_]{3,56}$/.test(status ?? '') ? status : 'respuesta inesperada';
    failures.push(`${index === 0 ? 'principal' : 'respaldo ' + index}: HTTP ${response.status} (${reason})`);
    const retryWithBackup = response.status === 402 || ['invalid_api_key', 'quota_exceeded', 'voice_not_found', 'missing_permissions'].includes(reason);
    if (reason === 'unusual_activity' || !retryWithBackup ||
      index === keys.length - 1) throw Error(`ElevenLabs rechazó la síntesis · ${failures.join(' · ')}.`);
  }
}

async function generateVoices() {
  const env = process.env.ELEVENLABS_API_KEY ? process.env : (await import(localEnv)).loadElevenLabsEnv();
  const fallback = await readFile(localVoices, 'utf8').then(JSON.parse).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return {};
  });
  const voices = {
    benkos: process.env.BENKHOOS_ELEVENLABS_BENKOS_VOICE_ID || fallback.benkos,
    nino: process.env.BENKHOOS_ELEVENLABS_BENKOS_VOICE_ID || fallback.nino,
    abuelo: process.env.BENKHOOS_ELEVENLABS_ABUELO_VOICE_ID || fallback.abuelo,
    narrador: process.env.BENKHOOS_ELEVENLABS_NARRADOR_VOICE_ID || fallback.narrador,
    wiwa: process.env.BENKHOOS_ELEVENLABS_WIWA_VOICE_ID || fallback.wiwa
  };
  const keys = [...new Set([env.ELEVENLABS_API_KEY, env.ELEVENLABS_API_KEY_FALLBACK, env.ELEVENLABS_API_KEY_FALLBACK_2].filter(Boolean))];
  if (!keys.length) throw Error('Faltan las claves locales de ElevenLabs.');
  const unavailable = new Set();
  for (const [page, { id, role }] of entries) {
    if (await present(id, '.mp3') && !process.argv.includes('--force')) continue;
    if (!voices[role] && ['narrador', 'wiwa'].includes(role)) continue;
    if (!/^[a-zA-Z0-9]+$/.test(voices[role] ?? '')) throw Error(`Falta configurar la voz de ${role}.`);
    if (unavailable.has(voices[role])) continue;
    try {
      const audio = await synthesize(PROLOGUE.lines[page][1], voices[role], role, keys);
      if (audio.length < 512) throw Error('La pista está vacía.');
      await writeFile(new URL(id + '.mp3', output), audio);
      console.log(`Pista generada · ${id}`);
    } catch (error) {
      console.error(`${role} · ${error.message}`);
      unavailable.add(voices[role]);
      process.exitCode = 1;
    }
  }
}

if (process.argv.includes('--script-json')) {
  console.log(JSON.stringify(entries.map(([page, voice]) => ({ ...voice, text: PROLOGUE.lines[page][1] }))));
} else {
  await mkdir(output, { recursive: true });
  try {
    if (!process.argv.includes('--index-only')) await generateVoices();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await indexMedia();
  }
}
