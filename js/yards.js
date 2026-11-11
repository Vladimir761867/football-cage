/* Дворы (косметические темы) и отрисовка сцен. Темы меняют только картинку. */

const YARDS = {
  classic: {
    id: 'classic', name: 'Классический двор', free: true,
    desc: 'Тёплый вечер, кирпичная стена, металлические ворота. Базовый двор — бесплатно и навсегда.',
    items: 'Асфальт • кирпичная стена • зелёные деревья • тёплые окна',
    sky: ['#2c3550', '#54486a', '#a06a4e'],
    building: '#4a3f3e', buildingEdge: '#3a3130', window: '#ffca63', windowOff: '#2c2826',
    asphalt: '#565a60', asphaltDark: '#44484e', line: 'rgba(253,247,232,.85)',
    wall: '#6e4b3f', wallTop: '#5d4036',
    tree: '#2e5531', treeDark: '#24411f', trunk: '#4b3826',
    props: ['tree', 'bench', 'hedge'],
    lamp: '#ffd98a', puddles: false, birches: false, garage: false, bunting: false
  },
  russia90: {
    id: 'russia90', name: 'Россия, 90-е', free: false, priceRub: 299,
    desc: 'Панельки с тёплыми окнами, берёзы, гаражи и разметка мелом. Сумерки после дождя — двор, в который хочется вернуться.',
    items: 'Панельные дома • берёзы • гаражи • лужи после дождя • фонарь • мел • покрышка • лавочка',
    sky: ['#232c45', '#3c4668', '#7a6a8a'],
    building: '#8b8e96', buildingEdge: '#6f727c', window: '#ffb84d', windowOff: '#23283a',
    asphalt: '#4c505a', asphaltDark: '#3a3e48', line: 'rgba(255,255,255,.92)',
    wall: '#7d8089', wallTop: '#696c75',
    tree: '#3c5c35', treeDark: '#2c4527', trunk: '#e8e4da',
    props: ['birch', 'garage', 'tyre', 'bench'],
    lamp: '#ffe9b0', puddles: true, birches: true, garage: true, bunting: true
  }
};

// Варианты одной эпохи отличаются местом и покрытием, но используют общий
// арт-слой. Это позволяет собирать большую матрицу «страна × годы × двор»
// без копирования тяжёлых фоновых изображений.
const russia90Base = YARDS.russia90;
Object.assign(YARDS, {
  russia90_asphalt: { ...russia90Base, id: 'russia90_asphalt', name: 'Россия, 90-е — асфальт у дома', desc: 'Двор между подъездами: мокрый асфальт, мелкие ворота и лавочка у подъезда.', surface: 'асфальт', place: 'между домами', baseArt: 'russia90' },
  russia90_gravel: { ...russia90Base, id: 'russia90_gravel', name: 'Россия, 90-е — гравийное поле', desc: 'Неровная площадка за домом, где линии рисовали мелом, а ворота держались на кирпичах.', surface: 'гравий', place: 'за домом', baseArt: 'russia90' },
  russia90_garage: { ...russia90Base, id: 'russia90_garage', name: 'Россия, 90-е — у гаражей', desc: 'Гаражный ряд, ржавые ворота и мяч, который иногда улетал под машину.', surface: 'грунт', place: 'гаражи', baseArt: 'russia90' },
  russia90_school: { ...russia90Base, id: 'russia90_school', name: 'Россия, 90-е — школьная коробка', desc: 'Металлическая коробка у школы: сетка, облупленная краска и длинные сумерки.', surface: 'асфальт', place: 'школьный двор', baseArt: 'russia90' },
  russia90_field: { ...russia90Base, id: 'russia90_field', name: 'Россия, 90-е — поле у пустыря', desc: 'Пыльное поле с самодельными воротами и широким небом вместо трибун.', surface: 'земля', place: 'пустырь', baseArt: 'russia90' },
  classic_80_gravel: { ...YARDS.classic, id: 'classic_80_gravel', name: 'Россия, 80-е — гравийная коробка', desc: 'Дворовая коробка из воспоминаний: гравий, хоккейные ворота и простая форма.', surface: 'гравий', place: 'коробка', baseArt: 'classic', priceRub: 199, free: false },
  classic_80_school: { ...YARDS.classic, id: 'classic_80_school', name: 'Россия, 80-е — школа после уроков', desc: 'Школьный двор с низкими воротами, мелом и тёплым светом из окон.', surface: 'асфальт', place: 'школа', baseArt: 'classic', priceRub: 199, free: false },
  classic_80_field: { ...YARDS.classic, id: 'classic_80_field', name: 'Россия, 80-е — поле за домом', desc: 'Неровное поле с двумя камнями вместо стоек и травой по краям.', surface: 'земля', place: 'за домом', baseArt: 'classic', priceRub: 199, free: false },
  classic_80_garage: { ...YARDS.classic, id: 'classic_80_garage', name: 'Россия, 80-е — гаражный проезд', desc: 'Тихий проезд у гаражей, где играли до первого фонаря.', surface: 'грунт', place: 'гаражи', baseArt: 'classic', priceRub: 199, free: false }
});

const RUSSIAN_COURTS = [
  ['80', '80-е', ['Двор между домами', 'Школьная гравийная коробка', 'Поле у гаражей'], ['асфальт', 'гравий', 'земля']],
  ['90', '90-е', ['Панельный двор после дождя', 'Школьная коробка', 'Гаражное поле'], ['асфальт', 'асфальт', 'грунт']],
  ['00', '2000-е', ['Обновлённый двор', 'Школьная спортплощадка', 'Травяное поле у домов'], ['асфальт', 'резиновое покрытие', 'трава']],
  ['10', '2010-е', ['Мини-поле у новостроек', 'Школьный спорткомплекс', 'Обновлённая коробка'], ['искусственный газон', 'резиновое покрытие', 'асфальт']],
  ['20', '2020-е', ['Современный двор', 'Многофункциональная школа', 'Поле старого района'], ['искусственный газон', 'резиновое покрытие', 'искусственный газон']]
];
RUSSIAN_COURTS.forEach(([code, era, names, surfaces]) => names.forEach((name, variant) => {
  const id = `ru${code}_${variant + 1}`;
  const base = code === '80' || code === '00' ? YARDS.classic : YARDS.russia90;
  YARDS[id] = {
    ...base, id, era, country: 'Россия', variant, atlas: code,
    name: `Россия, ${era} — ${name}`,
    desc: `${name}. Площадка эпохи ${era}, покрытие: ${surfaces[variant]}.`,
    items: `Покрытие: ${surfaces[variant]} • архитектура и ворота эпохи ${era}`,
    surface: surfaces[variant], free: variant === 0,
    priceRub: variant === 0 ? 0 : 199
  };
}));

const BALLS = {
  classic:   { id: 'classic',   name: 'Чёрно-белая классика', era: 'Базовый / 90-е', price: 0,   atlas: 1, material: 'потёртая синтетика', c1: '#f2ede2', c2: '#262626', style: 'penta' },
  leather80: { id: 'leather80', name: 'Кожаный с ручным швом', era: '80-е', price: 0,   atlas: 0, material: 'тяжёлая кожа', c1: '#9c6b3f', c2: '#6e4526', style: 'seams' },
  patch90:   { id: 'patch90',   name: 'Дворовая классика', era: '90-е', price: 150, atlas: 1, material: 'винил, грязь и потёртости', c1: '#e8ddc8', c2: '#b4443a', style: 'patch' },
  glossy00:  { id: 'glossy00',  name: 'Глянцевый с дугами', era: '2000-е', price: 150, atlas: 2, material: 'глянцевый полиуретан', c1: '#f5f5f5', c2: '#2563b0', style: 'swoosh' },
  tech10:    { id: 'tech10',    name: 'Термосклеенный', era: '2010-е', price: 220, atlas: 3, material: 'матовая термопанель', c1: '#f5f5f5', c2: '#2c86b8', style: 'swoosh' },
  neon20:    { id: 'neon20',    name: 'Неон с геометрией', era: '2020-е', price: 300, atlas: 4, material: 'текстурный TPU', c1: '#1d2430', c2: '#5df09a', style: 'neon' }
};

/* Живые фоновые ассеты. Если браузер ещё не успел их загрузить,
   остаётся процедурный fallback ниже — игра не ждёт сеть. */
const ART = {
  classicMenu: new Image(),
  classicSquare: new Image(),
  classicGoal: new Image(),
  russia90Menu: new Image(),
  russia90Square: new Image(),
  russia90Goal: new Image(),
  players: new Image(),
  runner: new Image(),
  runnerRed: new Image(),
  runnerGreen: new Image(),
  keeperReady: new Image(),
  keeperDive: new Image(),
  runAtlas: { blue: new Image(), red: new Image(), green: new Image() },
  kickBlue: new Image(),
  kickRed: new Image(),
  kickGreen: new Image(),
  goalBlue: new Image(),
  keeperAnim: new Image(),
  russian: Object.fromEntries(['80', '90', '00', '10', '20'].map(code => [code, new Image()])),
  ballAtlas: new Image()
};
const ART_VERSION = '?v=20261111-10';
ART.classicMenu.src = 'assets/yard-classic-menu.png' + ART_VERSION;
ART.classicSquare.src = 'assets/yard-classic-square.png' + ART_VERSION;
ART.classicGoal.src = 'assets/yard-classic-goal.png' + ART_VERSION;
ART.russia90Menu.src = 'assets/yard-russia90-menu.png' + ART_VERSION;
ART.russia90Square.src = 'assets/yard-russia90-square.png' + ART_VERSION;
ART.russia90Goal.src = 'assets/yard-russia90-goal.png' + ART_VERSION;
ART.players.src = 'assets/players-sheet.png' + ART_VERSION;
ART.runner.src = 'assets/runner.webp' + ART_VERSION;
ART.runnerRed.src = 'assets/runner-red.webp' + ART_VERSION;
ART.runnerGreen.src = 'assets/runner-green.webp' + ART_VERSION;
ART.keeperReady.src = 'assets/keeper-ready.webp' + ART_VERSION;
ART.keeperDive.src = 'assets/keeper-dive.webp' + ART_VERSION;
ART.runAtlas.blue.src = 'assets/run-blue.webp' + ART_VERSION;
ART.runAtlas.red.src = 'assets/run-red.webp' + ART_VERSION;
ART.runAtlas.green.src = 'assets/run-green.webp' + ART_VERSION;
ART.kickBlue.src = 'assets/kick-blue.webp' + ART_VERSION;
ART.kickRed.src = 'assets/kick-red.webp' + ART_VERSION;
ART.kickGreen.src = 'assets/kick-green.webp' + ART_VERSION;
ART.goalBlue.src = 'assets/goal-blue.webp' + ART_VERSION;
ART.keeperAnim.src = 'assets/keeper-anim.webp' + ART_VERSION;
Object.entries(ART.russian).forEach(([code, img]) => { img.src = `assets/russia-${code}-triptych.webp` + ART_VERSION; });
ART.ballAtlas.src = 'assets/balls-era-atlas.png' + ART_VERSION;
Object.values(ART).flatMap(value => value instanceof Image ? [value] : Object.values(value))
  .forEach(img => img.addEventListener('load', () => window.dispatchEvent(new Event('art-ready'))));

const Yards = (() => {

  function theme() { return YARDS[Save.data.selectedYard] || YARDS.classic; }
  function ball() { return BALLS[Save.data.selectedBall] || BALLS.classic; }
  function isRussia90(t) { return t.id === 'russia90' || t.baseArt === 'russia90'; }

  function ready(img) { return img && img.complete && img.naturalWidth > 0; }

  function drawCover(ctx, img, w, h) {
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const scale = Math.max(w / sw, h / sh);
    const dw = sw * scale, dh = sh * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  /* ---------- геометрия нарисованных площадок ----------
     Где на арт-фоне лежит начерченный квадрат и стоят ворота
     (нормированные координаты изображения, сняты с макетов). */
  const ART_GEO = {
    classicSquare:  { quad: [[.155, .322], [.93, .318], [.985, .70], [.015, .695]] },
    russia90Square: { quad: [[.145, .405], [.875, .402], [.995, .685], [.0, .688]] },
    classicGoal:    { goal: { x: .215, w: .585, top: .305, bottom: .49 } },
    russia90Goal:   { goal: { x: .165, w: .66, top: .335, bottom: .52 } }
  };
  function coverMap(img, w, h) {
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const sc = Math.max(w / sw, h / sh);
    return { ox: (w - sw * sc) / 2, oy: (h - sh * sc) / 2, sx: sw * sc, sy: sh * sc };
  }
  // 4 экранных угла начерченного квадрата (TL, TR, BR, BL) или null
  function courtQuad(w, h) {
    const t = theme();
    if (t.atlas) return null;
    const ru = isRussia90(t);
    const img = ru ? ART.russia90Square : ART.classicSquare;
    if (!ready(img)) return null;
    const m = coverMap(img, w, h);
    return ART_GEO[ru ? 'russia90Square' : 'classicSquare'].quad
      .map(([nx, ny]) => ({ x: m.ox + nx * m.sx, y: m.oy + ny * m.sy }));
  }
  // Экранный прямоугольник нарисованных ворот {x, y(земля), w, h} или null
  function artGoal(w, h) {
    const t = theme();
    if (t.atlas) return null;
    const ru = isRussia90(t);
    const img = ru ? ART.russia90Goal : ART.classicGoal;
    if (!ready(img)) return null;
    const m = coverMap(img, w, h);
    const g = ART_GEO[ru ? 'russia90Goal' : 'classicGoal'].goal;
    return { x: m.ox + g.x * m.sx, y: m.oy + g.bottom * m.sy,
             w: g.w * m.sx, h: (g.bottom - g.top) * m.sy };
  }
  // Точка внутри квадрата по (u,v) ∈ [0,1]² с учётом перспективы
  function quadPoint(q, u, v) {
    const lp = (a, b, t) => a + (b - a) * t;
    const ax = lp(q[0].x, q[1].x, u), ay = lp(q[0].y, q[1].y, u);
    const bx = lp(q[3].x, q[2].x, u), by = lp(q[3].y, q[2].y, u);
    return { x: lp(ax, bx, v), y: lp(ay, by, v) };
  }

  function paintArt(ctx, w, h, img) {
    if (!ready(img)) return false;
    drawCover(ctx, img, w, h);
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(9,14,24,.08)');
    shade.addColorStop(.58, 'rgba(9,14,24,.08)');
    shade.addColorStop(1, 'rgba(9,14,24,.68)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    return true;
  }

  function paintRussianAtlas(ctx, w, h, t) {
    if (!t.atlas || !ready(ART.russian[t.atlas])) return false;
    const img = ART.russian[t.atlas];
    const cell = img.naturalWidth / 3;
    const scale = Math.max(w / cell, h / img.naturalHeight);
    const dw = cell * scale, dh = img.naturalHeight * scale;
    ctx.drawImage(img, t.variant * cell, 0, cell, img.naturalHeight,
      (w - dw) / 2, (h - dh) / 2, dw, dh);
    // Общий визуальный язык любимого российского двора: тёплое окно/фонарь,
    // вечернее небо, вид к воротам и свободное поле на переднем плане.
    const evening = ctx.createLinearGradient(0, 0, 0, h);
    evening.addColorStop(0, 'rgba(78,69,125,.14)');
    evening.addColorStop(.42, 'rgba(255,174,104,.055)');
    evening.addColorStop(1, 'rgba(38,32,58,.12)');
    ctx.fillStyle = evening; ctx.fillRect(0, 0, w, h);
    const lamp = ctx.createRadialGradient(w * .18, h * .27, 0, w * .18, h * .27, h * .38);
    lamp.addColorStop(0, 'rgba(255,193,106,.10)');
    lamp.addColorStop(1, 'rgba(255,193,106,0)');
    ctx.fillStyle = lamp; ctx.fillRect(0, 0, w, h);
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(9,14,24,.15)');
    shade.addColorStop(.65, 'rgba(9,14,24,0)');
    shade.addColorStop(1, 'rgba(9,14,24,.55)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    return true;
  }

  /* ---------- вспомогательное ---------- */
  function skyGrad(ctx, w, h, t, to) {
    const g = ctx.createLinearGradient(0, 0, 0, to);
    g.addColorStop(0, t.sky[0]); g.addColorStop(.6, t.sky[1]); g.addColorStop(1, t.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, to);
  }

  function buildings(ctx, w, hor, t, seed) {
    let x = -20, i = seed;
    while (x < w + 20) {
      i++;
      const bw = 70 + (i * 37 % 60), bh = 90 + (i * 53 % 130);
      ctx.fillStyle = t.building;
      ctx.fillRect(x, hor - bh, bw, bh);
      ctx.fillStyle = t.buildingEdge;
      ctx.fillRect(x, hor - bh, bw, 5);
      if (t.birches) { // швы панелек
        ctx.fillRect(x + bw * .33, hor - bh, 2, bh);
        ctx.fillRect(x + bw * .66, hor - bh, 2, bh);
      }
      // окна
      const cols = Math.max(2, Math.floor(bw / 22)), rows = Math.max(3, Math.floor(bh / 26));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = ((i * 7 + r * 13 + c * 5) % 10) < 4;
        ctx.fillStyle = lit ? t.window : t.windowOff;
        ctx.fillRect(x + 8 + c * (bw - 14) / cols, hor - bh + 12 + r * (bh - 18) / rows, 9, 12);
      }
      x += bw + 8 + (i * 17 % 20);
    }
  }

  function birch(ctx, x, y, s) {
    ctx.strokeStyle = '#e9e5db'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6 * s, y - 40 * s, x + 2 * s, y - 80 * s); ctx.stroke();
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2 * s;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(x + i, y - i * 16 * s); ctx.lineTo(x + 6 * s + i, y - i * 16 * s - 3); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(90,120,60,.9)';
    blob(ctx, x + 2 * s, y - 92 * s, 26 * s);
  }
  function tree(ctx, x, y, s, t) {
    ctx.fillStyle = t.trunk === '#e8e4da' ? '#4b3826' : t.trunk;
    ctx.fillRect(x - 4 * s, y - 34 * s, 8 * s, 34 * s);
    ctx.fillStyle = t.treeDark; blob(ctx, x, y - 52 * s, 30 * s);
    ctx.fillStyle = t.tree; blob(ctx, x - 8 * s, y - 60 * s, 24 * s);
  }
  function blob(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.arc(x + r * .7, y + r * .3, r * .7, 0, 7);
    ctx.arc(x - r * .7, y + r * .3, r * .7, 0, 7);
    ctx.fill();
  }
  function garage(ctx, x, y, w, h) {
    ctx.fillStyle = '#5d6168'; ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = '#4a4e55'; ctx.fillRect(x, y - h, w, 6);
    ctx.fillStyle = '#7a4a3a'; ctx.fillRect(x + w * .15, y - h * .72, w * .7, h * .72);
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y - h * .72); ctx.lineTo(x + w / 2, y); ctx.stroke();
  }
  function bench(ctx, x, y, s) {
    ctx.fillStyle = '#7a5a36';
    ctx.fillRect(x, y - 14 * s, 44 * s, 5 * s);
    ctx.fillRect(x, y - 26 * s, 44 * s, 5 * s);
    ctx.fillStyle = '#3f3f3f';
    ctx.fillRect(x + 3 * s, y - 14 * s, 4 * s, 14 * s);
    ctx.fillRect(x + 37 * s, y - 14 * s, 4 * s, 14 * s);
  }
  function tyre(ctx, x, y, s) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 7 * s;
    ctx.beginPath(); ctx.ellipse(x, y, 16 * s, 6 * s, 0, 0, 7); ctx.stroke();
  }
  function lampPost(ctx, x, y, t) {
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 130); ctx.quadraticCurveTo(x, y - 150, x + 24, y - 148); ctx.stroke();
    const g = ctx.createRadialGradient(x + 26, y - 146, 2, x + 26, y - 146, 60);
    g.addColorStop(0, t.lamp); g.addColorStop(1, 'rgba(255,217,138,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 26, y - 146, 60, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffeec9'; ctx.beginPath(); ctx.arc(x + 26, y - 146, 5, 0, 7); ctx.fill();
  }
  function puddle(ctx, x, y, w, h, t) {
    const g = ctx.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, 'rgba(140,160,200,.35)'); g.addColorStop(1, 'rgba(60,70,100,.3)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, 7); ctx.fill();
  }
  function bunting(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 18, x2, y2); ctx.stroke();
    const n = 7, cols = ['#d94f3d', '#f0c33c', '#4f8fd9', '#67b24a'];
    for (let i = 1; i < n; i++) {
      const tt = i / n;
      const bx = (1 - tt) * (1 - tt) * x1 + 2 * (1 - tt) * tt * ((x1 + x2) / 2) + tt * tt * x2;
      const by = (1 - tt) * (1 - tt) * y1 + 2 * (1 - tt) * tt * (Math.max(y1, y2) + 18) + tt * tt * y2;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.lineTo(bx, by + 11); ctx.fill();
    }
  }

  /* ---------- сцена: фон меню ---------- */
  function paintMenu(ctx, w, h) {
    const t = theme();
    if (paintRussianAtlas(ctx, w, h, t)) return;
    if (paintArt(ctx, w, h, isRussia90(t) ? ART.russia90Menu : ART.classicMenu)) {
      return;
    }
    const hor = h * .46;
    skyGrad(ctx, w, h, t, hor);
    buildings(ctx, w, hor, t, isRussia90(t) ? 4 : 11);
    // земля
    const g = ctx.createLinearGradient(0, hor, 0, h);
    g.addColorStop(0, t.asphalt); g.addColorStop(1, t.asphaltDark);
    ctx.fillStyle = g; ctx.fillRect(0, hor, w, h - hor);
    if (t.garage) garage(ctx, w - 150, hor + 48, 120, 70);
    if (t.birches) { birch(ctx, 40, hor + 30, 1); birch(ctx, w - 190, hor + 26, .8); }
    else { tree(ctx, 44, hor + 28, 1.1, t); tree(ctx, w - 50, hor + 22, .9, t); }
    // ворота вдалеке
    drawGoalSmall(ctx, w / 2, hor + 56, 110, 46, t);
    if (t.bunting) bunting(ctx, w * .18, hor - 40, w * .82, hor - 54);
    bench(ctx, 24, hor + 120, 1);
    if (t.puddles) { puddle(ctx, w * .7, h * .72, 70, 14, t); puddle(ctx, w * .3, h * .86, 90, 16, t); }
    lampPost(ctx, w - 36, h * .78, t);
    // мелкая разметка мелом
    ctx.strokeStyle = t.line; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.ellipse(w / 2, h * .8, w * .3, 40, 0, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    vignette(ctx, w, h);
  }

  function drawGoalSmall(ctx, cx, y, gw, gh, t) {
    ctx.strokeStyle = isRussia90(t) ? '#c9cdd4' : '#d7d7d7';
    ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.strokeRect(cx - gw / 2, y - gh, gw, gh);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.35)';
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(cx - gw / 2 + i * gw / 6, y - gh); ctx.lineTo(cx - gw / 2 + i * gw / 6, y); ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(cx - gw / 2, y - gh + i * gh / 4); ctx.lineTo(cx + gw / 2, y - gh + i * gh / 4); ctx.stroke();
    }
  }

  /* ---------- сцена: вид сверху («Квадрат») ---------- */
  function paintCourt(ctx, w, h, court) {
    const t = theme();
    if (paintRussianAtlas(ctx, w, h, t)) {
      ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 4;
      ctx.strokeRect(court.x, court.y, court.w, court.h);
      return;
    }
    if (paintArt(ctx, w, h, isRussia90(t) ? ART.russia90Square : ART.classicSquare)) return;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, t.asphaltDark); g.addColorStop(.5, t.asphalt); g.addColorStop(1, t.asphaltDark);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // крапинки асфальта
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 90; i++) {
      const x = (i * 97 % w), y = (i * 193 % h);
      ctx.fillRect(x, y, 2, 2);
    }
    if (t.puddles) { puddle(ctx, w * .14, h * .22, 54, 12, t); puddle(ctx, w * .85, h * .78, 60, 13, t); }
    // трещины
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * .1, h * .7); ctx.quadraticCurveTo(w * .3, h * .76, w * .34, h * .95); ctx.stroke();
    // разметка квадрата мелом
    ctx.strokeStyle = t.line; ctx.lineWidth = 4; ctx.setLineDash(isRussia90(t) ? [18, 12] : []);
    ctx.strokeRect(court.x, court.y, court.w, court.h);
    ctx.setLineDash([]);
    // уголки-конусы или кирпичи
    const corners = [[court.x, court.y], [court.x + court.w, court.y], [court.x, court.y + court.h], [court.x + court.w, court.y + court.h]];
    corners.forEach(([cx, cy]) => {
      if (isRussia90(t)) { // кирпич
        ctx.fillStyle = '#9a4634'; ctx.fillRect(cx - 9, cy - 5, 18, 10);
        ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.strokeRect(cx - 9, cy - 5, 18, 10);
      } else { // конус
        ctx.fillStyle = '#e8702a';
        ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx + 9, cy + 4); ctx.lineTo(cx - 9, cy + 4); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(cx - 5, cy - 6, 10, 3);
      }
    });
    // мелки и рисунки на асфальте
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2;
    chalkCrown(ctx, w * .84, h * .12);
    if (isRussia90(t)) chalkSun(ctx, w * .12, h * .9);
    vignette(ctx, w, h);
  }
  function chalkCrown(ctx, x, y) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y - 14); ctx.lineTo(x + 14, y - 4);
    ctx.lineTo(x + 21, y - 16); ctx.lineTo(x + 28, y - 4); ctx.lineTo(x + 35, y - 14); ctx.lineTo(x + 42, y);
    ctx.closePath(); ctx.stroke();
  }
  function chalkSun(ctx, x, y) {
    ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16);
      ctx.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24); ctx.stroke();
    }
  }

  /* ---------- сцена: ворота анфас («Американка», «Навес») ---------- */
  function paintGoalScene(ctx, w, h, goal) {
    const t = theme();
    if (paintRussianAtlas(ctx, w, h, t)) return;
    if (paintArt(ctx, w, h, isRussia90(t) ? ART.russia90Goal : ART.classicGoal)) return;
    const hor = goal.y - goal.h - 40;
    skyGrad(ctx, w, h, t, hor + 10);
    buildings(ctx, w, hor, t, isRussia90(t) ? 7 : 3);
    // стена за воротами
    ctx.fillStyle = t.wall; ctx.fillRect(0, hor, w, goal.y - hor + 14);
    ctx.fillStyle = t.wallTop; ctx.fillRect(0, hor, w, 8);
    if (!isRussia90(t)) { // кирпичи
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1;
      for (let yy = hor + 16; yy < goal.y + 10; yy += 14) {
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
      }
    } else { // панельные швы + граффити-пятна
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
      for (let xx = 40; xx < w; xx += 90) { ctx.beginPath(); ctx.moveTo(xx, hor); ctx.lineTo(xx, goal.y + 12); ctx.stroke(); }
      ctx.fillStyle = 'rgba(200,90,70,.25)'; blob(ctx, w * .12, goal.y - 24, 18);
      ctx.fillStyle = 'rgba(80,120,200,.22)'; blob(ctx, w * .9, goal.y - 40, 15);
    }
    if (t.bunting) bunting(ctx, 10, hor + 16, w - 10, hor + 10);
    // земля
    const g = ctx.createLinearGradient(0, goal.y, 0, h);
    g.addColorStop(0, t.asphalt); g.addColorStop(1, t.asphaltDark);
    ctx.fillStyle = g; ctx.fillRect(0, goal.y + 8, w, h - goal.y);
    if (t.puddles) { puddle(ctx, w * .2, goal.y + 70, 60, 12, t); puddle(ctx, w * .8, h * .86, 80, 14, t); }
    if (t.birches) birch(ctx, 26, goal.y + 6, .9); else tree(ctx, 30, goal.y + 4, .9, t);
    // штрафная мелом
    ctx.strokeStyle = t.line; ctx.lineWidth = 3; ctx.setLineDash([12, 9]);
    ctx.beginPath();
    ctx.moveTo(goal.x - 40, goal.y + 10);
    ctx.lineTo(goal.x - 70, h * .8);
    ctx.lineTo(goal.x + goal.w + 70, h * .8);
    ctx.lineTo(goal.x + goal.w + 40, goal.y + 10);
    ctx.stroke(); ctx.setLineDash([]);
    vignette(ctx, w, h);
  }

  function drawGoalFrame(ctx, goal, t) {
    t = t || theme();
    const { x, y, w, h } = goal;
    // сетка
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
    const nx = 10, ny = 7;
    for (let i = 1; i < nx; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * w / nx, y - h); ctx.lineTo(x + i * w / nx, y); ctx.stroke();
    }
    for (let i = 1; i < ny; i++) {
      ctx.beginPath(); ctx.moveTo(x, y - h + i * h / ny); ctx.lineTo(x + w, y - h + i * h / ny); ctx.stroke();
    }
    // рама
    ctx.strokeStyle = isRussia90(t) ? '#d8dce3' : '#e8e8e8';
    ctx.lineWidth = 7; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x + w, y); ctx.stroke();
    if (isRussia90(t)) { // облупившаяся краска — красные метки
      ctx.strokeStyle = '#b44a3c'; ctx.lineWidth = 7;
      [[x, y - h * .35, x, y - h * .55], [x + w, y - h * .7, x + w, y - h * .85], [x + w * .3, y - h, x + w * .45, y - h]]
        .forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
    }
  }

  function vignette(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  /* ---------- мяч ---------- */
  function drawBall(ctx, x, y, r, ballDef) {
    const b = ballDef || ball();
    if (ready(ART.ballAtlas) && Number.isInteger(b.atlas)) {
      // Атлас состоит из пяти ячеек: кожа 80-х, классика 90-х,
      // глянец 2000-х, термопанель 2010-х и неон 2020-х.
      // Рисуем чуть больше радиуса, чтобы сохранились фактура и контактная тень.
      const cellW = ART.ballAtlas.naturalWidth / 5;
      const sx = b.atlas * cellW;
      const sy = ART.ballAtlas.naturalHeight * .13;
      const sw = cellW;
      const sh = ART.ballAtlas.naturalHeight * .70;
      const size = r * 2.72;
      ctx.save();
      ctx.drawImage(ART.ballAtlas, sx, sy, sw, sh, x - size / 2, y - size / 2, size, size);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.closePath();
    ctx.fillStyle = b.c1; ctx.fill();
    ctx.clip();
    if (b.style === 'penta') {
      ctx.fillStyle = b.c2;
      pent(ctx, x, y, r * .42);
      [[x - r * .85, y - r * .5], [x + r * .85, y - r * .5], [x, y + r * .95], [x - r * .7, y + r * .7], [x + r * .7, y + r * .7]]
        .forEach(([px, py]) => pent(ctx, px, py, r * .34));
    } else if (b.style === 'seams') {
      ctx.strokeStyle = b.c2; ctx.lineWidth = Math.max(1.5, r * .09);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(x + i * r * .45, y - r); ctx.quadraticCurveTo(x + i * r * .6, y, x + i * r * .45, y + r); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
    } else if (b.style === 'patch') {
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Math.max(1, r * .07);
      pentStroke(ctx, x, y, r * .42);
      ctx.fillStyle = b.c2;
      ctx.fillRect(x + r * .15, y - r * .75, r * .62, r * .5);
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.setLineDash([3, 3]);
      ctx.strokeRect(x + r * .15, y - r * .75, r * .62, r * .5); ctx.setLineDash([]);
    } else if (b.style === 'swoosh') {
      ctx.strokeStyle = b.c2; ctx.lineWidth = r * .22;
      ctx.beginPath(); ctx.arc(x, y + r * .3, r * .85, -2.6, -0.5); ctx.stroke();
      ctx.strokeStyle = '#c23b2e'; ctx.lineWidth = r * .14;
      ctx.beginPath(); ctx.arc(x, y - r * .5, r * .9, 0.6, 2.5); ctx.stroke();
    } else if (b.style === 'neon') {
      ctx.strokeStyle = b.c2; ctx.lineWidth = Math.max(1.5, r * .1);
      ctx.beginPath(); ctx.moveTo(x - r, y - r * .3); ctx.quadraticCurveTo(x, y + r * .4, x + r, y - r * .3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r, y + r * .4); ctx.quadraticCurveTo(x, y + r * 1.1, x + r, y + r * .4); ctx.stroke();
      ctx.fillStyle = b.c2; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .55, r * .13, 0, 7); ctx.fill();
    }
    ctx.restore();
    // объём и контур
    const sh = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.38)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  }
  function pent(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  function pentStroke(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.stroke();
  }

  /* ---------- игрок (силуэт) ---------- */
  function drawPlayer(ctx, x, y, s, color, pose, motion) {
    const phase = motion && Number.isFinite(motion.phase) ? motion.phase : performance.now() / 240;
    const moving = !motion || motion.moving !== false;
    const bob = moving ? Math.abs(Math.sin(phase)) * 2.4 * s : 0;
    const sway = moving ? Math.sin(phase) * 1.8 * s : 0;
    if (pose === 'keeper' && ready(ART.keeperAnim)) {
      const img = ART.keeperAnim, n = 4, cw = img.naturalWidth / n, ch = img.naturalHeight;
      const diving = motion && motion.dive;
      const fi = diving ? 1 : motion && motion.catch ? 2 : 0;
      const k = 120 * s / 216 * (diving ? 1.05 : 1);       // 216 — высота кадра стойки в атласе
      const dw = cw * k, dh = ch * k;
      ctx.save();
      ctx.translate(x, y - (diving ? 18 * s : 0));
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath(); ctx.ellipse(0, diving ? 18 * s - 2 * s : -2 * s, dw * (diving ? .34 : .22), 6 * s, 0, 0, Math.PI * 2); ctx.fill();
      if (!diving) { const t = performance.now() / 380; ctx.translate(Math.sin(t) * 3 * s, 0); ctx.rotate(Math.sin(t) * .02); }
      if (diving && motion.dive > 0) ctx.scale(-1, 1);       // кадр прыжка нарисован влево
      ctx.drawImage(img, fi * cw, 0, cw, ch, -dw / 2, -dh, dw, dh);
      ctx.restore();
      return;
    }
    if (pose !== 'keeper' && ready(ART.runAtlas.blue) && ready(ART.runAtlas.red) && ready(ART.runAtlas.green)) {
      // Покадровая анимация: цикл бега (4 кадра), кадр удара (3 кадра, синий игрок).
      const kind = color === '#c0392b' || color === '#d25743' ? 'red'
        : color === '#7a9f4b' || color === '#5b9b69' ? 'green' : 'blue';
      let img = ART.runAtlas[kind], n = 4, fi;
      const kicking = motion && motion.kick;
      const kickImg = kind === 'red' ? ART.kickRed : kind === 'green' ? ART.kickGreen : ART.kickBlue;
      if (motion && motion.celebrate && kind === 'blue' && ready(ART.goalBlue)) {
        img = ART.goalBlue; n = 3;
        fi = Math.floor(performance.now() / 260) % 3;
      } else if (kicking && ready(kickImg)) {
        img = kickImg; n = 3;
        const k = typeof motion.kick === 'number' && motion.kick > 0 && motion.kick <= 1 ? motion.kick : .5;
        fi = Math.min(2, Math.floor(k * 3));
      } else if (moving) {
        fi = Math.floor(((phase / (Math.PI / 2)) % 4 + 4) % 4);
      } else fi = 1;
      const cw = img.naturalWidth / n, ch = img.naturalHeight;
      const dh = 150 * s, dw = dh * cw / ch;
      ctx.save();
      ctx.translate(x, y - (moving ? Math.abs(Math.sin(phase)) * 1.5 * s : 0));
      // тень под ногами
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath(); ctx.ellipse(0, -2 * s, dw * .26, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
      if (motion && motion.face === -1) ctx.scale(-1, 1);
      if (moving && !kicking && !(motion && motion.celebrate)) {
        // пыль из-под ног: три затухающих облачка позади бегущего
        const t = ((phase / (Math.PI / 2)) % 1 + 1) % 1;
        for (let i = 0; i < 3; i++) {
          const k = (t + i / 3) % 1;
          ctx.fillStyle = `rgba(190,165,130,${(1 - k) * .26})`;
          ctx.beginPath();
          ctx.ellipse(-dw * .12 - k * 26 * s, -3 * s - k * 9 * s, (3 + k * 7) * s, (2 + k * 4) * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.drawImage(img, fi * cw, 0, cw, ch, -dw / 2, -dh, dw, dh);
      ctx.restore();
      return;
    }
    if (ready(ART.runner) && ready(ART.keeperReady) && ready(ART.keeperDive)) {
      const keeper = pose === 'keeper';
      const diving = keeper && motion && motion.dive;
      const img = keeper ? diving ? ART.keeperDive : ART.keeperReady
        : color === '#c0392b' || color === '#d25743' ? ART.runnerRed
        : color === '#7a9f4b' || color === '#5b9b69' ? ART.runnerGreen
        : ART.runner;
      const dh = (diving ? 72 : keeper ? 120 : 146) * s;
      const dw = dh * img.naturalWidth / img.naturalHeight;
      ctx.save();
      ctx.translate(x + sway, y - bob);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath(); ctx.ellipse(0, -2 * s, dw * (diving ? .45 : .28), 6 * s, 0, 0, Math.PI * 2); ctx.fill();
      if (keeper && !diving) { ctx.translate(Math.sin(performance.now() / 380) * 3 * s, 0); ctx.rotate(Math.sin(performance.now() / 380) * .03); }
      if (diving && motion.dive < 0) ctx.scale(-1, 1);
      else if (!keeper && motion && motion.face === -1) ctx.scale(-1, 1);
      if (!keeper) ctx.rotate((moving ? Math.sin(phase) * .045 : Math.sin(phase * .5) * .012) + (motion && motion.kick ? -.16 : 0));
      ctx.drawImage(img, -dw / 2, -dh, dw, dh);
      ctx.restore();
      return;
    }
    if (ready(ART.players)) {
      // Лист 2×2: красная куртка, синяя футболка, зелёное худи, вратарь.
      const quadrant = pose === 'keeper' ? 3
        : color === '#c0392b' ? 0
        : color === '#3f7fba' ? 1
        : 2;
      const qsz = ART.players.naturalWidth / 2;
      const sx = (quadrant % 2) * qsz, sy = Math.floor(quadrant / 2) * qsz;
      const dh = 150 * s, dw = dh; // квадранты листа квадратные
      ctx.save();
      ctx.globalAlpha = .98;
      ctx.translate(sway, -bob);
      if (motion && motion.face === -1) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
      ctx.drawImage(ART.players, sx, sy, qsz, qsz, x - dw / 2, y - dh, dw, dh);
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(x + sway, y - bob); ctx.rotate(moving ? Math.sin(phase) * .025 : 0);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 2, 13 * s, 4 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = color;
    // ноги
    ctx.fillRect(-6 * s + Math.sin(phase) * 2 * s, -16 * s, 4.5 * s, 16 * s);
    ctx.fillRect(2 * s - Math.sin(phase) * 2 * s, -16 * s, 4.5 * s, 16 * s);
    // корпус
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-8 * s, -38 * s, 16 * s, 24 * s, 5 * s);
    ctx.fill();
    // руки
    if (pose === 'keeper') {
      ctx.fillRect(-15 * s, -40 * s, 6 * s, 14 * s);
      ctx.fillRect(9 * s, -40 * s, 6 * s, 14 * s);
    } else {
      ctx.fillRect(-12 * s, -34 * s, 4.5 * s, 16 * s);
      ctx.fillRect(7.5 * s, -34 * s, 4.5 * s, 16 * s);
    }
    // голова
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath(); ctx.arc(0, -46 * s, 7.5 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2e22';
    ctx.beginPath(); ctx.arc(0, -49 * s, 7 * s, Math.PI, 0); ctx.fill();
    ctx.restore();
  }

  function paintPreview(canvas, yardId) {
    const t = YARDS[yardId];
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth * 2 || 600;
    const h = canvas.height = canvas.clientHeight * 2 || 300;
    const saveSel = Save.data.selectedYard;
    Save.data.selectedYard = yardId;
    paintMenu(ctx, w, h);
    Save.data.selectedYard = saveSel;
  }

  return { theme, ball, paintMenu, paintCourt, paintGoalScene, drawGoalFrame, drawBall, drawPlayer, paintPreview, vignette, courtQuad, artGoal, quadPoint, YARDS, BALLS };
})();
