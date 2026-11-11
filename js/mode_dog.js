/* «Собачка»: несколько игроков держат мяч передачами, водящие пытаются его отнять. */
class DogMode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    const difficulty = env.difficulty || 'normal';
    this.cfg = {
      easy:   { dogs: 1, passers: 3, steal: .16, speed: 1.25, cover: 46, wait: .95 },
      normal: { dogs: 1, passers: 4, steal: .27, speed: 1.55, cover: 58, wait: .72 },
      hard:   { dogs: 2, passers: 5, steal: .39, speed: 1.9, cover: 70, wait: .55 }
    }[difficulty];
    this.difficulty = difficulty;
    this.court = { x: W * .09, y: H * .2, w: W * .82, h: H * .64 };
    this.center = { x: W * .5, y: H * .51 };
    this.passers = this._makePassers(this.cfg.passers);
    this.dogs = Array.from({ length: this.cfg.dogs }, (_, i) => ({
      x: this.center.x + (i ? 28 : -18), y: this.center.y + (i ? 12 : -8),
      tx: this.center.x, ty: this.center.y, phase: i * 1.8
    }));
    this.errors = Array(this.cfg.passers).fill(0);
    this.active = Array(this.cfg.passers).fill(true);
    this.holder = 0;
    this.score = 0;
    this.passes = 0;
    this.timeLeft = 90;
    this.state = 'aim'; // aim | fly | steal
    this.fly = null;
    this.aimDrag = null;
    this.thinkT = this.cfg.wait;
    this.lastSteal = -1;
    this.bestMoment = '';

    env.hud.setPills([
      { id: 'score', lbl: 'Очки', val: 0 },
      { id: 'passes', lbl: 'Передачи', val: 0 },
      { id: 'losses', lbl: 'Потери', val: '0/10' }
    ]);
    env.hud.setTimer('90');
    env.hud.hint(`Потяни от своего игрока к партнёру. Водящих: ${this.cfg.dogs}`);

    env.gesture.onStart = p => {
      if (this.state !== 'aim' || this.holder !== 0 || !this.active[0]) return;
      const n = this.passers[0];
      if (Math.hypot(p.x - n.x, p.y - n.y) > Math.min(W, H) * .28) return;
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

  _makePassers(count) {
    const cx = this.center.x, cy = this.center.y, rx = this.court.w * .35, ry = this.court.h * .34;
    return Array.from({ length: count }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / count;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      return { x, y, baseX: x, baseY: y, phase: i * .7 };
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
    else if (Math.random() < .045) outcome = 'steal';
    const mid = { x: (from.x + target.x) / 2, y: (from.y + target.y) / 2 };
    const dog = this.dogs[0];
    this.state = 'fly';
    this.fly = {
      from: { ...from },
      to: outcome === 'steal' ? { x: dog.x, y: dog.y } : outcome === 'out' ? { x: mid.x + Math.cos(drag.angle) * 120, y: mid.y + Math.sin(drag.angle) * 120 } : { ...target },
      target: best, outcome, t: 0, dur: .3 / this.cfg.speed + .12 * (1 - p)
    };
    Sound.pass();
  }

  _penalize(i, reason) {
    if (i < 0 || !this.active[i]) return;
    this.errors[i]++;
    this.env.hud.setPill('losses', `${this.errors[0]}/10`);
    this.env.hud.toast(`${reason} • ${this.passers[i].name || (i === 0 ? 'твоя потеря' : `ошибка ${this.errors[i]}/10`)}`, 'bad');
    if (this.errors[i] >= 10) {
      this.active[i] = false;
      this.env.hud.toast(i === 0 ? 'Ты выбыл' : 'Игрок выбыл', 'bad');
    }
  }

  _nextHolder() {
    const alive = this._receivers();
    if (!this.active[0]) { this._finish(false); return; }
    if (alive.length <= 1) { this._finish(true); return; }
    this.holder = alive[Math.floor(Math.random() * alive.length)];
    this.state = 'aim';
    this.thinkT = this.cfg.wait;
  }

  _resolve() {
    const f = this.fly;
    this.fly = null;
    if (!f) return;
    if (f.outcome === 'ok') {
      this.passes++;
      this.score += 1;
      this.holder = f.target;
      this.state = 'aim';
      this.thinkT = this.cfg.wait;
      this.env.hud.setPill('score', this.score);
      this.env.hud.setPill('passes', this.passes);
      if (this.passes > 0 && this.passes % 5 === 0) { this.env.hud.toast(`Серия ${this.passes}!`, 'good'); Sound.goal(); }
    } else {
      if (f.outcome === 'steal') { this.lastSteal = 0; this.env.hud.toast('Собачка отняла!', 'bad'); Sound.intercept(); }
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
    this.passers.forEach((p, i) => {
      p.phase += dt * (2.1 + i * .12);
      p.x = p.baseX + Math.sin(p.phase) * 10;
      p.y = p.baseY + Math.cos(p.phase * .75) * 7;
    });
    const holder = this.passers[this.holder];
    if (this.state === 'aim' && this.holder !== 0) {
      this.thinkT -= dt;
      if (this.thinkT <= 0) this._botPass();
    }
    this.dogs.forEach((d, i) => {
      if (this.state === 'fly' && this.fly) {
        const from = this.passers[this.holder], to = this.passers[this.fly.target];
        d.tx = U.lerp(this.center.x, (from.x + to.x) / 2, .7);
        d.ty = U.lerp(this.center.y, (from.y + to.y) / 2, .7);
      } else {
        d.tx = U.lerp(this.center.x, holder.x, .23 + i * .04);
        d.ty = U.lerp(this.center.y, holder.y, .23 + i * .04);
      }
      const k = 1 - Math.pow(.001, dt * this.cfg.speed);
      d.x = U.lerp(d.x, d.tx, k); d.y = U.lerp(d.y, d.ty, k); d.phase += dt * 8;
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
    const fake = { angle, len: Math.min(this.env.W, this.env.H) * (.5 + Math.random() * .24) };
    const oldRandom = Math.random;
    // Bot is reliable, but tournament still allows the dog to read a pass.
    this._pass(fake);
    if (this.fly && this.difficulty === 'easy' && this.fly.outcome === 'steal' && Math.random() < .35) this.fly.outcome = 'ok';
    void oldRandom;
  }

  draw(ctx) {
    const { W, H } = this.env;
    Yards.paintCourt(ctx, W, H, this.court);
    const pulse = 1 + Math.sin(performance.now() / 180) * .08;
    this.passers.forEach((n, i) => {
      if (!this.active[i]) return;
      const isHolder = i === this.holder;
      if (this.state === 'aim' && isHolder) {
        ctx.strokeStyle = i === 0 ? 'rgba(130,230,90,.95)' : 'rgba(255,210,77,.85)';
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(n.x, n.y - 16, 28 * pulse, 0, 7); ctx.stroke();
      }
      Yards.drawPlayer(ctx, n.x, n.y, 1.05, i === 0 ? '#3f7fba' : i % 2 ? '#4e9fd1' : '#7a9f4b', 'field', { phase: n.phase + performance.now() / 300, moving: true });
      if (this.errors[i]) {
        ctx.fillStyle = '#ffd24d'; ctx.font = '900 13px Rubik'; ctx.textAlign = 'center';
        ctx.fillText(`${this.errors[i]}/10`, n.x, n.y + 14);
      }
    });
    this.dogs.forEach((d, i) => {
      Yards.drawPlayer(ctx, d.x, d.y, 1.08, '#c0392b', 'field', { phase: d.phase, moving: true });
      ctx.fillStyle = '#ffd24d'; ctx.font = '900 17px Rubik'; ctx.textAlign = 'center';
      ctx.fillText(this.cfg.dogs > 1 ? 'С' + (i + 1) : 'С', d.x, d.y - 68);
    });
    let bx, by;
    if (this.state === 'fly' && this.fly) {
      const tt = U.easeOut(U.clamp(this.fly.t, 0, 1));
      bx = U.lerp(this.fly.from.x, this.fly.to.x, tt);
      by = U.lerp(this.fly.from.y, this.fly.to.y, tt) - Math.sin(tt * Math.PI) * 28;
    } else {
      const n = this.passers[this.holder]; bx = n.x + 17; by = n.y - 8;
    }
    Yards.drawBall(ctx, bx, by, 12);
    if (this.aimDrag) { U.drawAim(ctx, this.aimDrag, 'rgba(255,255,255,.95)'); U.drawPower(ctx, this.aimDrag, Math.min(W, H) * .38); }
  }

  _finish(won) {
    const newBest = Save.setBest('dog', this.score);
    const coins = this.score * 4 + (won ? 25 : 0) + (newBest ? 15 : 0);
    Save.addCoins(coins);
    this.env.finish({
      title: won ? 'Победа!' : 'Собачка отняла мяч',
      score: `${this.score} передач`,
      sub: won ? 'Последний игрок на площадке' : 'Потери накапливаются до 10',
      moment: this.score ? `★ Успешных передач: ${this.score}` : '', coins, newBest
    });
  }
  destroy() {}
}
