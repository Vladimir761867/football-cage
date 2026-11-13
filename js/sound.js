/* Простые синтезированные звуки (WebAudio), без внешних файлов. */
const Sound = (() => {
  let ctx = null;
  function ac() {
    if (!Save.data.settings.sound) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function env(o, g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    o.start(t0); o.stop(t0 + a + d + 0.05);
  }
  function tone(freq, type, a, d, peak, slideTo) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + a + d);
    o.connect(g); g.connect(c.destination);
    env(o, g, c.currentTime, a, d, peak);
  }
  function noise(dur, peak, lp) {
    const c = ac(); if (!c) return;
    const n = c.sampleRate * dur;
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 900;
    const g = c.createGain(); g.gain.value = peak;
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
  }
  function vibrate(ms) {
    if (Save.data.settings.vibro && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }
  return {
    kick()      { tone(140, 'sine', 0.005, 0.12, 0.5, 60); noise(0.06, 0.25, 1400); vibrate(18); },
    pass()      { tone(220, 'sine', 0.004, 0.07, 0.3, 120); vibrate(10); },
    contact()   { tone(780, 'sine', .008, .08, .16); vibrate(18); },
    post()      {
      const yard = Yards.theme(), retro = ['80','90'].includes(Yards.ballEra(yard)) || yard.custom?.frame === 'retro';
      const pitch = retro ? 510 : 680;
      tone(pitch, 'triangle', .002, .35, .4, pitch*.95);
      tone(pitch*2, 'sine', .002, .20, .15);
      vibrate([20, 30, 20]);
    },
    goal()      { tone(392, 'triangle', 0.01, 0.12, 0.3); setTimeout(() => tone(523, 'triangle', 0.01, 0.12, 0.3), 110); setTimeout(() => tone(659, 'triangle', 0.01, 0.25, 0.35), 220); vibrate([30, 40, 60]); },
    miss()      { tone(200, 'sawtooth', 0.01, 0.18, 0.12, 110); vibrate(25); },
    intercept() { tone(300, 'square', 0.005, 0.1, 0.12, 150); noise(0.08, 0.15, 800); vibrate(30); },
    whistle()   { tone(2200, 'sine', 0.01, 0.18, 0.18, 2100); setTimeout(() => tone(2200, 'sine', 0.01, 0.3, 0.18, 1900), 240); },
    coin()      { tone(988, 'sine', 0.002, 0.08, 0.2); setTimeout(() => tone(1319, 'sine', 0.002, 0.15, 0.2), 70); },
    ui()        { tone(520, 'sine', 0.003, 0.05, 0.12); },
    buy()       { tone(659, 'sine', 0.005, 0.1, 0.2); setTimeout(() => tone(880, 'sine', 0.005, 0.2, 0.25), 100); vibrate(20); }
  };
})();
