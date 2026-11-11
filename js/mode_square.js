/* Режим «Квадрат»: держи мяч в передачах, бот-защитник пытается перехватить.
   90 секунд. 3 передачи подряд = +1 очко, 5 = +2, дальше больше. Риск-пас = +1 сразу. */
class SquareMode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    const m = Math.min(W, H);
    this.court = { x: W * .1, y: H * .22, w: W * .8, h: H * .6 };
    const c = this.court;
    this.nodes = [
      { x: c.x + c.w * .5, y: c.y + c.h * .92 },  // ближний (низ)
      { x: c.x + c.w * .12, y: c.y + c.h * .18 }, // левый верх
      { x: c.x + c.w * .88, y: c.y + c.h * .18 }  // правый верх
    ];
    this.holder = 0;
    this.defender = { x: c.x + c.w / 2, y: c.y + c.h / 2, tx: 0, ty: 0 };
    this.commit = -1;          // к какому приёмнику прижался защитник
    this.commitAmt = 0;
    this.thinkT = .6;
    this.holdT = 0;            // давление: нельзя держать мяч вечно
    this.state = 'aim';        // aim | fly | out
    this.fly = null;
    this.series = 0;
    this.score = 0;
    this.timeLeft = 90;
    this.aimDrag = null;
    this.bestMoment = '';
    this.bestMomentVal = 0;
    this.maxDrag = Math.min(260, m * .55);

    env.hud.setPills([
      { id: 'score', lbl: 'Очки', val: 0 },
      { id: 'series', lbl: 'Серия', val: 0 },
      { id: 'best', lbl: 'Рекорд', val: Save.data.best.square }
    ]);
    env.hud.hint('Потяни от мяча к игроку в зелёном кольце — и отпусти');
    this._newRound(0, true);

    env.gesture.onStart = p => {
      if (this.state !== 'aim') return;
      const b = this.nodes[this.holder];
      if (Math.hypot(p.x - b.x, p.y - b.y) > m * .3) return; // жест начинается у мяча
      this.aimDrag = { sx: b.x, sy: b.y, x: p.x, y: p.y, dx: 0, dy: 0, len: 0, angle: 0 };
      this._aimFrom = { x: p.x, y: p.y };
    };
    env.gesture.onMove = d => {
      if (!this._aimFrom || this.state !== 'aim') return;
      const b = this.nodes[this.holder];
      const dx = d.x - this._aimFrom.x, dy = d.y - this._aimFrom.y;
      this.aimDrag = { sx: b.x, sy: b.y, x: b.x + dx, y: b.y + dy, dx, dy,
        len: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
    };
    env.gesture.onEnd = d => {
      const drag = this.aimDrag;
      this.aimDrag = null; this._aimFrom = null;
      if (this.state !== 'aim' || !d || !drag || drag.len < 18) return;
      this._pass(drag);
    };
  }

  _receivers() { return [0, 1, 2].filter(i => i !== this.holder); }

  _newRound(holder, first) {
    this.holder = holder;
    this.state = 'aim';
    this.holdT = 0;
    this.thinkT = first ? .8 : .35 + Math.random() * .5;
    this.commit = -1;
    this.commitAmt = 0;
    const c = this.court;
    this.defender.tx = c.x + c.w / 2; this.defender.ty = c.y + c.h / 2;
  }

  _pass(drag) {
    const b = this.nodes[this.holder];
    const recs = this._receivers();
    let best = -1, bestDiff = 1e9;
    recs.forEach(i => {
      const a = Math.atan2(this.nodes[i].y - b.y, this.nodes[i].x - b.x);
      const diff = Math.abs(U.angDiff(drag.angle, a));
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    const p = U.clamp(drag.len / this.maxDrag, 0, 1.15);
    const target = this.nodes[best];
    const covered = this.commit === best && this.commitAmt > .4;

    let outcome; // 'ok' | 'risk' | 'steal' | 'out'
    if (bestDiff > .62) outcome = 'out';
    else if (p > .98) outcome = 'out';
    else if (p < .3) outcome = covered ? 'steal' : (Math.random() < .5 ? 'steal' : 'ok');
    else if (covered) {
      // риск-пас: очень точно и с правильной силой — сквозь защитника
      outcome = (bestDiff < .13 && p >= .55 && p <= .9) ? 'risk'
              : (Math.random() < .85 ? 'steal' : 'ok');
    } else outcome = Math.random() < .95 ? 'ok' : 'steal';

    this.state = 'fly';
    const from = { x: b.x, y: b.y };
    const mid = { x: (b.x + target.x) / 2, y: (b.y + target.y) / 2 };
    const to = outcome === 'steal' ? { x: U.lerp(mid.x, this.defender.x, .5), y: U.lerp(mid.y, this.defender.y, .5) }
             : outcome === 'out' ? { x: b.x + Math.cos(drag.angle) * this.maxDrag * 1.3, y: b.y + Math.sin(drag.angle) * this.maxDrag * 1.3 }
             : target;
    this.fly = { from, to, t: 0, dur: .22 + .12 * (1 - p), outcome, target: best };
    Sound.pass();
  }

  _resolveFly() {
    const { outcome, target } = this.fly;
    const env = this.env;
    this.fly = null;
    if (outcome === 'ok' || outcome === 'risk') {
      this.series++;
      let gained = 0;
      if (outcome === 'risk') { gained += 1; env.hud.toast('Риск-пас! +1', 'gold'); Sound.post(); }
      const ms = { 3: 1, 5: 2, 8: 2, 10: 3 };
      let add = ms[this.series] || (this.series > 10 && this.series % 5 === 0 ? 3 : 0);
      if (add) {
        gained += add;
        if (outcome !== 'risk') { env.hud.toast(`Серия ${this.series}! +${add}`, 'good'); Sound.goal(); }
      } else if (outcome !== 'risk') Sound.pass();
      this.score += gained;
      if (this.series > this.bestMomentVal) {
        this.bestMomentVal = this.series;
        this.bestMoment = outcome === 'risk'
          ? `Риск-пас сквозь защитника на серии ${this.series}`
          : `Серия из ${this.series} передач без потерь`;
      }
      env.hud.setPill('score', this.score);
      env.hud.setPill('series', this.series);
      if (this.score >= 7) { this._finish(true); return; }
      this._newRound(target);
    } else {
      if (outcome === 'steal') { env.hud.toast('Перехват!', 'bad'); Sound.intercept(); }
      else { env.hud.toast('Мимо!', 'bad'); Sound.miss(); }
      this.series = 0;
      env.hud.setPill('series', 0);
      this._newRound(Math.floor(Math.random() * 3));
    }
    env.hud.hideHintSoon();
  }

  update(dt) {
    this.timeLeft -= dt;
    this.env.hud.setTimer(Math.max(0, Math.ceil(this.timeLeft)));
    if (this.timeLeft <= 0) { this._finish(false); return; }

    // защитник думает и прижимается к одному из приёмников
    if (this.state === 'aim') {
      this.holdT += dt;
      if (this.commit < 0) {
        this.thinkT -= dt;
        if (this.thinkT <= 0) {
          const recs = this._receivers();
          this.commit = recs[Math.random() < .5 ? 0 : 1];
        }
      } else {
        this.commitAmt = Math.min(.75, this.commitAmt + dt * 1.4);
        const t = this.nodes[this.commit], b = this.nodes[this.holder];
        this.defender.tx = U.lerp((b.x + t.x) / 2, t.x, this.commitAmt * .7);
        this.defender.ty = U.lerp((b.y + t.y) / 2, t.y, this.commitAmt * .7);
      }
      if (this.holdT > 4.5) { // затянул — защитник отбирает
        this.env.hud.toast('Долго держал!', 'bad'); Sound.intercept();
        this.series = 0; this.env.hud.setPill('series', 0);
        this._newRound(Math.floor(Math.random() * 3));
      }
    }
    this.defender.x = U.lerp(this.defender.x, this.defender.tx, 1 - Math.pow(.001, dt));
    this.defender.y = U.lerp(this.defender.y, this.defender.ty, 1 - Math.pow(.001, dt));

    if (this.state === 'fly' && this.fly) {
      this.fly.t += dt / this.fly.dur;
      if (this.fly.t >= 1) this._resolveFly();
    }
  }

  draw(ctx) {
    const { W, H } = this.env;
    Yards.paintCourt(ctx, W, H, this.court);
    const t = Yards.theme();

    // подсветка приёмников
    if (this.state === 'aim') {
      const pulse = 1 + Math.sin(performance.now() / 180) * .08;
      this._receivers().forEach(i => {
        const n = this.nodes[i];
        const covered = this.commit === i && this.commitAmt > .4;
        ctx.strokeStyle = covered ? 'rgba(255,190,60,.95)' : 'rgba(130,230,90,.95)';
        ctx.lineWidth = covered ? 3 : 5;
        ctx.setLineDash(covered ? [6, 7] : []);
        ctx.beginPath(); ctx.arc(n.x, n.y, (covered ? 24 : 30) * pulse, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
      });
      // давление: кольцо таймера вокруг владельца
      const b = this.nodes[this.holder];
      const frac = U.clamp(this.holdT / 4.5, 0, 1);
      ctx.strokeStyle = frac > .7 ? 'rgba(232,91,75,.9)' : 'rgba(255,255,255,.5)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x, b.y - 38, 12, -Math.PI / 2, -Math.PI / 2 + frac * 2 * Math.PI); ctx.stroke();
    }

    // игроки
    this.nodes.forEach((n, i) => {
      Yards.drawPlayer(ctx, n.x, n.y, 1.15, i === this.holder ? '#3f7fba' : '#4e9fd1');
    });
    // защитник
    Yards.drawPlayer(ctx, this.defender.x, this.defender.y, 1.2, '#c0392b');
    if (this.commit >= 0 && this.state === 'aim') {
      ctx.fillStyle = '#ffd24d'; ctx.font = '900 20px Rubik';
      ctx.fillText('!', this.defender.x - 3, this.defender.y - 62);
    }

    // мяч
    let bx, by;
    if (this.state === 'fly' && this.fly) {
      const tt = U.easeOut(U.clamp(this.fly.t, 0, 1));
      bx = U.lerp(this.fly.from.x, this.fly.to.x, tt);
      by = U.lerp(this.fly.from.y, this.fly.to.y, tt) - Math.sin(tt * Math.PI) * 24;
    } else {
      const b = this.nodes[this.holder];
      bx = b.x + 16; by = b.y - 4;
    }
    Yards.drawBall(ctx, bx, by, 11);

    // прицел
    if (this.aimDrag && this.state === 'aim') {
      U.drawAim(ctx, this.aimDrag, 'rgba(255,255,255,.95)');
      U.drawPower(ctx, this.aimDrag, this.maxDrag);
    }
  }

  _finish(won) {
    const newBest = Save.setBest('square', this.score);
    const coins = this.score * 8 + (won ? 25 : 0) + (newBest ? 15 : 0);
    Save.addCoins(coins);
    this.env.finish({
      title: won ? 'Победа!' : 'Время вышло',
      score: `${this.score} очк.`,
      sub: won ? 'Ты набрал 7 очков раньше времени' : `Лучшая серия: ${this.bestMomentVal} передач`,
      moment: this.bestMoment ? '★ Лучший момент: ' + this.bestMoment : '',
      coins, newBest
    });
  }
  destroy() {}
}
