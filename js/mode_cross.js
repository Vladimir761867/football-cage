/* «Навес»: четыре участника. Комбинация: два паса по земле → навес → удар головой/с лёта.
   Потерял мяч или промахнулся — идёшь в ворота и ловишь следующий удар. */
class CrossMode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    const atlasCourt = Boolean(Yards.theme().atlas);
    const goalW = atlasCourt ? Math.min(W * .65, H * .22) : W * .6;
    this.goal = { x: (W - goalW) / 2, y: H * (atlasCourt ? .49 : .39),
      w: goalW, h: H * (atlasCourt ? .14 : .2) };
    this.players = Array.from({ length: 4 }, (_, i) => ({
      x: W * (.18 + i * .21), y: H * (.68 + (i % 2) * .07),
      tx: W * (.18 + i * .21), ty: H * (.68 + (i % 2) * .07), phase: i * 1.7,
      score: 0
    }));
    this.keeperIndex = 3;
    this.shooterIndex = 0;
    this.serverIndex = 2;
    this.combo = null;
    this._lastGoal = false; this._lastSaved = false;
    this.serveN = 0;
    this.total = 12;
    this.state = 'wait';
    this.waitT = .7;
    this.flight = null;
    this.shot = null;
    this.pendingKeeper = null;
    this.landing = { x: W * .5, y: H * .67 };
    this.dive = 0;
    this.keeperX = W * .5;
    this.keeperTarget = W * .5;
    this.bestMoment = '';
    this.finished = false;
    env.hud.setPills([
      { id: 'you', lbl: 'Ты', val: 0 },
      { id: 'turn', lbl: 'Розыгрыш', val: `0/${this.total}` },
      { id: 'keeper', lbl: 'На воротах', val: 'Игрок 4' }
    ]);
    env.hud.setTimer('⚽');
    env.hud.hint('Навес: проведи к углу ворот. Промахнулся — идёшь в ворота');
    env.gesture.onEnd = d => {
      if (this.state === 'combo' && d) { this._comboSwipe(d); return; }
      if (this.state !== 'serve' || !d) return;
      if (this.shooterIndex === 0) this._strike(d);
      else if (this.keeperIndex === 0) {
        this.dive = d.dx < 0 ? -1 : 1;
        this.keeperTarget = this.goal.x + this.goal.w * (this.dive < 0 ? .18 : .82);
      }
    };
  }

  _name(i) { return i === 0 ? 'Ты' : `Игрок ${i + 1}`; }
  _field() { return [0, 1, 2, 3].filter(i => i !== this.keeperIndex); }
  _nextAttacker() {
    const field = this._field();
    const pos = field.indexOf(this.shooterIndex);
    this.shooterIndex = field[(pos + 1 + field.length) % field.length];
    this._roles();
  }
  // S — нападающий, a — партнёр для первого паса, b — крайний (подаёт навес)
  _roles() {
    const S = this.shooterIndex, rest = this._field().filter(i => i !== S);
    this.roles = { S, a: rest[0], b: rest[1] };
    this.serverIndex = rest[1];
  }
  _slot(k) {
    const { W, H } = this.env;
    return { S: { x: W * .5, y: H * .75 }, a: { x: W * .2, y: H * .71 }, b: { x: W * .82, y: H * .67 } }[k];
  }
  _setPositions() {
    if (!this.roles) this._roles();
    const r = this.roles, serving = this.state === 'serve' || this.state === 'shot';
    this.players.forEach((p, i) => {
      if (i === this.keeperIndex) { p.tx = this.keeperX; p.ty = this.goal.y + 7; return; }
      const k = i === r.S ? 'S' : i === r.a ? 'a' : 'b';
      if (serving && k === 'S') { p.tx = this.landing.x - 22; p.ty = this.landing.y + 20; }
      else { const sl = this._slot(k); p.tx = sl.x; p.ty = sl.y; }
    });
  }
  _startServe() {
    if (this.serveN >= this.total) { this._finish(); return; }
    this.serveN++;
    this.env.hud.setPill('turn', `${this.serveN}/${this.total}`);
    const { W, H } = this.env;
    this.landing = { x: W * (.42 + Math.random() * .16), y: H * (.66 + Math.random() * .07) };
    this._roles();
    const r = this.roles;
    this.combo = { order: [r.S, r.a, r.b], step: 0, holder: r.S, ball: null, clock: 0, waitT: .55, limit: 2.6 };
    this.state = 'combo';
    this.dive = 0;
    this.keeperTarget = this.goal.x + this.goal.w / 2;
    this._setPositions();
    this.env.hud.hint(r.S === 0 ? 'Сыграй в стенку: проведи пас партнёру, он отдаст на край — затем навес!' :
      this.keeperIndex === 0 ? 'Ты в воротах: следи за комбинацией и лови удар' : `${this._name(r.S)} разыгрывает комбинацию`);
  }
  _comboTarget() { const c = this.combo; return this.players[c.order[c.step + 1]]; }
  _comboPass() {
    const c = this.combo, from = this.players[c.holder], to = this._comboTarget();
    from.kickT = .22;
    c.ball = { from: { x: from.x, y: from.y }, to: c.order[c.step + 1], t: 0, dur: .42 };
    Sound.pass();
  }
  _comboSwipe(d) {
    const c = this.combo;
    if (!c || c.holder !== 0 || c.ball) return;
    const from = this.players[0], to = this._comboTarget();
    const ang = Math.atan2(to.y - from.y, to.x - from.x);
    if (d.len < 22 || Math.abs(U.angDiff(d.angle, ang)) > .85) { this._comboFail('Неточный пас'); return; }
    this._comboPass();
  }
  _comboFail(reason) {
    const shooter = this.roles.S;
    this.env.hud.toast(`${reason}. ${this._name(shooter)} — в ворота!`, 'bad');
    Sound.miss();
    this._lastGoal = false; this._lastSaved = false; this._lastShooter = shooter;
    this.combo = null;
    this.keeperIndex = shooter;
    this.env.hud.setPill('keeper', this._name(this.keeperIndex));
    this._nextAttacker();
    this.state = 'wait'; this.waitT = .95;
  }
  _startCross() {
    const b = this.players[this.roles.b];
    b.kickT = .25;
    this.state = 'serve';
    this.flight = { t: 0, dur: 1.5, from: { x: b.x, y: b.y - 30 } };
    this.env.hud.hint(this.shooterIndex === 0 ? 'Навес! Ударь в нужный момент: проведи к левому или правому углу!' :
      this.keeperIndex === 0 ? 'Ты в воротах: проведи в сторону удара!' : `${this._name(this.shooterIndex)} бьёт. Следи за навесом`);
    Sound.pass();
  }
  _ballPos() {
    const t = U.clamp(this.flight.t / this.flight.dur, 0, 1);
    return { x: U.lerp(this.flight.from.x, this.landing.x, t),
      y: U.lerp(this.flight.from.y, this.landing.y, t) - Math.sin(t * Math.PI) * this.env.H * .22 };
  }
  _strike(d) {
    const t = this.flight.t / this.flight.dur;
    const side = d.dx < 0 ? -1 : 1;
    let pts = 0, reason = '';
    if (t < .42) reason = 'Слишком рано';
    else if (t > .96) reason = 'Не успел';
    else if (t >= .54 && t <= .78) { pts = 100; reason = 'С лёта'; }
    else if (t > .78 && t <= .9) { pts = 75; reason = 'Головой'; }
    else { pts = 40; reason = 'Дотянулся'; }
    if (d.dy > 30) { pts = 0; reason = 'Скидка не попала в ворота'; }
    this._resolveShot(side, pts, reason);
  }
  _botStrike() {
    const side = Math.random() < .5 ? -1 : 1;
    const r = Math.random();
    const pts = r < .24 ? 0 : r < .72 ? 75 : 100;
    this._resolveShot(side, pts, pts ? 'Удар с навеса' : 'Промах');
  }
  _resolveShot(side, potential, reason) {
    if (this.state !== 'serve') return;
    const shooter = this.shooterIndex;
    const keeper = this.keeperIndex;
    const keeperGuess = keeper === 0 ? this.dive : (Math.random() < .6 ? side : -side);
    let saved = potential > 0 && keeperGuess === side && Math.random() < (keeper === 0 ? .8 : .55);
    const points = saved ? 0 : potential;
    if (saved) reason = 'Вратарь отбил!';
    this.state = 'shot';
    this._lastShooter = shooter; this._lastKeeper = keeper; this._lastGoal = !!points; this._lastSaved = saved;
    this.players[shooter].kickT = .3;
    this.shot = {
      from: this._ballPos(), to: {
        x: this.goal.x + this.goal.w * (side < 0 ? .16 : .84),
        y: points ? this.goal.y - this.goal.h * .4 : this.goal.y - this.goal.h - 24
      },
      t: 0, dur: .42, saved, side
    };
    if (potential > 0) {
      this.dive = keeperGuess;
      this.keeperTarget = this.goal.x + this.goal.w * (keeperGuess < 0 ? .18 : .82);
    }
    if (points) {
      this.players[shooter].score += points;
      this.env.hud.toast(`${this._name(shooter)}: ${reason} +${points}`, 'good');
      Sound.goal();
      if (shooter === 0) this.bestMoment = `${reason} +${points}`;
    } else {
      this.env.hud.toast(`${this._name(shooter)}: ${reason}. В ворота!`, 'bad');
      Sound.miss();
      // Сначала показываем сейв прежнего вратаря; смена ролей после полёта мяча.
      this.pendingKeeper = shooter;
    }
    this.env.hud.setPill('you', this.players[0].score);
    this.env.hud.setPill('keeper', this._name(this.keeperIndex));
  }
  update(dt) {
    if (this.finished) return;
    // ворота из арт-фона, когда он загружен (точно по картинке)
    if (!this._defGoal) this._defGoal = { ...this.goal };
    const ag = Yards.artGoal(this.env.W, this.env.H);
    this.goal = ag || this._defGoal;
    this.keeperX = U.lerp(this.keeperX, this.keeperTarget, 1 - Math.pow(.002, dt));
    this._setPositions();
    this.players.forEach(p => {
      p.x = U.lerp(p.x, p.tx, 1 - Math.pow(.0001, dt));
      p.y = U.lerp(p.y, p.ty, 1 - Math.pow(.0001, dt));
      p.phase += dt * 8;
    });
    this.players.forEach(p => { if (p.kickT > 0) p.kickT -= dt; if (p.react > 0) p.react -= dt; });
    if (this.state === 'combo' && this.combo) {
      const c = this.combo;
      if (c.ball) {
        c.ball.t += dt / c.ball.dur;
        if (c.ball.t >= 1) {
          c.holder = c.ball.to; c.ball = null; c.step++; c.clock = 0; c.waitT = .4;
          this.players[c.holder].react = .4;
          if (c.step >= 2) this._startCross();
        }
      } else if (c.holder === 0) {
        c.clock += dt;
        if (c.clock > c.limit) this._comboFail('Долго держишь мяч');
      } else {
        c.waitT -= dt;
        if (c.waitT <= 0) { if (Math.random() < .07) this._comboFail(`${this._name(c.holder)}: потеря мяча`); else this._comboPass(); }
      }
    }
    if (this.state === 'wait') {
      this.waitT -= dt;
      if (this.waitT <= 0) this._startServe();
    } else if (this.state === 'serve') {
      this.flight.t += dt;
      const t = this.flight.t / this.flight.dur;
      if (this.shooterIndex !== 0 && t >= .72) this._botStrike();
      else if (this.shooterIndex === 0 && t >= 1) this._resolveShot(1, 0, 'Мяч упал');
    } else if (this.state === 'shot') {
      this.shot.t += dt / this.shot.dur;
      if (this.shot.t >= 1) {
        this.shot = null;
        if (this.pendingKeeper !== null) {
          this.keeperIndex = this.pendingKeeper;
          this.pendingKeeper = null;
          this.env.hud.setPill('keeper', this._name(this.keeperIndex));
        }
        this._nextAttacker();
        this.state = 'wait'; this.waitT = .65;
      }
    }
  }
  draw(ctx) {
    const { W, H } = this.env;
    Yards.paintGoalScene(ctx, W, H, this.goal);
    if (!Yards.theme().atlas && !Yards.artGoal(W, H)) Yards.drawGoalFrame(ctx, this.goal);
    const bp = this._currentBall();
    const order = this.players.map((p, i) => i).sort((x, y) => this.players[x].y - this.players[y].y);
    order.forEach(i => {
      const p = this.players[i];
      const keeper = i === this.keeperIndex;
      const persp = .78 + (p.y / H) * .5; // дальше — меньше
      const s = (keeper ? .92 : 1) * persp;
      const face = bp ? (bp.x < p.x - 3 ? -1 : 1) : 1;           // все смотрят на мяч
      const cm = this.combo;
      if (this.state === 'combo' && cm && !cm.ball && cm.holder === i) {
        // игрок с мячом: кольцо-таймер (твой — зелёное), и подсказка, кому пасовать
        const left = i === 0 ? U.clamp(1 - cm.clock / cm.limit, 0, 1) : 1;
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 3 * s, 32 * s, 12 * s, 0, 0, 7); ctx.stroke();
        ctx.strokeStyle = left < .3 ? 'rgba(255,90,70,.98)' : i === 0 ? 'rgba(130,230,90,.98)' : 'rgba(255,210,77,.95)';
        ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 3 * s, 32 * s, 12 * s, 0, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); ctx.stroke();
        if (i === 0) {
          const t = this._comboTarget(), pulse = 1 + Math.sin(performance.now() / 160) * .12;
          ctx.strokeStyle = 'rgba(255,210,77,.95)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.ellipse(t.x, t.y + 3, 34 * pulse, 13 * pulse, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      const inWait = this.state === 'wait';
      Yards.drawPlayer(ctx, p.x, p.y, s,
        keeper ? '#caa23c' : ['#3f7fba', '#c0392b', '#7a9f4b', '#4e9fd1'][i],
        keeper ? 'keeper' : 'field',
        { phase: p.phase, moving: keeper ? this.dive !== 0 : (this.state !== 'combo' || Math.hypot(p.tx - p.x, p.ty - p.y) > 3 || true),
          face, dive: keeper ? this.dive : 0,
          kick: (this.state === 'shot' && i === this.shooterIndex) || p.kickT > 0 ? (p.kickT > 0 ? Math.min(1, 1.01 - p.kickT / .25) : true) : false,
          celebrate: inWait && this._lastGoal && i === this._lastShooter,
          catch: inWait && ((this._lastSaved && i === this._lastKeeper) || (!this._lastGoal && i === this.keeperIndex)) });
      ctx.fillStyle = '#fdf7e8'; ctx.font = '700 13px Rubik'; ctx.textAlign = 'center';
      ctx.fillText(this._name(i) + (keeper ? ' 🧤' : ''), p.x, p.y + 17);
      // мимика: после удара
      if (inWait && this.waitT > .1) {
        let e = '';
        if (this._lastGoal) e = i === this._lastShooter ? '😎' : i === this._lastKeeper ? '😩' : '👏';
        else if (i === this._lastShooter) e = '😖'; else if (i === this._lastKeeper && this._lastSaved) e = '😤';
        if (e) Yards.drawEmote(ctx, p.x, p.y - 150 * s, .8, e);
      }
    });
    if (this.state === 'combo' && this.combo) {
      const cm = this.combo;
      if (bp) Yards.drawBall(ctx, bp.x, bp.y, 11);
    }
    if (this.state === 'serve') {
      const t = this.flight.t / this.flight.dur;
      ctx.strokeStyle = t >= .54 && t <= .78 ? '#ffd24d' : 'rgba(255,255,255,.7)';
      ctx.lineWidth = 4; ctx.beginPath();
      ctx.ellipse(this.landing.x, this.landing.y, 30 - t * 14, 14 - t * 5, 0, 0, 7); ctx.stroke();
      const b = this._ballPos(); Yards.drawBall(ctx, b.x, b.y, 11 + t * 3);
    }
    if (this.state === 'shot' && this.shot) {
      const f = this.shot, t = U.easeOut(U.clamp(f.t, 0, 1));
      Yards.drawBall(ctx, U.lerp(f.from.x, f.to.x, t),
        U.lerp(f.from.y, f.to.y, t) - Math.sin(t * Math.PI) * 24, 12);
    }
  }
  _currentBall() {
    if (this.state === 'combo' && this.combo) {
      const c = this.combo;
      if (c.ball) {
        const to = this.players[c.ball.to], t = U.easeOut(U.clamp(c.ball.t, 0, 1));
        return { x: U.lerp(c.ball.from.x, to.x, t), y: U.lerp(c.ball.from.y, to.y, t) - Math.sin(t * Math.PI) * 14 - 6 };
      }
      const h = this.players[c.holder];
      return { x: h.x + 18, y: h.y - 6 };
    }
    if (this.state === 'serve' && this.flight) return this._ballPos();
    if (this.state === 'shot' && this.shot) {
      const f = this.shot, t = U.easeOut(U.clamp(f.t, 0, 1));
      return { x: U.lerp(f.from.x, f.to.x, t), y: U.lerp(f.from.y, f.to.y, t) };
    }
    return null;
  }
  _finish() {
    if (this.finished) return;
    this.finished = true;
    const you = this.players[0].score;
    const bestRival = Math.max(...this.players.slice(1).map(p => p.score));
    const won = you >= bestRival;
    const newBest = Save.setBest('cross', you);
    const coins = Math.round(you / 10) + (won ? 30 : 0) + (newBest ? 15 : 0);
    Save.addCoins(coins);
    this.env.finish({ title: won ? 'Победа в навесе!' : 'Соперники точнее',
      score: `${you} : ${bestRival}`, sub: '12 розыгрышей • промахнувшийся идёт в ворота',
      moment: this.bestMoment ? '★ Лучший удар: ' + this.bestMoment : '', coins, newBest });
  }
  destroy() {}
}
