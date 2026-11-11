/* Сохранение прогресса в localStorage. */
const Save = (() => {
  const KEY = 'football-cage-save-v1';
  const def = () => ({
    coins: 0,
    ownedYards: ['classic'],
    selectedYard: 'classic',
    ownedBalls: ['classic'],
    selectedBall: 'classic',
    best: { dog: 0, square: 0, am300: 0, cross: 0 },
    tutorialSeen: { dog: false, square: false, am300: false, cross: false },
    settings: { sound: true, vibro: true }
  });
  let data = def();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = Object.assign(def(), parsed);
      data.best = Object.assign(def().best, parsed.best || {});
      data.settings = Object.assign(def().settings, parsed.settings || {});
      data.tutorialSeen = Object.assign(def().tutorialSeen, parsed.tutorialSeen || {});
    }
  } catch (e) { /* повреждённое сохранение — начинаем заново */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function addCoins(n) { data.coins += n; save(); }
  function spendCoins(n) {
    if (data.coins < n) return false;
    data.coins -= n; save(); return true;
  }
  function setBest(mode, v) {
    if (v > (data.best[mode] || 0)) { data.best[mode] = v; save(); return true; }
    return false;
  }
  return { get data() { return data; }, save, addCoins, spendCoins, setBest };
})();
