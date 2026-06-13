import { useEffect, useRef } from "react";

function useAmbient(settings) {
  const audio = useRef(null);
  useEffect(() => {
    if (!settings.music) {
      audio.current?.ctx?.close();
      audio.current = null;
      return;
    }
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = settings.volume * 0.08;
    gain.connect(ctx.destination);
    const notes = [146.83, 196, 246.94, 293.66];
    const oscillators = notes.map((n, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 ? "triangle" : "sine";
      osc.frequency.value = n;
      g.gain.value = 0.18 / notes.length;
      osc.connect(g).connect(gain);
      osc.start();
      return { osc, g };
    });
    const timer = setInterval(() => {
      oscillators.forEach(({ osc, g }, i) => {
        const now = ctx.currentTime;
        osc.frequency.linearRampToValueAtTime(notes[(i + Math.floor(now / 8)) % notes.length] * (i > 1 ? 0.5 : 1), now + 3);
        g.gain.linearRampToValueAtTime((0.11 + Math.random() * 0.08) / notes.length, now + 2.5);
      });
    }, 3800);
    audio.current = { ctx, timer };
    return () => {
      clearInterval(timer);
      ctx.close();
    };
  }, [settings.music, settings.volume]);
}

export { useAmbient };
