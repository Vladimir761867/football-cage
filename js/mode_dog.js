/* «Собачка»: игроки стоят по краям зоны из четырёх конусов и быстро
   перепасовываются. В центре — водящие. Пас надо отдать, пока не кончилось
   время удержания (кольцо вокруг мяча); быстрые передачи дают бонус. */
class DogMode {
  constructor(env) {
    this.env = env;
    this.random = env.random || Math.random;
    const { W, H } = env;
    const difficulty = env.difficulty || 'normal';
    this.cfg = Difficulty.dog(difficulty);
    this.paceLevel = 1;
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
    this.timeLeft = env.challenge?.time || 90;
    this.youDog = false;
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
      { id: 'losses', lbl: 'Потери', val: '0/10' },
      { id: 'pace', lbl: 'Темп', val: '1/5' }
    ]);
    env.hud.setTimer(this.timeLeft);
    env.hud.hint(env.tutorial ? 'Проведи коротко к партнёру сбоку. Для первого паса водящий подождёт.' : `${this.cfg.passers} против ${this.cfg.dogs}. Короткий свайп к партнёру. Каждые 8 пасов темп растёт`);

    env.gesture.onStart = p => {
      if (this.youDog || this.state !== 'aim' || this.holder !== 0 || !this.active[0]) return;
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
      if (this.youDog && d) {
        const dog = this.dogs[0], q = this._quad();
        const top = q[0].y, bottom = q[3].y;
        dog.manual = { x: U.clamp(dog.x + d.dx, this.env.W*.11, this.env.W*.89), y: U.clamp(dog.y + d.dy, top, bottom) };
        return;
      }
      if (this.state !== 'aim' || this.holder !== 0 || !drag || !d || d.len < 18) return;
      this._pass(d);
    };
  }

  // квадрат на земле (перспектива); запасной — прямоугольник
  _quad() {
    const { W, H } = this.env;
    const q = Yards.courtQuad(W, H);
    if (q) return q.map(p => ({x: U.clamp(p.x, W*.035, W*.965), y: p.y}));
    const c = this.court;
    return [{ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y }, { x: c.x + c.w, y: c.y + c.h }, { x: c.x, y: c.y + c.h }];
  }
  _pt(u, v) { return Yards.quadPoint(this._quad(), u, v); }
  _scaleAt(v) { return (.6 + v * .55) * .88; }

  _makePassers(count) {
    const places = count === 4 ? [[.5,.94],[.055,.50],[.5,.065],[.945,.50]]
      : [[.5,.94],[.055,.70],[.16,.065],[.84,.065],[.945,.70]];
    return places.map(([u, v], i) => {
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
    const badPower = p < .28 || p > 1.02;
    const out = diff > .58 || badPower;
    let outcome = 'ok';
    if (out) outcome = 'out';
    const mid = { x: (from.x + target.x) / 2, y: (from.y + target.y) / 2 };
    this.state = 'fly';
    this.fast = this.holder === 0 && this.holdT < this.holdMax * .45;
    from.kickT = .22;
    this.fly = {
      from: { x: from.x, y: from.y }, to: outcome === 'out' ? { x: mid.x + Math.cos(drag.angle) * 120, y: mid.y + Math.sin(drag.angle) * 120 }
        : { x: target.x, y: target.y },
      target: best, outcome, t: 0, dur: .36 + Math.hypot(target.x-from.x,target.y-from.y) / this.env.W * .18
    };
    Sound.pass();
  }

  _penalize(i, reason) {
    if (i < 0 || !this.active[i]) return;
    this.errors[i]++;
    this.env.progress?.('loss');
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
    this.paceLevel = Math.min(5, 1 + Math.floor(this.passes / 8));
    this.holdMax = this.cfg.hold / (1 + (this.paceLevel - 1) * .08);
    this.botHold = this.cfg.botHold / (1 + (this.paceLevel - 1) * .08) + this.random() * .15;
    this.env.hud.setPill('pace', `${this.paceLevel}/5`);
  }

  _nextHolder() {
    const alive = this._receivers();
    if (!this.active[0]) { this._finish(false); return; }
    if (this.active.filter(Boolean).length <= 1) { this._finish(true); return; }
    this._giveBall(alive[Math.floor(this.random() * alive.length)]);
  }

  _changeRole() {
    this.youDog = true;
    this.dogs[0].manual = null;
    this.env.hud.hint('Ты водишь. Свайпни в сторону передачи, чтобы перехватить мяч.');
    this._nextHolder();
  }

  _resolve() {
    const f = this.fly;
    this.fly = null;
    if (!f) return;
    if (f.outcome === 'ok') {
      this.passes++; this.streak++;
      this.env.progress?.('pass');
      if (this.env.tutorial && this.holder === 0) { this.env.learned?.(); return; }
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
      if (this.env.tutorial) {
        this._giveBall(0);
        this.env.hud.hint('Попробуй короткий свайп точно к боковому партнёру.');
        return;
      }
      if (f.catcher === this.dogs[0] && this.youDog) {
        this.youDog = false;
        this.dogs[0].manual = null;
        this._giveBall(0);
        this.env.hud.toast('Перехват! Теперь ты пасуешь', 'good');
        return;
      }
      if (this.env.rotateDog && this.holder === 0 && !this.youDog && f.outcome === 'steal') {
        this._changeRole(); return;
      }
      if (f.outcome === 'steal') { this.lastSteal = 0; this.env.hud.toast('Водящий отнял!', 'bad'); Sound.intercept(); }
      else { this.env.hud.toast('Плохая передача', 'bad'); Sound.miss(); }
      this._penalize(this.holder, f.outcome === 'steal' ? 'мяч отняли' : 'мимо');
      this._nextHolder();
    }
    this.env.hud.hideHintSoon();
  }

  update(dt) {
    if (!this.env.tutorial) this.timeLeft -= dt;
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
      if (this.holder !== 0 || this.youDog) {
        if (this.holdT >= this.botHold) this._botPass();
      } else if (this.holdT >= this.holdMax && !this.env.tutorial) {
        // слишком долго держишь — мяч отобрали
        this.aimDrag = null;
        this.env.hud.toast('Долго держишь!', 'bad'); Sound.intercept();
        if (this.env.rotateDog) this._changeRole();
        else { this._penalize(0, 'тайм-аут'); this._nextHolder(); }
      }
    }
    this.dogs.forEach((d, i) => {
      const c = this._pt(.5, .5);
      if (i === 0 && this.youDog) {
        const target = d.manual || d;
        d.tx = target.x; d.ty = target.y;
      } else if (i === 1 && this.state === 'aim') {
        const options = this._receivers().map(j => this.passers[j]);
        const side = options.sort((a,b) => Math.abs(a.x-holder.x)-Math.abs(b.x-holder.x))[0] || c;
        d.tx = U.lerp(holder.x, side.x, .55);
        d.ty = U.lerp(holder.y, side.y, .55);
      } else if (this.state === 'fly' && this.fly) {
        const from = this.passers[this.holder], to = this.passers[this.fly.target];
        d.tx = U.lerp(c.x, (from.x + to.x) / 2, .7);
        d.ty = U.lerp(c.y, (from.y + to.y) / 2, .7);
      } else {
        const pressure = .18 + U.clamp(this.holdT / this.holdMax, 0, 1) * .72;
        d.tx = U.lerp(c.x, holder.x, pressure);
        d.ty = U.lerp(c.y, holder.y, pressure);
      }
      if (this.dogs.length > 1 && !this.youDog) d.tx += (i === 0 ? -1 : 1) * this.env.W * .035;
      const dx = d.tx-d.x, dy = d.ty-d.y, dist = Math.hypot(dx,dy);
      const speed = i === 0 && this.youDog ? 240 : this.cfg.speed * (1 + (this.paceLevel - 1) * .12);
      const step = this.env.tutorial ? 0 : Math.min(dist, speed * dt);
      d.moving = step > .15;
      const ox = d.x;
      if (dist > 0) { d.x += dx/dist*step; d.y += dy/dist*step; }
      d.phase += step * .10;
      d.face = d.x - ox < -.15 ? -1 : d.x - ox > .15 ? 1 : d.face;
    });
    if (this.state === 'fly' && this.fly) {
      const previous = U.easeOut(U.clamp(this.fly.t,0,1));
      this.fly.t += dt / this.fly.dur;
      const f = this.fly, t = U.easeOut(U.clamp(f.t,0,1));
      const bx = U.lerp(f.from.x,f.to.x,t), by = U.lerp(f.from.y,f.to.y,t);
      // Отбор происходит у мяча, а не по случайному броску при старте паса.
      const catcher = !this.env.tutorial && f.outcome === 'ok' && f.t > .08 && f.t < .95
        && this.dogs.find(d => this._distanceToSegment(d,
          {x:U.lerp(f.from.x,f.to.x,previous),y:U.lerp(f.from.y,f.to.y,previous)},
          {x:bx,y:by}) < this.cfg.reach + 6);
      if (catcher) { f.outcome = 'steal'; f.catcher = catcher; f.to = {x:catcher.x,y:catcher.y}; f.t = 1; }
      if (this.fly.t >= 1) this._resolve();
    }
    if (this.lastSteal >= 0) { this.lastSteal += dt; if (this.lastSteal > .8) this.lastSteal = -1; }
  }

  _botPass() {
    const recs = this._receivers();
    if (!recs.length) { this._finish(true); return; }
    const target = recs[Math.floor(this.random() * recs.length)];
    const from = this.passers[this.holder], to = this.passers[target];
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    this._pass({ angle, len: Math.min(this.env.W, this.env.H) * (.20 + this.random() * .12) });
  }

  draw(ctx) {
    const { W, H } = this.env;
    const q = this._quad();
    this.env.bgFor('court', bg => {
      Yards.paintCourt(bg, W, H, this.court);
      // Четыре тренировочных столбика вместо мелового круга.
      for (const [u,v] of [[.02,.02],[.98,.02],[.98,.98],[.02,.98]]) {
        const p = Yards.quadPoint(q,u,v), s = .7 + v*.4;
        bg.save(); bg.translate(p.x,p.y);
        bg.fillStyle='rgba(0,0,0,.3)'; bg.beginPath(); bg.ellipse(0,3,11*s,4*s,0,0,7); bg.fill();
        bg.fillStyle='#f57921'; bg.beginPath(); bg.moveTo(-9*s,0); bg.lineTo(-3*s,-25*s); bg.lineTo(3*s,-25*s); bg.lineTo(9*s,0); bg.closePath(); bg.fill();
        bg.fillStyle='#fff4db'; bg.fillRect(-5*s,-14*s,10*s,4*s); bg.restore();
      }
    });

    // мяч — позиция
    let bx, by;
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
          { phase: n.phase, moving: false, face: n.face,
            kick: n.kickT > 0 ? Math.min(1, 1.01 - n.kickT / .22) : false });
        ctx.fillStyle = i === 0 ? '#9bf36a' : '#fdf7e8';
        ctx.font = `900 ${Math.round(12 * s)}px Rubik`; ctx.textAlign = 'center';
        ctx.fillText(i === 0 && !this.youDog ? 'ТЫ' : `${i + 1}`, n.x, n.y + 19 * s);
        if (this.errors[i]) {
          ctx.fillStyle = '#ffd24d'; ctx.font = `700 ${Math.round(11 * s)}px Rubik`;
          ctx.fillText(`${this.errors[i]}/10`, n.x, n.y + 32 * s);
        }
        if (n.react > 0) Yards.drawEmote(ctx, n.x, n.y - 160 * s, .8, '👍');
      } else {
        const d = this.dogs[it.i];
        const v = U.clamp((d.y - q[0].y) / ((q[3].y - q[0].y) || 1), 0, 1);
        const s = this._scaleAt(v);
        ctx.fillStyle = 'rgba(255,152,72,.9)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y + 3, 9 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
        Yards.drawPlayer(ctx, d.x, d.y, s, '#d25743', 'field', { phase: d.phase, moving: d.moving, face: d.face });
        if (this.youDog && it.i === 0) {
          ctx.fillStyle = '#9bf36a'; ctx.font = '800 13px Rubik'; ctx.textAlign = 'center';
          ctx.fillText('ТЫ', d.x, d.y + 18);
        }
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
    const newBest = !this.env.challenge && Save.setBest('dog', this.score);
    const coins = this.env.challenge ? 0 : this.score * 4 + (won ? 25 : 0) + (newBest ? 15 : 0);
    if (coins) Save.addCoins(coins);
    this.env.finish({
      title: won ? 'Победа!' : 'Водящий отнял мяч',
      score: `${this.score} очк.`,
      sub: won ? 'Последний игрок на площадке' : 'Потери накапливаются до 10',
      moment: this.passes ? `★ Передач: ${this.passes}` : '', coins, newBest
    });
  }
  destroy() {}
}
