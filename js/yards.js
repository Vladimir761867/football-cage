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

const BALLS = {
  classic:   { id: 'classic',   name: 'Классика',        era: 'Базовый',  price: 0,   c1: '#f2ede2', c2: '#262626', style: 'penta' },
  leather80: { id: 'leather80', name: 'Кожаный, 80-е',   era: '80-е',     price: 0,   c1: '#9c6b3f', c2: '#6e4526', style: 'seams' },
  patch90:   { id: 'patch90',   name: 'С заплаткой, 90-е', era: '90-е',   price: 150, c1: '#e8ddc8', c2: '#b4443a', style: 'patch' },
  glossy00:  { id: 'glossy00',  name: 'Глянцевый, 2000-е', era: '2000-е', price: 150, c1: '#f5f5f5', c2: '#2563b0', style: 'swoosh' },
  neon20:    { id: 'neon20',    name: 'Неон, 2020-е',    era: '2020-е',   price: 300, c1: '#1d2430', c2: '#5df09a', style: 'neon' }
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
  players: new Image()
};
ART.classicMenu.src = 'assets/yard-classic-menu.png';
ART.classicSquare.src = 'assets/yard-classic-square.png';
ART.classicGoal.src = 'assets/yard-classic-goal.png';
ART.russia90Menu.src = 'assets/yard-russia90-menu.png';
ART.russia90Square.src = 'assets/yard-russia90-square.png';
ART.russia90Goal.src = 'assets/yard-russia90-goal.png';
ART.players.src = 'assets/players-sheet.png';
Object.values(ART).forEach(img => img.addEventListener('load', () => window.dispatchEvent(new Event('art-ready'))));

const Yards = (() => {

  function theme() { return YARDS[Save.data.selectedYard] || YARDS.classic; }
  function ball() { return BALLS[Save.data.selectedBall] || BALLS.classic; }

  function ready(img) { return img && img.complete && img.naturalWidth > 0; }

  function drawCover(ctx, img, w, h) {
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const scale = Math.max(w / sw, h / sh);
    const dw = sw * scale, dh = sh * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
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
    if (paintArt(ctx, w, h, t.id === 'russia90' ? ART.russia90Menu : ART.classicMenu)) {
      return;
    }
    const hor = h * .46;
    skyGrad(ctx, w, h, t, hor);
    buildings(ctx, w, hor, t, t.id === 'russia90' ? 4 : 11);
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
    ctx.strokeStyle = t.id === 'russia90' ? '#c9cdd4' : '#d7d7d7';
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
    if (paintArt(ctx, w, h, t.id === 'russia90' ? ART.russia90Square : ART.classicSquare)) return;
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
    ctx.strokeStyle = t.line; ctx.lineWidth = 4; ctx.setLineDash(t.id === 'russia90' ? [18, 12] : []);
    ctx.strokeRect(court.x, court.y, court.w, court.h);
    ctx.setLineDash([]);
    // уголки-конусы или кирпичи
    const corners = [[court.x, court.y], [court.x + court.w, court.y], [court.x, court.y + court.h], [court.x + court.w, court.y + court.h]];
    corners.forEach(([cx, cy]) => {
      if (t.id === 'russia90') { // кирпич
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
    if (t.id === 'russia90') chalkSun(ctx, w * .12, h * .9);
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
    if (paintArt(ctx, w, h, t.id === 'russia90' ? ART.russia90Goal : ART.classicGoal)) return;
    const hor = goal.y - goal.h - 40;
    skyGrad(ctx, w, h, t, hor + 10);
    buildings(ctx, w, hor, t, t.id === 'russia90' ? 7 : 3);
    // стена за воротами
    ctx.fillStyle = t.wall; ctx.fillRect(0, hor, w, goal.y - hor + 14);
    ctx.fillStyle = t.wallTop; ctx.fillRect(0, hor, w, 8);
    if (t.id === 'classic') { // кирпичи
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
    ctx.strokeStyle = t.id === 'russia90' ? '#d8dce3' : '#e8e8e8';
    ctx.lineWidth = 7; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x + w, y); ctx.stroke();
    if (t.id === 'russia90') { // облупившаяся краска — красные метки
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
  function drawPlayer(ctx, x, y, s, color, pose) {
    if (ready(ART.players)) {
      // Лист 2×2: красная куртка, синяя футболка, зелёное худи, вратарь.
      const quadrant = pose === 'keeper' ? 3
        : color === '#c0392b' ? 2
        : color === '#3f7fba' ? 1
        : 0;
      const sx = (quadrant % 2) * 512, sy = Math.floor(quadrant / 2) * 512;
      const dw = 116 * s, dh = 154 * s;
      ctx.save();
      ctx.globalAlpha = .98;
      ctx.drawImage(ART.players, sx, sy, 512, 512, x - dw / 2, y - dh, dw, dh);
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 2, 13 * s, 4 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = color;
    // ноги
    ctx.fillRect(-6 * s, -16 * s, 4.5 * s, 16 * s);
    ctx.fillRect(2 * s, -16 * s, 4.5 * s, 16 * s);
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

  return { theme, ball, paintMenu, paintCourt, paintGoalScene, drawGoalFrame, drawBall, drawPlayer, paintPreview, vignette, YARDS, BALLS };
})();
