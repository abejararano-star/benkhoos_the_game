"""Extract the supplied music recordings and prepare normalized, seamless game loops.

Requires FFmpeg (pass --ffmpeg if it is not on PATH). Original AAC streams stay in
archive/audio-originals; the small MP3 loops and provenance manifest ship with the game.
"""
import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRACKS = [
    ('131949', 'night', 'Mangrove Night Drift', 'mangrove-night-drift.mp3'),
    ('132509', 'morning', 'La Matuna Morning Canopy', 'la-matuna-morning-canopy.mp3'),
    ('132709', 'palenque', 'Maroon Kingdom Harmony', 'maroon-kingdom-harmony.mp3'),
    ('133229', 'resistance', 'Forest Resistance', 'forest-resistance.mp3'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-directory', type=Path, required=True)
    parser.add_argument('--ffmpeg', default=shutil.which('ffmpeg'))
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/audio/music')
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error('FFmpeg is required: pass --ffmpeg with its executable path.')
    args.output.mkdir(parents=True, exist_ok=True)
    originals = ROOT / 'archive/audio-originals'
    originals.mkdir(parents=True, exist_ok=True)

    def run(options):
        result = subprocess.run([str(args.ffmpeg), '-hide_banner', '-nostdin', '-y', *map(str, options)],
                                capture_output=True, encoding='utf8', errors='replace')
        if result.returncode:
            raise RuntimeError(result.stderr[-3000:])
        return result.stderr

    entries = []
    for suffix, identifier, title, filename in TRACKS:
        source = args.source_directory / f'Grabación de pantalla 2026-11-19 {suffix}.mp4'
        original = originals / filename.replace('.mp3', '.m4a')
        run(['-i', source, '-map', '0:a:0', '-vn', '-c:a', 'copy', '-map_metadata', '-1', original])
        log = run(['-i', original, '-af', 'silencedetect=noise=-55dB:d=0.12', '-f', 'null', '-'])
        duration_parts = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', log)
        duration = sum(float(part) * scale for part, scale in zip(duration_parts.groups(), [3600, 60, 1]))
        start, end = 0.0, duration
        starts = [float(value) for value in re.findall(r'silence_start: ([\d.]+)', log)]
        ends = [float(value) for value in re.findall(r'silence_end: ([\d.]+)', log)]
        if starts and starts[0] < .05 and ends:
            start = max(0, ends[0] - .04)
        if starts and ends and ends[-1] >= duration - .06:
            end = min(duration, starts[-1] + .04)
        if end - start < 10:
            raise ValueError(f'{source.name}: insufficient non-silent audio')
        trim = f'atrim=start={start:.6f}:end={end:.6f},asetpts=PTS-STARTPTS'
        report = run(['-i', original, '-af', trim + ',loudnorm=I=-21:LRA=11:TP=-2:print_format=json', '-f', 'null', '-'])
        measured = json.loads(report[report.rfind('{'):report.rfind('}') + 1])
        if not math.isfinite(float(measured['input_i'])):
            raise ValueError(f'{source.name}: audio is silent')
        normalization = (f'loudnorm=I=-21:LRA=11:TP=-2:measured_I={measured["input_i"]}:'
                         f'measured_LRA={measured["input_lra"]}:measured_TP={measured["input_tp"]}:'
                         f'measured_thresh={measured["input_thresh"]}:offset={measured["target_offset"]}:linear=true')
        # End with a 1.2-second equal-power blend into the original beginning.
        # Its final sample meets the start of `body`, producing a continuous loop.
        graph = (f'[0:a]{trim},{normalization},aresample=44100,asplit=2[body][head];'
                 '[body]atrim=start=1.2,asetpts=PTS-STARTPTS[body2];'
                 '[head]atrim=end=1.2,asetpts=PTS-STARTPTS[head2];'
                 '[body2][head2]acrossfade=d=1.2:c1=qsin:c2=qsin,'
                 'alimiter=limit=0.89125:level=false[out]')
        output = args.output / filename
        run(['-i', original, '-filter_complex', graph, '-map', '[out]', '-vn', '-c:a', 'libmp3lame',
             '-b:a', '128k', '-ar', '44100', '-map_metadata', '-1', '-metadata', f'title={title}', output])
        output_report = run(['-i', output, '-af', 'loudnorm=I=-21:LRA=11:TP=-2:print_format=json', '-f', 'null', '-'])
        output_levels = json.loads(output_report[output_report.rfind('{'):output_report.rfind('}') + 1])
        entries.append(dict(id=identifier, title=title, file=filename, source=source.name,
                            source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                            sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                            source_duration=duration, kept_range=[round(start, 3), round(end, 3)],
                            loop_duration=round(end-start-1.2, 3), crossfade_seconds=1.2,
                            integrated_lufs=float(output_levels['input_i']), true_peak_dbtp=float(output_levels['input_tp']),
                            bytes=output.stat().st_size))
        print(f'{identifier}: {end-start-1.2:.2f}s, {output_levels["input_i"]} LUFS, {output.stat().st_size} bytes')
    manifest = dict(version=1, sample_rate=44100, channels=2, format='MP3 128 kb/s',
                    origin='Four screen recordings supplied by the user on 2026-11-19', tracks=entries)
    (args.output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    main()
