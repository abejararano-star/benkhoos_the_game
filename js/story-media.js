const mediaPath = 'assets/prologue-local/';
const stop = element => {
  if (!element.getAttribute('src')) return;
  element.pause();
  element.removeAttribute('src');
  element.load();
};

export function createStoryMedia({ video, voice, replay, settings }) {
  const catalog = fetch(mediaPath + 'manifest.json', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .catch(() => null);
  let revision = 0;
  let clipStart = 0;
  let clipEnd = Infinity;
  let soundStarted = false;
  let narration;
  let utterance;
  let fallbackAudio;
  const speech = globalThis.speechSynthesis;

  function clear() {
    revision++;
    video.onloadedmetadata = video.onplaying = video.onerror = null;
    voice.onerror = null;
    if (utterance) speech.cancel();
    utterance = null;
    narration = null;
    video.classList.add('hidden');
    replay.classList.add('hidden');
    stop(video);
    stop(voice);
  }

  function playVoice() {
    if (soundStarted || !settings.audio_enabled || settings.audio_volume <= 0) return;
    if (!voice.getAttribute('src')) {
      if (!narration?.text || !speech || !globalThis.SpeechSynthesisUtterance) return;
      const spanish = speech.getVoices().filter(option => option.localService && /^es(?:-|$)/i.test(option.lang));
      const option = spanish.find(item => item.lang.toLowerCase() === 'es-co') ??
        spanish.find(item => item.lang.toLowerCase() === 'es-mx') ?? spanish[0];
      if (!option) return;
      utterance = new SpeechSynthesisUtterance(narration.text);
      utterance.voice = option;
      utterance.lang = option.lang;
      utterance.volume = settings.audio_volume;
      utterance.pitch = { abuelo: .83, nino: 1.2, wiwa: .93 }[narration.role] ?? 1;
      utterance.rate = { abuelo: .87, nino: 1.06, wiwa: .91 }[narration.role] ?? .97;
      soundStarted = true;
      speech.speak(utterance);
      return;
    }
    soundStarted = true;
    voice.volume = settings.audio_volume;
    const ticket = revision;
    void voice.play().catch(() => { if (ticket === revision) soundStarted = false; });
  }

  function startVideo() {
    const ticket = revision;
    void video.play().catch(() => { if (ticket === revision) playVoice(); });
  }

  video.addEventListener('timeupdate', () => {
    if (video.currentTime >= clipEnd) video.pause();
  });
  replay.addEventListener('click', () => {
    soundStarted = false;
    if (utterance) speech.cancel();
    utterance = null;
    if (voice.getAttribute('src')) voice.currentTime = 0;
    playVoice();
    if (video.getAttribute('src') && !video.error) {
      video.pause();
      if (video.readyState >= 1) video.currentTime = clipStart;
      startVideo();
    }
  });

  async function show(clip, line) {
    clear();
    if (!clip && !line) return;
    const ticket = revision;
    const media = await catalog;
    if (ticket !== revision) return;
    narration = line;
    const hasVoice = line && Array.isArray(media?.voices) && media.voices.includes(line.id);
    fallbackAudio = line && Array.isArray(media?.localVoices) && media.localVoices.includes(line.id)
      ? mediaPath + line.id + '.wav' : '';
    const hasVideo = clip && Array.isArray(media?.videos) && media.videos.includes(clip.id);
    const canNarrate = hasVoice || fallbackAudio || line?.text && speech && globalThis.SpeechSynthesisUtterance;
    if (!hasVideo && !canNarrate) return;
    replay.classList.remove('hidden');
    replay.textContent = hasVideo ? 'Reproducir escena' : 'Repetir voz';
    soundStarted = false;
    if (hasVoice || fallbackAudio) {
      voice.onerror = () => {
        if (ticket !== revision) return;
        soundStarted = false;
        if (fallbackAudio && voice.getAttribute('src') !== fallbackAudio) voice.src = fallbackAudio;
        else stop(voice);
        playVoice();
      };
      voice.src = hasVoice ? mediaPath + line.id + '.mp3' : fallbackAudio;
    }
    playVoice();
    if (!hasVideo) return;

    clipStart = 0;
    clipEnd = Infinity;
    video.onloadedmetadata = () => {
      if (ticket !== revision || !Number.isFinite(video.duration)) return;
      clipStart = video.duration * (clip.start ?? 0);
      clipEnd = video.duration * (clip.end ?? 1);
      if (clipStart > 0) video.currentTime = clipStart;
    };
    video.onplaying = () => {
      if (ticket !== revision) return;
      video.classList.remove('hidden');
      playVoice();
    };
    video.onerror = () => {
      if (ticket !== revision) return;
      video.classList.add('hidden');
      if (!canNarrate) replay.classList.add('hidden');
      playVoice();
    };
    video.src = mediaPath + clip.id + '.mp4';
    if (!settings.reduce_motion) startVideo();
  }

  return { show, clear };
}
