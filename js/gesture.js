/* Один жест «потяни и отпусти» для всех режимов. */
class Gesture {
  constructor(canvas, camera = null) {
    this.canvas = canvas;
    this.camera = camera;
    this.active = false;
    this.enabled = true;
    this.pointerId = null;
    this.start = null;   // {x,y,t}
    this.cur = null;     // {x,y}
    this.onStart = null; // (p) => {}
    this.onMove = null;  // (drag) => {}
    this.onEnd = null;   // (drag|null) => {}  null = отмена/короткий тап
    this.onTap = null;
    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);
    this._cancel = this._cancel.bind(this);
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    canvas.addEventListener('pointerup', this._up);
    canvas.addEventListener('pointercancel', this._cancel);
  }
  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    if (this.camera) {
      const { left, top, scale } = this.camera;
      return { x: left + (e.clientX - r.left) / scale, y: top + (e.clientY - r.top) / scale };
    }
    return { x: (e.clientX - r.left) * ((this.canvas.logicalWidth || this.canvas.width) / r.width),
             y: (e.clientY - r.top) * ((this.canvas.logicalHeight || this.canvas.height) / r.height) };
  }
  _down(e) {
    if (!this.enabled || this.active || (e.button !== undefined && e.button !== 0)) return;
    this.pointerId = e.pointerId;
    e.preventDefault();
    this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
    const p = this._pos(e);
    this.active = true;
    this.start = { ...p, t: performance.now() };
    this.cur = p;
    this.onStart && this.onStart(p);
  }
  _move(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.cur = this._pos(e);
    this.onMove && this.onMove(this.drag());
  }
  _up(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.active = false;
    this.cur = this._pos(e);
    const d = this.drag();
    this.onEnd && this.onEnd(d.len < 18 ? null : d);
    if (d.len < 18 && d.dur < 420 && this.onTap) {
      const rect = this.canvas.getBoundingClientRect();
      const scale = this.camera ? 1 / this.camera.scale : (this.canvas.logicalWidth || this.canvas.width) / rect.width;
      this.onTap(this.cur, 24 * scale);
    }
    this.start = null; this.cur = null;
    this.pointerId = null;
  }
  _cancel(e) {
    if (e && e.pointerId !== this.pointerId) return;
    if (this.active && this.onEnd) this.onEnd(null);
    this.active = false; this.start = null; this.cur = null; this.pointerId = null;
  }
  drag() {
    // Keep a swipe of the same screen length equally strong in both camera views.
    const gain = this.camera ? this.camera.scale / this.camera.overviewScale : 1;
    const dx = (this.cur.x - this.start.x) * gain, dy = (this.cur.y - this.start.y) * gain;
    return {
      sx: this.start.x, sy: this.start.y, x: this.cur.x, y: this.cur.y,
      dx, dy, len: Math.hypot(dx, dy), angle: Math.atan2(dy, dx),
      dur: performance.now() - this.start.t
    };
  }
  destroy() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._down);
    c.removeEventListener('pointermove', this._move);
    c.removeEventListener('pointerup', this._up);
    c.removeEventListener('pointercancel', this._cancel);
  }
}

/* Утилиты, общие для режимов */
const U = {
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  easeOut: t => 1 - (1 - t) * (1 - t),
  tapPlayer(tap, radius, candidates, position, height) {
    let nearest = -1, distance = radius;
    for (const id of candidates) {
      const feet = position(id);
      const y = U.clamp(tap.y, feet.y - height(id), feet.y);
      const d = Math.hypot(tap.x - feet.x, tap.y - y);
      if (d < distance) { nearest = id; distance = d; }
    }
    return nearest;
  },
  aimedPass(from, to, len) {
    return { angle: Math.atan2(to.y - from.y, to.x - from.x), len };
  },
  angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  },
  // стрелка прицеливания от точки жеста
  drawAim(ctx, d, color) {
    if (!d || d.len < 10) return;
    const maxLen = 260;
    const len = U.clamp(d.len, 0, maxLen);
    const ex = d.sx + Math.cos(d.angle) * len, ey = d.sy + Math.sin(d.angle) * len;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 3;
    ctx.strokeStyle = color || 'rgba(255,255,255,.9)';
    ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(d.sx, d.sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.setLineDash([]);
    // наконечник
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(d.angle) * 14, ey + Math.sin(d.angle) * 14);
    ctx.lineTo(ex + Math.cos(d.angle + 2.6) * 12, ey + Math.sin(d.angle + 2.6) * 12);
    ctx.lineTo(ex + Math.cos(d.angle - 2.6) * 12, ey + Math.sin(d.angle - 2.6) * 12);
    ctx.closePath();
    ctx.fillStyle = color || 'rgba(255,255,255,.9)';
    ctx.fill();
    ctx.restore();
  },
  // шкала силы без цифр: цветная дуга у пальца
  drawPower(ctx, d, maxLen) {
    if (!d || d.len < 10) return;
    const p = U.clamp(d.len / maxLen, 0, 1);
    const col = p < .35 ? '#8ab4ff' : p <= .9 ? '#6fbf3f' : '#e85b4b';
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(d.sx, d.sy, 34, -Math.PI * .9, Math.PI * -0.1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(d.sx, d.sy, 34, -Math.PI * .9, -Math.PI * .9 + p * Math.PI * .8); ctx.stroke();
    ctx.restore();
  }
};
