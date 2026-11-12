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
  let difficulty = Difficulty.ids.includes(Save.data.difficulty) ? Save.data.difficulty : 'normal';
  let opponentCount = 1;
  let paused = false, artRevision = 0;
  let matchIsCup = false;

  /* ---------- навигация ---------- */
  function nav(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
    current = name;
    if (name !== 'match') stopLoop();
    if (name === 'home') { paintBg('#home-bg'); updateCoins(); updateYardLabel(); }
    if (name === 'modes') { paintBg('#modes-bg'); updateCoins(); updateBests(); updateCompetition(); }
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
    $('#best-dog').textContent = Save.data.best.dog ? `Рекорд: ${Save.data.best.dog} очк.` : 'Ещё не играл';
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
    dog: { cls: DogMode, title: 'Собачка' },
    square: { cls: SquareMode, title: 'Квадрат' },
    am300: { cls: Am300Mode, title: 'Американка 300' },
    cross: { cls: CrossMode, title: 'Навес' }
  };

  function startMode(id, inCup = false) {
    matchIsCup = inCup;
    const cup = inCup ? Cups.begin() : null;
    if (inCup && !cup) return;
    const matchDifficulty = cup ? Cups.difficulty(cup) : difficulty;
    Yards.syncBallToYard();
    paused = false;
    lastModeId = id;
    nav('match');
    $('#match-title').textContent = cup ? `${id === 'square' ? 'Квадрат' : '300'} · ${cup.stage + 1}/3` : MODES[id].title;
    $('#match-hint').classList.remove('off');
    const canvas = $('#match-canvas');
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    const ctx = canvas.getContext('2d');
    // Игровые размеры не зависят от плотности пикселей экрана.
    const W = canvas.logicalWidth = 520;
    const H = canvas.logicalHeight = W * r.height / r.width;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    if (gesture) gesture.destroy();
    gesture = new Gesture(canvas);
    const bgCache = {};
    const env = {
      canvas, ctx, W, H, gesture, hud, difficulty: matchDifficulty,
      opponentCount: cup ? 1 : opponentCount, cup: !!cup,
      bgFor(key, painter) {
        if (!bgCache[key] || bgCache[key].revision !== artRevision) {
          const oc = document.createElement('canvas');
          oc.width = canvas.width; oc.height = canvas.height;
          const background = oc.getContext('2d');
          background.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
          painter(background);
          oc.revision = artRevision;
          bgCache[key] = oc;
        }
        ctx.drawImage(bgCache[key], 0, 0, W, H);
      },
      finish(result) {
        if (cup) result.cupResult = Cups.settle(result);
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
    if (!activeMode || paused || document.hidden) return;
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
    $('#result-score').classList.toggle('cup-score', !!res.cupResult);
    $('#result-sub').textContent = res.sub || '';
    $('#result-moment').textContent = res.moment || '';
    $('#result-reward').innerHTML =
      `🪙 +${res.coins} жетонов${res.newBest ? ' &nbsp;•&nbsp; 🏆 Новый рекорд!' : ''}`;
    $('#btn-rematch').textContent = '🔁 Ещё раз';
    if (res.cupResult) {
      const r = res.cupResult;
      $('#result-title').textContent = r.status === 'won' ? 'Кубок твой!' : r.outcome === 'draw' ? 'Нужна переигровка' : r.outcome === 'loss' ? 'Кубок завершён' : 'Проходишь дальше!';
      $('#result-sub').textContent = r.status === 'won' ? 'Три этапа пройдены · +120 жетонов за кубок' : r.outcome === 'draw' ? 'Равенство на границе прохода. Сыграем этот этап ещё раз.' : r.outcome === 'loss' ? `${Cups.stages[r.stage]}: проход не состоялся. Можно начать новый кубок.` : `Далее: ${Cups.stages[Cups.current().stage]} · сложность ${Difficulty.name(Cups.difficulty())}`;
      $('#result-moment').textContent = Cups.current().history.map(h => `${Cups.stages[h.stage]}: ${h.outcome === 'win' ? '✓' : h.outcome === 'draw' ? '=' : '×'}`).join(' · ');
      if (res.penalties) $('#result-score').textContent = `Штрафы ${res.penalties.join(' : ')}`;
      $('#btn-rematch').textContent = r.status === 'ready' ? (r.outcome === 'draw' ? 'Переиграть этап' : 'Следующий этап') : 'Новый кубок';
    }
    updateCoins();
    setTimeout(Sound.coin, 400);
  }

  function updateCompetition() {
    $$('.difficulty-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.difficulty === difficulty);
      b.setAttribute('aria-pressed', b.dataset.difficulty === difficulty);
    });
    const cfg = Difficulty.dog(difficulty);
    $('#difficulty-detail').textContent = `${Difficulty.name(difficulty)} · Собачка ${cfg.passers}×${cfg.dogs} · ${cfg.hold.toFixed(1).replace('.', ',')} с на пас`;
    const c = Cups.current(), pending = c && ['ready','playing'].includes(c.status);
    $('#continue-cup').classList.toggle('hidden', !pending);
    if (pending) $('#continue-cup').textContent = `Продолжить: ${MODES[c.mode].title} · ${Cups.stages[c.stage]}`;
    $('#cup-medals').textContent = `Выиграно: квадрат ${Save.data.cupsWon.square} · американка ${Save.data.cupsWon.am300}`;
  }
  function openCup(mode) {
    const c = Cups.current();
    modal(`<h3>${mode === 'square' ? 'Кубок квадрата' : 'Кубок американки'}</h3>
      <p>Отбор → полуфинал → финал. Соперники — боты. Сложность растёт до уровня 5.</p>
      <p>${mode === 'square' ? '4 участника, до 90 секунд. В отборе и полуфинале нужно войти в двойку по наименьшему числу штрафов, в финале — стать первым. 10 штрафов — вылет. Равенство на границе прохода — переигровка.' : 'Три дуэли один на один до 300 очков. Победитель проходит дальше. При равном счёте игра продолжается.'}</p>
      <p>Старт: ${Difficulty.name(difficulty)}. Награда за весь кубок: 120 жетонов.</p>
      ${c && ['ready','playing'].includes(c.status) ? '<p>Новый кубок заменит текущий сохранённый маршрут.</p>' : ''}
      <div class="modal-actions"><button class="btn btn-paper" data-close>Назад</button><button class="btn btn-primary" id="start-cup">Начать кубок</button></div>`);
    $('#start-cup').onclick = () => { Cups.start(mode,difficulty); closeModal(); startMode(mode,true); };
  }

  /* ---------- магазин ---------- */
  let shopTab = 'yards';
  let yardEra = 'all';

  function renderShop() {
    const list = $('#shop-list');
    list.innerHTML = '';
    if (shopTab === 'yards') {
      Object.values(YARDS).filter(y =>
        (y.era || y.id === 'classic' || y.id === Save.data.selectedYard) &&
        (yardEra === 'all' || y.era === yardEra)
      ).forEach(y => {
        const owned = y.free || Save.data.ownedYards.includes(y.id);
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
          b.onclick = () => { Sound.ui(); Save.data.selectedYard = y.id; Yards.syncBallToYard(); renderShop(); paintBg('#shop-bg'); };
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
      Yards.syncBallToYard();
      const note = document.createElement('p');
      note.className = 'ball-set-note';
      note.textContent = `Мячи: ${Yards.ball().era} · 3 варианта. Эпоха меняется вместе с двором. Выбор для каждой эпохи сохраняется.`;
      list.appendChild(note);
      Yards.ballsForEra().forEach(bl => {
        const owned = Save.data.ownedBalls.includes(bl.id);
        const selected = Save.data.selectedBall === bl.id;
        const row = document.createElement('div');
        row.className = 'shop-card ball-row';
        row.innerHTML = `
          <canvas class="ball-canvas" width="128" height="128"></canvas>
          <div class="ball-info">
            <div class="ball-name">${bl.name}</div>
            <div class="ball-era">${bl.era} • ${bl.material} • одинаковая физика</div>
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
      Yards.syncBallToYard();
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
    if (current === 'match') {
      paused = true;
      if (gesture) { gesture._cancel(); gesture.enabled = false; }
    }
    const wrap = $('#modal-wrap');
    $('#modal-box').innerHTML = html;
    wrap.classList.remove('hidden');
    $$('#modal-box [data-close]').forEach(b => b.onclick = () => { closeModal(); onClose && onClose(); });
  }
  function closeModal() {
    $('#modal-wrap').classList.add('hidden');
    paused = false; lastT = performance.now();
    if (gesture) gesture.enabled = true;
  }
  $('#modal-wrap').addEventListener('click', e => { if (e.target === $('#modal-wrap')) closeModal(); });

  function settingsModal() {
    Sound.ui();
    const s = Save.data.settings;
    modal(`
      <h3>Настройки</h3>
      <div class="settings-row"><span>Звук</span><button class="toggle ${s.sound ? 'on' : ''}" id="tg-sound"></button></div>
      <div class="settings-row"><span>Вибрация</span><button class="toggle ${s.vibro ? 'on' : ''}" id="tg-vibro"></button></div>
      <p style="margin-top:12px;font-size:12.5px;opacity:.7">Версия 12.11.2026 · 14</p>
      <button class="btn btn-green" id="btn-update-game" style="width:100%;margin-top:8px">Обновить игру</button>
      <p style="margin-top:12px;font-size:12.5px;opacity:.7">Прогресс хранится на этом устройстве. Косметика не влияет на игру.</p>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Готово</button></div>`);
    $('#tg-sound').onclick = e => { s.sound = !s.sound; Save.save(); e.target.classList.toggle('on', s.sound); };
    $('#tg-vibro').onclick = e => { s.vibro = !s.vibro; Save.save(); e.target.classList.toggle('on', s.vibro); };
    $('#btn-update-game').onclick = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.replace(url.href);
    };
  }

  function pauseModal() {
    modal(`
      <h3>Пауза</h3>
      <p>${matchIsCup ? 'При возвращении текущий этап начнётся заново. Пройденные этапы сохранятся.' : 'Выйти из матча? Прогресс партии не сохранится.'}</p>
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
  $('#btn-rematch').onclick = () => {
    Sound.ui();
    if (!matchIsCup) startMode(lastModeId);
    else if (Cups.current().status === 'ready') startMode(Cups.current().mode,true);
    else openCup(Cups.current().mode);
  };
  $$('[data-cup]').forEach(b => b.onclick = () => openCup(b.dataset.cup));
  $('#continue-cup').onclick = () => startMode(Cups.current().mode,true);
  $('#btn-result-menu').onclick = () => { Sound.ui(); nav('modes'); };
  $$('[data-nav]').forEach(b => b.onclick = () => { Sound.ui(); nav(b.dataset.nav); });
  $$('.mode-card').forEach(b => b.onclick = () => { Sound.ui(); startMode(b.dataset.mode); });
  $$('.difficulty-btn').forEach(b => b.onclick = () => {
    Sound.ui(); difficulty = b.dataset.difficulty;
    Save.data.difficulty = difficulty; Save.save(); updateCompetition();
  });
  $$('.opponents-btn').forEach(b => b.onclick = () => {
    Sound.ui(); opponentCount = Number(b.dataset.opponents);
    $$('.opponents-btn').forEach(x => x.classList.toggle('active', x === b));
  });
  $$('.shop-tab').forEach(b => b.onclick = () => {
    Sound.ui(); shopTab = b.dataset.tab; syncTabs(); renderShop();
  });
  $$('.yard-era-btn').forEach(b => b.onclick = () => {
    Sound.ui(); yardEra = b.dataset.era;
    $$('.yard-era-btn').forEach(x => x.classList.toggle('active', x === b));
    renderShop();
  });
  function syncTabs() {
    $$('.shop-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === shopTab));
    $('#yard-era-filter').classList.toggle('hidden', shopTab !== 'yards');
  }

  window.addEventListener('resize', () => {
    if (current !== 'match') nav(current);
  });

  // Перерисовываем меню, когда фоновые изображения догрузились.
  window.addEventListener('art-ready', () => {
    artRevision++;
    if (current !== 'match') nav(current);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && current === 'match' && !paused) pauseModal();
  });
  Yards.syncBallToYard();
  nav('home');
})();
