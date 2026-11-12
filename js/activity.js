/* Задания, воспроизводимые условия и личные результаты. */
const Activities = (() => {
  const catalog = {
    targets: { mode: 'am300', title: 'Три цели', description: 'За пять ударов попади в штангу, перекладину и девятку.', events: ['post','bar','corner'], goal: 3, distinct: true, shots: 5 },
    bar: { mode: 'am300', title: 'Звон перекладины', description: 'Дважды попади в перекладину за пять ударов.', events: ['bar'], goal: 2, shots: 5 },
    dog: { mode: 'dog', title: 'Пасы под давлением', description: 'Собери серию из 12 передач без потери за 55 секунд.', events: ['pass'], goal: 12, time: 55, streak: true },
    square: { mode: 'square', title: 'Хозяин четверти', description: 'Сделай пять точных отбиваний за 55 секунд.', events: ['return'], goal: 5, time: 55 },
    cross: { mode: 'cross', title: 'С лёта', description: 'Забей дважды за шесть розыгрышей.', events: ['goal'], goal: 2, rounds: 6 }
  };
  const cycle = ['bar','dog','square','cross','targets','square','cross'];
  const courts = ['ru80_1','ru90_1','ru00_1','ru10_1','ru20_1'];
  function day() { return new Date().toISOString().slice(0, 10); }
  function definition(id, date = day()) {
    if (!Object.hasOwn(catalog, id) || !/^20\d\d-\d\d-\d\d$/.test(date)) return null;
    const timestamp = Date.parse(date + 'T00:00:00Z');
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
    const n = Math.floor(timestamp / 86400000);
    return { ...catalog[id], id, key: date + '.' + id, date, yard: id === 'bar' ? 'ru90_1' : courts[n % courts.length], difficulty: 'easy' };
  }
  function daily(date = day()) {
    const n = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000);
    return definition(cycle[n % cycle.length], date);
  }
  function random(key) {
    let n = 2166136261;
    for (const c of key) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return () => {
      n = (n + 0x6d2b79f5) | 0;
      let t = Math.imul(n ^ (n >>> 15), n | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fromLink(params) {
    const [date, id, extra] = (params.get('challenge') || '').split('.');
    const challenge = extra === undefined ? definition(id, date) : null;
    if (!challenge) return null;
    const score = params.get('score');
    const yard = (params.get('yard') || '').split('.');
    if (yard.length >= 6 && yard.length <= 8 && YardEditor.bases.includes(yard[0])) {
      challenge.yard = yard[0];
      challenge.custom = YardEditor.clean({
        base: yard[0], surface: yard[1], frame: yard[2], light: yard[3], kit: yard[4],
        prop: yard[5], props: yard[6]?.split(','), season: yard[7]
      });
    }
    if (score !== null && /^\d{1,3}$/.test(score)) challenge.friend = +score;
    return challenge;
  }
  function link(c, score) {
    const url = new URL(location.href);
    url.search = ''; url.hash = '';
    url.searchParams.set('challenge', c.key);
    if (Number.isInteger(score)) url.searchParams.set('score', score);
    if (c.custom) {
      const yard = YardEditor.clean(c.custom);
      const parts = [yard.base, yard.surface, yard.frame, yard.light, yard.kit, yard.prop, yard.props.join(',')];
      if (yard.season === 'winter') parts.push(yard.season);
      url.searchParams.set('yard', parts.join('.'));
    }
    return url.href;
  }
  function tracker(c) {
    const hits = new Set();
    let count = 0, best = 0;
    return {
      push(event) {
        if (c.streak && event === 'loss') count = 0;
        if (!c.events.includes(event) || (c.distinct && hits.has(event))) return;
        hits.add(event);
        count++;
        best = Math.max(best, count);
      },
      get score() { return best; },
      get hits() { return [...hits]; }
    };
  }
  function resultKey(c) {
    if (!c.custom) return c.key;
    const yard = YardEditor.clean(c.custom);
    const legacy = [yard.base, yard.surface, yard.frame, yard.light, yard.kit, yard.prop].join('.');
    const decorations = yard.props.length > 1 || (yard.props.length && yard.prop === 'none') ? '.' + yard.props.join(',') : '';
    return c.key + ':' + legacy + decorations + (yard.season === 'winter' ? '.winter' : '');
  }
  function personal(c) { return Save.data.activities[resultKey(c)]; }
  function record(c, score) {
    const key = resultKey(c);
    const past = Save.data.activities[key] || { best: 0, reward: false };
    const reward = score >= c.goal && !past.reward && !c.custom && daily().key === c.key;
    const row = { best: Math.max(past.best, score), reward: past.reward || reward };
    Save.data.activities[key] = row;
    if (reward) {
      Save.data.coins += 30;
      Save.data.badges += 1;
    }
    Save.save();
    return { best: row.best, bonus: reward ? 30 : 0 };
  }
  return { day, daily, definition, fromLink, link, random, tracker, record, personal };
})();

const YardEditor = {
  get bases() {
    return Object.values(YARDS).filter(yard => yard.atlas || yard.photo).map(yard => yard.id);
  },
  fields: {
    surface: { original: 'Родное покрытие', wet: 'Мокрый асфальт', turf: 'Газон', clay: 'Красный грунт' },
    frame: { original: 'Родные ворота', metal: 'Белый металл', retro: 'Красно-белые', blue: 'Синие стойки' },
    light: { original: 'Родной свет', warm: 'Тёплый фонарь', dusk: 'Синие сумерки' },
    kit: { blue: 'Синяя форма', green: 'Зелёная форма', red: 'Красная куртка' },
    prop: { none: 'Без деталей', bench: 'Лавка', lamp: 'Фонарь', flags: 'Флажки' }
  },
  decorations: {
    bench: 'Лавочка',
    grandma: 'Бабушка с семечками',
    boys: 'Районные ребята',
    neighbor: 'Соседка в окне',
    coach: 'Дворовый тренер',
    lamp: 'Фонарь',
    flags: 'Флажки'
  },
  packs: {
    evening: { title: 'Вечер после дождя', price: 199, items: { surface: 'wet', frame: 'retro', light: 'warm', prop: 'lamp' } },
    floodlights: { title: 'Под прожекторами', price: 199, items: { surface: 'turf', frame: 'blue', light: 'dusk', prop: 'flags' } }
  },
  clean(data = {}) {
    const result = { base: this.bases.includes(data.base) ? data.base : 'ru90_1' };
    for (const [key, options] of Object.entries(this.fields)) {
      result[key] = Object.hasOwn(options, data[key]) ? data[key] : Object.keys(options)[0];
    }
    const requested = Array.isArray(data.props) ? data.props : [result.prop];
    result.props = Object.keys(this.decorations).filter(id => requested.includes(id));
    result.prop = result.props.find(id => Object.hasOwn(this.fields.prop, id)) || 'none';
    result.season = YARDS[result.base].country === 'Россия' && data.season === 'winter' ? 'winter' : 'summer';
    return result;
  },
  available(field, value) {
    if (Save.openCatalog) return true;
    const pack = Object.entries(this.packs).find(([, p]) => p.items[field] === value);
    return !pack || Save.data.editorPacks.includes(pack[0]);
  }
};
