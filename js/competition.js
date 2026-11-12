/* Общая лестница сложности и сохраняемый маршрут кубка против ботов. */
const Difficulty = {
  ids: ['beginner', 'easy', 'normal', 'hard', 'expert'],
  names: ['Знакомство', 'Разминка', 'Двор', 'Мастер', 'Легенда'],
  index(id) { const n = this.ids.indexOf(id); return n < 0 ? 2 : n; },
  name(id) { const i = this.index(id); return `${i + 1} · ${this.names[i]}`; },
  dog(id) {
    const i = this.index(id);
    return { dogs: i < 3 ? 1 : 2, passers: i < 3 ? 4 : 5,
      speed: [72, 94, 120, 148, 176][i], reach: [13, 15, 17, 19, 21][i],
      hold: [3.8, 3.1, 2.5, 2.05, 1.65][i], botHold: [.82,.72,.62,.53,.45][i],
      angle: [.78,.68,.58,.52,.46][i] };
  },
  square(id) {
    const i = this.index(id);
    return { receive: [1.65,1.35,1.1,.9,.74][i], botDelay: [.72,.60,.49,.39,.30][i],
      botAcc: [.62,.73,.82,.90,.95][i], angle: [.80,.70,.60,.50,.42][i],
      deep: [0,.10,.25,.43,.60][i], pressure: [0,.08,.18,.29,.42][i] };
  },
  american(id) {
    const i = this.index(id);
    return { spread: [.03,.10,.19,.28,.37][i], window: [.50,.38,.28,.21,.15][i],
      rate: [3.1,3.6,4.15,4.65,5.2][i], miss: [.43,.34,.25,.18,.12][i],
      highValue: [.16,.22,.30,.38,.46][i] };
  },
  cross(id) {
    const i = this.index(id);
    return { flight: [2.55,2.15,1.84,1.58,1.37][i],
      contact: [[.40,.90],[.45,.86],[.50,.83],[.55,.80],[.59,.78]][i],
      pace: [.67,.60,.53,.46,.40][i], keeper: [.18,.28,.39,.51,.63][i] };
  },
  keeper(id) {
    const i = this.index(id);
    return { reaction: [.26,.22,.18,.14,.10][i], speed: [.39,.55,.73,.92,1.08][i],
      reach: [.13,.15,.17,.19,.21][i], read: [.32,.46,.61,.76,.89][i] };
  },
  details(mode, id) {
    const seconds = v => v.toFixed(1).replace('.', ',') + ' с';
    if (mode === 'dog') {
      const c = this.dog(id);
      return `${c.passers}×${c.dogs} · ${seconds(c.hold)} на пас`;
    }
    if (mode === 'square') return `${seconds(this.square(id).receive)} до первого отскока`;
    if (mode === 'am300') return `Золотая зона ${Math.round(this.american(id).window * 100)}% шкалы`;
    if (mode === 'cross') {
      const c = this.cross(id);
      return `Подача ${seconds(c.flight)} · окно удара ${seconds(c.flight * (c.contact[1] - c.contact[0]))}`;
    }
    return `Вратарь реагирует за ${Math.round(this.keeper(id).reaction * 1000)} мс`;
  }
};

const Cups = {
  stages: ['Отбор', 'Полуфинал', 'Финал'],
  current() { return Save.data.cup || null; },
  start(mode, difficulty) {
    if (!['square','am300'].includes(mode)) throw new Error('Unsupported cup mode');
    Save.data.cup = { mode, difficulty, stage: 0, status: 'ready', history: [] };
    Save.save(); return this.current();
  },
  difficulty(c = this.current()) {
    return Difficulty.ids[Math.min(4, Difficulty.index(c.difficulty) + c.stage)];
  },
  begin() {
    const c = this.current();
    if (!c || !['ready','playing'].includes(c.status)) return null;
    c.status = 'playing'; Save.save(); return c;
  },
  settle(result) {
    const c = this.current();
    if (!c || c.status !== 'playing') return null;
    let outcome;
    if (c.mode === 'square') {
      const errors = result.penalties;
      const cut = c.stage === 2 ? 1 : 2;
      const better = errors.slice(1).filter(n => n < errors[0]).length;
      const equal = errors.slice(1).filter(n => n === errors[0]).length;
      outcome = errors[0] >= 10 || better >= cut ? 'loss' : better + equal >= cut ? 'draw' : 'win';
    } else outcome = result.draw ? 'draw' : result.won ? 'win' : 'loss';
    const stage = c.stage;
    c.history.push({ stage, outcome, score: result.score });
    let bonus = 0;
    if (outcome === 'draw') c.status = 'ready';
    else if (outcome === 'loss') c.status = 'lost';
    else if (stage < 2) { c.stage++; c.status = 'ready'; }
    else {
      c.status = 'won'; bonus = 120;
      Save.data.cupsWon[c.mode] = (Save.data.cupsWon[c.mode] || 0) + 1;
      Save.addCoins(bonus);
    }
    Save.save(); return { outcome, stage, status: c.status, bonus };
  }
};
