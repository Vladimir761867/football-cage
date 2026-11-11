/* «Навес»: партнёр подаёт, ты замыкаешь. Ранний жест — удар с лёта (100),
   золотое окно — головой (75), поздно — скидка (30). 10 подач, серия ×2/×3. */
class CrossMode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    this.goal = { x: W * .2, y: H * .4, w: W * .6, h: H * .2 };
    this.landing = { x: W * .5, y: H * .72 };
    this.serveFrom = { x: -30, y: H * .62 };
    this.score = 0;
    this.serveN = 0;
    this.total = 10;
    this.streak = 0;
    this.state = 'wait'; // wait | serve | shot | done
    this.flight = null;  // {t, dur}
    this.shot = null;
    this.keeper = { side: 0, commit: 0 }; // -1 влево, 1 вправо
    this.bestMoment = ''; this.bestVal = 0;
    this.waitT = .9;

    env.hud.setPills([
      { id: 'score', lbl: 'Очки', val: 0 },
      { id: 'serve', lbl: 'Подача', val: '0/10' },
      { id: 'streak', lbl: 'Серия', val: '—' }
    ]);
    env.hud.setTimer('⚽');
    env.hud.hint('Когда мяч подлетает — проведи к углу ворот. Раньше = с лёта!');

    env.gesture.onEnd = d => {
      if (this.state !== 'serve' || !d) return;
      if (d.dy > 10) { // жест вниз = скидка
        this._resolve('lay', 0);
        return;
      }
      const side = d.dx >= 0 ? 1 : -1;
      this._resolve('strike', side);
    };
  }

  _startServe() {
    this.serveN++;
    this.env.hud.setPill('serve', `${this.serveN}/${this.total}`);
    this.state = 'serve';
    const { W, H } = this.env;
    this.landing = { x: W * (.38 + Math.random() * .24), y: H * (.68 + Math.random() * .08) };
    this.flight = { t: 0, dur: 1.7 };
    this.keeper.side = Math.random() < .5 ? -1 : 1;
    this.keeper.commit = 0;
    Sound.pass();
  }

  _windows() {
    // доли полёта: с лёта / головой (золотое) / поздно (скидка ещё можно)
    return { volley: [.5, .66], header: [.68, .85], late: [.85, .97] };
  }

  _resolve(kind, side) {
    const t = this.flight.t / this.flight.dur;
    const w = this._windows();
    let label = '', pts = 0, goal = false, cls = 'good';

    if (kind === 'lay') {
      if (t > .4 && t < .97) { label = 'Скидка партнёру'; pts = 30; }
      else { label = 'Рано!'; pts = 0; cls = 'bad'; }
    } else if (t >= w.volley[0] && t <= w.volley[1]) {
      label = 'С лёта'; pts = 100; goal = true;
    } else if (t > w.header[0] && t <= w.header[1]) {
      label = 'Головой'; pts = 75; goal = true;
    } else if (t > w.late[0] && t <= w.late[1]) {
      label = 'Дотянулся'; pts = 40; goal = true;
    } else {
      label = t < w.volley[0] ? 'Слишком рано' : 'Не успел'; pts = 0; cls = 'bad';
    }

    // вратарь угадывает угол
    if (goal && side === this.keeper.side && Math.random() < .45) {
      label = 'Вратарь взял!'; pts = 0; goal = false; cls = 'bad';
    }

    this.state = 'shot';
    const g = this.goal, topY = g.y - g.h;
    const tx = side === 0 ? g.x + g.w / 2
      : side < 0 ? g.x + g.w * .16 : g.x + g.w * .84;
    this.shot = {
      from: this._ballPos(), kind, side, goal,
      to: kind === 'lay' ? { x: this.landing.x + 60, y: this.landing.y + 10 }
        : { x: tx + (goal ? 0 : (Math.random() - .5) * 60), y: goal ? topY + g.h * .3 : topY - 30 },
      t: 0, dur: .3
    };
    this.keeper.commit = side !== 0 ? this.keeper.side : 0;

    if (goal) {
      this.streak++;
      const mult = Math.min(3, 1 + Math.floor(this.streak / 2) * 0.5); // x1, x1.5, x2, … до x3
      const total = Math.round(pts * mult);
      this.score += total;
      this.env.hud.toast(`${label}! Гол +${total}${mult > 1 ? ' (×' + mult + ')' : ''}`, pts >= 100 ? 'gold' : 'good');
      Sound.goal();
      if (total > this.bestVal) { this.bestVal = total; this.bestMoment = `${label} в ${side < 0 ? 'левый' : 'правый'} угол, +${total}`; }
    } else if (pts > 0) {
      this.score += pts;
      this.env.hud.toast(`${label} +${pts}`, 'good');
      Sound.pass();
    } else {
      this.streak = 0;
      this.env.hud.toast(label, cls);
      Sound.miss();
    }
    this.env.hud.setPill('score', this.score);
    this.env.hud.setPill('streak', this.streak > 1 ? '×' + Math.min(3, 1 + Math.floor(this.streak / 2) * 0.5) : '—');
    this.env.hud.hideHintSoon();
  }

  _ballPos() {
    const t = U.clamp(this.flight.t / this.flight.dur, 0, 1);
    const x = U.lerp(this.serveFrom.x, this.landing.x, t);
    const y = U.lerp(this.serveFrom.y, this.landing.y, t) - Math.sin(t * Math.PI) * this.env.H * .3;
    return { x, y };
  }

  update(dt) {
    if (this.state === 'wait') {
      this.waitT -= dt;
      if (this.waitT <= 0) {
        if (this.serveN >= this.total) { this._finish(); return; }
        this._startServe();
      }
    } else if (this.state === 'serve') {
      this.flight.t += dt;
      if (this.flight.t >= this.flight.dur) {
        // мяч упал — подача потеряна
        this.streak = 0;
        this.env.hud.setPill('streak', '—');
        this.env.hud.toast('Мяч упал', 'bad');
        Sound.miss();
        this.state = 'wait'; this.waitT = .8;
      }
    } else if (this.state === 'shot' && this.shot) {
      this.shot.t += dt / this.shot.dur;
      if (this.shot.t >= 1) {
        this.shot = null;
        this.state = 'wait'; this.waitT = .9;
      }
    }
  }

  draw(ctx) {
    const { W, H } = this.env;
    Yards.paintGoalScene(ctx, W, H, this.goal);
    const g = this.goal, topY = g.y - g.h;
    Yards.drawGoalFrame(ctx, g);

    // вратарь
    const kx = g.x + g.w / 2 + (this.keeper.commit || 0) * g.w * .3;
    Yards.drawPlayer(ctx, kx, g.y + 4, 1.1, '#caa23c', 'keeper');

    // нападающий у точки приземления
    Yards.drawPlayer(ctx, this.landing.x - 26, this.landing.y + 18, 1.3, '#3f7fba');

    if (this.state === 'serve') {
      // кольцо приземления + индикатор окна
      const t = this.flight.t / this.flight.dur;
      const w = this._windows();
      let col = 'rgba(255,255,255,.6)';
      if (t >= w.volley[0] && t <= w.volley[1]) col = 'rgba(255,210,77,.95)';
      else if (t > w.header[0] && t <= w.header[1]) col = 'rgba(130,230,90,.95)';
      else if (t > w.late[0]) col = 'rgba(232,140,75,.9)';
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      const r = U.lerp(46, 16, U.clamp((t - .3) / .6, 0, 1));
      ctx.beginPath(); ctx.ellipse(this.landing.x, this.landing.y, r, r * .4, 0, 0, 7); ctx.stroke();
      // мяч в полёте
      const bp = this._ballPos();
      Yards.drawBall(ctx, bp.x, bp.y, U.lerp(10, 14, t));
      // подписи окон
      ctx.fillStyle = col; ctx.font = '700 14px Rubik'; ctx.textAlign = 'center';
      const lbl = t < w.volley[0] ? 'жди…' : t <= w.volley[1] ? 'С ЛЁТА!' : t <= w.header[1] ? 'ГОЛОВОЙ!' : t <= w.late[1] ? 'успей!' : '';
      if (lbl) ctx.fillText(lbl, this.landing.x, this.landing.y + 34);
    }
    if (this.state === 'shot' && this.shot) {
      const s = this.shot, tt = U.easeOut(U.clamp(s.t, 0, 1));
      const x = U.lerp(s.from.x, s.to.x, tt);
      const y = U.lerp(s.from.y, s.to.y, tt) - (s.kind === 'lay' ? 0 : Math.sin(tt * Math.PI) * 30);
      Yards.drawBall(ctx, x, y, 12);
    }
  }

  _finish() {
    // бот замыкает свои 10 подач (симуляция)
    let bot = 0, bstreak = 0;
    for (let i = 0; i < 10; i++) {
      const r = Math.random();
      let pts = r < .3 ? 0 : r < .5 ? 30 : r < .8 ? 75 : 100;
      if (pts >= 75) { bstreak++; pts = Math.round(pts * Math.min(3, 1 + Math.floor(bstreak / 2) * .5)); }
      else if (!pts) bstreak = 0;
      bot += pts;
    }
    const won = this.score > bot;
    const newBest = Save.setBest('cross', this.score);
    const coins = Math.round(this.score / 10) + (won ? 30 : 0) + (newBest ? 15 : 0);
    Save.addCoins(coins);
    this.env.finish({
      title: won ? 'Победа!' : bot === this.score ? 'Ничья' : 'Бот забил больше',
      score: `${this.score} : ${bot}`,
      sub: won ? 'Твои навесы точнее' : 'Лови золотое окно — и бей с лёта',
      moment: this.bestMoment ? '★ Лучший момент: ' + this.bestMoment : '',
      coins, newBest
    });
  }
  destroy() {}
}
