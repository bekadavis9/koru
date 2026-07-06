# As Heard Through a Cochlear Implant

A Rust channel vocoder that simulates how cochlear implant (CI) users perceive music. Feed it an audio file and it returns a degraded version that preserves rhythm and timing while destroying harmonic detail and timbre — mirroring the perceptual limitations of CI devices.

**[Try it in the browser](https://bekadavis9.github.io/koru/)** — runs entirely client-side via WebAssembly.

## About this project

Cochlear implants work by mapping sound to a small number of electrode channels implanted in the cochlea, which is why music — rich in pitch and harmonic detail — is so much harder for CI users than speech. I first explored this idea as a freshman research project: I led a team studying how cochlear implant users have limited musical perception, and built a rough prototype of the CI listening experience as our deliverable. This version began during a week-long AI-assisted-development hackathon at my former employer, built with [Claude Code](https://claude.ai/code) — I've maintained and extended it on my own time since. See `CLAUDE.md` for the architecture notes I use when working on it with Claude Code, and `ci_music/planning/conversation.md` for the original design conversation.

## Background

Modern CI devices typically use 8–22 electrode channels covering roughly 70–8,500 Hz. This channel limitation is what makes music so difficult for CI users: pitch, harmonics, and timbre are largely lost, while rhythm and loudness contour survive. This tool makes that experience audible. See `sources/` for the audiology literature behind it.

## Install

```bash
git clone https://github.com/bekadavis9/koru.git
cd koru/ci_music
cargo build --release
```

## Usage

### CLI

```bash
cargo run -- process --input song.wav --output sim.wav --channels 8
cargo run -- process -i song.mp3 -o sim.wav -c 4 --strategy fs4 --carrier sine --verbose
```

| Flag | Default | Description |
|---|---|---|
| `-i, --input` | *(required)* | Input audio file (WAV, MP3, FLAC, OGG/Vorbis, AAC, M4A) |
| `-o, --output` | *(required)* | Output WAV file |
| `-c, --channels` | `8` | Number of frequency bands (4 = very degraded, 12 ≈ typical CI, 24 = closer to normal) |
| `--strategy` | `cis` | `cis` (standard CI envelope coding), `fs4` (MED-EL FineHearing — pitch-preserving apical channels), or `fft` (comparison baseline, not a realistic CI simulation) |
| `--carrier` | `noise` | `noise` (band-limited noise, classic buzzy CI sound) or `sine` (tonal) |
| `-v, --verbose` | off | Print processing details |

### Web UI

```bash
cargo run -- serve          # http://localhost:3000
cargo run -- serve -p 3001
```

Upload a WAV, MP3, FLAC, or OGG file, adjust channels and strategy, and compare original vs. simulated audio in the browser.

## Algorithm

**CIS (Continuous Interleaved Sampling)** — the canonical CI simulation algorithm (Shannon 1995, Loizou 1999): for each band, a 4th-order IIR bandpass filter isolates the channel, a full-wave rectifier + 400 Hz Butterworth lowpass extracts the amplitude envelope, and the envelope modulates a noise or sine carrier at the band's center frequency. All bands are summed.

**FS4** — models MED-EL's FineHearing sound coding. Apical channels (center frequency ≤ 950 Hz) use a sine carrier whose frequency tracks zero-crossings of the filtered signal, preserving pitch in the low-frequency region; basal channels use standard CIS. Clinical studies show 93% of FS4/FS4-p users prefer it over CIS for music listening.

**FFT** — Hann-windowed overlap-add (1024-sample frames, 512-sample hop), band amplitude estimated via RMS of FFT bins and resynthesized as a pure sine. Kept as a comparison baseline, not a realistic CI simulation.

```
audio in → downmix mono → 4th-order IIR bandpass (per band)
         → full-wave rectify → 400 Hz lowpass (envelope)
         → × carrier → sum bands → normalize → WAV out
```

**Frequency bands** are logarithmically spaced between 70 Hz and 8,500 Hz: `f[i] = f_low × (f_high / f_low) ^ (i / N)`, with center frequencies as the geometric mean of adjacent edges.

## Sources

**Algorithm and signal processing**
- Shannon, R.V., Zeng, F.G., Kamath, V., Wygonski, J., & Ekelid, M. (1995). "Speech recognition with primarily temporal cues." *Science*, 270(5234), 303–304.
- Loizou, P.C. (1999). "Introduction to cochlear implants." *IEEE Engineering in Medicine and Biology Magazine*, 18(1), 32–42.

**Music perception with cochlear implants**
- McDermott, H.J. (2004). "Music perception with cochlear implants: A review." *Trends In Amplification*, 8(2), 49–82.
- McDermott, H., Sucher, C., & Simpson, A. (2009). "Electro-acoustic stimulation." *Audiology & Neurotology*, 14(Suppl 1), 31–38.
- Kasdan, A.V., et al. (2024). "Cochlear implant users experience the sound-to-music effect." *Auditory Perception & Cognition*, 7(3), 179–202.

**FS4 sound coding strategy**
- Riss, D., et al. (2014). "FS4, FS4-p, and FSP: A 4-month crossover study of 3 fine structure sound-coding strategies." *Ear and Hearing*, 35(6), e272–e281.

Full PDFs and additional references are in `sources/`.

## Repository structure

```
ci_music/           Rust crate — CLI + native web server + WASM entry point
  src/
    lib.rs          Library root + WASM entry point
    main.rs         CLI (process/serve subcommands)
    server.rs       axum web server, native only
    index.html      Local server UI
    audio.rs        Symphonia-based decode, native only
    vocoder.rs       CIS/FS4/FFT strategies + WAV encode
    filter.rs       Biquad IIR filters
    bands.rs        Log-spaced band frequency math
  demo.html         Standalone slide deck used for the hackathon demo
  planning/         Original design conversation
web/                GitHub Pages UI (WASM build target)
sources/            Audiology literature referenced above
```

## Development

```bash
cd ci_music
cargo test
cargo clippy
```

## GitHub Pages deployment

`.github/workflows/pages.yml` builds the WASM target with `wasm-pack` and deploys on every push to `main`.

## Stretch goals

- **Live microphone input** via `cpal`, refactoring `vocoder::process()` into a streaming API with persistent filter state across chunks
- **WASM AudioWorklet** for real-time in-browser processing with no server round-trip
- Fold the hackathon slide deck's educational content (cochlea anatomy, sensorineural hearing loss, CI device mechanics) into the live web UI
