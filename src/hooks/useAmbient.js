import { useEffect, useRef } from "react";

const MUSIC_THEMES = {
  station: {
    bpm: 68,
    root: 48,
    scale: [0, 3, 7, 10, 14],
    bass: [0, 0, 7, 3],
    melody: [2, null, 3, 1, null, 4, 2, null],
    pad: [[0, 2, 4], [1, 3, 4], [0, 2, 3], [1, 2, 4]],
    tone: "triangle",
    filter: 1350,
    pulse: 0.018
  },
  hazard: {
    bpm: 82,
    root: 41,
    scale: [0, 2, 5, 6, 10],
    bass: [0, 3, 0, 2],
    melody: [0, null, 3, 2, 4, null, 1, 2],
    pad: [[0, 2, 4], [0, 1, 3], [1, 2, 4], [0, 2, 3]],
    tone: "sawtooth",
    filter: 920,
    pulse: 0.024
  },
  reactor: {
    bpm: 74,
    root: 45,
    scale: [0, 3, 5, 7, 10, 12],
    bass: [0, 2, 4, 1],
    melody: [4, 2, null, 3, 5, null, 2, 1],
    pad: [[0, 2, 4], [1, 3, 5], [0, 3, 4], [1, 2, 5]],
    tone: "triangle",
    filter: 1680,
    pulse: 0.02
  },
  midnight: {
    bpm: 60,
    root: 38,
    scale: [0, 3, 7, 8, 12, 15],
    bass: [0, 0, 3, 1],
    melody: [5, null, 3, null, 4, 2, null, 1],
    pad: [[0, 2, 4], [1, 3, 5], [0, 2, 5], [1, 2, 4]],
    tone: "sine",
    filter: 1120,
    pulse: 0.014
  }
};

const midiToFrequency = (note) => 440 * (2 ** ((note - 69) / 12));

function playVoice(ctx, output, {
  frequency,
  start,
  duration,
  volume,
  type = "sine",
  filterFrequency = 1400,
  attack = 0.08,
  release = 0.5,
  detune = 0
}) {
  const oscillator = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFrequency, start);
  filter.Q.setValueAtTime(0.7, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + attack);
  gain.gain.setValueAtTime(Math.max(0.0001, volume), Math.max(start + attack, start + duration - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(filter).connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function createTrack(ctx, master, themeName) {
  const theme = MUSIC_THEMES[themeName] || MUSIC_THEMES.station;
  const bus = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  compressor.threshold.value = -24;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  bus.connect(compressor).connect(master);

  const beat = 60 / theme.bpm;
  let step = 0;
  let nextNoteAt = ctx.currentTime + 0.08;
  let stopped = false;

  const schedule = () => {
    while (!stopped && nextNoteAt < ctx.currentTime + 0.35) {
      const phraseStep = step % 16;
      const bar = Math.floor(step / 8) % theme.pad.length;

      if (phraseStep % 8 === 0) {
        theme.pad[bar].forEach((degree, index) => {
          playVoice(ctx, bus, {
            frequency: midiToFrequency(theme.root + theme.scale[degree] + (index ? 12 : 0)),
            start: nextNoteAt,
            duration: beat * 7.5,
            volume: 0.026,
            type: "sine",
            filterFrequency: theme.filter,
            attack: beat * 1.4,
            release: beat * 2.2,
            detune: index === 2 ? 4 : -3
          });
        });
      }

      if (phraseStep % 4 === 0) {
        const bassDegree = theme.bass[Math.floor(phraseStep / 4)];
        playVoice(ctx, bus, {
          frequency: midiToFrequency(theme.root - 12 + theme.scale[bassDegree]),
          start: nextNoteAt,
          duration: beat * 3.4,
          volume: 0.055,
          type: "sine",
          filterFrequency: 420,
          attack: 0.06,
          release: beat * 1.2
        });
      }

      const melodyDegree = theme.melody[phraseStep % theme.melody.length];
      if (melodyDegree !== null && phraseStep % 2 === 0) {
        playVoice(ctx, bus, {
          frequency: midiToFrequency(theme.root + 12 + theme.scale[melodyDegree]),
          start: nextNoteAt,
          duration: beat * 1.7,
          volume: 0.028,
          type: theme.tone,
          filterFrequency: theme.filter * 1.25,
          attack: 0.04,
          release: beat * 0.9
        });
      }

      if (phraseStep % 2 === 0) {
        playVoice(ctx, bus, {
          frequency: midiToFrequency(theme.root + 24),
          start: nextNoteAt,
          duration: beat * 0.22,
          volume: theme.pulse,
          type: "square",
          filterFrequency: 640,
          attack: 0.01,
          release: beat * 0.18
        });
      }

      step += 1;
      nextNoteAt += beat / 2;
    }
  };

  schedule();
  const timer = window.setInterval(schedule, 100);
  return {
    bus,
    stop(fadeSeconds = 2.8) {
      stopped = true;
      window.clearInterval(timer);
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
      bus.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
      window.setTimeout(() => {
        try {
          bus.disconnect();
        } catch {
          // The audio graph may already be closed during page teardown.
        }
      }, (fadeSeconds + 0.2) * 1000);
    }
  };
}

function useAmbient(settings, theme = "station") {
  const engine = useRef(null);

  useEffect(() => {
    if (!settings.music) {
      const current = engine.current;
      if (current) {
        const now = current.ctx.currentTime;
        current.master.gain.cancelScheduledValues(now);
        current.master.gain.setValueAtTime(Math.max(0.0001, current.master.gain.value), now);
        current.master.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        current.track?.stop(1.2);
        window.setTimeout(() => current.ctx.close().catch(() => {}), 1400);
        engine.current = null;
      }
      return undefined;
    }

    if (!engine.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return undefined;
      const ctx = new AudioContextClass();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      engine.current = { ctx, master, track: null, theme: null };
      ctx.resume().catch(() => {});
    }

    const current = engine.current;
    const now = current.ctx.currentTime;
    const targetVolume = Math.max(0.0001, settings.volume * 0.72);
    current.master.gain.cancelScheduledValues(now);
    current.master.gain.setValueAtTime(Math.max(0.0001, current.master.gain.value), now);
    current.master.gain.exponentialRampToValueAtTime(targetVolume, now + 0.45);

    if (current.theme !== theme) {
      const previousTrack = current.track;
      const nextTrack = createTrack(current.ctx, current.master, theme);
      nextTrack.bus.gain.exponentialRampToValueAtTime(1, now + 3.4);
      previousTrack?.stop(3.4);
      current.track = nextTrack;
      current.theme = theme;
    }

    return undefined;
  }, [settings.music, settings.volume, theme]);

  useEffect(() => () => {
    const current = engine.current;
    if (!current) return;
    current.track?.stop(0.08);
    current.ctx.close().catch(() => {});
    engine.current = null;
  }, []);
}

export { useAmbient };
