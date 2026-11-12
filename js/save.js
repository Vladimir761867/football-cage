/* Сохранение прогресса в localStorage. */
const Save = (() => {
  const KEY = 'football-cage-save-v1';
  const def = () => ({
    coins: 0,
    ownedYards: ['classic'],
    selectedYard: 'classic',
    ownedBalls: ['classic'],
    selectedBall: 'classic',
    ballsByEra: {},
    ownedOutfits: [],
    outfitsByEra: {},
    difficulty: 'normal',
    cup: null,
    cupsWon: { square: 0, am300: 0 },
    activities: {},
    badges: 0,
    customYard: null,
    editorPacks: [],
    playStats: { first: '', last: '', days: 0, matches: 0, lesson: 0 },
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
      data.playStats = Object.assign(def().playStats, parsed.playStats || {});
      data.ownedOutfits = Array.isArray(parsed.ownedOutfits) ? parsed.ownedOutfits.filter(x => typeof x === 'string') : [];
      data.outfitsByEra = parsed.outfitsByEra && typeof parsed.outfitsByEra === 'object' && !Array.isArray(parsed.outfitsByEra) ? parsed.outfitsByEra : {};
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
