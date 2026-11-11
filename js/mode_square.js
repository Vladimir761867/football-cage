/* «Квадрат»: площадка делится на четыре части. Ошибка/два отскока в своей
   части дают штрафное очко; на 10 штрафах игрок выбывает. */
class SquareMode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    const difficulty = env.difficulty || 'normal';
    this.cfg = {
      easy:   { receive: .98, botDelay: .42, botAcc: .70, angle: .66 },
      normal: { receive: .74, botDelay: .30, botAcc: .84, angle: .52 },
      hard:   { receive: .54, botDelay: .22, botAcc: .94, angle: .40 }
    }[difficulty];
    this.court = { x: W * .09, y: H * .2, w: W * .82, h: H * .62 };
    const c = this.court;
    this.nodes = [
      { x: c.x + c.w * .25, y: c.y + c.h * .25, phase: 0 },
      { x: c.x + c.w * .75, y: c.y + c.h * .25, phase: .8 },
      { x: c.x + c.w * .75, y: c.y + c.h * .75, phase: 1.6 },
      { x: c.x + c.w * .25, y: c.y + c.h * .75, phase: 2.4 }
    ];
    this.errors = [0, 0, 0, 0];
    this.active = [true, true, true, true];
    this.holder = 0;
    this.state = 'aim'; // aim | fly
    this.fly = null;
    this.aimDrag = null;
    this.receiveT = 0;
    this.bounces = 0;
    this.score = 0;
    this.timeLeft = 150;
    this.lastMistake = '';

    env.hud.setPills([
      { id: 'you', lbl: 'Ты', val: '0/10' },
      { id: 'p2', lbl: 'Игрок 2', val: '0/10' },
      { id: 'p3', lbl: 'Игрок 3', val: '0/10' },
      { id: 'p4', lbl: 'Игрок 4', val: '0/10' }
    ]);
    env.hud.setTimer('150');
    env.hud.hint('Твоя четверть — верхняя левая. Отбей мяч до второго отскока');

    env.gesture.onStart = p => {
      if (this.state !== 'aim' || this.holder !== 0 || !this.active[0]) return;
      const n = this.nodes[0];
      if (Math.hypot(p.x - n.x, p.y - n.y) > Math.min(W, H) * .27) return;
      this.aimDrag = { sx: n.x, sy: n.y, x: p.x, y: p.y, dx: 0, dy: 0, len: 0, angle: 0 };
    };
    env.gesture.onMove = d => {
      if (!this.aimDrag || this.state !== 'aim') return;
      this.aimDrag = { ...this.aimDrag, x: d.x, y: d.y, dx: d.dx, dy: d.dy, len: d.len, angle: d.angle };
    };
    env.gesture.onEnd = d => {
      const drag = this.aimDrag; this.aimDrag = null;
      if (this.state !== 'aim' || this.holder !== 0 || !drag || !d || d.len < 18) return;
      this._hit(drag);
    };
  }

  _targets() { return this.nodes.map((_, i) => i).filter(i => i !== this.holder && this.active[i]); }

  _hit(drag) {
    const from = this.nodes[this.holder];
    let target = -1, bestDiff = 99;
    this._targets().forEach(i => {
      const a = Math.atan2(this.nodes[i].y - from.y, this.nodes[i].x - from.x);
      const diff = Math.abs(U.angDiff(drag.angle, a));
      if (diff < bestDiff) { bestDiff = diff; target = i; }
    });
    if (target < 0) return;
    const p = U.clamp(drag.len / (Math.min(this.env.W, this.env.H) * .37), 0, 1.2);
    const outcome = bestDiff > this.cfg.angle || p < .24 || p > 1.04 ? 'out' : 'ok';
    this.state = 'fly';
    this.fly = { from: { ...from }, to: outcome === 'ok' ? { ...this.nodes[target] } : { x: from.x + Math.cos(drag.angle) * 180, y: from.y + Math.sin(drag.angle) * 180 }, target, outcome, t: 0, dur: .28 + .14 * (1 - p) };
    Sound.pass();
  }

  _markError(index, reason) {
    if (index < 0 || !this.active[index]) return;
    this.errors[index]++;
    this.env.hud.setPill(index === 0 ? 'you' : 'p' + (index + 1), `${this.errors[index]}/10`);
    this.lastMistake = reason;
    this.env.hud.toast(index === 0 ? `${reason} • ${this.errors[index]}/10` : `Игрок ${index + 1}: ${reason}`, index === 0 ? 'bad' : '');
    if (this.errors[index] >= 10) {
      this.active[index] = false;
      this.env.hud.toast(index === 0 ? 'Ты выбыл' : `Игрок ${index + 1} выбыл`, 'bad');
    }
  }

  _checkEnd() {
    const alive = this.active.filter(Boolean).length;
    if (!this.active[0]) { this._finish(false); return true; }
    if (alive <= 1) { this._finish(true); return true; }
    return false;
  }

  _arrive() {
    const f = this.fly; this.fly = null;
    if (f.outcome === 'out') {
      this._markError(this.holder, 'Мяч за линию');
      if (this._checkEnd()) return;
      this._selectBotHolder();
      return;
    }
    this.holder = f.target;
    this.state = 'aim';
    this.receiveT = 0;
    this.bounces = 0;
    this.score++;
    if (this.holder !== 0) this.env.hud.hint(`Игрок ${this.holder + 1}: отбивает мяч…`);
  }

  _selectBotHolder() {
    const alive = this._targets();
    if (!alive.length) { this._finish(true); return; }
    this.holder = alive[Math.floor(Math.random() * alive.length)];
    this.state = 'aim'; this.receiveT = 0; this.bounces = 0;
  }

  _botHit() {
    if (this.holder === 0 || this.state !== 'aim') return;
    const targets = this._targets();
    if (!targets.length) { this._finish(true); return; }
    const target = targets[Math.floor(Math.random() * targets.length)];
    const from = this.nodes[this.holder], to = this.nodes[target];
    const accurate = Math.random() < this.cfg.botAcc;
    const angle = Math.atan2(to.y - from.y, to.x - from.x) + (accurate ? 0 : (Math.random() - .5) * .85);
    this._hit({ angle, len: Math.min(this.env.W, this.env.H) * (accurate ? .55 : .22) });
  }

  update(dt) {
    this.timeLeft -= dt;
    this.env.hud.setTimer(Math.max(0, Math.ceil(this.timeLeft)));
    if (this.timeLeft <= 0) { this._finish(this.active[0]); return; }
    if (this.state === 'aim') {
      this.receiveT += dt;
      if (this.holder !== 0 && this.receiveT >= this.cfg.botDelay) this._botHit();
      if (this.receiveT >= this.cfg.receive) {
        this.bounces++;
        this.receiveT = 0;
        if (this.bounces === 1) this.env.hud.toast('Первый отскок — успевай!', 'gold');
        else {
          this._markError(this.holder, 'Два отскока в своей части');
          if (this._checkEnd()) return;
          this._selectBotHolder();
        }
      }
    }
    if (this.state === 'fly' && this.fly) {
      this.fly.t += dt / this.fly.dur;
      if (this.fly.t >= 1) this._arrive();
    }
  }

  draw(ctx) {
    const { W, H } = this.env;
    Yards.paintCourt(ctx, W, H, this.court);
    const c = this.court;
    ctx.save();
    ctx.strokeStyle = 'rgba(253,247,232,.65)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(c.x + c.w / 2, c.y); ctx.lineTo(c.x + c.w / 2, c.y + c.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h / 2); ctx.lineTo(c.x + c.w, c.y + c.h / 2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    this.nodes.forEach((n, i) => {
      if (!this.active[i]) return;
      const holder = i === this.holder;
      if (holder) {
        ctx.strokeStyle = i === 0 ? 'rgba(130,230,90,.95)' : 'rgba(255,210,77,.8)';
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(n.x, n.y - 15, 28 + Math.sin(performance.now() / 190) * 2, 0, 7); ctx.stroke();
      }
      Yards.drawPlayer(ctx, n.x, n.y, 1.05, ['#3f7fba', '#c0392b', '#7a9f4b', '#4e9fd1'][i], 'field', { phase: n.phase + performance.now() / 310, moving: true });
      ctx.fillStyle = '#fdf7e8'; ctx.font = '900 13px Rubik'; ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'ТЫ' : `${i + 1}`, n.x, n.y + 15);
      ctx.fillStyle = this.errors[i] >= 7 ? '#ff8d7a' : '#ffd24d';
      ctx.font = '900 12px Rubik'; ctx.fillText(`${this.errors[i]}/10`, n.x, n.y + 30);
    });
    let bx, by;
    if (this.state === 'fly' && this.fly) {
      const tt = U.easeOut(U.clamp(this.fly.t, 0, 1));
      bx = U.lerp(this.fly.from.x, this.fly.to.x, tt);
      by = U.lerp(this.fly.from.y, this.fly.to.y, tt) - Math.sin(tt * Math.PI) * 26;
    } else {
      const n = this.nodes[this.holder]; bx = n.x + 17; by = n.y - 8;
    }
    Yards.drawBall(ctx, bx, by, 12);
    if (this.aimDrag) { U.drawAim(ctx, this.aimDrag, 'rgba(255,255,255,.95)'); U.drawPower(ctx, this.aimDrag, Math.min(W, H) * .37); }
  }

  _finish(won) {
    const newBest = Save.setBest('square', this.score);
    const coins = this.score * 5 + (won ? 30 : 0) + (newBest ? 15 : 0);
    Save.addCoins(coins);
    this.env.finish({
      title: won ? 'Остался последним!' : 'Ты выбыл',
      score: `${this.score} точных отбиваний`,
      sub: won ? 'Все остальные набрали по 10 штрафов' : 'Два отскока в своей части — штрафное очко',
      moment: this.lastMistake ? '★ Последнее событие: ' + this.lastMistake : '', coins, newBest
    });
  }
  destroy() {}
}
