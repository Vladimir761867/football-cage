/* «Собачка» (квадрат/круг на скорость): игроки стоят по кругу, нарисованному на земле,
   и быстро перепасовываются. В центре — водящий. Пас надо отдать, пока не кончилось
   время удержания (кольцо вокруг мяча); быстрые передачи дают бонус. */
class DogMode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    const difficulty = env.difficulty || 'normal';
    this.cfg = {
      easy:   { dogs: 1, passers: 3, steal: .14, speed: 1.2, cover: 46, hold: 2.3 },
      normal: { dogs: 1, passers: 4, steal: .24, speed: 1.5, cover: 58, hold: 1.8 },
      hard:   { dogs: 2, passers: 5, steal: .36, speed: 1.85, cover: 70, hold: 1.4 }
    }[difficulty];
    this.difficulty = difficulty;
    this.court = { x: W * .09, y: H * .2, w: W * .82, h: H * .64 };
    this.passers = this._makePassers(this.cfg.passers);
    const c = this._pt(.5, .5);
    this.dogs = Array.from({ length: this.cfg.dogs }, (_, i) => ({
      x: c.x + (i ? 28 : -18), y: c.y + (i ? 12 : -8), tx: c.x, ty: c.y, phase: i * 1.8, face: 1
    }));
    this.errors = Array(this.cfg.passers).fill(0);
    this.active = Array(this.cfg.passers).fill(true);
    this.holder = 0;
    this.score = 0;
    this.passes = 0;
    this.streak = 0;
    this.timeLeft = 90;
    this.state = 'aim'; // aim | fly
    this.fly = null;
    this.aimDrag = null;
    this.holdT = -1.6;       // первая передача — с запасом; сколько уже держит мяч
    this.holdMax = this.cfg.hold;
    this.botHold = .45;
    this.lastSteal = -1;
    this.trail = [];
    this.bestMoment = '';

    env.hud.setPills([
      { id: 'score', lbl: 'Очки', val: 0 },
      { id: 'passes', lbl: 'Передачи', val: 0 },
      { id: 'losses', lbl: 'Потери', val: '0/10' }
    ]);
    env.hud.setTimer('90');
    env.hud.hint(`Пасуй быстро: кольцо у мяча тает. Водящих: ${this.cfg.dogs}`);

    env.gesture.onStart = p => {
      if (this.state !== 'aim' || this.holder !== 0 || !this.active[0]) return;
      const n = this.passers[0];
      if (Math.hypot(p.x - n.x, p.y - n.y) > Math.min(W, H) * .3) return;
      this.aimDrag = { sx: n.x, sy: n.y, x: p.x, y: p.y, dx: 0, dy: 0, len: 0, angle: 0 };
    };
    env.gesture.onMove = d => {
      if (!this.aimDrag || this.state !== 'aim') return;
      this.aimDrag = { ...this.aimDrag, x: d.x, y: d.y, dx: d.dx, dy: d.dy, len: d.len, angle: d.angle };
    };
    env.gesture.onEnd = d => {
      const drag = this.aimDrag;
      this.aimDrag = null;
      if (this.state !== 'aim' || this.holder !== 0 || !drag || !d || d.len < 18) return;
      this._pass(drag);
    };
  }

  // квадрат на земле (перспектива); запасной — прямоугольник
  _quad() {
    const { W, H } = this.env;
    const q = Yards.courtQuad(W, H);
    if (q) return q;
    const c = this.court;
    return [{ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y }, { x: c.x + c.w, y: c.y + c.h }, { x: c.x, y: c.y + c.h }];
  }
  _pt(u, v) { return Yards.quadPoint(this._quad(), u, v); }
  _scaleAt(v) { return .6 + v * .55; }

  _makePassers(count) {
    return Array.from({ length: count }, (_, i) => {
      const a = Math.PI / 2 + i * Math.PI * 2 / count; // игрок 0 — внизу, ближе к пальцу
      const u = .5 + Math.cos(a) * .36, v = .5 + Math.sin(a) * .36;
      const pt = this._pt(u, v);
      return { u, v, x: pt.x, y: pt.y, phase: i * .9, kickT: 0, react: 0, face: 1 };
    });
  }

  _receivers() { return this.passers.map((_, i) => i).filter(i => i !== this.holder && this.active[i]); }

  _nearestReceiver(angle) {
    let best = -1, diff = 99;
    const from = this.passers[this.holder];
    this._receivers().forEach(i => {
      const a = Math.atan2(this.passers[i].y - from.y, this.passers[i].x - from.x);
      const d = Math.abs(U.angDiff(angle, a));
      if (d < diff) { diff = d; best = i; }
    });
    return { best, diff };
  }

  _distanceToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = U.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }

  _pass(drag) {
    const { best, diff } = this._nearestReceiver(drag.angle);
    if (best < 0) return;
    const p = U.clamp(drag.len / (Math.min(this.env.W, this.env.H) * .38), 0, 1.2);
    const from = this.passers[this.holder], target = this.passers[best];
    const covered = this.dogs.some(d => this._distanceToSegment(d, from, target) < this.cfg.cover);
    const badPower = p < .28 || p > 1.02;
    const out = diff > .58 || badPower;
    let outcome = 'ok';
    if (out) outcome = 'out';
    else if (covered && Math.random() < this.cfg.steal + .26 * p) outcome = 'steal';
    else if (Math.random() < .04) outcome = 'steal';
    const mid = { x: (from.x + target.x) / 2, y: (from.y + target.y) / 2 };
    const dog = this.dogs[0];
    this.state = 'fly';
    this.fast = this.holder === 0 && this.holdT < this.holdMax * .45;
    from.kickT = .22;
    this.fly = {
      from: { x: from.x, y: from.y }, to: outcome === 'steal' ? { x: dog.x, y: dog.y }
        : outcome === 'out' ? { x: mid.x + Math.cos(drag.angle) * 120, y: mid.y + Math.sin(drag.angle) * 120 }
        : { x: target.x, y: target.y },
      target: best, outcome, t: 0, dur: .3 / this.cfg.speed + .12 * (1 - Math.min(1, p))
    };
    Sound.pass();
  }

  _penalize(i, reason) {
    if (i < 0 || !this.active[i]) return;
    this.errors[i]++;
    this.streak = 0;
    this.env.hud.setPill('losses', `${this.errors[0]}/10`);
    this.env.hud.toast(`${reason} • ${i === 0 ? 'твоя потеря' : `ошибка ${this.errors[i]}/10`}`, 'bad');
    if (this.errors[i] >= 10) {
      this.active[i] = false;
      this.env.hud.toast(i === 0 ? 'Ты выбыл' : 'Игрок выбыл', 'bad');
    }
  }

  _giveBall(i) {
    this.holder = i;
    this.state = 'aim';
    this.holdT = 0;
    this.holdMax = Math.max(this.cfg.hold * .55, this.cfg.hold - this.passes * .018);
    this.botHold = .32 + Math.random() * .3;
  }

  _nextHolder() {
    const alive = this._receivers();
    if (!this.active[0]) { this._finish(false); return; }
    if (alive.length <= 1) { this._finish(true); return; }
    this._giveBall(alive[Math.floor(Math.random() * alive.length)]);
  }

  _resolve() {
    const f = this.fly;
    this.fly = null;
    if (!f) return;
    if (f.outcome === 'ok') {
      this.passes++; this.streak++;
      const fast = this.fast && this.holder === 0;
      const pts = fast ? 3 : 1;
      this.score += pts;
      const prev = this.holder;
      this._giveBall(f.target);
      this.passers[f.target].react = .5; // принял мяч
      this.env.hud.setPill('score', this.score);
      this.env.hud.setPill('passes', this.passes);
      if (fast) this.env.hud.toast('Быстро! +3', 'gold');
      else if (this.streak > 0 && this.streak % 5 === 0) { this.env.hud.toast(`Серия ${this.streak}!`, 'good'); Sound.goal(); }
      void prev;
    } else {
      if (f.outcome === 'steal') { this.lastSteal = 0; this.env.hud.toast('Водящий отнял!', 'bad'); Sound.intercept(); }
      else { this.env.hud.toast('Плохая передача', 'bad'); Sound.miss(); }
      this._penalize(this.holder, f.outcome === 'steal' ? 'мяч отняли' : 'мимо');
      this._nextHolder();
    }
    this.env.hud.hideHintSoon();
  }

  update(dt) {
    this.timeLeft -= dt;
    this.env.hud.setTimer(Math.max(0, Math.ceil(this.timeLeft)));
    if (this.timeLeft <= 0) { this._finish(this.active[0] && this.score >= 10); return; }
    // позиции держим по перспективе (экран мог измениться), небольшое покачивание
    this.passers.forEach((p, i) => {
      p.phase += dt * 4.5;
      const pt = this._pt(p.u, p.v);
      p.x = pt.x + Math.sin(p.phase + i) * 2; p.y = pt.y + Math.cos(p.phase * .8 + i) * 1.5;
      if (p.kickT > 0) p.kickT -= dt;
      if (p.react > 0) p.react -= dt;
    });
    const holder = this.passers[this.holder];
    if (this.state === 'aim') {
      this.holdT += dt;
      if (this.holder !== 0) {
        if (this.holdT >= this.botHold) this._botPass();
      } else if (this.holdT >= this.holdMax) {
        // слишком долго держишь — мяч отобрали
        this.aimDrag = null;
        this.env.hud.toast('Долго держишь!', 'bad'); Sound.intercept();
        this._penalize(0, 'тайм-аут');
        this._nextHolder();
      }
    }
    this.dogs.forEach((d, i) => {
      const c = this._pt(.5, .5);
      if (this.state === 'fly' && this.fly) {
        const from = this.passers[this.holder], to = this.passers[this.fly.target];
        d.tx = U.lerp(c.x, (from.x + to.x) / 2, .7);
        d.ty = U.lerp(c.y, (from.y + to.y) / 2, .7);
      } else {
        d.tx = U.lerp(c.x, holder.x, .27 + i * .05);
        d.ty = U.lerp(c.y, holder.y, .27 + i * .05);
      }
      const k = 1 - Math.pow(.001, dt * this.cfg.speed);
      const ox = d.x; d.x = U.lerp(d.x, d.tx, k); d.y = U.lerp(d.y, d.ty, k); d.phase += dt * 8;
      d.face = d.x - ox < -.15 ? -1 : d.x - ox > .15 ? 1 : d.face;
    });
    if (this.state === 'fly' && this.fly) {
      this.fly.t += dt / this.fly.dur;
      if (this.fly.t >= 1) this._resolve();
    }
    if (this.lastSteal >= 0) { this.lastSteal += dt; if (this.lastSteal > .8) this.lastSteal = -1; }
  }

  _botPass() {
    const recs = this._receivers();
    if (!recs.length) { this._finish(true); return; }
    const target = recs[Math.floor(Math.random() * recs.length)];
    const from = this.passers[this.holder], to = this.passers[target];
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    this._pass({ angle, len: Math.min(this.env.W, this.env.H) * (.5 + Math.random() * .24) });
    if (this.fly && this.difficulty === 'easy' && this.fly.outcome === 'steal' && Math.random() < .35) this.fly.outcome = 'ok';
  }

  draw(ctx) {
    const { W, H } = this.env;
    Yards.paintCourt(ctx, W, H, this.court);
    const q = this._quad();
    // квадрат (если нет на арте) и круг игроков — мелом по перспективе
    Yards.drawCourtMarks(ctx, q, { outer: !Yards.courtHasChalk(), cross: false });
    const ring = [];
    for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2; ring.push(this._pt(.5 + Math.cos(a) * .36, .5 + Math.sin(a) * .36)); }
    ctx.save(); ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ring.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); };
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 7; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 4; ctx.setLineDash([16, 10]); path(); ctx.stroke();
    ctx.restore();

    // мяч — позиция
    let bx, by, bs = 1;
    if (this.state === 'fly' && this.fly) {
      const tt = U.easeOut(U.clamp(this.fly.t, 0, 1));
      bx = U.lerp(this.fly.from.x, this.fly.to.x, tt);
      by = U.lerp(this.fly.from.y, this.fly.to.y, tt) - Math.sin(tt * Math.PI) * 34;
      this.trail.push({ x: bx, y: by }); if (this.trail.length > 6) this.trail.shift();
    } else {
      this.trail.length = 0;
      const n = this.passers[this.holder]; bx = n.x + (n.face || 1) * 18; by = n.y - 6;
    }

    const items = [];
    this.passers.forEach((n, i) => { if (this.active[i]) items.push({ y: n.y, k: 'p', i }); });
    this.dogs.forEach((d, i) => items.push({ y: d.y, k: 'd', i }));
    items.sort((a, b) => a.y - b.y).forEach(it => {
      if (it.k === 'p') {
        const n = this.passers[it.i], i = it.i, s = this._scaleAt(n.v);
        n.face = bx < n.x - 3 ? -1 : 1;              // все смотрят на мяч
        const isHolder = i === this.holder && this.state === 'aim';
        if (isHolder) {
          // кольцо-таймер удержания: тает; в последние 30% краснеет
          const left = U.clamp(1 - this.holdT / (i === 0 ? this.holdMax : this.botHold + .3), 0, 1);
          ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.ellipse(n.x, n.y + 3 * s, 32 * s, 12 * s, 0, 0, 7); ctx.stroke();
          ctx.strokeStyle = left < .3 ? 'rgba(255,90,70,.98)' : i === 0 ? 'rgba(130,230,90,.98)' : 'rgba(255,210,77,.95)';
          ctx.lineWidth = 4.5;
          ctx.beginPath(); ctx.ellipse(n.x, n.y + 3 * s, 32 * s, 12 * s, 0, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); ctx.stroke();
        }
        Yards.drawPlayer(ctx, n.x, n.y, s, i === 0 ? '#3f7fba' : i % 2 ? '#c0392b' : '#7a9f4b', 'field',
          { phase: n.phase, moving: true, face: n.face,
            kick: n.kickT > 0 ? Math.min(1, 1.01 - n.kickT / .22) : false });
        ctx.fillStyle = i === 0 ? '#9bf36a' : '#fdf7e8';
        ctx.font = `900 ${Math.round(12 * s)}px Rubik`; ctx.textAlign = 'center';
        ctx.fillText(i === 0 ? 'ТЫ' : `${i + 1}`, n.x, n.y + 19 * s);
        if (this.errors[i]) {
          ctx.fillStyle = '#ffd24d'; ctx.font = `700 ${Math.round(11 * s)}px Rubik`;
          ctx.fillText(`${this.errors[i]}/10`, n.x, n.y + 32 * s);
        }
        if (n.react > 0) Yards.drawEmote(ctx, n.x, n.y - 160 * s, .8, '👍');
      } else {
        const d = this.dogs[it.i];
        const v = U.clamp((d.y - q[0].y) / ((q[3].y - q[0].y) || 1), 0, 1);
        const s = this._scaleAt(v);
        Yards.drawPlayer(ctx, d.x, d.y, s, '#d25743', 'field', { phase: d.phase, moving: true, face: d.face });
        if (this.lastSteal >= 0) Yards.drawEmote(ctx, d.x, d.y - 160 * s, .85, '😎');
      }
    });

    this.trail.forEach((t, k) => {
      ctx.globalAlpha = (k + 1) / this.trail.length * .28; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(t.x, t.y, 5, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    Yards.drawBall(ctx, bx, by, 12);
    if (this.aimDrag) { U.drawAim(ctx, this.aimDrag, 'rgba(255,255,255,.95)'); U.drawPower(ctx, this.aimDrag, Math.min(W, H) * .38); }
  }

  _finish(won) {
    const newBest = Save.setBest('dog', this.score);
    const coins = this.score * 4 + (won ? 25 : 0) + (newBest ? 15 : 0);
    Save.addCoins(coins);
    this.env.finish({
      title: won ? 'Победа!' : 'Водящий отнял мяч',
      score: `${this.score} очк.`,
      sub: won ? 'Последний игрок на площадке' : 'Потери накапливаются до 10',
      moment: this.passes ? `★ Передач: ${this.passes}` : '', coins, newBest
    });
  }
  destroy() {}
}
