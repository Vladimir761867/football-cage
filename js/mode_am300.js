/* «Американка 300»: штанга, перекладина, девятка и ворота. 1–3 соперника
   по выбору; отдельная тренировка без соперников. */
class Am300Mode {
  constructor(env) {
    this.env = env;
    this.random = env.random || Math.random;
    const { W, H } = env;
    this.difficulty = env.difficulty || 'normal';
    this.cfg = Difficulty.american(this.difficulty);
    if (env.tutorial) this.cfg = { ...this.cfg, spread: 0 };
    const atlasCourt = Boolean(Yards.theme().atlas);
    const goalW = atlasCourt ? Math.min(W * .65, H * .22) : W * .72;
    this.goal = Yards.artGoal(W, H) || { x: (W - goalW) / 2, y: H * .42,
      w: goalW, h: H * .24 };
    this.ballPos = { x: W / 2, y: H * .82 };
    this.you = 0;
    this.opponents = Array.from({ length: env.opponentCount ?? 1 }, (_, i) => ({ name: `Игрок ${i + 2}`, score: 0 }));
    this.round = 1;
    this.ballsLeft = env.challenge?.shots || 5;
    this.targets = new Set();
    this.state = 'aim'; // aim | fly | impact | bot | done
    this.aim = null;    // текущая точка прицела
    this.drag = null;
    this.oscT = 0;      // фаза шкалы тайминга
    this.fly = null;
    this.botQueue = [];
    this.botT = 0;
    this.bestMoment = ''; this.bestVal = 0;
    this.maxDrag = H * .5;
    this.botFly = null; this.botShooter = -1; this.react = null; this.kickT = 0; this.botKickT = 0;

    env.hud.setPills([
      { id: 'you', lbl: 'Ты', val: 0 },
      { id: 'balls', lbl: 'Мячи', val: this.ballsLeft },
      ...this.opponents.map((p, i) => ({ id: `bot${i}`, lbl: p.name, val: 0 }))
    ]);
    env.hud.setTimer(env.challenge || env.tutorial || env.quick ? '🎯' : '🎯300');
    env.hud.hint(env.tutorial ? 'Проведи вверх от мяча к центру ворот. Пунктир покажет цель.' : env.challenge?.description || 'Потяни вверх к цели. Отпусти, когда бегунок в золотой зоне');

    env.gesture.onStart = p => {
      if (this.state !== 'aim') return;
      this.oscT = 0;
    };
    env.gesture.onMove = d => {
      if (this.state !== 'aim') return;
      this.drag = d;
      // прицел = направление жеста от мяча
      this.aim = ShotRules.aim(this.goal, this.ballPos, d, this.maxDrag);
    };
    env.gesture.onEnd = d => {
      this.drag = null;
      if (this.state !== 'aim') return;
      if (!d || d.dy > -20) { this.aim = null; return; }
      this._shoot(d);
    };
  }

  _ballNow() {
    if (this.state === 'fly' && this.fly) {
      const f = this.fly, tt = U.easeOut(U.clamp(f.t, 0, 1));
      return { x: U.lerp(f.from.x, f.to.x, tt), y: U.lerp(f.from.y, f.to.y, tt) - Math.sin(tt * Math.PI) * 70 };
    }
    if (this.botFly) {
      const f = this.botFly, tt = U.easeOut(U.clamp(f.t, 0, 1));
      return { x: U.lerp(f.from.x, f.to.x, tt), y: U.lerp(f.from.y, f.to.y, tt) - Math.sin(tt * Math.PI) * 70 };
    }
    return { x: this.ballPos.x, y: this.ballPos.y };
  }
  _drawActors(ctx, W, H) {
    const bn = this._ballNow(), now = performance.now();
    const shooterSpot = { x: this.ballPos.x - W * .16, y: this.ballPos.y + 20, s: .9 };
    const spots = [[.76, .83], [.9, .79], [.63, .93]].map(([ux, uy]) => ({ x: W * ux, y: H * uy, s: .74 + (uy - .78) * .8 }));
    const meBot = this.botShooter >= 0;
    // кто сейчас бьёт / кто смотрит
    const people = [{ me: true, color: '#3f7fba', name: 'Ты' },
      ...this.opponents.map((o, i) => ({ id: i, color: ['#c0392b', '#7a9f4b', '#4e9fd1'][i], name: o.name }))];
    const shooter = meBot ? people.find(p => p.id === this.botShooter) : people[0];
    const watchers = people.filter(p => p !== shooter);
    const draw = (p, spot, isShooter) => {
      const hop = !isShooter && this.react && this.react.pts === 0 ? Math.abs(Math.sin(now / 130)) * 9 * spot.s : 0;
      const face = bn.x < spot.x - 3 ? -1 : 1;
      let emote = '';
      if (this.react) {
        const byThis = (this.react.by === 'you' && p.me) || this.react.by === p.id;
        const pts = this.react.pts;
        if (byThis) emote = pts >= 100 ? '🤩' : pts >= 50 ? '😎' : pts > 0 ? '🙂' : '😖';
        else emote = pts >= 100 ? '🤯' : pts >= 50 ? '😤' : pts > 0 ? '😐' : '😄';
      }
      const happyWatcher = !isShooter && this.react && this.react.pts === 0;
      Yards.drawPlayer(ctx, spot.x, spot.y - hop, spot.s, p.color, 'field', {
        phase: now / 300 + (p.id || 0), moving: isShooter, face,
        kick: isShooter && (p.me ? this.state === 'fly' : this.botKickT > 0),
        celebrate: happyWatcher && p.me });
      ctx.fillStyle = '#fdf7e8'; ctx.font = '700 12px Rubik'; ctx.textAlign = 'center';
      Yards.drawFieldText(ctx, p.name, spot.x, spot.y + 14 * spot.s);
      if (emote) Yards.drawEmote(ctx, spot.x, spot.y - hop - 158 * spot.s, .8, emote);
    };
    watchers.forEach((p, i) => draw(p, spots[i], false));
    draw(shooter, shooterSpot, true);
  }

  _timing() {
    // бегунок ходит туда-сюда; золотая зона в центре
    const ph = (Math.sin(this.oscT * 4.6) + 1) / 2; // 0..1
    return ph;
  }

  _shoot(drag) {
    this.state = 'fly';
    this.fly = ShotRules.kick(this.goal, this.ballPos, drag, this.maxDrag, this.oscT, this.cfg, this.random);
    this.aim = null;
    Sound.kick();
  }

  _zoneAt(x, y) {
    return ShotRules.zone(this.goal, x, y);
  }

  _impact() {
    const f = this.fly;
    const { to, golden } = f;
    const z = f.zone || this._zoneAt(to.x, to.y);
    let pts = z.pts, label = z.name;
    if (z.pts === 75 && golden) { pts = 100; label = 'Девятка + тайминг'; }
    this.impactFx = { x: to.x, y: to.y, t: 0, pts, label };
    this.fly = null;
    if (pts >= 50) this.flashT = .25;
    if (pts >= 100) { this.slowT = .8; this.shakeT = .35; }
    if (pts >= 100) { Sound.goal(); this.env.hud.toast(`${label}! +${pts}`, 'gold'); }
    else if (pts >= 50) { Sound.post(); this.env.hud.toast(`${label}! +${pts}`, 'good'); }
    else if (pts > 0) { Sound.pass(); this.env.hud.toast(`+${pts}`, 'good'); }
    else { Sound.miss(); this.env.hud.toast(f.issue || 'Мимо', 'bad'); }
    this.env.progress?.(z.id);
    const scored = z.id === 'goal' || z.id === 'corner';
    if (scored) this.env.goal?.(to);
    this.env.collect?.(z.id);
    this.targets.add(z.id);
    if (this.env.challenge?.distinct) {
      const names = {post:'Штанга',bar:'Перекладина',corner:'Девятка'};
      this.env.hud.hint(this.env.challenge.events.map(id => (this.targets.has(id) ? '✓ ' : '○ ') + names[id]).join('  ·  '));
    }
    if (pts && f.from) this.env.highlight?.({ from:f.from, to, arc:70, goal:{...this.goal}, label, value:pts, scored });
    if (this.env.tutorial) {
      if (pts) this.env.learned?.();
      else {
        this.state = 'impact'; this.impactDelay = .45;
        this.env.hud.hint('Попробуй снова. Пунктир должен дойти до ворот.');
      }
      return;
    }
    this.react = { t: 1.6, pts, by: 'you' };
    if (pts > this.bestVal) { this.bestVal = pts; this.bestMoment = `${label} (+${pts}) на ${this.round}-м круге`; }
    this.you += pts;
    this.ballsLeft--;
    this.env.hud.setPill('you', this.you);
    this.env.hud.setPill('balls', this.ballsLeft);
    this.state = 'impact';
    this.impactDelay = .65;
    if (!this.env.challenge) this.env.hud.hideHintSoon();
  }

  _startBotTurn() {
    if (!this.opponents.length) {
      this._finish(this.env.challenge ? this.env.challenge.events.some(id => this.targets.has(id)) : this.you >= 300);
      return;
    }
    this.state = 'bot';
    this.env.hud.toast('Ход соперников…', '');
    const rest = 1 - this.cfg.miss;
    const table = [[0, this.cfg.miss], [25, rest * .42], [50, rest * .26], [75, rest * .19], [100, rest * .13]];
    this.botQueue = [];
    this.opponents.forEach((_, id) => {
      for (let i = 0; i < (this.env.quick ? 1 : 5); i++) {
        let r = this.random(), acc = 0, pts = 0;
        for (const [v, p] of table) { acc += p; if (r <= acc) { pts = v; break; } }
        this.botQueue.push({ id, pts });
      }
    });
    this.botT = .8;
  }

  update(dt) {
    if (this.state === 'impact') {
      this.impactDelay -= dt;
      if (this.impactDelay <= 0) {
        if (this.ballsLeft <= 0 || this.env.quick) this._startBotTurn();
        else this.state = 'aim';
      }
    }
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.slowT > 0) { this.slowT -= dt; dt *= .35; }
    if (this.react) { this.react.t -= dt; if (this.react.t <= 0) this.react = null; }
    if (this.kickT > 0) this.kickT -= dt;
    if (this.botKickT > 0) this.botKickT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    // ворота из арт-фона, когда он загружен (цели совпадают с картинкой)
    if (!this._defGoal) this._defGoal = { ...this.goal };
    const ag = Yards.artGoal(this.env.W, this.env.H);
    this.goal = ag || this._defGoal;
    this.oscT += dt;
    if (this.state === 'fly' && this.fly) {
      this.fly.t += dt / this.fly.dur;
      if (this.fly.t >= 1) this._impact();
    }
    if (this.impactFx) { this.impactFx.t += dt; if (this.impactFx.t > .9) this.impactFx = null; }
    if (this.state === 'bot') {
      if (this.botFly) {
        const f = this.botFly; f.t += dt / f.dur;
        if (f.t >= 1) this._botImpact();
      } else {
        this.botT -= dt;
        if (this.botT <= 0) {
          if (this.botQueue.length) this._botShoot(this.botQueue.shift());
          else {
            // конец круга — проверяем 300
            const top = Math.max(0, ...this.opponents.map(p => p.score));
            this.botShooter = -1;
            if (this.env.quick) {
              if (this.ballsLeft > 0) this.state = 'aim';
              else this._finish(this.you > top, this.you === top);
              return;
            }
            if (this.you >= 300 || top >= 300) {
              if (this.you === top) { this.env.hud.toast('Ничья — ещё круг!', 'gold'); this._nextRound(); }
              else this._finish(this.you > top);
            } else this._nextRound();
          }
        }
      }
    }
  }
  // куда летит удар соперника — зависит от результата, мы видим точку попадания
  _botTarget(pts) {
    const g = this.goal, topY = g.y - g.h, nineR = g.w * .08, r = this.random;
    if (pts >= 100) return { x: g.x + g.w * (.3 + .4 * r()), y: topY };
    if (pts >= 75) return { x: r() < .5 ? g.x + nineR * .8 : g.x + g.w - nineR * .8, y: topY + nineR * 1.65 };
    if (pts >= 50) return { x: r() < .5 ? g.x : g.x + g.w, y: g.y - g.h * (.2 + .6 * r()) };
    if (pts >= 25) return { x: g.x + g.w * (.15 + .7 * r()), y: topY + g.h * (.3 + .55 * r()) };
    return r() < .5
      ? { x: r() < .5 ? g.x - g.w * .16 - 14 : g.x + g.w * 1.16 + 14, y: topY + g.h * r() }
      : { x: g.x + g.w * (.1 + .8 * r()), y: topY - 34 - 30 * r() };
  }
  _botShoot({ id, pts }) {
    this.botShooter = id;
    this.botKickT = .3;
    this.botFly = { id, pts, from: { ...this.ballPos }, to: this._botTarget(pts), t: 0, dur: .48 };
    Sound.kick();
  }
  _botImpact() {
    const f = this.botFly; this.botFly = null;
    const rival = this.opponents[f.id], pts = f.pts;
    rival.score += pts;
    this.env.hud.setPill(`bot${f.id}`, rival.score);
    const names = { 0: 'мимо', 25: 'гол', 50: 'штанга', 75: 'девятка', 100: 'перекладина' };
    this.env.hud.toast(`${rival.name}: ${names[pts]}${pts ? ' +' + pts : ''}`, pts >= 75 ? 'bad' : '');
    this.impactFx = { x: f.to.x, y: f.to.y, t: 0, pts, label: names[pts] };
    if (pts >= 50) this.flashT = .25;
    if (pts >= 100) { this.slowT = .8; this.shakeT = .35; }
    pts >= 75 ? Sound.post() : pts ? Sound.pass() : Sound.miss();
    this.react = { t: 1.4, pts, by: f.id };
    this.botT = .85;
  }
  _nextRound() {
    this.round++;
    this.ballsLeft = 5;
    this.env.hud.setPill('balls', this.ballsLeft);
    this.state = 'aim';
  }

  draw(ctx) {
    // «киношный» момент: на ударе в перекладину — замедление, наезд камеры и тряска
    const k = Math.max(0, this.slowT || 0) / .8, fx = this.impactFx;
    ctx.save();
    if (fx && (k > 0 || this.shakeT > 0)) {
      const { W, H } = this.env, z = 1 + .10 * Math.min(1, k * 1.4);
      const sh = Math.max(0, this.shakeT || 0) * 20;
      ctx.translate(fx.x, fx.y); ctx.scale(z, z); ctx.translate(-fx.x, -fx.y);
      ctx.translate((Math.random() - .5) * sh, (Math.random() - .5) * sh);
    }
    this._drawScene(ctx);
    ctx.restore();
    if (this.flashT > 0 && fx) {
      const a = Math.min(1, this.flashT / .25), r = 40 + (1 - a) * 90;
      const gr = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, r);
      gr.addColorStop(0, `rgba(255,240,190,${.85 * a})`); gr.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, 7); ctx.fill();
    }
  }

  _drawScene(ctx) {
    const { W, H } = this.env;
    this.env.bgFor('goal', bg => Yards.paintGoalScene(bg, W, H, this.goal));
    const g = this.goal, topY = g.y - g.h;

    // зоны-подсказки
    const nineR = g.w * .08;
    ctx.save();
    ctx.globalAlpha = this.state === 'aim' ? .9 : .4;
    for (const nx of [g.x + nineR * .8, g.x + g.w - nineR * .8]) {
      ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(nx, topY + nineR * 1.65, nineR, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,210,77,.9)'; ctx.font = '700 13px Rubik'; ctx.textAlign = 'center';
      Yards.drawFieldText(ctx, '75', nx, topY + nineR * 1.8);
    }
    ctx.restore();
    if (!Yards.theme().atlas && !Yards.artGoal(this.env.W, this.env.H)) Yards.drawGoalFrame(ctx, g);
    // Игроки: стреляющий у мяча, остальные стоят справа и смотрят на мяч/удар.
    this._drawActors(ctx, W, H);
    // подписи целей
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '700 12px Rubik'; ctx.textAlign = 'center';
    Yards.drawFieldText(ctx, 'ПЕРЕКЛАДИНА 100', g.x + g.w / 2, topY - 14);
    Yards.drawFieldText(ctx, '50', g.x - 16, g.y - g.h / 2);
    Yards.drawFieldText(ctx, '50', g.x + g.w + 16, g.y - g.h / 2);

    // мяч и прицел
    if ((this.state === 'aim' || this.state === 'impact' || this.state === 'bot') && !this.botFly) {
      Yards.drawBall(ctx, this.ballPos.x, this.ballPos.y, 15);
    }
    if (this.state === 'aim' && this.aim && this.drag) {
      // траектория-пунктир
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.moveTo(this.ballPos.x, this.ballPos.y);
      ctx.quadraticCurveTo((this.ballPos.x + this.aim.x) / 2, this.aim.y - 60, this.aim.x, this.aim.y);
      ctx.stroke(); ctx.setLineDash([]);
      // прицел
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.aim.x, this.aim.y, 14, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.aim.x - 20, this.aim.y); ctx.lineTo(this.aim.x + 20, this.aim.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.aim.x, this.aim.y - 20); ctx.lineTo(this.aim.x, this.aim.y + 20); ctx.stroke();
      // шкала тайминга
      this._drawTimingBar(ctx, W, H);
      U.drawPower(ctx, this.drag, this.maxDrag);
    }
    // удар соперника: мяч летит в видимую точку
    if (this.botFly) {
      const bn = this._ballNow();
      Yards.drawBall(ctx, bn.x, bn.y, U.lerp(15, 8, U.clamp(this.botFly.t, 0, 1)), undefined, true);
    }
    // полёт
    if (this.state === 'fly' && this.fly) {
      const f = this.fly, tt = U.easeOut(U.clamp(f.t, 0, 1));
      const x = U.lerp(f.from.x, f.to.x, tt);
      const y = U.lerp(f.from.y, f.to.y, tt) - Math.sin(tt * Math.PI) * 70;
      Yards.drawBall(ctx, x, y, U.lerp(15, 8, tt), undefined, true);
    }
    // точка попадания
    if (this.impactFx) {
      const a = 1 - this.impactFx.t / .9;
      ctx.globalAlpha = a;
      ctx.strokeStyle = this.impactFx.pts ? '#9bf36a' : '#ff8d7a';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.impactFx.x, this.impactFx.y, 12 + this.impactFx.t * 40, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  _drawTimingBar(ctx, W, H) {
    const bw = W * .6, bx = (W - bw) / 2, by = H * .70, bh = 14;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.roundRect(bx - 6, by - 6, bw + 12, bh + 12, 10); ctx.fill();
    ctx.fillStyle = '#5a5f6a'; ctx.fillRect(bx, by, bw, bh);
    // золотая зона — на турнире она заметно уже
    ctx.fillStyle = '#ffd24d';
    const half = this.cfg.window / 2;
    ctx.fillRect(bx + bw * (.5 - half), by, bw * half * 2, bh);
    // бегунок
    const ph = this._timing();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(bx + ph * bw - 4, by - 4, 8, bh + 8, 4); ctx.fill();
  }

  _finish(won, draw = false) {
    const top = Math.max(0, ...this.opponents.map(p => p.score));
    const newBest = !this.env.challenge && Save.setBest('am300', this.you);
    const coins = this.env.challenge ? 0 : Math.round(this.you / 10) + (won ? 30 : 0) + (newBest ? 15 : 0);
    if (coins) Save.addCoins(coins);
    this.env.finish({
      won, draw,
      title: !this.opponents.length ? 'Серия окончена' : draw ? 'Ничья' : won ? 'Победа!' : 'Соперник оказался точнее',
      score: this.opponents.length ? `${this.you} : ${top}` : `${this.you} очк.`,
      sub: !this.opponents.length ? 'Удары по раме и углам' : this.env.quick ? 'По пять ударов каждому · победа по сумме очков' : won ? `Ты первым дошёл до 300 (${this.round} кр.)` : 'Целься в перекладину и девятку',
      moment: this.bestMoment ? '★ Лучший удар: ' + this.bestMoment : '',
      coins, newBest
    });
  }
  destroy() {}
}
