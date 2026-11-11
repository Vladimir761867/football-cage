/* «Американка 300»: соревнование на точность. Девятка 100, перекладина 75,
   штанга 50, сектор 25. Идеальный тайминг в девятку = 150. Первый до 300. */
class Am300Mode {
  constructor(env) {
    this.env = env;
    const { W, H } = env;
    this.difficulty = env.difficulty || 'normal';
    this.cfg = {
      easy:   { spread: .15, window: .25, keeper: .16, keeperSpeed: .7 },
      normal: { spread: .30, window: .16, keeper: .30, keeperSpeed: 1.15 },
      hard:   { spread: .48, window: .09, keeper: .52, keeperSpeed: 1.8 }
    }[this.difficulty];
    this.goal = { x: W * .14, y: H * .42, w: W * .72, h: H * .24 };
    this.ballPos = { x: W / 2, y: H * .82 };
    this.you = 0; this.bot = 0;
    this.round = 1;
    this.ballsLeft = 5;
    this.state = 'aim'; // aim | fly | impact | bot | done
    this.aim = null;    // текущая точка прицела
    this.drag = null;
    this.oscT = 0;      // фаза шкалы тайминга
    this.fly = null;
    this.botQueue = [];
    this.botT = 0;
    this.bestMoment = ''; this.bestVal = 0;
    this.maxDrag = H * .5;
    this.keeper = { x: W * .5, phase: 0 };

    env.hud.setPills([
      { id: 'you', lbl: 'Ты', val: 0 },
      { id: 'balls', lbl: 'Мячи', val: '5' },
      { id: 'bot', lbl: 'Бот', val: 0 }
    ]);
    env.hud.setTimer('🎯300');
    env.hud.hint('Потяни вверх к цели. Отпусти, когда бегунок в золотой зоне');

    env.gesture.onStart = p => {
      if (this.state !== 'aim') return;
      this.oscT = 0;
    };
    env.gesture.onMove = d => {
      if (this.state !== 'aim') return;
      this.drag = d;
      // прицел = направление жеста от мяча
      const len = U.clamp(d.len / this.maxDrag, 0, 1);
      const dirX = d.dx / (d.len || 1), dirY = d.dy / (d.len || 1);
      const reach = U.lerp(0, this.ballPos.y - (this.goal.y - this.goal.h) + 40, len);
      this.aim = { x: this.ballPos.x + dirX * Math.abs(reach) * .9,
                   y: this.ballPos.y + dirY * reach, p: len };
    };
    env.gesture.onEnd = d => {
      const drag = this.drag; this.drag = null;
      if (this.state !== 'aim') return;
      if (!d || !drag || !this.aim || drag.dy > -20) { this.aim = null; return; } // тянуть нужно вверх
      this._shoot(drag);
    };
  }

  _timing() {
    // бегунок ходит туда-сюда; золотая зона в центре
    const ph = (Math.sin(this.oscT * 4.6) + 1) / 2; // 0..1
    return ph;
  }

  _shoot(drag) {
    const p = U.clamp(drag.len / this.maxDrag, 0, 1.1);
    const ph = this._timing();
    const timingErr = Math.abs(ph - .5) * 2;          // 0 = идеально
    const golden = timingErr < this.cfg.window;
    const powerErr = p < .35 ? (.35 - p) * 3 : p > .95 ? (p - .95) * 4 : 0;
    const contactErr = timingErr > this.cfg.window ? timingErr * .9 : timingErr * .22;
    const err = (contactErr + powerErr) * this.goal.w * this.cfg.spread;
    const a = Math.random() * Math.PI * 2;
    const hit = { x: this.aim.x + Math.cos(a) * err, y: this.aim.y + Math.sin(a) * err * .7 };
    if (p < .3) hit.y = this.goal.y - 6; // недолёт — мяч катится низом
    this.state = 'fly';
    this.fly = { from: { ...this.ballPos }, to: hit, t: 0, dur: .38 + timingErr * .12, golden };
    this.aim = null;
    Sound.kick();
  }

  _zoneAt(x, y) {
    const g = this.goal, topY = g.y - g.h;
    const nineR = g.w * .11;
    const inX = x > g.x - 10 && x < g.x + g.w + 10;
    const inY = y > topY - 10 && y < g.y + 6;
    // девятки
    for (const nx of [g.x + nineR * .8, g.x + g.w - nineR * .8]) {
      if (Math.hypot(x - nx, y - (topY + nineR * .8)) < nineR) return { name: 'Девятка', pts: 100 };
    }
    if (inX && Math.abs(y - topY) < 11) return { name: 'Перекладина', pts: 75 };
    if (inY && (Math.abs(x - g.x) < 11 || Math.abs(x - (g.x + g.w)) < 11)) return { name: 'Штанга', pts: 50 };
    if (x > g.x && x < g.x + g.w && y > topY && y < g.y) return { name: 'Сектор', pts: 25 };
    return { name: 'Мимо', pts: 0 };
  }

  _impact() {
    const { to, golden } = this.fly;
    let z = this._zoneAt(to.x, to.y);
    let pts = z.pts, label = z.name;
    if (z.pts === 100 && golden) { pts = 150; label = 'Девятка + тайминг'; }
    const keeperY = this.goal.y + 4;
    const keeperReach = this.goal.w * .17;
    const keeperHit = z.pts > 0 && Math.abs(to.x - this.keeper.x) < keeperReach && to.y > this.goal.y - this.goal.h * .7;
    if (keeperHit && Math.random() < this.cfg.keeper) {
      pts = z.pts >= 50 ? 10 : 0;
      label = pts ? 'Вратарь коснулся мяча' : 'Вратарь отбил';
      if (!pts) z = { pts: 0, name: label };
      void keeperY;
    }
    this.impactFx = { x: to.x, y: to.y, t: 0, pts, label };
    this.fly = null;
    if (pts >= 100) { Sound.goal(); this.env.hud.toast(`${label}! +${pts}`, 'gold'); }
    else if (pts >= 50) { Sound.post(); this.env.hud.toast(`${label}! +${pts}`, 'good'); }
    else if (pts > 0) { Sound.pass(); this.env.hud.toast(`+${pts}`, 'good'); }
    else { Sound.miss(); this.env.hud.toast('Мимо', 'bad'); }
    if (pts > this.bestVal) { this.bestVal = pts; this.bestMoment = `${label} (+${pts}) на ${this.round}-м круге`; }
    this.you += pts;
    this.ballsLeft--;
    this.env.hud.setPill('you', this.you);
    this.env.hud.setPill('balls', this.ballsLeft);
    this.state = 'impact';
    setTimeout(() => {
      if (this.state !== 'impact') return;
      if (this.ballsLeft <= 0) this._startBotTurn();
      else this.state = 'aim';
    }, 650);
    this.env.hud.hideHintSoon();
  }

  _startBotTurn() {
    this.state = 'bot';
    this.env.hud.toast('Ход бота…', '');
    // бот среднего уровня: 5 ударов
    const table = [[0, .2], [25, .34], [50, .2], [75, .16], [100, .1]];
    this.botQueue = [];
    for (let i = 0; i < 5; i++) {
      let r = Math.random(), acc = 0, pts = 0;
      for (const [v, p] of table) { acc += p; if (r <= acc) { pts = v; break; } }
      this.botQueue.push(pts);
    }
    this.botT = .8;
  }

  update(dt) {
    this.oscT += dt;
    this.keeper.phase += dt * this.cfg.keeperSpeed;
    this.keeper.x = this.goal.x + this.goal.w * (.5 + Math.sin(this.keeper.phase * 1.3) * .30);
    if (this.state === 'fly' && this.fly) {
      this.fly.t += dt / this.fly.dur;
      if (this.fly.t >= 1) this._impact();
    }
    if (this.impactFx) { this.impactFx.t += dt; if (this.impactFx.t > .9) this.impactFx = null; }
    if (this.state === 'bot') {
      this.botT -= dt;
      if (this.botT <= 0) {
        if (this.botQueue.length) {
          const pts = this.botQueue.shift();
          this.bot += pts;
          this.env.hud.setPill('bot', this.bot);
          const names = { 0: 'мимо', 25: 'сектор', 50: 'штанга', 75: 'перекладина', 100: 'девятка' };
          this.env.hud.toast(`Бот: ${names[pts]}${pts ? ' +' + pts : ''}`, pts >= 75 ? 'bad' : '');
          pts >= 75 ? Sound.post() : pts ? Sound.pass() : Sound.miss();
          this.botT = .62;
        } else {
          // конец круга — проверяем 300
          if (this.you >= 300 || this.bot >= 300) {
            if (this.you === this.bot) { this.env.hud.toast('Ничья — ещё круг!', 'gold'); this._nextRound(); }
            else this._finish(this.you > this.bot);
          } else this._nextRound();
        }
      }
    }
  }
  _nextRound() {
    this.round++;
    this.ballsLeft = 5;
    this.env.hud.setPill('balls', this.ballsLeft);
    this.state = 'aim';
  }

  draw(ctx) {
    const { W, H } = this.env;
    Yards.paintGoalScene(ctx, W, H, this.goal);
    const g = this.goal, topY = g.y - g.h;

    // зоны-подсказки
    const nineR = g.w * .11;
    ctx.save();
    ctx.globalAlpha = this.state === 'aim' ? .9 : .4;
    for (const nx of [g.x + nineR * .8, g.x + g.w - nineR * .8]) {
      ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(nx, topY + nineR * .8, nineR, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,210,77,.9)'; ctx.font = '700 13px Rubik'; ctx.textAlign = 'center';
      ctx.fillText('100', nx, topY + nineR * .9);
    }
    ctx.restore();
    Yards.drawGoalFrame(ctx, g);
    // Вратарь двигается по линии и на высокой сложности закрывает часть ворот.
    Yards.drawPlayer(ctx, this.keeper.x, g.y + 4, 1.1, '#caa23c', 'keeper', {
      phase: performance.now() / 260,
      moving: true
    });
    // подписи целей
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '700 12px Rubik'; ctx.textAlign = 'center';
    ctx.fillText('75', g.x + g.w / 2, topY - 14);
    ctx.fillText('50', g.x - 16, g.y - g.h / 2);
    ctx.fillText('50', g.x + g.w + 16, g.y - g.h / 2);

    // мяч и прицел
    if (this.state === 'aim' || this.state === 'impact' || this.state === 'bot') {
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
    // полёт
    if (this.state === 'fly' && this.fly) {
      const f = this.fly, tt = U.easeOut(U.clamp(f.t, 0, 1));
      const x = U.lerp(f.from.x, f.to.x, tt);
      const y = U.lerp(f.from.y, f.to.y, tt) - Math.sin(tt * Math.PI) * 70;
      Yards.drawBall(ctx, x, y, U.lerp(15, 8, tt));
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
    const bw = W * .6, bx = (W - bw) / 2, by = H * .9, bh = 14;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.roundRect(bx - 6, by - 6, bw + 12, bh + 12, 10); ctx.fill();
    ctx.fillStyle = '#5a5f6a'; ctx.fillRect(bx, by, bw, bh);
    // золотая зона — на турнире она заметно уже
    ctx.fillStyle = '#ffd24d';
    const half = this.cfg.window;
    ctx.fillRect(bx + bw * (.5 - half), by, bw * half * 2, bh);
    // бегунок
    const ph = this._timing();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(bx + ph * bw - 4, by - 4, 8, bh + 8, 4); ctx.fill();
  }

  _finish(won) {
    const newBest = Save.setBest('am300', this.you);
    const coins = Math.round(this.you / 10) + (won ? 30 : 0) + (newBest ? 15 : 0);
    Save.addCoins(coins);
    this.env.finish({
      title: won ? 'Победа!' : 'Бот оказался точнее',
      score: `${this.you} : ${this.bot}`,
      sub: won ? `Ты первым дошёл до 300 (${this.round} кр.)` : 'Реванш? Целься в девятку с таймингом',
      moment: this.bestMoment ? '★ Лучший удар: ' + this.bestMoment : '',
      coins, newBest
    });
  }
  destroy() {}
}
