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

  function clear() {
    revision++;
    video.onloadedmetadata = video.onplaying = video.onerror = null;
    video.classList.add('hidden');
    replay.classList.add('hidden');
    stop(video);
    stop(voice);
  }

  function playVoice() {
    if (soundStarted || !voice.getAttribute('src') || !settings.audio_enabled || settings.audio_volume <= 0) return;
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
    if (voice.getAttribute('src')) voice.currentTime = 0;
    if (video.getAttribute('src') && !video.error) {
      if (video.readyState >= 1) video.currentTime = clipStart;
      startVideo();
    } else playVoice();
  });

  async function show(clip, line) {
    clear();
    if (!clip && !line) return;
    const ticket = revision;
    const media = await catalog;
    if (ticket !== revision || !media) return;
    const hasVoice = line && Array.isArray(media.voices) && media.voices.includes(line.id);
    const hasVideo = clip && Array.isArray(media.videos) && media.videos.includes(clip.id);
    if (!hasVideo && !hasVoice) return;
    replay.classList.remove('hidden');
    soundStarted = false;
    if (hasVoice) voice.src = mediaPath + line.id + '.mp3';
    if (!hasVideo) { playVoice(); return; }

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
      if (!hasVoice) replay.classList.add('hidden');
      playVoice();
    };
    video.src = mediaPath + clip.id + '.mp4';
    if (settings.reduce_motion) playVoice();
    else startVideo();
  }

  return { show, clear };
}
