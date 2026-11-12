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
  let opponentCount = [1,2,3].includes(Save.data.opponentCount) ? Save.data.opponentCount : 1;
  let paused = false, artRevision = 0;
  let matchIsCup = false;
  let matchOptions = {};
  let replay = null, lastActivity = null;
  let matchElapsed = 0;
  let lastGoal = null;
  let refreshYardPreview = null;
  let refreshAlbum = null;
  let modalFocus = null, modalDismiss = null, modalScreen = null;
  const nativeAndroid = $('meta[name="football-platform"]')?.content === 'android';
  let roomsAvailable = !nativeAndroid && $('meta[name="football-online"]')?.content === 'on';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const countries = [...new Set(Object.values(YARDS).map(yard => yard.country || 'Россия'))];

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
    const yard = Yards.theme();
    $('#home-yard-label').textContent = yard.name + (yard.season === 'winter' ? ' · Зима' : '');
  }
  function updateBests() {
    for (const id of Object.keys(MODES)) {
      const best = Save.data.best[id];
      $('#best-'+id).textContent = best || Save.data.playedModes[id] ? `Рекорд: ${best || 0} очк.` : '';
    }
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
  const W = 520, H = 1120;

  function fitMatchCanvas() {
    const canvas = $('#match-canvas');
    const viewport = $('#match-arena').getBoundingClientRect();
    if (!viewport.width || !viewport.height) return;
    const scale = Math.min(viewport.width/W,viewport.height/H);
    const width = W*scale, height = H*scale;
    canvas.style.width = width+'px';
    canvas.style.height = height+'px';
    const dpr = Math.min(2,window.devicePixelRatio || 1);
    const pixelsW = Math.round(width*dpr), pixelsH = Math.round(height*dpr);
    if (canvas.width !== pixelsW || canvas.height !== pixelsH) {
      gesture?._cancel();
      canvas.width = pixelsW;
      canvas.height = pixelsH;
    }
    canvas.logicalWidth = W;
    canvas.logicalHeight = H;
    canvas.getContext('2d').setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  }

  function startMode(id, inCup = false, options = {}) {
    matchIsCup = inCup;
    const cup = inCup ? Cups.begin() : null;
    if (inCup && !cup) return;
    matchOptions = options;
    replay = null; lastActivity = null;
    lastGoal = null;
    const cupTrial = cup?.mode === 'am300' && cup.stage < 2;
    const challenge = cupTrial ? { ...Activities.definition(cup.stage === 0 ? 'bar' : 'targets'),
      title: cup.stage === 0 ? 'Попадание в раму' : 'Девятка',
      events: cup.stage === 0 ? ['bar','post'] : ['corner'], goal:1, distinct:false,
      description: cup.stage === 0 ? 'За пять ударов попади в штангу или перекладину.' : 'За пять ударов попади в девятку.' }
      : options.challenge;
    const progress = challenge && Activities.tracker(challenge);
    const collection = options.tutorial || options.online || options.practice === 'solo' ? null : Collections.match();
    const matchDifficulty = cup ? Cups.difficulty(cup) : options.tutorial ? 'beginner' : challenge?.difficulty || options.difficulty || difficulty;
    Yards.syncBallToYard();
    if (options.online) Yards.setScene(options.online.room.yard ? Yards.editedTheme(options.online.room.yard.preset) : YARDS.ru90_1);
    else if (challenge) Yards.setScene(challenge.custom ? Yards.editedTheme(challenge.custom) : YARDS[challenge.yard]);
    else Yards.setScene(Yards.theme());
    paused = false;
    lastModeId = id;
    nav('match');
    clearTimeout(hintTimer); clearTimeout(toastTimer);
    $('#match-toast').textContent = '';
    $('#match-toast').className = 'match-toast';
    $('#match-title').textContent = options.online ? OnlineRooms.format(options.online.room) : options.practice === 'keeper' ? 'Удары по воротам' :
      options.practice === 'solo' ? 'Удары по мишеням' :
      cup ? `${id === 'square' ? 'Квадрат' : '300'} · ${cup.stage + 1}/3` : challenge?.title || MODES[id].title;
    $('#match-hint').classList.remove('off');
    $('#btn-skip-lesson').classList.toggle('hidden', !options.tutorial);
    // Keep the arena stable while the action buttons appear and disappear during a rally.
    $('#match-actions').hidden = !options.tutorial && id !== 'cross' && !options.online;
    choose([]);
    const canvas = $('#match-canvas');
    if (gesture) gesture.destroy();
    gesture = null;
    fitMatchCanvas();
    const ctx = canvas.getContext('2d');
    gesture = new Gesture(canvas);
    const bgCache = {};
    const env = {
      canvas, ctx, W, H, gesture, hud, difficulty: matchDifficulty,
      opponentCount: challenge || options.tutorial || options.practice ? 0 : cup || options.quick ? 1 : opponentCount,
      cup: !!cup, cupStage: cup?.stage, tutorial: options.tutorial, practice: options.practice,
      attackOnly: id === 'cross',
      challenge, quick: options.quick, rotateDog: options.rotateDog, online:options.online, invite:shareRoom, standings:showTournament,
      random: challenge ? Activities.random(challenge.key) : Math.random,
      choose,
      progress(event) {
        if (!progress) return;
        progress.push(event);
        hud.setPill('objective', `${progress.score}/${challenge.goal}`);
      },
      collect(event) { collection?.note(event); },
      goal(point) {
        collection?.note('goal');
        lastGoal = { ...point, time: matchElapsed, effect: Collections.effect() };
      },
      learned() {
        Save.data.tutorialSeen[id] = true;
        Save.data.playStats.lesson++;
        Save.save();
        showResult({title:'Получилось!', score:'Первый розыгрыш', sub:'Теперь попробуй в матче.', coins:0, lesson:true});
      },
      highlight(clip) {
        if (!replay || (clip.value || 0) >= (replay.value || 0)) {
          replay = { ...clip, W, H, yard: Yards.theme(), effect: clip.scored ? Collections.effect() : null };
        }
      },
      bgFor(key, painter) {
        if (!bgCache[key] || bgCache[key].revision !== artRevision ||
            bgCache[key].width !== canvas.width || bgCache[key].height !== canvas.height) {
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
        if (!$('#modal-wrap').classList.contains('hidden')) closeModal();
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
        if (!result.aborted) {
          result.collection = collection?.finish(Yards.theme(), result.cupResult?.status === 'won', Activities.day());
          if (!challenge && !options.practice && !options.online) Save.data.playedModes[id] = true;
          trackMatch();
        }
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
    matchElapsed = 0;
    lastT = performance.now();
    loop();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    if (!activeMode || (paused && !matchOptions.online) || document.hidden) return;
    matchElapsed += dt;
    activeMode.update(dt);
    if (!activeMode) return; // finish мог сработать внутри update
    activeMode.draw(activeMode.env.ctx);
    const { ctx, W, H } = activeMode.env;
    if (lastGoal) Collections.drawEffect(ctx,lastGoal.effect,lastGoal.x,lastGoal.y,matchElapsed-lastGoal.time,reducedMotion.matches);
    Yards.drawYardReaction(ctx, W, H, matchElapsed, lastGoal?.time);
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
    options.forEach((option, index) => {
      const selected = option.selected ?? index === 0;
      const b = document.createElement('button'); b.className = 'btn ' + (selected ? 'btn-green' : 'btn-paper');
      b.textContent = option.text; b.setAttribute('aria-pressed', selected);
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
    const rewards = (res.collection?.badges || []).map(id => 'Нашивка «' + Collections.badges[id].name + '»');
    if (res.collection?.photo) rewards.push('Снимок двора добавлен');
    $('#result-collection').textContent = rewards.join(' · ');
    $('#btn-result-album').classList.toggle('hidden', rewards.length === 0);
    $('#btn-rematch').textContent = '🔁 Ещё раз';
    $('#btn-result-menu').textContent = res.practice ? 'К тренировкам' : 'В меню';
    if (res.lesson) $('#btn-rematch').textContent = 'Начать матч';
    if (matchOptions.online) $('#btn-rematch').textContent = 'Новая комната';
    $('#btn-share-result').classList.toggle('hidden', nativeAndroid || res.practice || (!lastActivity && !replay));
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
    $('#difficulty-detail').textContent = Difficulty.name(difficulty);
    $$('.mode-card').forEach(card => {
      let label = card.querySelector('.mode-level');
      if (!label) {
        label = document.createElement('div');
        label.className = 'mode-level';
        card.querySelector('.mode-card-best').before(label);
      }
      label.textContent = Difficulty.details(card.dataset.mode,difficulty);
    });
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
    const seen = Save.data.tutorialSeen[id];
    if (seen && id !== 'am300') { startMode(id); return; }
    const rivals = id === 'am300' ? `<div class="opponents-picker"><span>Соперники</span>
      ${[1,2,3].map(n => `<button class="opponents-btn ${n === opponentCount ? 'active' : ''}" data-opponents="${n}" aria-pressed="${n === opponentCount}">${n}</button>`).join('')}</div>` : '';
    modal(`<h3>${MODES[id].title}</h3><p>${Difficulty.details(id,difficulty)}</p>${rivals}
      <div class="feature-stack"><button class="btn btn-primary" id="direct-match">${seen ? 'Начать матч' : 'Сразу в матч'}</button>
      <button class="btn btn-paper" id="start-lesson">Обучение</button><button class="btn btn-paper" data-close>Назад</button></div>`);
    $$('[data-opponents]').forEach(b => b.onclick = () => {
      opponentCount = Number(b.dataset.opponents);
      Save.data.opponentCount = opponentCount;
      Save.save();
      $$('[data-opponents]').forEach(button => {
        button.classList.toggle('active',button === b);
        button.setAttribute('aria-pressed',button === b);
      });
    });
    $('#direct-match').onclick = () => {
      Save.data.tutorialSeen[id] = true; Save.save();
      closeModal(); startMode(id);
    };
    $('#start-lesson').onclick = () => { closeModal(); startMode(id,false,{ tutorial:true }); };
  }

  function trainingMenu() {
    let level = Difficulty.ids.includes(Save.data.practiceDifficulty) ? Save.data.practiceDifficulty : difficulty;
    modal(`<h3>Тренировка</h3><div class="difficulty-picker"><span>Сложность</span>
      ${Difficulty.ids.map((id,i) => `<button class="difficulty-btn" data-practice-level="${id}"
        aria-label="${Difficulty.name(id)}">${i+1}</button>`).join('')}</div>
      <p id="practice-details"></p>
      <div class="feature-stack">
        <button class="btn btn-primary" data-practice="solo">Американка · 5 ударов</button>
        <button class="btn btn-green" data-practice="keeper">Против вратаря · 10 ударов</button>
        <button class="btn btn-paper" data-close>Назад</button>
      </div>`);
    function update() {
      $('#practice-details').textContent = `${Difficulty.details('am300',level)}. ${Difficulty.details('keeper',level)}.`;
      $$('[data-practice-level]').forEach(button => {
        const selected = button.dataset.practiceLevel === level;
        button.classList.toggle('active',selected);
        button.setAttribute('aria-pressed',selected);
      });
    }
    $$('[data-practice-level]').forEach(button => button.onclick = () => {
      level = button.dataset.practiceLevel;
      Save.data.practiceDifficulty = level;
      Save.save();
      update();
    });
    $$('[data-practice]').forEach(button => button.onclick = () => {
      closeModal();
      startMode('am300',false,{practice:button.dataset.practice,difficulty:level});
    });
    update();
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
  function shareActivity(challenge, score, onBack) {
    copyDialog('Вызови друга','По ссылке откроется то же задание. Друг сыграет в удобное время и сможет прислать свой результат.',Activities.link(challenge,score),onBack);
  }
  function shareRoom(session) {
    copyDialog('Приглашение в комнату',`Код ${session.room.code}. Отправь ссылку всем участникам.`,OnlineRooms.link(session));
  }
  function showTournament(room) {
    modal('<h3>Таблица турнира</h3><ul id="tournament-rows"></ul><button class="btn btn-primary" data-close>К матчу</button>');
    const rows = $('#tournament-rows');
    const add = text => {
      const li = document.createElement('li');
      li.textContent = text;
      rows.append(li);
    };
    const team = i => room.teams?.[i] || `Игрок ${i+1}`;
    if (room.mode === 'square') {
      room.tournament.points.map((points,i) => ({points,i})).sort((a,b) => b.points-a.points)
        .forEach(({points,i}) => add(`${team(i)} · ${points} очк.`));
    } else {
      room.tournament.history.forEach((match,i) => add(`${RoomField.stageName(room.mode,i)} · ${match.roster.map(team).join(' — ')} · ${match.roster.map(seat => match.scores[seat]).join(':')}`));
      add(`${RoomField.stageName(room.mode,room.tournament.stage)} · ${room.roster.map(team).join(' — ')}`);
    }
  }
  function copyDialog(title,description,link,onBack) {
    modal(`<h3>${title}</h3><p>${description}</p>
      <label class="room-fields">Ссылка<input class="share-link" id="share-link" readonly></label>
      <p class="feature-status" id="share-status" role="status"></p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>${onBack ? 'В редактор' : 'Готово'}</button><button class="btn btn-primary" id="copy-share">Копировать</button></div>`,onBack,onBack);
    $('#share-link').value = link;
    $('#copy-share').onclick = async () => {
      try { await navigator.clipboard.writeText(link); if ($('#share-status')) $('#share-status').textContent = 'Ссылка скопирована'; }
      catch { $('#share-link')?.select(); if ($('#share-status')) $('#share-status').textContent = 'Скопируй выделенную ссылку'; }
    };
  }

  function onlineLobby(invite = {}) {
    if (!roomsAvailable) return;
    const yard = invite.yard;
    modal(`<h3>С друзьями</h3>
      ${yard ? '<p id="yard-team"></p><div class="feature-stack"><button class="btn btn-green" id="yard-invite">Пригласить во двор</button><button class="btn btn-paper" id="yard-rating">Рейтинг двора</button><button class="btn btn-paper" id="yard-refresh">Обновить комнаты</button></div><div id="yard-rooms" class="feature-stack"></div>' : ''}
      <div class="room-fields">
        <label ${yard ? 'hidden' : ''}>Название команды<input id="room-team" maxlength="24" placeholder="Например, Соседи" autocomplete="off"></label>
        <label>Код комнаты<input id="room-code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="6 символов"></label>
        <label ${yard || document.querySelector('meta[name="football-rooms-origin"]')?.content ? 'hidden' : ''}>Адрес сервера комнат<input id="room-origin" type="url" placeholder="https://…" autocomplete="off"></label>
      </div>
      <p class="feature-status" id="room-status" role="status"></p>
      <div class="feature-stack"><button class="btn btn-green" id="join-room">Войти по коду</button>
        <button class="btn btn-primary" data-create-room="am300">Американка 1×1</button>
        <button class="btn btn-paper" data-create-room="square-2">Квадрат 1×1</button>
        <button class="btn btn-paper" data-create-room="square-4">Квадрат на четверых</button>
        <details class="room-tournaments"><summary>Турниры</summary><div class="feature-stack">
          <button class="btn btn-paper" data-create-room="cup">Кубок американки · двое</button>
          <button class="btn btn-paper" data-create-room="am300-tournament">Турнир американки · четверо</button>
          <button class="btn btn-paper" data-create-room="square-tournament">Турнир квадрата · четверо</button>
        </div></details>
        <button class="btn btn-paper" id="btn-online-yard">${yard ? 'Создать другой двор' : 'Мой двор онлайн'}</button>
        <button class="btn btn-paper" data-close>Закрыть</button></div>`);
    const origin = $('#room-origin'), code = $('#room-code'), status = $('#room-status');
    const team = $('#room-team');
    team.value = yard?.team || Save.data.teamName || '';
    team.onchange = () => {
      team.value = Save.data.teamName = RoomField.teamName(team.value);
      Save.save();
    };
    origin.value = yard?.origin || invite.server || Save.data.roomOrigin || '';
    code.value = invite.code || Save.data.roomCode || '';
    const buttons = $$('#modal-box #join-room, #modal-box [data-create-room]');
    async function enter(mode, joining) {
      const roomCode = joining ? code.value.trim().toUpperCase() : '';
      if (joining && !/^[A-F0-9]{6}$/.test(roomCode)) { status.textContent = 'Введи шестизначный код из приглашения'; return; }
      buttons.forEach(b => b.disabled = true);
      status.textContent = 'Подключение…';
      try {
        const server = OnlineRooms.origin(origin.value);
        const name = RoomField.teamName(team.value);
        const cup = mode === 'cup';
        const tournament = mode?.endsWith('-tournament') || false;
        const game = mode?.startsWith('square') ? 'square' : 'am300';
        const size = game === 'square' ? (mode === 'square-2' ? 2 : 4) : undefined;
        const session = await OnlineRooms.enter(server,game,roomCode,{team:name,cup,size,tournament,yard});
        const obsoleteServer = (cup && !session.room.cup) || (tournament && !session.room.tournament) ||
          (size && size !== session.room.capacity) || (yard && yard.code !== session.room.yard?.code);
        if (obsoleteServer || !status.isConnected || $('#modal-wrap').classList.contains('hidden')) {
          OnlineRooms.request(server,'/'+session.room.code+'/leave',{body:{},token:session.token}).catch(() => {});
          if (obsoleteServer) throw new Error('Сервер комнат нужно обновить для этого формата.');
          return;
        }
        Save.data.roomOrigin = origin.value.trim();
        if (!yard) Save.data.teamName = name;
        Save.data.roomCode = session.room.code; Save.save();
        closeModal(); startMode(session.room.mode,false,{online:session});
      } catch (e) { status.textContent = e.message; }
      finally { buttons.forEach(b => b.disabled = false); }
    }
    $('#join-room').onclick = () => enter(null,true);
    $$('#modal-box [data-create-room]').forEach(b => b.onclick = () => enter(b.dataset.createRoom,false));
    $('#btn-online-yard').onclick = () => {
      const saved = Save.data.onlineYard;
      if (!yard && saved) onlineYardMenu({code:saved.code,server:saved.origin});
      else onlineYardMenu({server:origin.value});
    };
    if (yard) {
      $('#modal-title').dataset.noTranslate = '';
      $('#modal-title').textContent = yard.name;
      $('#yard-team').dataset.noTranslate = '';
      $('#yard-team').textContent = `${I18n.text('Команда')}: ${yard.team}`;
      $('#yard-invite').onclick = () => copyDialog('Приглашение во двор','По этой ссылке друзья смогут вступить во двор.',
        OnlineRooms.inviteLink(yard.origin,null,yard.code),() => onlineLobby(invite));
      $('#yard-rating').onclick = () => yardRating(yard,() => onlineLobby(invite));
      $('#yard-refresh').onclick = () => onlineYardMenu({code:yard.code,server:yard.origin});
      for (const room of yard.rooms || []) {
        const button = document.createElement('button');
        button.className = 'btn btn-paper';
        button.textContent = `${OnlineRooms.format(room)} · ${room.host} · ${room.joined}/${room.capacity}`;
        button.onclick = () => { code.value = room.code; enter(null,true); };
        $('#yard-rooms').append(button);
      }
    }
  }

  function onlineYardMenu({code,server,preset,room} = {}) {
    if (!roomsAvailable) return;
    modal(`<h3>${code ? 'Вступить во двор' : 'Создать онлайн-двор'}</h3>
      <div class="room-fields">
        ${code ? '' : '<label>Название двора<input id="online-yard-name" maxlength="24" placeholder="Например, Наш двор"></label>'}
        <label>Название команды<input id="online-yard-team" maxlength="24" placeholder="Например, Соседи"></label>
        <label>Адрес сервера комнат<input id="online-yard-origin" type="url" placeholder="https://…"></label>
      </div>
      <p class="feature-status" id="online-yard-status" role="status"></p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>Назад</button>
        <button class="btn btn-primary" id="enter-yard">${code ? 'Войти во двор' : 'Создать двор'}</button></div>`);
    const origin = $('#online-yard-origin');
    origin.value = server || Save.data.roomOrigin || '';
    $('#online-yard-team').value = Save.data.teamName || '';
    const status = $('#online-yard-status'), button = $('#enter-yard');
    async function enter() {
      button.disabled = true;
      try {
        const address = OnlineRooms.origin(origin.value);
        const yard = await OnlineYards.enter(address,{code,name:$('#online-yard-name')?.value,
          team:$('#online-yard-team').value,preset:preset || Save.data.customYard || {base:Save.data.selectedYard,season:Save.data.yardSeason}});
        if (status.isConnected && !$('#modal-wrap').classList.contains('hidden')) onlineLobby({yard,code:room});
      } catch (e) { status.textContent = e.message; }
      finally { button.disabled = false; }
    }
    button.onclick = enter;
    if (code) {
      try {
        if (OnlineYards.token(OnlineRooms.origin(origin.value),code)) enter();
      } catch { /* the server address can be filled in manually */ }
    }
  }

  function yardRating(yard,onBack) {
    modal('<h3>Рейтинг двора</h3><p>Победа — 3 очка, ничья — 1.</p><div id="yard-ratings"></div><button class="btn btn-paper" data-close>Во двор</button>',onBack,onBack);
    const list = $('#yard-ratings');
    const modes = {'square-2':'Квадрат 1×1','square-4':'Квадрат на четверых',am300:'Американка 1×1',
      cup:'Кубок американки','square-tournament':'Турнир квадрата','am300-tournament':'Турнир американки'};
    const entries = Object.entries(yard.standings || {});
    if (!entries.length) list.textContent = 'Здесь появятся результаты после первого матча во дворе.';
    for (const [mode,rows] of entries) {
      const title = document.createElement('h4');
      title.textContent = modes[mode];
      const ranking = document.createElement('ol');
      for (const row of rows) {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.dataset.noTranslate = '';
        name.textContent = row.name;
        li.append(name,` · ${row.points} очк. · игр: ${row.played}`);
        ranking.append(li);
      }
      list.append(title,ranking);
    }
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
      const elapsed = now - start - 180;
      const t = U.clamp(elapsed / 800, 0, 1);
      const k = U.easeOut(t);
      const rebound = clip.rebound ? U.clamp((elapsed - 800) / 320, 0, 1) : 0;
      const x = rebound ? U.lerp(clip.to.x, clip.rebound.x, rebound) : U.lerp(clip.from.x, clip.to.x, k);
      const y = rebound ? U.lerp(clip.to.y, clip.rebound.y, rebound) - Math.sin(rebound * Math.PI) * 12 :
        U.lerp(clip.from.y, clip.to.y, k) - Math.sin(k * Math.PI) * clip.arc;
      const flying = t < 1 || Boolean(clip.rebound && rebound < 1);
      const playing = flying || Boolean(clip.effect && elapsed < 1650);
      Yards.withScene(clip.yard, () => {
        Yards.paintGoalScene(ctx,clip.W,clip.H,clip.goal);
        if (!Yards.artGoal(clip.W,clip.H)) Yards.drawGoalFrame(ctx,clip.goal);
        Yards.drawBall(ctx,x,y,U.lerp(15,8,k),undefined,flying);
        if (clip.effect && t === 1) Collections.drawEffect(ctx,clip.effect,x,y,(elapsed-800)/1000,reducedMotion.matches);
      });
      if (playing) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function albumYard(photo) {
    return photo.custom ? Yards.editedTheme(photo.custom) : Yards.seasonal(YARDS[photo.base],photo.season);
  }
  function paintAlbumPhoto(canvas, photo) {
    const ctx = canvas.getContext('2d');
    Yards.withScene(albumYard(photo), () => Yards.paintMenu(ctx,canvas.width,canvas.height));
  }
  function openAlbum(tab = 'badges') {
    const photos = Object.values(Save.data.collection.photos)
      .filter(photo => photo && Object.hasOwn(YARDS,photo.base)).reverse();
    const earned = Save.data.collection.badges;
    modal(`<h3>Альбом дворов</h3>
      <div class="yard-country-filter">
        <button class="yard-era-btn ${tab === 'badges' ? 'active' : ''}" id="album-badges" aria-pressed="${tab === 'badges'}">Нашивки</button>
        <button class="yard-era-btn ${tab === 'photos' ? 'active' : ''}" id="album-photos" aria-pressed="${tab === 'photos'}">Фотографии</button>
      </div>
      <div id="album-content"></div>
      <div class="feature-stack"><button class="btn btn-primary" data-close>Готово</button></div>`);
    $('#album-badges').onclick = () => openAlbum('badges');
    $('#album-photos').onclick = () => openAlbum('photos');
    const content = $('#album-content');
    if (tab === 'badges') {
      content.innerHTML = `<p class="feature-small">Нашивки за мастерство · ${Object.keys(Collections.badges).filter(id => earned.includes(id)).length}/6</p>` +
        Object.entries(Collections.badges).map(([id,badge]) => `<div class="collection-row">
          <span class="collection-icon" aria-hidden="true">${badge.icon}</span>
          <div><strong>${badge.name}</strong>
          <p>${badge.detail}</p>
          <span class="collection-mark">${earned.includes(id) ? '✓ Получена' : 'Задание'}</span></div></div>`).join('') +
        `<p class="feature-small">Нашивки вызова дня · ${Number(Save.data.badges) || 0}</p>`;
      return;
    }
    if (!photos.length) content.innerHTML = '<p>Заверши матч с выполненным заданием на нашивку, чтобы добавить снимок двора.</p>';
    const list = document.createElement('div');
    list.className = 'feature-stack';
    content.appendChild(list);
    const previews = [];
    if (Save.openCatalog) {
      const scene = Yards.theme();
      photos.unshift({base:scene.custom?.base || scene.id,season:scene.season,custom:scene.custom,sample:true});
    }
    photos.forEach(photo => {
      const card = document.createElement('button');
      card.className = 'collection-photo';
      const name = albumYard(photo).name + (photo.season === 'winter' ? ' · Зима' : '');
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 200;
      const caption = document.createElement('span');
      caption.textContent = photo.sample ? 'Пример снимка · ' + name : name;
      card.append(canvas,caption);
      card.onclick = () => showAlbumPhoto(photo,name);
      list.appendChild(card);
      previews.push([canvas,photo]);
    });
    refreshAlbum = () => {
      if (list.isConnected && !$('#modal-wrap').classList.contains('hidden')) {
        previews.forEach(([canvas,photo]) => paintAlbumPhoto(canvas,photo));
      }
    };
    refreshAlbum();
  }
  function showAlbumPhoto(photo,name) {
    modal(`<h3>${name}</h3><canvas class="collection-large-photo" width="540" height="432"></canvas>
      <p class="feature-small">${photo.sample ? 'Пример снимка' : Collections.badges[photo.reason]?.name || 'Снимок из матча'}</p>
      <div class="feature-stack"><button class="btn btn-paper" id="back-to-album">В альбом</button></div>`);
    const canvas = $('.collection-large-photo');
    refreshAlbum = () => {
      if (canvas.isConnected && !$('#modal-wrap').classList.contains('hidden')) paintAlbumPhoto(canvas,photo);
    };
    $('#back-to-album').onclick = () => openAlbum('photos');
    refreshAlbum();
  }

  const editorLabels = {surface:'Покрытие',frame:'Ворота',light:'Свет'};
  const ownsYard = yard => Save.openCatalog || yard.free || Save.data.ownedYards.includes(yard.id);
  function yardEditor(previous = Save.data.customYard || {base:Save.data.selectedYard}) {
    const draft = YardEditor.clean({ ...previous, season: previous.season ?? Save.data.yardSeason });
    modal(`<h3>Мой двор</h3><canvas class="yard-editor-preview" id="yard-editor-preview" width="620" height="360"></canvas>
      <div class="editor-fields">
        <label>Страна<select id="edit-country">${countries.map(name => `<option>${name}</option>`).join('')}</select></label>
        <label>Площадка<select id="edit-base"></select></label>
        <label id="edit-season-label">Сезон<select id="edit-season"><option value="summer">Лето</option><option value="winter">Зима</option></select></label>
        ${Object.entries(editorLabels).map(([field,label]) => `<label><span id="edit-${field}-caption">${label}</span><select id="edit-${field}">
          ${Object.entries(YardEditor.fields[field]).map(([key,label]) => `<option value="${key}">${label}${YardEditor.available(field,key) ? '' : ' · набор'}</option>`).join('')}</select></label>`).join('')}
      </div>
      <fieldset class="yard-decorations"><legend>Детали и зрители</legend>
        ${Object.entries(YardEditor.decorations).map(([id,label]) => `<label>
          <input type="checkbox" value="${id}" ${draft.props.includes(id) ? 'checked' : ''}>
          <span>${label}${YardEditor.available('prop',id) ? '' : ' · набор'}</span></label>`).join('')}
      </fieldset>
      <p class="feature-status" role="status" id="yard-editor-status"></p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>Закрыть</button><button class="btn btn-primary" id="save-yard">Сохранить</button></div>
      <div class="feature-stack"><button class="btn btn-paper" id="open-packs">Наборы оформления</button>
      <button class="btn btn-green" id="share-yard" ${nativeAndroid ? 'hidden' : ''}>Вызов в моём дворе</button>
      <button class="btn btn-paper" id="create-online-yard" ${roomsAvailable ? '' : 'hidden'}>Создать этот двор онлайн</button></div>`);
    const canvas = $('#yard-editor-preview'), ctx = canvas.getContext('2d');
    const country = $('#edit-country'), base = $('#edit-base'), season = $('#edit-season');
    country.value = YARDS[draft.base].country;
    if (country.value !== 'Россия') draft.season = Save.data.yardSeason === 'winter' ? 'winter' : 'summer';
    season.value = draft.season;
    function updateBases() {
      base.replaceChildren(...YardEditor.bases.map(id => YARDS[id]).filter(y => y.country === country.value)
        .map(y => new Option(y.name.replace(/^Россия, /, '') + (ownsYard(y) ? '' : ' · в магазине'), y.id)));
      base.value = draft.base;
      if (!base.value) base.selectedIndex = 0;
      draft.base = base.value;
      $('#edit-season-label').hidden = country.value !== 'Россия';
    }
    function preview() {
      if (!canvas.isConnected || $('#modal-wrap').classList.contains('hidden')) return;
      const t = YardEditor.clean(draft);
      $('#edit-surface-caption').textContent = t.season === 'winter' ? 'Покрытие летом' : 'Покрытие';
      Yards.withScene(Yards.editedTheme(t), () => {
        Yards.paintMenu(ctx,canvas.width,canvas.height);
        Yards.drawPlayer(ctx,canvas.width*.51,canvas.height*.91,.60,'#3f7fba','field',{moving:false});
        Yards.drawBall(ctx,canvas.width*.56,canvas.height*.90,9);
      });
      const lockedBase = !ownsYard(YARDS[t.base]);
      const lockedPack = Object.keys(editorLabels).some(key => !YardEditor.available(key,t[key])) ||
        t.props.some(id => !YardEditor.available('prop',id));
      $('#yard-editor-status').textContent = lockedBase ? 'Площадку можно открыть в магазине дворов.' :
        lockedPack ? 'Выбранные детали доступны в наборах оформления.' : '';
      $('#save-yard').disabled = lockedBase || lockedPack;
      $('#share-yard').disabled = lockedBase || lockedPack;
      $('#create-online-yard').disabled = lockedBase || lockedPack;
    }
    Object.keys(editorLabels).forEach(key => {
      const field = $('#edit-'+key); field.value = draft[key];
      field.onchange = () => { draft[key] = field.value; preview(); };
    });
    country.onchange = () => { updateBases(); preview(); };
    base.onchange = () => { draft.base = base.value; preview(); };
    season.onchange = () => { draft.season = season.value; preview(); };
    $$('.yard-decorations input').forEach(input => input.onchange = () => {
      draft.props = $$('.yard-decorations input:checked').map(box => box.value);
      preview();
    });
    $('#save-yard').onclick = () => {
      Save.data.customYard = YardEditor.clean(draft);
      if (country.value === 'Россия') Save.data.yardSeason = draft.season;
      Save.data.selectedYard = 'custom';
      Yards.syncBallToYard(); closeModal(); nav('home');
    };
    $('#open-packs').onclick = () => editorPacks(draft);
    $('#share-yard').onclick = () => shareActivity({...Activities.definition('targets'),yard:draft.base,custom:YardEditor.clean(draft)},
      undefined,() => yardEditor(draft));
    $('#create-online-yard').onclick = () => onlineYardMenu({preset:YardEditor.clean(draft)});
    updateBases();
    refreshYardPreview = preview;
    preview();
  }

  function editorPacks(draft) {
    modal(`<h3>Наборы оформления</h3><p class="feature-small">Все предметы доступны бесплатно.</p>
      <div class="feature-stack">${Object.entries(YardEditor.packs).map(([id,pack]) => `<button class="btn btn-paper" data-editor-pack="${id}">${pack.title} · ${Save.openCatalog || Save.data.editorPacks.includes(id) ? 'примерить' : pack.price+' ₽ в витрине'}</button>`).join('')}</div>
      <button class="btn btn-primary" id="back-to-editor">В редактор</button>`);
    $('#back-to-editor').onclick = () => yardEditor(draft);
    $$('#modal-box [data-editor-pack]').forEach(b => b.onclick = () => {
      const id = b.dataset.editorPack, pack = YardEditor.packs[id];
      const preset = { ...draft, ...pack.items, props: [...draft.props, pack.items.prop] };
      if (Save.openCatalog || Save.data.editorPacks.includes(id)) { yardEditor(preset); return; }
      modal(`<h3>${pack.title}</h3><p>${Object.entries(pack.items).map(([k,v]) => YardEditor.fields[k][v]).join(' · ')}</p>
        <div class="modal-actions"><button class="btn btn-paper" id="try-pack">Примерить</button><button class="btn btn-primary" id="unlock-pack">Открыть в демо</button></div>`);
      $('#try-pack').onclick = () => yardEditor(preset);
      $('#unlock-pack').onclick = () => {
        Save.data.editorPacks.push(id); Save.save(); Sound.buy();
        yardEditor(preset);
      };
    });
  }

  /* ---------- магазин ---------- */
  let shopTab = 'yards';
  let outfitTab = 'kits';
  let yardEra = 'all';
  let yardCountry = Yards.theme().country || 'Россия';
  let outfitEra = Yards.ballEra();
  let outfitCountry = Object.hasOwn(Wardrobe.countries,Yards.theme().country) ? Yards.theme().country : '';

  function selectCurrentOutfitCollection() {
    const country = Yards.theme().country;
    outfitCountry = Object.hasOwn(Wardrobe.countries,country) ? country : '';
    outfitEra = Yards.ballEra();
  }

  function paintOutfit(canvas, animate = false) {
    const outfit = Wardrobe.catalog[canvas.dataset.outfit];
    if (!outfit) return;
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const bg = ctx.createLinearGradient(0,0,w,h);
    bg.addColorStop(0,'#243341'); bg.addColorStop(1,'#141d27');
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
    const shoes = canvas.dataset.shoes ? canvas.dataset.shoes === 'special' : Collections.hasShoesEquipped(outfit.era);
    if (canvas.dataset.footwear) {
      if (!Wardrobe.drawFootwear(ctx,w,h,outfit.id,shoes)) {
        ctx.fillStyle='#f0e6d2'; ctx.textAlign='center'; ctx.font='14px system-ui';
        ctx.fillText('Загружаем обувь…',w/2,h/2);
      }
      return;
    }
    ctx.strokeStyle='rgba(248,223,172,.2)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(w/2,h-22,w*.3,10,0,0,Math.PI*2); ctx.stroke();
    const phase=performance.now()/160;
    const state=animate ? Math.floor(performance.now()/2200)%3 : 0;
    const drawn=Wardrobe.draw(ctx,w/2,h-24,(h-55)/150,outfit.id,state===2 ? 'keeper' : 'field',
      {moving:animate && state===0,kick:state===1,phase,shoes});
    if (!drawn) {
      ctx.fillStyle='#f0e6d2'; ctx.textAlign='center'; ctx.font='14px system-ui';
      ctx.fillText(Wardrobe.load(outfit.asset || outfit.era).failed ? 'Не удалось загрузить одежду' : 'Загружаем одежду…',w/2,h/2);
    }
  }
  function outfitModal(id) {
    const item=Wardrobe.catalog[id];
    const owned=Wardrobe.owns(id);
    modal(`<h3>${item.name}</h3><canvas class="outfit-fitting" data-outfit="${id}" width="300" height="230"></canvas>
      <p>${item.description}</p><p class="feature-small">${item.style} · ${item.country || Wardrobe.eras[item.era]}</p>
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
    const country = outfitTab === 'kits' ? outfitCountry : '';
    const note=document.createElement('p'); note.className='ball-set-note outfit-note';
    note.textContent=country ? 'Комплект можно надеть во всех дворах этой страны.' :
      outfitTab === 'shoes' ? 'Обувь для комплектов по эпохам.' : 'Комплект сохраняется отдельно для каждого десятилетия.';
    list.appendChild(note);
    const play=document.createElement('button'); play.className='btn btn-green';
    play.textContent='Играть во дворе · '+(country || Wardrobe.eras[outfitEra]);
    play.onclick=() => {
      if (country && Yards.theme().country !== country) {
        Save.data.selectedYard = Object.values(YARDS).find(yard => yard.country === country && yard.free).id;
      } else if (!country && (Yards.ballEra() !== outfitEra || Object.hasOwn(Wardrobe.countries,Yards.theme().country))) {
        Save.data.selectedYard='ru'+outfitEra+'_1';
      }
      Yards.syncBallToYard(); nav('modes');
    };
    list.appendChild(play);
    if (outfitTab === 'shoes') renderShoes(list);
    else Wardrobe.list(outfitEra,country).forEach(item => {
      const selected=Wardrobe.selected(outfitEra,country).id===item.id;
      const card=document.createElement('div'); card.className='shop-card outfit-card';
      card.innerHTML=`<canvas class="outfit-preview" data-outfit="${item.id}" width="300" height="220"></canvas>
        <div class="shop-card-body"><div class="shop-card-title">${item.name}</div>
        <div class="outfit-category">${item.style} · ${item.country || Wardrobe.eras[item.era]} ${selected ? '· ✓ Надет' : ''}</div>
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

  function renderShoes(list) {
    const era = outfitEra, outfit = Wardrobe.selected(era);
    const equipped = Collections.hasShoesEquipped(era);
    for (const special of [false,true]) {
      const item = special ? Collections.shoes[era] :
        {name:'Обувь из комплекта',detail:'Подбирается вместе с выбранной одеждой.'};
      const card = document.createElement('div');
      card.className = 'shop-card outfit-card';
      card.innerHTML = `<canvas class="outfit-preview footwear-preview" data-outfit="${outfit.id}"
        data-shoes="${special ? 'special' : 'base'}" data-footwear="true" width="300" height="128"></canvas>
        <div class="shop-card-body"><div class="shop-card-title">${item.name}</div>
          <div class="outfit-category">${Wardrobe.eras[era]} ${equipped === special ? '· ✓ Надета' : ''}</div>
          <div class="shop-card-desc">${item.detail}</div>
          <div class="shop-card-actions"><button class="btn btn-paper">Примерить</button></div>
        </div>`;
      card.querySelector('button').onclick = () => shoeModal(era,special,item);
      list.appendChild(card);
      paintOutfit(card.querySelector('canvas'));
    }
  }
  function shoeModal(era,special,item) {
    const owned = !special || Collections.ownsShoes(era);
    modal(`<h3>${item.name}</h3><canvas class="outfit-fitting" data-outfit="${Wardrobe.selected(era).id}"
      data-shoes="${special ? 'special' : 'base'}" width="300" height="230"></canvas>
      <p>${item.detail}</p><p class="feature-status" role="status" id="shoe-status"></p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>Назад</button>
      <button class="btn btn-primary" id="equip-shoes">${owned ? 'Надеть' : 'Купить · 🪙 ' + item.price}</button></div>`);
    const canvas = $('#modal-box .outfit-fitting');
    function frame() {
      if (!canvas.isConnected || $('#modal-wrap').classList.contains('hidden')) return;
      paintOutfit(canvas,true);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    $('#equip-shoes').onclick = () => {
      if (!Collections.equipShoes(era,special)) {
        $('#shoe-status').textContent = 'Не хватает жетонов.';
        return;
      }
      closeModal(); updateCoins(); renderShop();
    };
  }
  function paintEffect(canvas,id,time) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#293746';
    ctx.fillRect(0,0,w,h);
    Yards.drawGoalFrame(ctx,{x:w*.22,y:h*.85,w:w*.56,h:h*.69});
    Yards.drawBall(ctx,w/2,h*.52,10);
    Collections.drawEffect(ctx,id,w/2,h*.52,time,reducedMotion.matches);
  }
  function renderEffects(list) {
    Object.entries(Collections.effects).forEach(([id,item]) => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `<canvas class="effect-preview" width="300" height="120"></canvas>
        <div class="shop-card-body"><div class="shop-card-title">${item.name}</div>
        <div class="shop-card-desc">${item.detail}${Collections.effect() === id ? ' · ✓ Выбран' : ''}</div>
        <div class="shop-card-actions"><button class="btn btn-paper">Посмотреть эффект</button></div></div>`;
      card.querySelector('button').onclick = () => effectModal(id,item);
      list.appendChild(card);
      paintEffect(card.querySelector('canvas'),id,.29);
    });
  }
  function effectModal(id,item) {
    const owned = Collections.ownsEffect(id);
    modal(`<h3>${item.name}</h3><canvas class="outfit-fitting" width="300" height="150"></canvas>
      <p>${item.detail}</p><p class="feature-status" role="status" id="effect-status"></p>
      <div class="modal-actions"><button class="btn btn-paper" data-close>Назад</button>
      <button class="btn btn-primary" id="equip-effect">${owned ? 'Выбрать' : item.badge ? 'Как получить' : 'Купить · 🪙 '+item.price}</button></div>`);
    const canvas = $('#modal-box .outfit-fitting'), start = performance.now();
    function frame(now) {
      if (!canvas.isConnected || $('#modal-wrap').classList.contains('hidden')) return;
      paintEffect(canvas,id,((now-start)%1600)/1000);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    $('#equip-effect').onclick = () => {
      if (!Collections.equipEffect(id)) {
        $('#effect-status').textContent = item.badge ? Collections.badges[item.badge].detail : 'Не хватает жетонов.';
        return;
      }
      closeModal(); updateCoins(); renderShop();
    };
  }

  function renderShop() {
    const list = $('#shop-list');
    list.innerHTML = '';
    if (shopTab === 'outfits') { renderOutfits(list); return; }
    if (shopTab === 'effects') { renderEffects(list); return; }
    if (shopTab === 'yards') {
      Object.values(YARDS).filter(y =>
        (y.country || 'Россия') === yardCountry &&
        (y.era || y.id === 'classic' || y.id === Save.data.selectedYard) &&
        (yardEra === 'all' || y.era === yardEra)
      ).forEach(y => {
        const owned = ownsYard(y);
        const selected = Save.data.selectedYard === y.id;
        const view = Yards.seasonal(y, Save.data.yardSeason);
        const winter = view.season === 'winter';
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.innerHTML = `
          <canvas class="shop-card-preview"></canvas>
          <div class="shop-card-body">
          <div class="shop-card-title">${view.name}
              ${y.free || Save.openCatalog ? '<span class="tag tag-free">Бесплатно</span>'
                : owned ? '<span class="tag tag-owned">Куплено</span>'
                : y.priceCoins ? '<span class="tag tag-paid">За жетоны</span>' : '<span class="tag tag-paid">Платный набор</span>'}
            </div>
            <div class="shop-card-desc">${winter ? 'Утоптанный снег на площадке и сугробы у края двора.' : y.desc}</div>
            <div class="shop-card-items">${winter ? 'Зимнее оформление' : y.items}</div>
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
          price.textContent = y.priceCoins ? '🪙 ' + y.priceCoins : y.priceRub + ' ₽';
          const b = document.createElement('button');
          b.className = 'btn btn-primary';
          b.textContent = y.priceCoins ? 'Открыть' : 'Купить';
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
      note.textContent = `Мячи: ${Yards.ball().era} · ${Yards.ballsForEra().length} варианта. Выбор сохраняется для каждой эпохи.`;
      list.appendChild(note);
      Yards.ballsForEra().forEach(bl => {
        const owned = Yards.ownsBall(bl.id);
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
    const price = y.priceCoins ? y.priceCoins + ' жетонов' : y.priceRub + ' ₽';
    modal(`
      <h3>${y.name} — ${price}</h3>
      <p>${y.desc}</p>
      <p><b>В наборе:</b> ${y.items}.</p>
      <p>Двор — чистая косметика: размер площадки, физика мяча и окна тайминга не меняются.</p>
      ${y.priceCoins ? '<p id="yard-purchase-status" role="status"></p>' :
        '<div class="demo-note">Демо-покупка. Деньги не списываются.</div>'}
      <div class="modal-actions">
        <button class="btn btn-paper" data-close>Отмена</button>
        <button class="btn btn-primary" id="confirm-buy">${y.priceCoins ? 'Открыть за жетоны' : 'Открыть в демо'}</button>
      </div>`);
    $('#confirm-buy').onclick = () => {
      if (!ownsYard(y)) {
        if (y.priceCoins && Save.data.coins < y.priceCoins) {
          $('#yard-purchase-status').textContent = `Не хватает ${y.priceCoins - Save.data.coins} жетонов.`;
          return;
        }
        Save.data.coins -= y.priceCoins || 0;
        Save.data.ownedYards.push(y.id);
      }
      Save.data.selectedYard = y.id;
      Yards.syncBallToYard();
      Sound.buy();
      closeModal();
      updateCoins(); renderShop(); paintBg('#shop-bg');
      modal(`<h3>Двор твой! 🎉</h3>
        <p>«${y.name}» разблокирован и уже выбран. Можно переходить к матчу.</p>
        <div class="modal-actions"><button class="btn btn-green" data-close>Сыграть</button></div>`,
        () => nav('modes'));
    };
  }

  /* ---------- модалки ---------- */
  function modal(html, onClose, onDismiss) {
    if (current === 'match') {
      paused = true;
      if (gesture) { gesture._cancel(); gesture.enabled = false; }
    }
    const wrap = $('#modal-wrap');
    if (wrap.classList.contains('hidden')) {
      modalFocus = document.activeElement;
      modalScreen = screens[current];
    }
    modalDismiss = onDismiss;
    modalScreen.inert = true;
    const box = $('#modal-box');
    box.innerHTML = html;
    box.scrollTop = 0;
    wrap.classList.remove('hidden');
    const title = box.querySelector('h3');
    if (title) {
      title.id = 'modal-title';
      title.tabIndex = -1;
      title.focus({preventScroll:true});
    }
    $$('#modal-box [data-close]').forEach(b => b.onclick = () => { closeModal(); onClose && onClose(); });
  }
  function closeModal() {
    $('#modal-wrap').classList.add('hidden');
    if (modalScreen) modalScreen.inert = false;
    modalScreen = null;
    modalDismiss = null;
    const trigger = modalFocus;
    trigger?.focus({preventScroll:true});
    modalFocus = null;
    queueMicrotask(() => {
      if ($('#modal-wrap').classList.contains('hidden') && document.activeElement === document.body) {
        const visible = [...screens[current].querySelectorAll('button,select,a[href]')]
          .find(control => !control.disabled && control.getClientRects().length);
        visible?.focus({preventScroll:true});
      }
    });
    paused = false; lastT = performance.now();
    if (gesture) gesture.enabled = true;
  }
  function dismissModal() {
    const onDismiss = modalDismiss;
    closeModal();
    onDismiss?.();
  }
  const modalWrap = $('#modal-wrap');
  let backdropPress = false;
  modalWrap.addEventListener('pointerdown', e => { backdropPress = e.target === modalWrap; });
  modalWrap.addEventListener('click', e => {
    if (backdropPress && e.target === modalWrap) dismissModal();
    backdropPress = false;
  });
  function modalControls() {
    return $$('#modal-box button, #modal-box input, #modal-box select, #modal-box a[href], #modal-box summary, #modal-box [tabindex]')
      .filter(control => !control.matches(':disabled') && control.tabIndex >= 0 && control.getClientRects().length);
  }
  document.addEventListener('focusin', event => {
    if (!modalWrap.classList.contains('hidden') && !modalWrap.contains(event.target)) {
      ($('#modal-title') || modalControls()[0])?.focus({preventScroll:true});
    }
  });
  document.addEventListener('keydown', event => {
    if ($('#modal-wrap').classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissModal();
    } else if (event.key === 'Tab') {
      const controls = modalControls();
      const index = controls.indexOf(document.activeElement);
      if (!controls.length || index < 0 || (event.shiftKey ? index === 0 : index === controls.length-1)) {
        event.preventDefault();
        (controls[event.shiftKey ? controls.length-1 : 0] || $('#modal-title'))?.focus();
      }
    }
  });

  function settingsModal() {
    Sound.ui();
    const s = Save.data.settings;
    modal(`
      <h3>Настройки</h3>
      <div class="settings-row"><span>Звук</span><button class="toggle ${s.sound ? 'on' : ''}" id="tg-sound" aria-label="Звук" role="switch" aria-checked="${s.sound}"></button></div>
      <div class="settings-row"><span>Вибрация</span><button class="toggle ${s.vibro ? 'on' : ''}" id="tg-vibro" aria-label="Вибрация" role="switch" aria-checked="${s.vibro}"></button></div>
      <p class="feature-small">Матчей завершено: ${Save.data.playStats.matches} · игровых дней: ${Save.data.playStats.days} · обучений: ${Save.data.playStats.lesson} · нашивок: ${Save.data.badges}</p>
      <p style="margin-top:12px;font-size:12.5px;opacity:.7">Версия 12.11.2026 · 23</p>
      <button class="btn btn-green" id="btn-update-game" ${nativeAndroid ? 'hidden' : ''} style="width:100%;margin-top:8px">Обновить игру</button>
      <p style="margin-top:12px;font-size:12.5px;opacity:.7">Прогресс хранится на этом устройстве. Косметика не влияет на игру.</p>
      <p><a href="privacy.html">Политика конфиденциальности</a></p>
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
  $('#btn-training').onclick = trainingMenu;
  $('#btn-training-home').onclick = trainingMenu;
  $('#btn-shop').onclick = () => {
    Sound.ui();
    shopTab = 'yards';
    yardCountry = Yards.theme().country || 'Россия';
    yardEra = 'all';
    syncTabs();
    nav('shop');
  };
  $('#btn-wardrobe').onclick = () => {
    Sound.ui(); shopTab='outfits'; outfitTab='kits'; selectCurrentOutfitCollection(); syncTabs(); nav('shop');
  };
  $('#btn-yards').onclick = () => { Sound.ui(); yardEditor(); };
  $('#btn-album').onclick = () => openAlbum();
  $('#btn-result-album').onclick = () => openAlbum('photos');
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
    if (matchOptions.online?.yard) onlineYardMenu({code:matchOptions.online.yard.code,server:matchOptions.online.origin});
    else if (matchOptions.online) onlineLobby();
    else if (!matchIsCup) startMode(lastModeId,false,matchOptions.tutorial ? {} : matchOptions);
    else if (Cups.current().status === 'ready') startMode(Cups.current().mode,true);
    else openCup(Cups.current().mode);
  };
  $$('[data-cup]').forEach(b => b.onclick = () => openCup(b.dataset.cup));
  $('#continue-cup').onclick = () => startMode(Cups.current().mode,true);
  $('#btn-result-menu').onclick = () => {
    Sound.ui();
    nav('modes');
    if (matchOptions.practice) trainingMenu();
  };
  $$('[data-nav]').forEach(b => b.onclick = () => { Sound.ui(); nav(b.dataset.nav); });
  $$('.mode-card').forEach(b => b.onclick = () => { Sound.ui(); playMode(b.dataset.mode); });
  $$('[data-difficulty]').forEach(b => b.onclick = () => {
    Sound.ui(); difficulty = b.dataset.difficulty;
    Save.data.difficulty = difficulty; Save.save(); updateCompetition();
  });
  $$('.shop-tab').forEach(b => b.onclick = () => {
    Sound.ui();
    shopTab = b.dataset.tab;
    if (shopTab === 'outfits') selectCurrentOutfitCollection();
    syncTabs(); renderShop();
  });
  $$('.outfit-era-btn').forEach(b => b.onclick = () => { outfitEra=b.dataset.outfitEra; renderShop(); });
  $$('[data-outfit-section]').forEach(b => b.onclick = () => {
    outfitTab = b.dataset.outfitSection;
    syncTabs();
    renderShop();
  });
  function countryButtons(container, names, change) {
    for (const name of names) {
      const button = document.createElement('button');
      button.className = 'yard-era-btn';
      button.dataset.country = name;
      button.textContent = name || 'По эпохам';
      button.onclick = () => {
        change(name);
        syncTabs();
        renderShop();
      };
      $(container).appendChild(button);
    }
  }
  countryButtons('#yard-country-filter',countries,name => { yardCountry = name; yardEra = 'all'; });
  countryButtons('#outfit-country-filter',['',...Object.keys(Wardrobe.countries)],name => { outfitCountry = name; });
  $$('[data-season]').forEach(button => button.onclick = () => {
    const season = button.dataset.season;
    Save.data.yardSeason = season;
    const custom = Save.data.customYard;
    if (YARDS[custom?.base]?.country === 'Россия') custom.season = season;
    Save.save();
    Sound.ui();
    syncTabs();
    paintBg('#shop-bg');
    renderShop();
  });
  $$('#yard-era-filter [data-era]').forEach(b => b.onclick = () => {
    Sound.ui(); yardEra = b.dataset.era;
    $$('#yard-era-filter [data-era]').forEach(x => x.classList.toggle('active', x === b));
    renderShop();
  });
  function syncTabs() {
    $$('.shop-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === shopTab));
    $('#yard-country-filter').classList.toggle('hidden', shopTab !== 'yards');
    $('#yard-season-filter').classList.toggle('hidden', shopTab !== 'yards' || yardCountry !== 'Россия');
    $$('#yard-country-filter [data-country]').forEach(b => {
      const selected = b.dataset.country === yardCountry;
      b.classList.toggle('active', selected);
      b.setAttribute('aria-pressed', selected);
    });
    $$('[data-season]').forEach(button => {
      const selected = button.dataset.season === (Save.data.yardSeason === 'winter' ? 'winter' : 'summer');
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected);
    });
    $$('#yard-era-filter [data-era]').forEach(b => {
      b.hidden = b.dataset.era !== 'all' && !Object.values(YARDS).some(y => y.country === yardCountry && y.era === b.dataset.era);
      b.classList.toggle('active', b.dataset.era === yardEra);
    });
    $('#yard-era-filter').classList.toggle('hidden', shopTab !== 'yards');
    $('#outfit-country-filter').classList.toggle('hidden',shopTab !== 'outfits' || outfitTab !== 'kits');
    $$('#outfit-country-filter [data-country]').forEach(b => {
      const selected = b.dataset.country === outfitCountry;
      b.classList.toggle('active',selected);
      b.setAttribute('aria-pressed',selected);
    });
    $('#outfit-era-filter').classList.toggle('hidden', shopTab !== 'outfits' || (outfitTab === 'kits' && Boolean(outfitCountry)));
    $('#outfit-section-filter').classList.toggle('hidden', shopTab !== 'outfits');
    $('#test-catalog').classList.toggle('hidden', !Save.openCatalog);
    $$('[data-outfit-section]').forEach(b => {
      const selected = b.dataset.outfitSection === outfitTab;
      b.classList.toggle('active', selected);
      b.setAttribute('aria-pressed', selected);
    });
  }

  window.addEventListener('resize', () => {
    if (current === 'match') fitMatchCanvas();
    else if ($('#modal-wrap').classList.contains('hidden')) nav(current);
  });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { if (current === 'match') fitMatchCanvas(); }).observe($('#match-arena'));
  }

  // Перерисовываем меню, когда фоновые изображения догрузились.
  window.addEventListener('art-ready', () => {
    artRevision++;
    if (current !== 'match') nav(current);
    refreshYardPreview?.();
    refreshAlbum?.();
  });
  window.addEventListener('wardrobe-ready', () => {
    $$('#shop-list canvas[data-outfit]').forEach(c => paintOutfit(c));
    refreshYardPreview?.();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && current === 'match' && !paused && !matchOptions.online) pauseModal();
  });
  Yards.syncBallToYard();
  syncTabs();
  const languagePicker = $('#language-picker');
  for (const [id,name] of Object.entries(I18n.languages)) languagePicker.add(new Option(name,id));
  languagePicker.value = I18n.language;
  languagePicker.onchange = () => I18n.set(languagePicker.value);
  I18n.start();
  nav('home');
  const params = new URLSearchParams(location.search);
  const invitation = nativeAndroid ? null : Activities.fromLink(params);
  const courtCode = /^[a-f0-9]{24}$/.test(params.get('court') || '') ? params.get('court') : '';
  const roomCode = /^[A-F0-9]{6}$/.test(params.get('room') || '') ? params.get('room') : '';
  function exposeRooms() {
    $('#btn-online').hidden = !roomsAvailable;
    const create = $('#create-online-yard');
    if (create) create.hidden = !roomsAvailable;
    if (!roomsAvailable || invitation) return;
    if (courtCode) onlineYardMenu({code:courtCode,server:params.get('server') || '',room:roomCode});
    else if (roomCode) onlineLobby({code:roomCode,server:params.get('server') || ''});
  }
  if (invitation) activityModal(invitation);
  exposeRooms();
  const endpoint = $('meta[name="football-rooms-origin"]')?.content;
  const inviteServer = (courtCode || roomCode) && params.get('server');
  if (!nativeAndroid && !roomsAvailable && (inviteServer || endpoint)) {
    Promise.resolve().then(() => OnlineRooms.request(OnlineRooms.origin(inviteServer || endpoint),'',{resource:'health'}))
      .then(health => {
        roomsAvailable = health.version >= 2;
        exposeRooms();
      }).catch(() => {});
  }
  if (nativeAndroid) {
    window.footballPause = () => {
      if (current === 'match' && !paused) pauseModal();
    };
    window.footballBack = () => {
      if (!modalWrap.classList.contains('hidden')) dismissModal();
      else if (current === 'match') pauseModal();
      else if (current !== 'home') nav('home');
      else return false;
      return true;
    };
  }
})();
