/* Предметы, награды за матчи и оформление гола. */
const Collections = (() => {
  const shoes = {
    '80': { name: 'Бордовые кеды', detail: 'Парусина, резиновый мыс и кремовая подошва.', price: 90 },
    '90': { name: 'Бирюзовые кроссовки', detail: 'Белые кроссовки с бирюзовыми вставками и светлой подошвой.', price: 110 },
    '00': { name: 'Чёрно-золотые сороконожки', detail: 'Низкая подошва для коробки, золотые вставки.', price: 130 },
    '10': { name: 'Лазурные бутсы', detail: 'Лёгкий верх, белые шнурки и светлая подошва.', price: 150 },
    '20': { name: 'Лаймовые бутсы', detail: 'Вязаный верх и тёмно-синяя подошва.', price: 170 }
  };
  const badges = {
    goal: { name: 'Первый гол', icon: '⚽', detail: 'Забей в створ в «Американке» или «Навесе».' },
    pass: { name: 'Свой в круге', icon: '↗', detail: 'Отдай пять своих точных пасов без собственной потери в «Собачке».' },
    square: { name: 'Хозяин четверти', icon: '▦', detail: 'Сделай пять точных отбиваний за один «Квадрат».' },
    frame: { name: 'Мастер рамы', icon: '◎', detail: 'За одну «Американку» попади в штангу, перекладину и девятку.' },
    keeper: { name: 'На замке', icon: '🧤', detail: 'Сделай два сейва за один «Навес».' },
    cup: { name: 'Кубок двора', icon: '🏆', detail: 'Выиграй все этапы одного кубка.' }
  };
  const effects = {
    net: { name: 'Волна по сетке', detail: 'Мягкая волна у точки попадания.', price: 0 },
    chalk: { name: 'Меловой круг', detail: 'Светлое кольцо и брызги мела.', price: 110 },
    lights: { name: 'Искры фонарей', detail: 'Золотые огоньки в створе ворот.', badge: 'keeper' }
  };

  function ownsEffect(id) {
    const item = Object.hasOwn(effects, id) && effects[id];
    if (!item) return false;
    if (Save.openCatalog) return true;
    if (item.badge) return Save.data.collection.badges.includes(item.badge);
    return item.price === 0 || Save.data.collection.effects.includes(id);
  }
  function effect() {
    const id = Save.data.collection.effect;
    return ownsEffect(id) ? id : 'net';
  }
  function equipEffect(id) {
    if (!Object.hasOwn(effects, id)) return false;
    if (!ownsEffect(id)) {
      const { price, badge } = effects[id];
      if (badge || Save.data.coins < price) return false;
      Save.data.coins -= price;
      Save.data.collection.effects.push(id);
    }
    Save.data.collection.effect = id;
    Save.save();
    return true;
  }
  function ownsShoes(era) {
    return Object.hasOwn(shoes, era) && (Save.openCatalog || Save.data.collection.shoes.includes(era));
  }
  function hasShoesEquipped(era) {
    return ownsShoes(era) && Save.data.collection.equippedShoes[era] === true;
  }
  function equipShoes(era, special) {
    if (!Object.hasOwn(shoes, era)) return false;
    if (special && !ownsShoes(era)) {
      const { price } = shoes[era];
      if (Save.data.coins < price) return false;
      Save.data.coins -= price;
      Save.data.collection.shoes.push(era);
    }
    Save.data.collection.equippedShoes[era] = special;
    Save.save();
    return true;
  }

  function match() {
    let passes = 0, bestPasses = 0, returns = 0, saves = 0, goal = false;
    const frame = new Set();
    return {
      note(event) {
        if (event === 'pass') bestPasses = Math.max(bestPasses, ++passes);
        if (event === 'loss') passes = 0;
        if (event === 'return') returns++;
        if (event === 'save') saves++;
        if (event === 'goal') goal = true;
        if (['bar','post','corner'].includes(event)) frame.add(event);
      },
      finish(yard, cupWon, date) {
        const earned = [
          goal && 'goal', bestPasses >= 5 && 'pass', returns >= 5 && 'square',
          frame.size === 3 && 'frame', saves >= 2 && 'keeper', cupWon && 'cup'
        ].filter(Boolean);
        if (!earned.length) return { badges: [], photo: false };
        const collection = Save.data.collection;
        const added = earned.filter(id => !collection.badges.includes(id));
        collection.badges.push(...added);
        const base = yard.custom?.base || yard.id;
        const season = yard.season === 'winter' ? 'winter' : 'summer';
        const key = base + ':' + season;
        const photo = !Object.hasOwn(collection.photos, key);
        if (photo) {
          collection.photos[key] = {
            base, season, date, reason: earned[0],
            custom: yard.custom ? YardEditor.clean(yard.custom) : null
          };
        }
        Save.save();
        return { badges: added, photo };
      }
    };
  }

  function drawEffect(ctx, id, x, y, elapsed, reduced = false) {
    const t = elapsed / .85;
    if (t < 0 || t >= 1) return;
    ctx.save();
    ctx.translate(x,y);
    ctx.globalAlpha = (1 - t) * .86;
    ctx.strokeStyle = id === 'lights' ? '#ffd27e' : '#fff1cc';
    ctx.lineWidth = 3 - t * 2;
    ctx.beginPath();
    ctx.ellipse(0,0,reduced ? 21 : 9 + t * 52,reduced ? 13 : 7 + t * 34,0,0,Math.PI*2);
    ctx.stroke();
    if (!reduced && id !== 'net') {
      ctx.fillStyle = id === 'lights' ? '#ffbe59' : '#fff6e4';
      ctx.beginPath();
      for (let i=0; i<16; i++) {
        const a = i * 2.4;
        const distance = 12 + t * (32 + (i % 5) * 13);
        const px = Math.cos(a) * distance;
        const py = Math.sin(a) * distance * .62 + t*t*11;
        const radius = (id === 'lights' ? 2.7 : 1.9) * (1 - t*.66);
        ctx.moveTo(px + radius,py);
        ctx.arc(px,py,radius,0,Math.PI*2);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  return { shoes, badges, effects, ownsEffect, effect, equipEffect, ownsShoes, hasShoesEquipped, equipShoes, match, drawEffect };
})();
