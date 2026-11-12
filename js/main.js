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
  let matchOptions = {};
  let replay = null, lastActivity = null;

  /* ---------- навигация ---------- */
  function nav(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
    current = name;
    if (name !== 'match') stopLoop();
    if (name === 'home') {
      paintBg('#home-bg'); updateCoins(); updateYardLabel();
      $('#home-daily-label').textContent = Activities.daily().title;
    }
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
      const nodes = arr.map(p => {
        const pill = document.createElement('div'); pill.className = 'hud-pill';
        const label = document.createElement('span'); label.className = 'lbl'; label.textContent = p.lbl;
        const value = document.createElement('span'); value.className = 'val'; value.id = 'pill-' + p.id; value.textContent = p.val;
        pill.append(label,value);
        return pill;
      });
      $('#match-score-row').replaceChildren(...nodes);
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

  function startMode(id, inCup = false, options = {}) {
    matchIsCup = inCup;
    const cup = inCup ? Cups.begin() : null;
    if (inCup && !cup) return;
    matchOptions = options;
    replay = null; lastActivity = null;
    const cupTrial = cup?.mode === 'am300' && cup.stage < 2;
    const challenge = cupTrial ? { ...Activities.definition(cup.stage === 0 ? 'bar' : 'targets'),
      title: cup.stage === 0 ? 'Попадание в раму' : 'Девятка',
      events: cup.stage === 0 ? ['bar','post'] : ['corner'], goal:1, distinct:false,
      description: cup.stage === 0 ? 'За пять ударов попади в штангу или перекладину.' : 'За пять ударов попади в девятку.' }
      : options.challenge;
    const progress = challenge && Activities.tracker(challenge);
    const matchDifficulty = cup ? Cups.difficulty(cup) : options.tutorial ? 'beginner' : challenge?.difficulty || difficulty;
    Yards.syncBallToYard();
    if (options.online) Yards.setScene(YARDS.ru90_1);
    else if (challenge) Yards.setScene(challenge.custom ? Yards.editedTheme(challenge.custom) : YARDS[challenge.yard]);
    else Yards.setScene(Yards.theme());
    paused = false;
    lastModeId = id;
    nav('match');
    clearTimeout(hintTimer); clearTimeout(toastTimer);
    $('#match-toast').textContent = '';
    $('#match-toast').className = 'match-toast';
    $('#match-title').textContent = cup ? `${id === 'square' ? 'Квадрат' : '300'} · ${cup.stage + 1}/3` : challenge?.title || MODES[id].title;
    $('#match-hint').classList.remove('off');
    $('#btn-skip-lesson').classList.toggle('hidden', !options.tutorial);
    choose([]);
    const canvas = $('#match-canvas');
    canvas.style.width = ''; canvas.style.height = ''; canvas.style.inset = '';
    if (challenge || options.online) {
      const viewport = screens.match.getBoundingClientRect();
      const width = Math.min(viewport.width, viewport.height * 520/1120);
      canvas.style.width = width + 'px';
      canvas.style.height = width * 1120/520 + 'px';
      canvas.style.inset = '0'; canvas.style.margin = 'auto';
    } else canvas.style.margin = '';
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
      opponentCount: challenge || options.tutorial ? 0 : cup || options.quick ? 1 : opponentCount,
      cup: !!cup, cupStage: cup?.stage, tutorial: options.tutorial,
      challenge, quick: options.quick, rotateDog: options.rotateDog, online:options.online, invite:shareRoom,
      random: challenge ? Activities.random(challenge.key) : Math.random,
      choose,
      progress(event) {
        if (!progress) return;
        progress.push(event);
        hud.setPill('objective', `${progress.score}/${challenge.goal}`);
      },
      learned() {
        Save.data.tutorialSeen[id] = true;
        Save.data.playStats.lesson++;
        Save.save();
        showResult({title:'Получилось!', score:'Первый розыгрыш', sub:'Теперь попробуй в матче.', coins:0, lesson:true});
      },
      highlight(clip) {
        if (!replay || (clip.value || 0) >= (replay.value || 0)) replay = { ...clip, W, H, yard: Yards.theme() };
      },
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
        if (progress) {
          result.won = progress.score >= challenge.goal;
          if (cupTrial) {
            result.score = `${progress.score}/${challenge.goal} попаданий`;
          } else {
            const record = Activities.record(challenge, progress.score);
            lastActivity = { challenge, score:progress.score };
            result = { ...result, title:result.won ? 'Вызов выполнен!' : 'Можно точнее',
              score:`${progress.score} / ${challenge.goal}`, sub:challenge.description,
              moment:`Личный лучший результат: ${record.best}` + (challenge.friend !== undefined ? ` · результат друга: ${challenge.friend}` : '') +
                (record.bonus ? ' · Нашивка дня получена' : ''),
              coins:record.bonus, newBest:false };
          }
        }
        if (cup) result.cupResult = Cups.settle(result);
        if (!result.aborted) trackMatch();
        stopLoop();
        showResult(result);
      }
    };
    activeMode = options.online ? new OnlineMode(env) : new MODES[id].cls(env);
    if (challenge) {
      const badge = document.createElement('div'); badge.className = 'hud-pill';
      badge.innerHTML = '<span class="lbl">Цель</span><span class="val" id="pill-objective">0</span>';
      $('#match-score-row').appendChild(badge);
      hud.setPill('objective', `0/${challenge.goal}`);
      hud.hint(challenge.description);
    }
    if (cup?.mode === 'square') hud.hint(['Отбор. Сохраняй темп и держись в двойке.',
      'Полуфинал. Сильный свайп отправляет мяч в дальнюю часть четверти.',
      'Финал. Соперники чаще бьют в твою четверть. Побеждает первый.'][cup.stage]);
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
    Yards.setScene(null);
  }

  function choose(options) {
    const row = $('#match-choices');
    row.replaceChildren();
    row.classList.toggle('hidden', !options.length);
    screens.match.classList.toggle('has-choices', !!options.length);
    options.forEach((option, index) => {
      const b = document.createElement('button'); b.className = 'btn ' + (index === 0 ? 'btn-green' : 'btn-paper');
      b.textContent = option.text; b.setAttribute('aria-pressed', index === 0);
      b.onclick = () => {
        option.action();
        Array.from(row.children).forEach(el => {
          el.classList.toggle('btn-green', el === b); el.classList.toggle('btn-paper', el !== b);
          el.setAttribute('aria-pressed', el === b);
        });
      };
      row.appendChild(b);
    });
  }

  function trackMatch() {
    const stats = Save.data.playStats, date = Activities.day();
    if (!stats.first) stats.first = date;
    if (stats.last !== date) { stats.days++; stats.last = date; }
    stats.matches++;
    Save.save();
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
    if (res.lesson) $('#btn-rematch').textContent = 'Начать матч';
    if (matchOptions.online) $('#btn-rematch').textContent = 'Новая комната';
    $('#btn-share-result').classList.toggle('hidden', !lastActivity && !replay);
    $('#btn-replay').classList.toggle('hidden', !replay);
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
      <p>${mode === 'square' ? '4 участника, до 90 секунд. В отборе и полуфинале нужно войти в двойку по наименьшему числу штрафов, в финале — стать первым. В полуфинале соперники чаще бьют в дальнюю зону, в финале давят на твою четверть. Равенство на границе прохода — переигровка.' : 'Отбор — попасть в раму за пять ударов. Полуфинал — попасть в девятку за пять ударов. Финал — дуэль до 300 очков.'}</p>
      <p>Старт: ${Difficulty.name(difficulty)}. Награда за весь кубок: 120 жетонов.</p>
      ${c && ['ready','playing'].includes(c.status) ? '<p>Новый кубок заменит текущий сохранённый маршрут.</p>' : ''}
      <div class="modal-actions"><button class="btn btn-paper" data-close>Назад</button><button class="btn btn-primary" id="start-cup">Начать кубок</button></div>`);
    $('#start-cup').onclick = () => { Cups.start(mode,difficulty); closeModal(); startMode(mode,true); };
  }

  function playMode(id) {
    if (Save.data.tutorialSeen[id]) { startMode(id); return; }
    modal(`<h3>${MODES[id].title}</h3><p>Сделай один розыгрыш с подсказкой и переходи к матчу.</p>
      <div class="modal-actions"><button class="btn btn-paper" id="direct-match">Сразу в матч</button>
      <button class="btn btn-primary" id="start-lesson">Попробовать</button></div>`);
    $('#direct-match').onclick = () => {
      Save.data.tutorialSeen[id] = true; Save.save();
      closeModal(); startMode(id);
    };
    $('#start-lesson').onclick = () => { closeModal(); startMode(id,false,{ tutorial:true }); };
  }

  function activityModal(challenge) {
    const daily = challenge.key === Activities.daily().key && !challenge.custom;
    const saved = Activities.personal(challenge);
    modal(`<h3>${challenge.title}</h3>
      <p>${challenge.description}</p>
      <p class="feature-small">${challenge.custom ? 'Двор друга' : YARDS[challenge.yard].name} · Уровень 2${daily ? (saved?.reward ? ' · Нашивка получена' : ' · 30 жетонов и нашивка за первое выполнение сегодня') : ''}</p>
      ${saved ? `<p>Личный лучший результат: <b>${saved.best}</b></p>` : ''}
      ${challenge.friend !== undefined ? `<p>Результат друга: <b>${challenge.friend}</b></p>` : ''}
      <div class="modal-actions"><button class="btn btn-paper" data-close>Назад</button><button class="btn btn-primary" id="start-activity">Сыграть</button></div>`);
    $('#start-activity').onclick = () => { closeModal(); startMode(challenge.mode,false,{challenge}); };
  }
  function activitiesMenu() {
    const ids = ['targets','bar','dog','square','cross'];
    modal(`<h3>Испытания двора</h3><div class="feature-stack">${ids.map(id => {
      const item = Activities.definition(id);
      return `<button class="btn btn-paper" data-activity="${id}">${item.title}</button>`;
    }).join('')}</div><button class="btn btn-primary" data-close>Готово</button>`);
    $$('#modal-box [data-activity]').forEach(b => b.onclick = () => activityModal(Activities.definition(b.dataset.activity)));
  }
  function shareActivity(challenge, score) {
    copyDialog('Вызови друга','По ссылке откроется то же задание. Друг сыграет в удобное время и сможет прислать свой результат.',Activities.link(challenge,score));
  }
  function shareRoom(session) {
    copyDialog('Приглашение в комнату',`Код ${session.room.code}. Отправь ссылку всем участникам.`,OnlineRooms.link(session));
  }
  function copyDialog(title,description,link) {
    modal(`<h3>${title}</h3><p>${description}</p>
      <label class="room-fields">Ссылка<input class="share-link" id="share-link" readonly></label>
      <p class="feature-status" id="share-status" role="status"></p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>Готово</button><button class="btn btn-primary" id="copy-share">Копировать</button></div>`);
    $('#share-link').value = link;
    $('#copy-share').onclick = async () => {
      try { await navigator.clipboard.writeText(link); if ($('#share-status')) $('#share-status').textContent = 'Ссылка скопирована'; }
      catch { $('#share-link')?.select(); if ($('#share-status')) $('#share-status').textContent = 'Скопируй выделенную ссылку'; }
    };
  }

  function onlineLobby(invite = {}) {
    modal(`<h3>С друзьями</h3><p>Дуэль в «Американке» на двоих или «Квадрат» на четверых.</p>
      <div class="room-fields">
        <label>Адрес сервера комнат<input id="room-origin" type="url" placeholder="https://…" autocomplete="off"></label>
        <label>Код комнаты<input id="room-code" maxlength="6" autocomplete="off" placeholder="6 символов"></label>
      </div>
      <p class="feature-small">Если игра открыта с сервера комнат, адрес можно оставить пустым. Для GitHub Pages нужен адрес отдельного сервера.</p>
      <p class="feature-status" id="room-status" role="status"></p>
      <div class="feature-stack"><button class="btn btn-green" id="join-room">Войти по коду</button>
        <button class="btn btn-primary" data-create-room="am300">Создать дуэль</button>
        <button class="btn btn-paper" data-create-room="square">Создать квадрат</button></div>`);
    const origin = $('#room-origin'), code = $('#room-code'), status = $('#room-status');
    origin.value = invite.server || Save.data.roomOrigin || '';
    code.value = invite.code || Save.data.roomCode || '';
    const buttons = $$('#modal-box #join-room, #modal-box [data-create-room]');
    async function enter(mode, joining) {
      const roomCode = joining ? code.value.trim().toUpperCase() : '';
      if (joining && !/^[A-F0-9]{6}$/.test(roomCode)) { status.textContent = 'Введи шестизначный код из приглашения'; return; }
      buttons.forEach(b => b.disabled = true);
      status.textContent = 'Подключение…';
      try {
        const server = OnlineRooms.origin(origin.value);
        const session = await OnlineRooms.enter(server,mode,roomCode);
        if (!status.isConnected || $('#modal-wrap').classList.contains('hidden')) {
          OnlineRooms.request(server,'/'+session.room.code+'/leave',{body:{},token:session.token}).catch(() => {});
          return;
        }
        Save.data.roomOrigin = origin.value.trim();
        Save.data.roomCode = session.room.code; Save.save();
        closeModal(); startMode(session.room.mode,false,{online:session});
      } catch (e) { status.textContent = e.message; }
      finally { buttons.forEach(b => b.disabled = false); }
    }
    $('#join-room').onclick = () => enter(null,true);
    $$('#modal-box [data-create-room]').forEach(b => b.onclick = () => enter(b.dataset.createRoom,false));
  }

  function playReplay() {
    if (!replay) return;
    const clip = replay;
    modal(`<h3>${clip.label}</h3><canvas class="replay-preview" id="replay-canvas"></canvas>
      <div class="feature-stack"><button class="btn btn-primary" data-close>Готово</button></div>`);
    const canvas = $('#replay-canvas');
    canvas.width = 420;
    canvas.height = Math.round(clip.H/clip.W*420);
    canvas.style.maxHeight = '58dvh';
    canvas.style.width = 'auto'; canvas.style.maxWidth = '100%'; canvas.style.margin = 'auto';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width/clip.W,0,0,canvas.height/clip.H,0,0);
    const start = performance.now();
    function frame(now) {
      if (!canvas.isConnected || $('#modal-wrap').classList.contains('hidden')) return;
      const t = U.clamp((now-start-180)/800,0,1);
      const k = U.easeOut(t);
      Yards.withScene(clip.yard, () => {
        Yards.paintGoalScene(ctx,clip.W,clip.H,clip.goal);
        if (!Yards.artGoal(clip.W,clip.H)) Yards.drawGoalFrame(ctx,clip.goal);
        Yards.drawBall(ctx,U.lerp(clip.from.x,clip.to.x,k),U.lerp(clip.from.y,clip.to.y,k)-Math.sin(k*Math.PI)*clip.arc,U.lerp(15,8,k),undefined,t<1);
      });
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const editorLabels = {surface:'Покрытие',frame:'Ворота',light:'Свет',kit:'Форма',prop:'Детали'};
  function yardEditor(previous = Save.data.customYard || {base:Save.data.selectedYard}) {
    const draft = YardEditor.clean(previous);
    modal(`<h3>Мой двор</h3><canvas class="yard-editor-preview" id="yard-editor-preview" width="620" height="310"></canvas>
      <div class="editor-fields">
        <label>Эпоха<select id="edit-base">${YardEditor.bases.map(id => `<option value="${id}">${YARDS[id].era}</option>`).join('')}</select></label>
        ${Object.entries(YardEditor.fields).filter(([field]) => field !== 'kit').map(([field,values]) => `<label>${editorLabels[field]}<select id="edit-${field}">
          ${Object.entries(values).map(([key,label]) => `<option value="${key}">${label}${YardEditor.available(field,key) ? '' : ' · набор'}</option>`).join('')}</select></label>`).join('')}
      </div><p class="feature-small">Одежда игрока выбирается в магазине → «Одежда».</p><p class="feature-status" role="status" id="yard-editor-status"></p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>Закрыть</button><button class="btn btn-primary" id="save-yard">Выбрать двор</button></div>
      <div class="feature-stack"><button class="btn btn-paper" id="open-packs">Наборы оформления</button>
      <button class="btn btn-green" id="share-yard">Вызов в моём дворе</button></div>`);
    const canvas = $('#yard-editor-preview'), ctx = canvas.getContext('2d');
    function preview() {
      const t = YardEditor.clean(draft);
      Yards.withScene(Yards.editedTheme(t), () => {
        Yards.paintMenu(ctx,canvas.width,canvas.height);
        Yards.drawPlayer(ctx,canvas.width*.51,canvas.height*.91,.60,'#3f7fba','field',{moving:false});
        Yards.drawBall(ctx,canvas.width*.56,canvas.height*.90,9);
      });
      const locked = Object.keys(YardEditor.fields).some(key => key !== 'kit' && !YardEditor.available(key,t[key]));
      $('#yard-editor-status').textContent = locked ? 'Предпросмотр. Для игры открой выбранный набор.' : 'Оформление не меняет правила игры.';
      $('#save-yard').disabled = locked;
      $('#share-yard').disabled = locked;
    }
    Object.keys(draft).forEach(key => {
      const field = $('#edit-'+key); if (!field) return; field.value = draft[key];
      field.onchange = () => { draft[key] = field.value; preview(); };
    });
    $('#save-yard').onclick = () => {
      Save.data.customYard = YardEditor.clean(draft); Save.data.selectedYard = 'custom';
      Yards.syncBallToYard(); closeModal(); nav('home');
    };
    $('#open-packs').onclick = () => editorPacks(draft);
    $('#share-yard').onclick = () => shareActivity({...Activities.definition('targets'),yard:draft.base,custom:YardEditor.clean(draft)});
    preview();
  }

  function editorPacks(draft) {
    modal(`<h3>Наборы оформления</h3><p class="feature-small">Демо-витрина. При разблокировке деньги не списываются.</p>
      <div class="feature-stack">${Object.entries(YardEditor.packs).map(([id,pack]) => `<button class="btn btn-paper" data-editor-pack="${id}">${pack.title} · ${Save.data.editorPacks.includes(id) ? 'примерить' : pack.price+' ₽ в витрине'}</button>`).join('')}</div>
      <button class="btn btn-primary" id="back-to-editor">В редактор</button>`);
    $('#back-to-editor').onclick = () => yardEditor(draft);
    $$('#modal-box [data-editor-pack]').forEach(b => b.onclick = () => {
      const id = b.dataset.editorPack, pack = YardEditor.packs[id];
      if (Save.data.editorPacks.includes(id)) { yardEditor({...draft,...pack.items}); return; }
      modal(`<h3>${pack.title}</h3><p>${Object.entries(pack.items).map(([k,v]) => YardEditor.fields[k][v]).join(' · ')}</p>
        <div class="modal-actions"><button class="btn btn-paper" id="try-pack">Примерить</button><button class="btn btn-primary" id="unlock-pack">Открыть в демо</button></div>`);
      $('#try-pack').onclick = () => yardEditor({...draft,...pack.items});
      $('#unlock-pack').onclick = () => {
        Save.data.editorPacks.push(id); Save.save(); Sound.buy();
        yardEditor({...draft,...pack.items});
      };
    });
  }

  /* ---------- магазин ---------- */
  let shopTab = 'yards';
  let yardEra = 'all';
  let outfitEra = Yards.ballEra();

  function paintOutfit(canvas, animate = false) {
    const outfit = Wardrobe.catalog[canvas.dataset.outfit];
    if (!outfit) return;
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const bg = ctx.createLinearGradient(0,0,w,h);
    bg.addColorStop(0,'#243341'); bg.addColorStop(1,'#141d27');
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(248,223,172,.2)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(w/2,h-22,w*.3,10,0,0,Math.PI*2); ctx.stroke();
    const phase=performance.now()/160;
    const state=animate ? Math.floor(performance.now()/2200)%3 : 0;
    const drawn=Wardrobe.draw(ctx,w/2,h-24,(h-55)/150,outfit.id,state===2 ? 'keeper' : 'field',
      {moving:animate && state===0,kick:state===1,phase});
    if (!drawn) {
      ctx.fillStyle='#f0e6d2'; ctx.textAlign='center'; ctx.font='14px system-ui';
      ctx.fillText(Wardrobe.load(outfit.era).failed ? 'Не удалось загрузить одежду' : 'Загружаем одежду…',w/2,h/2);
    }
  }
  function outfitModal(id) {
    const item=Wardrobe.catalog[id];
    const owned=Wardrobe.owns(id);
    modal(`<h3>${item.name}</h3><canvas class="outfit-fitting" data-outfit="${id}" width="300" height="230"></canvas>
      <p>${item.description}</p><p class="feature-small">${item.style} · ${Wardrobe.eras[item.era]}. Бег, удар и игра в воротах в одном комплекте.</p>
      <p class="feature-status" role="status" id="outfit-status">${owned ? 'Комплект уже доступен.' : 'Цена: '+item.price+' игровых жетонов. Деньги не списываются.'}</p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>Назад</button>
      <button class="btn btn-primary" id="equip-outfit">${owned ? 'Надеть' : 'Купить · 🪙 '+item.price}</button></div>`);
    const preview=$('#modal-box .outfit-fitting');
    function frame() {
      if (!preview.isConnected || $('#modal-wrap').classList.contains('hidden')) return;
      paintOutfit(preview,true); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    $('#equip-outfit').onclick=() => {
      if (!Wardrobe.buy(id)) {
        $('#outfit-status').textContent=`Не хватает ${Math.max(0,item.price-Save.data.coins)} жетонов. Их можно заработать в матчах.`;
        return;
      }
      Sound.ui(); closeModal(); updateCoins(); renderShop();
    };
  }
  function renderOutfits(list) {
    const note=document.createElement('p'); note.className='ball-set-note outfit-note';
    note.textContent='Дворовая одежда бесплатна. Форма за жетоны. Выбор сохраняется для каждого десятилетия.';
    list.appendChild(note);
    const play=document.createElement('button'); play.className='btn btn-green';
    play.textContent='Играть во дворе · '+Wardrobe.eras[outfitEra];
    play.onclick=() => {
      if (Yards.ballEra()!==outfitEra) Save.data.selectedYard='ru'+outfitEra+'_1';
      Yards.syncBallToYard(); nav('modes');
    };
    list.appendChild(play);
    Wardrobe.list(outfitEra).forEach(item => {
      const selected=Wardrobe.selected(outfitEra).id===item.id;
      const card=document.createElement('div'); card.className='shop-card outfit-card';
      card.innerHTML=`<canvas class="outfit-preview" data-outfit="${item.id}" width="300" height="220"></canvas>
        <div class="shop-card-body"><div class="shop-card-title">${item.name}</div>
        <div class="outfit-category">${item.style} · ${Wardrobe.eras[item.era]} ${selected ? '· ✓ Надет' : ''}</div>
        <div class="shop-card-desc">${item.description}</div>
        <div class="shop-card-actions"><button class="btn btn-paper">${selected ? 'Посмотреть в движении' : Wardrobe.owns(item.id) ? 'Примерить и надеть' : 'Примерить · 🪙 '+item.price}</button></div></div>`;
      card.querySelector('button').onclick=() => outfitModal(item.id);
      list.appendChild(card); paintOutfit(card.querySelector('canvas'));
    });
    $$('.outfit-era-btn').forEach(b => {
      b.classList.toggle('active',b.dataset.outfitEra===outfitEra);
      b.setAttribute('aria-pressed',b.dataset.outfitEra===outfitEra);
    });
  }

  function renderShop() {
    const list = $('#shop-list');
    list.innerHTML = '';
    if (shopTab === 'outfits') { renderOutfits(list); return; }
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
        <p>«${y.name}» разблокирован и уже выбран. Можно переходить к матчу.</p>
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
      <div class="settings-row"><span>Звук</span><button class="toggle ${s.sound ? 'on' : ''}" id="tg-sound" aria-label="Звук" role="switch" aria-checked="${s.sound}"></button></div>
      <div class="settings-row"><span>Вибрация</span><button class="toggle ${s.vibro ? 'on' : ''}" id="tg-vibro" aria-label="Вибрация" role="switch" aria-checked="${s.vibro}"></button></div>
      <p class="feature-small">Матчей завершено: ${Save.data.playStats.matches} · игровых дней: ${Save.data.playStats.days} · обучений: ${Save.data.playStats.lesson} · нашивок: ${Save.data.badges}</p>
      <p style="margin-top:12px;font-size:12.5px;opacity:.7">Версия 12.11.2026 · 16</p>
      <button class="btn btn-green" id="btn-update-game" style="width:100%;margin-top:8px">Обновить игру</button>
      <p style="margin-top:12px;font-size:12.5px;opacity:.7">Прогресс хранится на этом устройстве. Косметика не влияет на игру.</p>
      <div class="modal-actions"><button class="btn btn-primary" data-close>Готово</button></div>`);
    $('#tg-sound').onclick = e => { s.sound = !s.sound; Save.save(); e.target.classList.toggle('on', s.sound); e.target.setAttribute('aria-checked',s.sound); };
    $('#tg-vibro').onclick = e => { s.vibro = !s.vibro; Save.save(); e.target.classList.toggle('on', s.vibro); e.target.setAttribute('aria-checked',s.vibro); };
    $('#btn-update-game').onclick = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.replace(url.href);
    };
  }

  function pauseModal() {
    modal(`
      <h3>Пауза</h3>
      <p>${matchOptions.online ? 'Сетевой матч продолжается, пока открыто это окно. Выход закроет начатую партию.' : matchIsCup ? 'При возвращении текущий этап начнётся заново. Пройденные этапы сохранятся.' : 'Выйти из матча? Прогресс партии не сохранится.'}</p>
      <div class="modal-actions">
        <button class="btn btn-green" data-close>Продолжить</button>
        <button class="btn btn-paper" id="quit-match">Выйти</button>
      </div>`);
    $('#quit-match').onclick = () => { closeModal(); stopLoop(); nav('modes'); };
  }

  /* ---------- события ---------- */
  $('#btn-play').onclick = () => { Sound.ui(); nav('modes'); };
  $('#btn-shop').onclick = () => { Sound.ui(); shopTab = 'yards'; syncTabs(); nav('shop'); };
  $('#btn-wardrobe').onclick = () => { Sound.ui(); shopTab='outfits'; outfitEra=Yards.ballEra(); syncTabs(); nav('shop'); };
  $('#btn-yards').onclick = () => { Sound.ui(); yardEditor(); };
  $('#btn-daily').onclick = () => activityModal(Activities.daily());
  $('#btn-online').onclick = () => onlineLobby();
  $('#btn-activities').onclick = activitiesMenu;
  $('#btn-fast-duel').onclick = () => startMode('am300',false,{quick:true});
  $('#btn-dog-roles').onclick = () => startMode('dog',false,{rotateDog:true});
  $('#btn-share-result').onclick = () => {
    if (lastActivity) shareActivity(lastActivity.challenge,lastActivity.score);
    else if (replay) shareActivity(Activities.definition(lastModeId === 'cross' ? 'cross' : 'targets'));
  };
  $('#btn-replay').onclick = playReplay;
  $('#btn-skip-lesson').onclick = () => {
    Save.data.tutorialSeen[lastModeId] = true; Save.save();
    stopLoop(); startMode(lastModeId);
  };
  $('#btn-settings').onclick = settingsModal;
  $('#btn-pause').onclick = pauseModal;
  $('#btn-rematch').onclick = () => {
    Sound.ui();
    if (matchOptions.online) onlineLobby();
    else if (!matchIsCup) startMode(lastModeId,false,matchOptions.tutorial ? {} : matchOptions);
    else if (Cups.current().status === 'ready') startMode(Cups.current().mode,true);
    else openCup(Cups.current().mode);
  };
  $$('[data-cup]').forEach(b => b.onclick = () => openCup(b.dataset.cup));
  $('#continue-cup').onclick = () => startMode(Cups.current().mode,true);
  $('#btn-result-menu').onclick = () => { Sound.ui(); nav('modes'); };
  $$('[data-nav]').forEach(b => b.onclick = () => { Sound.ui(); nav(b.dataset.nav); });
  $$('.mode-card').forEach(b => b.onclick = () => { Sound.ui(); playMode(b.dataset.mode); });
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
  $$('.outfit-era-btn').forEach(b => b.onclick = () => { outfitEra=b.dataset.outfitEra; renderShop(); });
  $$('.yard-era-btn').forEach(b => b.onclick = () => {
    Sound.ui(); yardEra = b.dataset.era;
    $$('.yard-era-btn').forEach(x => x.classList.toggle('active', x === b));
    renderShop();
  });
  function syncTabs() {
    $$('.shop-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === shopTab));
    $('#yard-era-filter').classList.toggle('hidden', shopTab !== 'yards');
    $('#outfit-era-filter').classList.toggle('hidden', shopTab !== 'outfits');
  }

  window.addEventListener('resize', () => {
    if (current !== 'match') nav(current);
  });

  // Перерисовываем меню, когда фоновые изображения догрузились.
  window.addEventListener('art-ready', () => {
    artRevision++;
    if (current !== 'match') nav(current);
  });
  window.addEventListener('wardrobe-ready', () => {
    $$('#shop-list canvas[data-outfit]').forEach(c => paintOutfit(c));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && current === 'match' && !paused) pauseModal();
  });
  Yards.syncBallToYard();
  nav('home');
  const params = new URLSearchParams(location.search);
  const invitation = Activities.fromLink(params);
  if (invitation) activityModal(invitation);
  else if (/^[A-F0-9]{6}$/.test(params.get('room') || '')) onlineLobby({code:params.get('room'),server:params.get('server') || ''});
})();
