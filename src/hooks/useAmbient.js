import { useEffect, useRef } from "react";

const AMBIENT_THEMES = {
  station: {
    type: "sine",
    notes: [146.83, 196, 246.94, 293.66],
    drift: 8,
    gain: 0.08,
    wobble: 0.08
  },
  hazard: {
    type: "sawtooth",
    notes: [110, 164.81, 220, 277.18],
    drift: 6,
    gain: 0.065,
    wobble: 0.06
  },
  reactor: {
    type: "triangle",
    notes: [130.81, 174.61, 196, 261.63, 329.63],
    drift: 9,
    gain: 0.075,
    wobble: 0.1
  },
  midnight: {
    type: "sine",
    notes: [98, 146.83, 185, 233.08, 293.66],
    drift: 11,
    gain: 0.07,
    wobble: 0.12
  }
};

function useAmbient(settings, theme = "station") {
  const audio = useRef(null);
  useEffect(() => {
    if (!settings.music) {
      audio.current?.ctx?.close();
      audio.current = null;
      return;
    }
    const ambient = AMBIENT_THEMES[theme] || AMBIENT_THEMES.station;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = settings.volume * ambient.gain;
    gain.connect(ctx.destination);
    const oscillators = ambient.notes.map((n, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 ? "triangle" : ambient.type;
      osc.frequency.value = n;
      g.gain.value = 0.18 / ambient.notes.length;
      osc.connect(g).connect(gain);
      osc.start();
      return { osc, g };
    });
    const timer = setInterval(() => {
      oscillators.forEach(({ osc, g }, i) => {
        const now = ctx.currentTime;
        const note = ambient.notes[(i + Math.floor(now / ambient.drift)) % ambient.notes.length];
        const octave = i > 1 ? 0.5 : 1;
        osc.frequency.linearRampToValueAtTime(note * octave, now + 3);
        g.gain.linearRampToValueAtTime((0.11 + Math.random() * ambient.wobble) / ambient.notes.length, now + 2.5);
      });
    }, 3800);
    audio.current = { ctx, timer };
    return () => {
      clearInterval(timer);
      ctx.close();
    };
  }, [settings.music, settings.volume, theme]);
}

export { useAmbient };
