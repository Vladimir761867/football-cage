/* Общая оценка удара для одиночной игры и сетевой комнаты. */
const ShotRules = {
  zone(g, x, y) {
    const top = g.y - g.h, corner = g.w * .08;
    const rail = Math.min(10, g.w * .04);
    const withinX = x > g.x - rail && x < g.x + g.w + rail;
    const withinY = y > top - rail && y < g.y + rail * .6;
    if (withinX && Math.abs(y - top) < rail) return { id:'bar', name:'Перекладина', pts:100 };
    if (withinY && Math.min(Math.abs(x - g.x), Math.abs(x - g.x - g.w)) < rail) {
      return { id:'post', name:'Штанга', pts:50 };
    }
    for (const cx of [g.x + corner * .8, g.x + g.w - corner * .8]) {
      if (Math.hypot(x - cx, y - top - corner * 1.65) < corner) return { id:'corner', name:'Девятка', pts:75 };
    }
    if (x > g.x && x < g.x + g.w && y > top && y < g.y) return { id:'goal', name:'Гол', pts:25 };
    return { id:'miss', name:'Мимо', pts:0 };
  },
  aim(goal, ball, drag, maxDrag) {
    const len = Math.hypot(drag.dx, drag.dy);
    const power = Math.min(1, len / maxDrag);
    const reach = (ball.y - (goal.y - goal.h) + 40) * power;
    return { x:ball.x + drag.dx / (len || 1) * reach * .9, y:ball.y + drag.dy / (len || 1) * reach };
  },
  kick(goal, ball, drag, maxDrag, phase, cfg, random = Math.random) {
    const power = Math.min(1.1, Math.hypot(drag.dx, drag.dy) / maxDrag);
    const timing = Math.abs(Math.sin(phase * 4.6));
    const golden = timing < cfg.window;
    const powerError = power < .35 ? (.35 - power) * 3 : power > .95 ? (power - .95) * 4 : 0;
    const drift = (timing * (golden ? .22 : .9) + powerError) * goal.w * cfg.spread;
    const a = random() * Math.PI * 2;
    const aim = this.aim(goal, ball, drag, maxDrag);
    const to = { x:aim.x + Math.cos(a) * drift, y:aim.y + Math.sin(a) * drift * .7 };
    if (power < .30) to.y = goal.y - 6;
    const zone = this.zone(goal, to.x, to.y);
    const issue = power < .35 ? 'Слабый удар' : power > .97 ? 'Слишком сильный удар'
      : !golden && zone.id !== this.zone(goal, aim.x, aim.y).id ? 'Отпусти ближе к золотой зоне' : 'Поправь направление';
    return { from: {...ball}, to, zone, golden, issue, t:0, dur:.38 + timing * .12 };
  }
};
if (typeof module !== 'undefined') module.exports = ShotRules;
