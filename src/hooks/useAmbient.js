import { useEffect, useRef } from "react";

const TEMPO = 72;
const STEP_SECONDS = (60 / TEMPO) / 2;
const BAR_STEPS = 8;
const LOOK_AHEAD_SECONDS = 0.28;

const SCORES = {
  station: {
    root: 48,
    scale: [0, 3, 5, 7, 10, 12],
    chords: [[0, 2, 4], [0, 3, 5], [1, 3, 5], [0, 2, 3]],
    bass: [0, 3, 1, 0],
    motif: [4, null, 2, 3, null, 1, 2, null],
    leadType: "triangle",
    color: 1500
  },
  hazard: {
    root: 41,
    scale: [0, 2, 5, 6, 9, 12],
    chords: [[0, 2, 4], [0, 1, 3], [1, 3, 5], [0, 2, 3]],
    bass: [0, 1, 3, 2],
    motif: [0, 3, null, 2, 4, null, 1, 2],
    leadType: "sawtooth",
    color: 980
  },
  reactor: {
    root: 45,
    scale: [0, 3, 5, 7, 10, 12],
    chords: [[0, 2, 4], [1, 3, 5], [0, 3, 4], [1, 2, 5]],
    bass: [0, 2, 4, 1],
    motif: [4, 2, null, 3, 5, null, 2, 1],
    leadType: "triangle",
    color: 1820
  },
  midnight: {
    root: 38,
    scale: [0, 3, 7, 8, 12, 15],
    chords: [[0, 2, 4], [1, 3, 5], [0, 2, 5], [1, 2, 4]],
    bass: [0, 0, 3, 1],
    motif: [5, null, 3, null, 4, 2, null, 1],
    leadType: "sine",
    color: 1180
  }
};

const SCREEN_MIXES = {
  auth: { level: 0.28, pad: 1, bass: 0, lead: 0.25, pulse: 0 },
  menu: { level: 0.46, pad: 1, bass: 0.35, lead: 0.42, pulse: 0 },
  profile: { level: 0.4, pad: 1, bass: 0.2, lead: 0.28, pulse: 0 },
  shop: { level: 0.4, pad: 1, bass: 0.2, lead: 0.28, pulse: 0 },
  settings: { level: 0.32, pad: 1, bass: 0, lead: 0.18, pulse: 0 },
  controls: { level: 0.32, pad: 1, bass: 0, lead: 0.18, pulse: 0 },
  briefing: { level: 0.52, pad: 1, bass: 0.48, lead: 0.5, pulse: 0.1 },
  stationMap: { level: 0.58, pad: 1, bass: 0.55, lead: 0.45, pulse: 0.18 },
  playing: { level: 0.72, pad: 0.9, bass: 0.9, lead: 0.72, pulse: 0.55 },
  paused: { level: 0.24, pad: 1, bass: 0, lead: 0, pulse: 0 },
  summary: { level: 0.5, pad: 1, bass: 0.32, lead: 0.36, pulse: 0 },
  workshop: { level: 0.42, pad: 1, bass: 0.24, lead: 0.24, pulse: 0 }
};

const midiToFrequency = (note) => 440 * (2 ** ((note - 69) / 12));
const getMix = (screen) => SCREEN_MIXES[screen] || SCREEN_MIXES.menu;

function holdAt(param, ctx, minimum = 0.0001) {
  const now = ctx.currentTime;
  if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
  else {
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(minimum, param.value), now);
  }
  return now;
}

function playVoice(ctx, output, {
  frequency,
  start,
  duration,
  volume,
  type = "sine",
  filterFrequency = 1400,
  attack = 0.05,
  release = 0.45,
  detune = 0,
  pan = 0
}) {
  if (volume <= 0) return;
  const oscillator = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const panner = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFrequency, start);
  filter.Q.setValueAtTime(0.8, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + attack);
  gain.gain.setValueAtTime(Math.max(0.0001, volume), Math.max(start + attack, start + duration - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(filter).connect(gain);
  if (panner) {
    panner.pan.setValueAtTime(pan, start);
    gain.connect(panner).connect(output);
  } else {
    gain.connect(output);
  }
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function scheduleStep(engine) {
  const { ctx, bus } = engine;
  if (engine.step % BAR_STEPS === 0 && engine.pendingTheme) {
    engine.theme = engine.pendingTheme;
    engine.pendingTheme = null;
  }

  const score = SCORES[engine.theme] || SCORES.station;
  const mix = engine.mix;
  const phrase = Math.floor(engine.step / BAR_STEPS);
  const beatInBar = engine.step % BAR_STEPS;
  const chord = score.chords[phrase % score.chords.length];
  const start = engine.nextStepAt;

  if (beatInBar === 0) {
    chord.forEach((degree, index) => {
      playVoice(ctx, bus, {
        frequency: midiToFrequency(score.root + score.scale[degree] + (index ? 12 : 0)),
        start,
        duration: STEP_SECONDS * 7.8,
        volume: 0.028 * mix.pad,
        type: "sine",
        filterFrequency: score.color,
        attack: STEP_SECONDS * 1.5,
        release: STEP_SECONDS * 2.3,
        detune: index === 1 ? -4 : index === 2 ? 4 : 0,
        pan: index === 1 ? -0.28 : index === 2 ? 0.28 : 0
      });
    });
  }

  if ((beatInBar === 0 || beatInBar === 4) && mix.bass > 0) {
    const degree = score.bass[phrase % score.bass.length];
    playVoice(ctx, bus, {
      frequency: midiToFrequency(score.root - 12 + score.scale[degree]),
      start,
      duration: STEP_SECONDS * 3.5,
      volume: 0.052 * mix.bass,
      type: "sine",
      filterFrequency: 430,
      attack: 0.045,
      release: STEP_SECONDS * 1.2
    });
  }

  const motifDegree = score.motif[engine.step % score.motif.length];
  if (motifDegree !== null && mix.lead > 0) {
    playVoice(ctx, bus, {
      frequency: midiToFrequency(score.root + 12 + score.scale[motifDegree]),
      start,
      duration: STEP_SECONDS * 1.45,
      volume: 0.026 * mix.lead,
      type: score.leadType,
      filterFrequency: score.color * 1.25,
      attack: 0.035,
      release: STEP_SECONDS * 0.8,
      pan: beatInBar < 4 ? -0.18 : 0.18
    });
  }

  if (beatInBar % 2 === 0 && mix.pulse > 0) {
    playVoice(ctx, bus, {
      frequency: midiToFrequency(score.root + 24),
      start,
      duration: STEP_SECONDS * 0.22,
      volume: 0.014 * mix.pulse,
      type: "square",
      filterFrequency: 620,
      attack: 0.008,
      release: STEP_SECONDS * 0.18
    });
  }

  engine.step += 1;
  engine.nextStepAt += STEP_SECONDS;
}

function createEngine(theme, screen, volume) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  const ctx = new AudioContextClass();
  const master = ctx.createGain();
  const bus = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  const mix = getMix(screen);

  master.gain.value = 0.0001;
  bus.gain.value = 0.9;
  compressor.threshold.value = -24;
  compressor.knee.value = 18;
  compressor.ratio.value = 3.5;
  bus.connect(compressor).connect(master).connect(ctx.destination);

  const engine = {
    ctx,
    master,
    bus,
    theme,
    pendingTheme: null,
    mix,
    step: 0,
    nextStepAt: ctx.currentTime + 0.08,
    timer: 0
  };

  const scheduler = () => {
    while (engine.nextStepAt < ctx.currentTime + LOOK_AHEAD_SECONDS) scheduleStep(engine);
  };
  scheduler();
  engine.timer = window.setInterval(scheduler, 80);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * mix.level), ctx.currentTime + 1.1);
  ctx.resume().catch(() => {});
  return engine;
}

function stopEngine(engine, fadeSeconds = 1.2) {
  if (!engine) return;
  window.clearInterval(engine.timer);
  const now = holdAt(engine.master.gain, engine.ctx);
  engine.master.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
  window.setTimeout(() => engine.ctx.close().catch(() => {}), (fadeSeconds + 0.15) * 1000);
}

function useAmbient(settings, theme = "station", screen = "menu") {
  const engineRef = useRef(null);

  useEffect(() => {
    if (!settings.music) {
      stopEngine(engineRef.current);
      engineRef.current = null;
      return;
    }

    if (!engineRef.current) {
      engineRef.current = createEngine(theme, screen, settings.volume);
      return;
    }

    const engine = engineRef.current;
    const nextMix = getMix(screen);
    engine.mix = nextMix;
    if (engine.theme !== theme) engine.pendingTheme = theme;

    const now = holdAt(engine.master.gain, engine.ctx);
    engine.master.gain.exponentialRampToValueAtTime(Math.max(0.0001, settings.volume * nextMix.level), now + 0.75);
    engine.ctx.resume().catch(() => {});
  }, [settings.music, settings.volume, theme, screen]);

  useEffect(() => () => {
    stopEngine(engineRef.current, 0.08);
    engineRef.current = null;
  }, []);
}

export { useAmbient };
