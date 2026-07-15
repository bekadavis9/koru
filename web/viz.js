// Pure helper functions shared between index.html and viz.test.js.
// No browser APIs — safe to import in Node.

export const F_LOW  = 70;
export const F_HIGH = 8500;

// AnalyserNode.fftSize used for the live playback visualization. 16384 gives
// ~2.7 Hz/bin at 44.1kHz — needed so adjacent low-end log bands (as narrow as
// ~7 Hz below 200 Hz) resolve to mostly-distinct bins instead of collapsing
// onto the same one or two bins and lighting up together as a single block.
export const ANALYSER_FFT_SIZE = 16384;

/** Log-spaced [lo, hi] Hz for band i of n. */
export function bandFreqs(i, n) {
  const lo = F_HIGH * Math.pow(F_LOW / F_HIGH, (n - i)     / n);
  const hi = F_HIGH * Math.pow(F_LOW / F_HIGH, (n - 1 - i) / n);
  return [lo, hi];
}

/** HSL colour string for band i of n. */
export function bandColor(i, n) {
  const hue = 20 + 200 * i / Math.max(n - 1, 1);
  return `hsl(${hue.toFixed(0)},75%,58%)`;
}

/** Human-readable frequency label. */
export function fmtHz(f) {
  if (f < 1000) return `${Math.round(f / 10) * 10} Hz`;
  if (f < 2000) return `${(Math.round(f / 100) / 10).toFixed(1)} kHz`;
  const r = Math.round(f / 500) * 500;
  return `${r % 1000 === 0 ? r / 1000 : (r / 1000).toFixed(1)} kHz`;
}

/**
 * Map a [lo, hi] Hz range to [loIdx, hiIdx] FFT bin indices.
 * @param {number} lo      - low frequency (Hz)
 * @param {number} hi      - high frequency (Hz)
 * @param {number} nyquist - sampleRate / 2
 * @param {number} binCount - analyser.frequencyBinCount
 */
export function bandBinRange(lo, hi, nyquist, binCount) {
  return [
    Math.max(0,             Math.floor(lo / nyquist * binCount)),
    Math.min(binCount - 1,  Math.ceil (hi / nyquist * binCount)),
  ];
}

/**
 * Average magnitude of freqData[loIdx..hiIdx] (inclusive).
 * @param {Uint8Array} freqData
 */
export function bandEnergy(freqData, loIdx, hiIdx) {
  let sum = 0;
  for (let k = loIdx; k <= hiIdx; k++) sum += freqData[k];
  return sum / Math.max(1, hiIdx - loIdx + 1);
}

/**
 * Energy level (out of 255) a band must exceed to be drawn as "lit", relative
 * to this frame's loudest bin rather than a fixed dB floor — a fixed floor
 * sits barely above the analyser's noise floor, so it reads as lit almost
 * continuously regardless of what's actually playing. The 24 floor still
 * suppresses near-silence (quiet peak shouldn't make everything look "lit").
 * @param {Uint8Array} freqData
 */
export function litThreshold(freqData) {
  let peak = 0;
  for (let k = 0; k < freqData.length; k++) if (freqData[k] > peak) peak = freqData[k];
  return Math.max(24, peak * 0.22);
}
