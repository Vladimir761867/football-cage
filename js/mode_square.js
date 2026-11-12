/* «Квадрат»: площадка делится на четыре части. Ошибка/два отскока в своей
   части дают штрафное очко; на 10 штрафах игрок выбывает.
   Игроки стоят в начерченном на земле квадрате (геометрия берётся из арт-фона),
   бегают за мячом внутри своих четвертей, мяч скачет с видимым таймером. */
class SquareMode {
  constructor(env) {
    this.env = env;
    this.random = env.random || Math.random;
    const { W, H } = env;
    const difficulty = env.difficulty || 'normal';
    this.cfg = Difficulty.square(difficulty);
    this.showBounce = env.tutorial || Difficulty.index(difficulty) <= 1;
    this.stage = env.cupStage ?? -1;
    this.incoming = 1;
    // запасной прямоугольник, если арт ещё не загрузился
    this.court = { x: W * .09, y: H * .24, w: W * .82, h: H * .56 };
    // четверти: ты — нижняя левая (ближе к пальцу и крупнее в перспективе)
    this.bounds = [
      { u: [.07, .44], v: [.56, .93] },
      { u: [.56, .93], v: [.56, .93] },
      { u: [.56, .93], v: [.07, .44] },
      { u: [.07, .44], v: [.07, .44] }
    ];
    this.nodes = [0, 1, 2, 3].map(i => {
      const b = this.bounds[i];
      return {
        u: (b.u[0] + b.u[1]) / 2, v: (b.v[0] + b.v[1]) / 2,
        tu: (b.u[0] + b.u[1]) / 2, tv: (b.v[0] + b.v[1]) / 2,
        face: i === 0 || i === 3 ? 1 : -1, kickT: 0,
        wanderT: .6 + i * .5, phase: i * 1.7
      };
    });
    this.errors = [0, 0, 0, 0];
    this.active = [true, true, true, true];
    this.holder = 0;
    this.state = 'aim'; // aim | fly
    this.fly = null;
    this.aimDrag = null;
    this.receiveT = 0;
    this.bounces = 0;
    this.score = 0;
    this.timeLeft = env.challenge?.time || (env.cup ? 90 : 150);
    this.lastMistake = '';
    this.trail = [];

    env.hud.setPills([
      { id: 'you', lbl: 'Ты', val: '0/10' },
      { id: 'p2', lbl: 'Игрок 2', val: '0/10' },
      { id: 'p3', lbl: 'Игрок 3', val: '0/10' },
      { id: 'p4', lbl: 'Игрок 4', val: '0/10' }
    ]);
    env.hud.setTimer(this.timeLeft);
    env.hud.hint(env.tutorial ? 'Ты в нижней левой четверти. Проведи коротко к одному из игроков.' : 'Твоя четверть — нижняя левая. Отбей до второго отскока');

    env.gesture.onStart = p => {
      if (this.state !== 'aim' || this.holder !== 0 || !this.active[0]) return;
      const n = this._pos(0);
      if (Math.hypot(p.x - n.x, p.y - n.y) > Math.min(W, H) * .3) return;
      this.aimDrag = { sx: n.x, sy: n.y, x: p.x, y: p.y, dx: 0, dy: 0, len: 0, angle: 0 };
    };
    env.gesture.onMove = d => {
      if (!this.aimDrag || this.state !== 'aim') return;
      const n = this._pos(0);
      this.aimDrag = { sx: n.x, sy: n.y, x: d.x, y: d.y, dx: d.dx, dy: d.dy, len: d.len, angle: d.angle };
    };
    env.gesture.onEnd = d => {
      const drag = this.aimDrag; this.aimDrag = null;
      if (this.state !== 'aim' || this.holder !== 0 || !drag || !d || d.len < 18) return;
      this._hit(d);
    };
  }

  _quad() {
    const { W, H } = this.env;
    const q = Yards.courtQuad(W, H);
    if (q) return q;
    const c = this.court;
    return [{ x: c.x, y: c.y }, { x: c.x + c.w, y: c.y },
            { x: c.x + c.w, y: c.y + c.h }, { x: c.x, y: c.y + c.h }];
  }
  _pos(i) { return Yards.quadPoint(this._quad(), this.nodes[i].u, this.nodes[i].v); }
  _scale(i) { return (.6 + this.nodes[i].v * .55) * .82; }
  _targets() { return this.nodes.map((_, i) => i).filter(i => i !== this.holder && this.active[i]); }

  _hit(drag) {
    const from = this._pos(this.holder);
    let target = -1, bestDiff = 99;
    this._targets().forEach(i => {
      const p = this._pos(i);
      const a = Math.atan2(p.y - from.y, p.x - from.x);
      const diff = Math.abs(U.angDiff(drag.angle, a));
      if (diff < bestDiff) { bestDiff = diff; target = i; }
    });
    if (target < 0) return;
    const p = U.clamp(drag.len / (Math.min(this.env.W, this.env.H) * .37), 0, 1.2);
    const outcome = bestDiff > this.cfg.angle || p < .24 || p > 1.04 ? 'out' : 'ok';
    const n = this.nodes[this.holder];
    n.kickT = .2;
    n.face = Math.cos(drag.angle) >= 0 ? 1 : -1;
    let destU, destV;
    if (outcome === 'ok') {
      const b = this.bounds[target];
      const deep = p >= .78;
      const rival = this.nodes[target];
      destU = deep ? (rival.u < (b.u[0]+b.u[1])/2 ? b.u[1] : b.u[0])
        : U.clamp((b.u[0] + b.u[1]) / 2 + (this.random() - .5) * .22, b.u[0], b.u[1]);
      destV = deep ? (rival.v < (b.v[0]+b.v[1])/2 ? b.v[1] : b.v[0])
        : U.clamp((b.v[0] + b.v[1]) / 2 + (this.random() - .5) * .22, b.v[0], b.v[1]);
    } else {
      destU = this.nodes[this.holder].u + Math.cos(drag.angle) * .5;
      destV = this.nodes[this.holder].v + Math.sin(drag.angle) * .5;
    }
    this.state = 'fly';
    this.fly = { from, destU, destV, target, outcome, deep: p >= .78, t: 0, dur: .34 + .16 * (1 - p) };
    this.trail = [];
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
      if (this.env.tutorial) {
        this.state = 'aim'; this.receiveT = 0;
        this.env.hud.hint('Проведи к игроку чуть короче. Стрелка покажет направление.');
        return;
      }
      this._markError(this.holder, 'Мяч за линию');
      if (this._checkEnd()) return;
      this._selectBotHolder();
      return;
    }
    if (this.holder === 0) {
      this.score++;
      this.env.progress?.('return');
      if (this.env.tutorial) { this.env.learned?.(); return; }
    }
    this.holder = f.target;
    this.state = 'aim';
    this.receiveT = 0;
    this.bounces = 0;
    this.incoming = f.deep ? .8 : 1;
  }

  _selectBotHolder() {
    const alive = this._targets();
    if (!alive.length) { this._finish(true); return; }
    this.holder = alive[Math.floor(this.random() * alive.length)];
    this.incoming = 1;
    this.state = 'aim'; this.receiveT = 0; this.bounces = 0;
  }

  _botHit() {
    if (this.holder === 0 || this.state !== 'aim') return;
    const targets = this._targets();
    if (!targets.length) { this._finish(true); return; }
    const target = this.stage === 2 && targets.includes(0) && this.random() < .55
      ? 0 : targets[Math.floor(this.random() * targets.length)];
    const from = this._pos(this.holder), to = this._pos(target);
    const style = this.holder;
    const receiveDifficulty = this.incoming < 1 ? .13 : 0;
    const accurate = this.random() < this.cfg.botAcc - receiveDifficulty - (style === 2 ? .05 : 0);
    const angle = Math.atan2(to.y - from.y, to.x - from.x) + (accurate ? 0 : (this.random() - .5) * .85);
    const strength = style === 2 || (style === 3 && this.stage >= 1) ? .34 : .25;
    this._hit({ angle, len: Math.min(this.env.W, this.env.H) * (accurate ? strength : .06) });
  }

  update(dt) {
    if (!this.env.tutorial) this.timeLeft -= dt;
    this.env.hud.setTimer(Math.max(0, Math.ceil(this.timeLeft)));
    if (this.timeLeft <= 0) { this._finish(false, true); return; }

    // движение игроков: приёмник бежит к точке паса, остальные гуляют по четверти
    this.nodes.forEach((n, i) => {
      if (!this.active[i]) return;
      n.phase += dt * 6;
      n.kickT = Math.max(0, n.kickT - dt);
      let speed = .09;
      if (this.fly && this.fly.target === i && this.fly.outcome === 'ok') {
        n.tu = this.fly.destU; n.tv = this.fly.destV; speed = .62; // спринт к мячу
      } else if (i === this.holder && this.state === 'aim') {
        speed = .05;
      } else {
        n.wanderT -= dt;
        if (n.wanderT <= 0) {
          const b = this.bounds[i];
          const u = i === 1 ? .34 + this.random()*.32 : this.random();
          const v = i === 1 ? .34 + this.random()*.32 : this.random();
          n.tu = b.u[0] + u * (b.u[1] - b.u[0]);
          n.tv = b.v[0] + v * (b.v[1] - b.v[0]);
          n.wanderT = 1.3 + this.random() * 1.6;
        }
      }
      const du = n.tu - n.u, dv = n.tv - n.v;
      const dist = Math.hypot(du, dv);
      n.moving = dist > .012;
      if (n.moving) {
        const step = Math.min(dist, speed * dt);
        n.u += du / dist * step; n.v += dv / dist * step;
        if (Math.abs(du) > .01) n.face = du > 0 ? 1 : -1;
      }
    });

    if (this.state === 'aim' && !this.env.tutorial) {
      this.receiveT += dt;
      if (this.holder !== 0 && this.receiveT >= this.cfg.botDelay + this.bounces * .3) this._botHit();
      if (this.receiveT >= this.cfg.receive * this.incoming) {
        this.bounces++;
        this.receiveT = 0;
        if (this.bounces === 1) { if (this.holder === 0) this.env.hud.toast('Первый отскок — отбивай!', 'gold'); }
        else {
          this._markError(this.holder, 'Два отскока');
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
    const quad = this._quad();

    // меловая разметка: контур (если нет на арте), крест, центральный круг
    this.env.bgFor('court', bg => {
      Yards.paintCourt(bg, W, H, this.court);
      Yards.drawCourtMarks(bg, quad, { outer: true });
    });

    // позиция мяча
    let ball = null, ballScale = 1;
    if (this.state === 'fly' && this.fly) {
      const f = this.fly, tt = U.easeOut(U.clamp(f.t, 0, 1));
      const dest = Yards.quadPoint(quad, f.destU, f.destV);
      if (this.showBounce && f.target === 0 && f.outcome === 'ok') {
        ctx.fillStyle = 'rgba(16,26,35,.56)'; ctx.strokeStyle = '#ffe294'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(dest.x, dest.y, 18, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      const x = U.lerp(f.from.x, dest.x, tt);
      const y = U.lerp(f.from.y, dest.y, tt) - Math.sin(tt * Math.PI) * 60;
      ball = { x, y };
      ballScale = .6 + U.lerp(this.nodes[this.holder].v, f.destV, tt) * .55;
      this.trail.push({ x, y });
      if (this.trail.length > 5) this.trail.shift();
    } else {
      this.trail.length = 0;
      const i = this.holder, p = this._pos(i), s = this._scale(i);
      const bounce = Math.abs(Math.sin(Math.PI * this.receiveT / (this.cfg.receive * this.incoming)));
      ball = { x: p.x + this.nodes[i].face * 20 * s, y: p.y - 8 * s - bounce * 46 * s };
      ballScale = s;
    }

    // игроки: дальние раньше ближних
    const order = [0, 1, 2, 3].filter(i => this.active[i]).sort((a, b) => this.nodes[a].v - this.nodes[b].v);
    order.forEach(i => {
      const n = this.nodes[i], p = this._pos(i), s = this._scale(i);
      const holder = i === this.holder && this.state === 'aim';
      if (holder) {
        // кольцо-таймер приёма: жёлтое, после первого отскока — красное
        const frac = U.clamp(this.receiveT / (this.cfg.receive * this.incoming), 0, 1);
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 4 * s, 30 * s, 11 * s, 0, 0, 7); ctx.stroke();
        ctx.strokeStyle = this.bounces ? 'rgba(255,100,80,.95)' : 'rgba(255,210,77,.95)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 4 * s, 30 * s, 11 * s, 0, -Math.PI / 2, -Math.PI / 2 + frac * 2 * Math.PI); ctx.stroke();
      }
      Yards.drawPlayer(ctx, p.x, p.y, s, ['#3f7fba', '#c0392b', '#7a9f4b', '#4e9fd1'][i], 'field',
        { phase: n.phase, moving: !!n.moving, face: !n.moving && ball ? (ball.x < p.x - 3 ? -1 : 1) : n.face, kick: n.kickT > 0 ? Math.min(1, 1.01 - n.kickT / .2) : false });
      ctx.fillStyle = i === 0 ? '#9bf36a' : '#fdf7e8';
      ctx.font = `900 ${Math.round(12 * s)}px Rubik`; ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'ТЫ' : `${i + 1}`, p.x, p.y + 20 * s);
      ctx.fillStyle = this.errors[i] >= 7 ? '#ff8d7a' : 'rgba(255,210,77,.9)';
      ctx.font = `700 ${Math.round(11 * s)}px Rubik`;
      ctx.fillText(`${this.errors[i]}/10`, p.x, p.y + 34 * s);
    });

    // шлейф и мяч
    this.trail.forEach((t, k) => {
      ctx.globalAlpha = (k + 1) / this.trail.length * .25;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(t.x, t.y, 5, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (ball) Yards.drawBall(ctx, ball.x, ball.y, 12 * ballScale);

    if (this.aimDrag) {
      U.drawAim(ctx, this.aimDrag, 'rgba(255,255,255,.95)');
      U.drawPower(ctx, this.aimDrag, Math.min(W, H) * .37);
    }
  }

  _finish(won, timedOut = false) {
    const newBest = !this.env.challenge && Save.setBest('square', this.score);
    const coins = this.env.challenge ? 0 : this.score * 5 + (won ? 30 : 0) + (newBest ? 15 : 0);
    if (coins) Save.addCoins(coins);
    this.env.finish({
      won, penalties: [...this.errors],
      title: timedOut ? 'Время вышло' : won ? 'Остался последним!' : 'Ты выбыл',
      score: `${this.score} точных отбиваний`,
      sub: timedOut ? 'Партия завершена по времени — победитель не определён' : won ? 'Все остальные набрали по 10 штрафов' : 'Два отскока в своей части — штрафное очко',
      moment: this.lastMistake ? '★ Последнее событие: ' + this.lastMistake : '', coins, newBest
    });
  }
  destroy() {}
}
