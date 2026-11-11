/* «Навес»: четыре участника на поле. Подача, удар, попытка вратаря отбить.
   Промахнувшийся нападающий меняется местами с вратарём. */
class CrossMode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    const atlasCourt = Boolean(Yards.theme().atlas);
    const goalW = atlasCourt ? Math.min(W * .65, H * .22) : W * .6;
    this.goal = Yards.goalGeometry(W, H, { x: (W - goalW) / 2, y: H * .39,
      w: goalW, h: H * .2 });
    this.players = Array.from({ length: 4 }, (_, i) => ({
      x: W * (.18 + i * .21), y: H * (.68 + (i % 2) * .07),
      tx: W * (.18 + i * .21), ty: H * (.68 + (i % 2) * .07), phase: i * 1.7,
      score: 0
    }));
    this.keeperIndex = 3;
    this.shooterIndex = 0;
    this.serverIndex = 1;
    this.serveN = 0;
    this.total = 12;
    this.state = 'wait';
    this.waitT = .7;
    this.flight = null;
    this.shot = null;
    this.pendingKeeper = null;
    this.landing = { x: W * .5, y: H * .67 };
    this.dive = 0;
    this.keeperX = this.goal.x + this.goal.w / 2;
    this.keeperTarget = this.keeperX;
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
    this.serverIndex = field.find(i => i !== this.shooterIndex);
  }
  _setPositions() {
    const { W, H } = this.env;
    this.players.forEach((p, i) => {
      if (i === this.keeperIndex) { p.tx = this.keeperX; p.ty = this.goal.y + 7; }
      else if (i === this.shooterIndex) { p.tx = this.landing.x - 22; p.ty = this.landing.y + 20; }
      else if (i === this.serverIndex) { p.tx = W * .18; p.ty = H * .66; }
      else { p.tx = W * .82; p.ty = H * .69; }
    });
  }
  _startServe() {
    if (this.serveN >= this.total) { this._finish(); return; }
    this.serveN++;
    this.env.hud.setPill('turn', `${this.serveN}/${this.total}`);
    const { W, H } = this.env;
    this.landing = { x: W * (.42 + Math.random() * .16), y: H * (.66 + Math.random() * .07) };
    this._setPositions();
    this.state = 'serve';
    this.flight = { t: 0, dur: 1.6, from: { x: W * .18, y: H * .62 } };
    this.dive = 0;
    this.keeperTarget = this.goal.x + this.goal.w / 2;
    this.env.hud.hint(this.shooterIndex === 0 ? 'Ты бьёшь: проведи к левому или правому углу!' :
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
    this.keeperX = U.lerp(this.keeperX, this.keeperTarget, 1 - Math.pow(.002, dt));
    this._setPositions();
    this.players.forEach(p => {
      p.x = U.lerp(p.x, p.tx, 1 - Math.pow(.0001, dt));
      p.y = U.lerp(p.y, p.ty, 1 - Math.pow(.0001, dt));
      p.phase += dt * 8;
    });
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
    this.env.bgFor('goal', bg => Yards.paintGoalScene(bg, W, H, this.goal));
    if (!Yards.theme().atlas) Yards.drawGoalFrame(ctx, this.goal);
    this.players.map((p, i) => ({p, i})).sort((a, b) => a.p.y - b.p.y).forEach(({p, i}) => {
      const keeper = i === this.keeperIndex;
      Yards.drawPlayer(ctx, p.x, p.y, keeper ? Math.min(1.35, this.goal.h * .65 / 89) : 1.1,
        keeper ? '#caa23c' : ['#3f7fba', '#c0392b', '#7a9f4b', '#4e9fd1'][i],
        keeper ? 'keeper' : 'field',
        { phase: p.phase, moving: Math.hypot(p.tx - p.x, p.ty - p.y) > 3,
          facing: p.tx - p.x < -3 ? -1 : 1, dive: keeper ? this.dive : 0,
          kick: this.state === 'shot' && i === this.shooterIndex });
      ctx.fillStyle = '#fdf7e8'; ctx.font = '700 13px Rubik'; ctx.textAlign = 'center';
      ctx.fillText(this._name(i) + (keeper ? ' 🧤' : ''), p.x, p.y + 17);
    });
    if (this.state === 'serve') {
      const t = this.flight.t / this.flight.dur;
      ctx.strokeStyle = t >= .54 && t <= .78 ? '#ffd24d' : 'rgba(255,255,255,.7)';
      ctx.lineWidth = 4; ctx.beginPath();
      ctx.ellipse(this.landing.x, this.landing.y, 30 - t * 14, 14 - t * 5, 0, 0, 7); ctx.stroke();
      const b = this._ballPos(); Yards.drawBall(ctx, b.x, b.y, 11 + t * 3, undefined, true);
    }
    if (this.state === 'shot' && this.shot) {
      const f = this.shot, t = U.easeOut(U.clamp(f.t, 0, 1));
      Yards.drawBall(ctx, U.lerp(f.from.x, f.to.x, t),
        U.lerp(f.from.y, f.to.y, t) - Math.sin(t * Math.PI) * 24, 12, undefined, true);
    }
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
