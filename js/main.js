/* Экраны, HUD, магазин, запуск режимов. */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const screens = {
    home: $('#screen-home'), modes: $('#screen-modes'), match: $('#screen-match'),
    result: $('#screen-result'), shop: $('#screen-shop')
  };
  let current = 'home';
  let activeMode = null, rafId = 0, lastT = 0, gesture = null, lastModeId = null;
  let hintTimer = 0, toastTimer = 0;

  /* ---------- навигация ---------- */
  function nav(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
    current = name;
    if (name !== 'match') stopLoop();
    if (name === 'home') { paintBg('#home-bg'); updateCoins(); updateYardLabel(); }
    if (name === 'modes') { paintBg('#modes-bg'); updateCoins(); updateBests(); }
    if (name === 'shop') { paintBg('#shop-bg'); updateCoins(); renderShop(); }
    if (name === 'result') paintBg('#result-bg');
  }

  function paintBg(sel) {
    const c = $(sel);
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * 2); c.height = Math.round(r.height * 2);
    Yards.paintMenu(c.getContext('2d'), c.width, c.height);
  }

  function updateCoins() {
    const v = Save.data.coins;
    $$('.coins-chip b').forEach(b => b.textContent = v);
  }
  function updateYardLabel() {
    $('#home-yard-label').textContent = Yards.theme().name;
  }
  function updateBests() {
    $('#best-square').textContent = Save.data.best.square ? `Рекорд: ${Save.data.best.square} очк.` : 'Ещё не играл';
    $('#best-am300').textContent = Save.data.best.am300 ? `Рекорд: ${Save.data.best.am300} очк.` : 'Ещё не играл';
    $('#best-cross').textContent = Save.data.best.cross ? `Рекорд: ${Save.data.best.cross} очк.` : 'Ещё не играл';
  }

  /* ---------- HUD матча ---------- */
  const hud = {
    setTimer(v) { $('#match-timer').textContent = v; },
    setPills(arr) {
      $('#match-score-row').innerHTML = arr.map(p =>
        `<div class="hud-pill"><span class="lbl">${p.lbl}</span><span class="val" id="pill-${p.id}">${p.val}</span></div>`).join('');
    },
    setPill(id, v) { const el = $('#pill-' + id); if (el) el.textContent = v; },
    toast(text, cls) {
      const t = $('#match-toast');
      t.textContent = text;
      t.className = 'match-toast show ' + (cls || '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 950);
    },
    hint(text) {
      const h = $('#match-hint');
      h.textContent = text; h.classList.remove('off');
      clearTimeout(hintTimer);
    },
    hideHintSoon() {
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => $('#match-hint').classList.add('off'), 1200);
    }
  };

  /* ---------- запуск режима ---------- */
  const MODES = {
    square: { cls: SquareMode, title: 'Квадрат' },
    am300: { cls: Am300Mode, title: 'Американка 300' },
    cross: { cls: CrossMode, title: 'Навес' }
  };

  function startMode(id) {
    lastModeId = id;
    nav('match');
    $('#match-title').textContent = MODES[id].title;
    $('#match-hint').classList.remove('off');
    const canvas = $('#match-canvas');
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    const ctx = canvas.getContext('2d');
    if (gesture) gesture.destroy();
    gesture = new Gesture(canvas);
    const bgCache = {};
    const env = {
      canvas, ctx, W: canvas.width, H: canvas.height, gesture, hud,
      bgFor(key, painter) {
        if (!bgCache[key]) {
          const oc = document.createElement('canvas');
          oc.width = canvas.width; oc.height = canvas.height;
          painter(oc.getContext('2d'));
          bgCache[key] = oc;
        }
        ctx.drawImage(bgCache[key], 0, 0);
      },
      finish(result) {
        stopLoop();
        showResult(result);
      }
    };
    activeMode = new MODES[id].cls(env);
    lastT = performance.now();
    loop();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    if (!activeMode) return;
    activeMode.update(dt);
    if (!activeMode) return; // finish мог сработать внутри update
    activeMode.draw(activeMode.env.ctx);
  }
  function stopLoop() {
    cancelAnimationFrame(rafId);
    if (activeMode) { activeMode.destroy(); activeMode = null; }
  }

  function showResult(res) {
    Sound.whistle();
    nav('result');
    $('#result-title').textContent = res.title;
    $('#result-score').textContent = res.score;
    $('#result-sub').textContent = res.sub || '';
    $('#result-moment').textContent = res.moment || '';
    $('#result-reward').innerHTML =
      `🪙 +${res.coins} жетонов${res.newBest ? ' &nbsp;•&nbsp; 🏆 Новый рекорд!' : ''}`;
    updateCoins();
    setTimeout(Sound.coin, 400);
  }

  /* ---------- магазин ---------- */
  let shopTab = 'yards';

  function renderShop() {
    const list = $('#shop-list');
    list.innerHTML = '';
    if (shopTab === 'yards') {
      Object.values(YARDS).forEach(y => {
        const owned = Save.data.ownedYards.includes(y.id);
        const selected = Save.data.selectedYard === y.id;
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
          <canvas class="shop-card-preview"></canvas>
          <div class="shop-card-body">
            <div class="shop-card-title">${y.name}
              ${y.free ? '<span class="tag tag-free">Бесплатно</span>'
                : owned ? '<span class="tag tag-owned">Куплено</span>'
                : '<span class="tag tag-paid">Платный набор</span>'}
            </div>
            <div class="shop-card-desc">${y.desc}</div>
            <div class="shop-card-items">В наборе: ${y.items}</div>
            <div class="shop-card-actions"></div>
          </div>`;
        const actions = card.querySelector('.shop-card-actions');
        if (owned) {
          const b = document.createElement('button');
          b.className = 'btn ' + (selected ? 'btn-paper' : 'btn-green');
          b.textContent = selected ? '✓ Выбран' : 'Выбрать';
          b.disabled = selected;
          b.onclick = () => { Sound.ui(); Save.data.selectedYard = y.id; Save.save(); renderShop(); paintBg('#shop-bg'); };
          actions.appendChild(b);
        } else {
          const price = document.createElement('div');
          price.className = 'shop-price';
          price.textContent = y.priceRub + ' ₽';
          const b = document.createElement('button');
          b.className = 'btn btn-primary';
          b.textContent = 'Купить';
          b.onclick = () => buyYardModal(y);
          actions.appendChild(price); actions.appendChild(b);
        }
        list.appendChild(card);
        const pv = card.querySelector('.shop-card-preview');
        requestAnimationFrame(() => Yards.paintPreview(pv, y.id));
      });
    } else {
      Object.values(BALLS).forEach(bl => {
        const owned = Save.data.ownedBalls.includes(bl.id);
        const selected = Save.data.selectedBall === bl.id;
        const row = document.createElement('div');
        row.className = 'shop-card ball-row';
        row.innerHTML = `
          <canvas class="ball-canvas" width="128" height="128"></canvas>
          <div class="ball-info">
            <div class="ball-name">${bl.name}</div>
            <div class="ball-era">${bl.era} • одинаковая физика у всех мячей</div>
          </div>`;
        Yards.drawBall(row.querySelector('canvas').getContext('2d'), 64, 64, 50, bl);
        const b = document.createElement('button');
        if (owned) {
          b.className = 'btn ' + (selected ? 'btn-paper' : 'btn-green');
          b.textContent = selected ? '✓' : 'Выбрать';
          b.disabled = selected;
          b.onclick = () => { Sound.ui(); Save.data.selectedBall = bl.id; Save.save(); renderShop(); };
        } else {
          b.className = 'btn btn-primary';
          b.textContent = `🪙 ${bl.price}`;
          b.onclick = () => {
            if (Save.spendCoins(bl.price)) {
              Save.data.ownedBalls.push(bl.id);
              Save.data.selectedBall = bl.id;
              Save.save(); Sound.buy(); updateCoins(); renderShop();
            } else {
              modal(`<h3>Не хватает жетонов</h3>
                <p>Нужно 🪙 ${bl.price}, у тебя 🪙 ${Save.data.coins}. Жетоны даются за любые матчи — сыграй ещё!</p>
                <div class="modal-actions"><button class="btn btn-primary" data-close>Понятно</button></div>`);
            }
          };
        }
        row.appendChild(b);
        list.appendChild(row);
      });
    }
  }

  function buyYardModal(y) {
    Sound.ui();
    modal(`
      <h3>${y.name} — ${y.priceRub} ₽</h3>
      <p>${y.desc}</p>
      <p><b>В наборе:</b> ${y.items}.</p>
      <p>Двор — чистая косметика: размер площадки, физика мяча и окна тайминга не меняются.</p>
      <div class="demo-note">⚠ Это демо-версия игры: реальные платежи не подключены. Нажатие «Купить» просто разблокирует двор.</div>
      <div class="modal-actions">
        <button class="btn btn-paper" data-close>Отмена</button>
        <button class="btn btn-primary" id="confirm-buy">Купить</button>
      </div>`);
    $('#confirm-buy').onclick = () => {
      Save.data.ownedYards.push(y.id);
      Save.data.selectedYard = y.id;
      Save.save();
      Sound.buy();
      closeModal();
      renderShop(); paintBg('#shop-bg');
      modal(`<h3>Двор твой! 🎉</h3>
        <p>«${y.name}» куплен и уже выбран. Друзья в твоей комнате смогут играть на нём бесплатно.</p>
        <div class="modal-actions"><button class="btn btn-green" data-close>Сыграть</button></div>`,
        () => nav('modes'));
    };
  }

  /* ---------- модалки ---------- */
  function modal(html, onClose) {
    const wrap = $('#modal-wrap');
    $('#modal-box').innerHTML = html;
    wrap.classList.remove('hidden');
    $$('#modal-box [data-close]').forEach(b => b.onclick = () => { closeModal(); onClose && onClose(); });
  }
  function closeModal() { $('#modal-wrap').classList.add('hidden'); }
  $('#modal-wrap').addEventListener('click', e => { if (e.target === $('#modal-wrap')) closeModal(); });

  function settingsModal() {
    Sound.ui();
    const s = Save.data.settings;
    modal(`
      <h3>Настройки</h3>
      <div class="settings-row"><span>Звук</span><button class="toggle ${s.sound ? 'on' : ''}" id="tg-sound"></button></div>
      <div class="settings-row"><span>Вибрация</span><button class="toggle ${s.vibro ? 'on' : ''}" id="tg-vibro"></button></div>
      <p style="margin-top:12px;font-size:12.5px;opacity:.7">Прогресс хранится на этом устройстве. Косметика не влияет на игру.</p>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Готово</button></div>`);
    $('#tg-sound').onclick = e => { s.sound = !s.sound; Save.save(); e.target.classList.toggle('on', s.sound); };
    $('#tg-vibro').onclick = e => { s.vibro = !s.vibro; Save.save(); e.target.classList.toggle('on', s.vibro); };
  }

  function pauseModal() {
    modal(`
      <h3>Пауза</h3>
      <p>Выйти из матча? Прогресс партии не сохранится.</p>
      <div class="modal-actions">
        <button class="btn btn-green" data-close>Продолжить</button>
        <button class="btn btn-paper" id="quit-match">Выйти</button>
      </div>`);
    $('#quit-match').onclick = () => { closeModal(); stopLoop(); nav('modes'); };
  }

  /* ---------- события ---------- */
  $('#btn-play').onclick = () => { Sound.ui(); nav('modes'); };
  $('#btn-shop').onclick = () => { Sound.ui(); shopTab = 'yards'; syncTabs(); nav('shop'); };
  $('#btn-yards').onclick = () => { Sound.ui(); shopTab = 'yards'; syncTabs(); nav('shop'); };
  $('#btn-settings').onclick = settingsModal;
  $('#btn-pause').onclick = pauseModal;
  $('#btn-rematch').onclick = () => { Sound.ui(); startMode(lastModeId); };
  $('#btn-result-menu').onclick = () => { Sound.ui(); nav('modes'); };
  $$('[data-nav]').forEach(b => b.onclick = () => { Sound.ui(); nav(b.dataset.nav); });
  $$('.mode-card').forEach(b => b.onclick = () => { Sound.ui(); startMode(b.dataset.mode); });
  $$('.shop-tab').forEach(b => b.onclick = () => {
    Sound.ui(); shopTab = b.dataset.tab; syncTabs(); renderShop();
  });
  function syncTabs() {
    $$('.shop-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === shopTab));
  }

  window.addEventListener('resize', () => {
    if (current !== 'match') nav(current);
  });

  nav('home');
})();
