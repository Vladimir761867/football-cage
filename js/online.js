/* Дружеские комнаты с сервером, общим счётом и очередностью ходов. */
const OnlineRooms = {
  origin(value) {
    const input = (value || '').trim() || document.querySelector('meta[name="football-rooms-origin"]')?.content;
    if (!input && location.hostname.endsWith('.github.io')) throw new Error('Для игры по этой ссылке нужен адрес сервера комнат. Вставь адрес или открой приглашение.');
    let url;
    try { url = new URL(input || location.origin); } catch { throw new Error('Укажи полный адрес сервера, например https://example.com'); }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === location.origin))) {
      throw new Error('Укажи адрес HTTPS без пути. Для локального сервера оставь поле пустым.');
    }
    return url.origin;
  },
  async request(origin, path, {body,token,keepalive=false} = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const response = await fetch(origin + '/api/rooms' + path,{
        method:body === undefined ? 'GET' : 'POST',
        headers:{
          ...(token ? {Authorization:'Bearer '+token} : {}),
          ...(body !== undefined ? {'Content-Type':'application/json'} : {})
        },
        body:body === undefined ? undefined : JSON.stringify(body), credentials:'omit',
        signal:ctrl.signal, keepalive
      });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('По этому адресу нет сервера комнат');
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || 'Сервер не принял действие');
      return value;
    } catch (e) {
      if (e.name === 'AbortError' || e instanceof TypeError) throw new Error('Сервер комнат недоступен');
      throw e;
    } finally { clearTimeout(timer); }
  },
  check(room) {
    const count = room?.mode === 'am300' ? 2 : room?.mode === 'square' ? 4 : 0;
    if (!count || room.capacity !== count || !/^[A-F0-9]{6}$/.test(room.code) ||
        !['lobby','playing','done','cancelled'].includes(room.phase) ||
        !Array.isArray(room.seats) || room.seats.length !== count ||
        !Array.isArray(room.scores) || room.scores.length !== count || !room.scores.every(Number.isFinite) ||
        ![room.version,room.serverNow,room.turnReadyAt,room.deadline].every(Number.isFinite) ||
        !Number.isInteger(room.turn) || room.turn < 0 || room.turn >= count) {
      throw new Error('Сервер прислал неверное состояние комнаты');
    }
    if (room.last && (!room.last.from || !room.last.to ||
        ![room.last.from.x,room.last.from.y,room.last.to.x,room.last.to.y,room.last.arc,room.last.time].every(Number.isFinite))) {
      throw new Error('Сервер прислал неверный ход');
    }
    if (room.teams != null && (!Array.isArray(room.teams) || room.teams.length !== count ||
        room.teams.some(team => typeof team !== 'string' || team !== RoomField.teamName(team)))) {
      throw new Error('Сервер прислал неверные названия команд');
    }
    const cup = room.cup;
    const scorePair = pair => Array.isArray(pair) && pair.length === 2 && pair.every(n => Number.isInteger(n) && n >= 0);
    if (cup != null && (room.mode !== 'am300' || ![1,2,3].includes(cup.set) ||
        !scorePair(cup.points) || !scorePair(cup.wins) || !Array.isArray(cup.history) ||
        cup.history.length > 3 || !cup.history.every(scorePair))) {
      throw new Error('Сервер прислал неверный счёт кубка');
    }
    return room;
  },
  memoryKey(origin,code) { return 'football-room:' + origin + ':' + code; },
  async enter(origin,mode,code,{team='',cup=false} = {}) {
    if (code) {
      let previous;
      try { previous = JSON.parse(sessionStorage.getItem(this.memoryKey(origin,code))); } catch { /* storage unavailable */ }
      if (previous?.token) {
        try {
          const room = this.check(await this.request(origin,'/'+code,{token:previous.token}));
          if (room.phase === 'lobby' || room.phase === 'playing') return {...previous,room,origin};
        } catch { /* previous seat no longer available */ }
      }
    }
    const outfit = Wardrobe.selected('90').id;
    const data = code ? await this.request(origin,'/'+code+'/join',{body:{outfit,team}})
      : await this.request(origin,'',{body:{mode,outfit,team,cup}});
    this.check(data.room);
    if (!/^[a-f0-9]{48}$/.test(data.token) || !Number.isInteger(data.seat) || !data.room.seats[data.seat]) {
      throw new Error('Сервер не подтвердил место в комнате');
    }
    try { sessionStorage.setItem(this.memoryKey(origin,data.room.code),JSON.stringify({token:data.token,seat:data.seat})); } catch { /* storage unavailable */ }
    return {...data,origin};
  },
  link(session) {
    const url = new URL(location.href); url.search = ''; url.hash = '';
    url.searchParams.set('room',session.room.code);
    if (session.origin !== location.origin) url.searchParams.set('server',session.origin);
    return url.href;
  }
};

class OnlineMode {
  constructor(env) {
    this.env = env;
    this.session = env.online;
    this.seat = this.session.seat;
    this.closed = false;
    this.pollIn = 0;
    this.pending = false;
    this.failures = 0;
    this.drag = null;
    this.startedAt = 0;
    this.pillsSet = false;
    this.accept(this.session.room);
    env.gesture.onStart = () => {
      this.startedAt = performance.now();
      this.drag = null;
    };
    env.gesture.onMove = d => { if (this.myTurn()) this.drag = d; };
    env.gesture.onEnd = d => {
      this.drag = null;
      if (!d || !this.myTurn() || this.pending) return;
      this.send('/play',{version:this.room.version,dx:d.dx,dy:d.dy,phase:Math.min(120,(performance.now()-this.startedAt)/1000)});
    };
    if (this.room.mode === 'square') env.gesture.onTap = (point,radius) => {
      if (!this.myTurn() || this.pending) return;
      const targets = this.room.seats.map((occupied,i) => occupied && i !== this.seat && this.room.scores[i] < 10 ? i : -1).filter(i => i >= 0);
      const id = U.tapPlayer(point,radius,targets,i => RoomField.places[i],66);
      if (id < 0) return;
      const pass = U.aimedPass(RoomField.places[this.seat],RoomField.places[id],RoomField.W*.24);
      this.send('/play',{version:this.room.version,dx:Math.cos(pass.angle)*pass.len,dy:Math.sin(pass.angle)*pass.len,phase:0});
    };
  }
  team(i) { return this.room.teams?.[i] || (i === this.seat ? 'Ты' : `Игрок ${i+1}`); }
  time() { return Date.now() + this.offset; }
  myTurn() {
    return this.room.phase === 'playing' && this.room.turn === this.seat &&
      this.time() >= this.room.turnReadyAt && this.time() <= this.room.deadline;
  }
  accept(room) {
    if (this.closed || (this.room && (room.version < this.room.version || room.serverNow < this.room.serverNow))) return;
    const before = this.room;
    this.room = room;
    this.offset = room.serverNow - Date.now();
    const hud = this.env.hud;
    if (room.phase !== before?.phase) {
      this.env.choose(room.phase === 'lobby' ? [{text:'Ссылка на комнату',action:() => this.env.invite(this.session)}] : []);
    }
    if (room.phase === 'lobby') {
      hud.hint(`Комната ${room.code} · ${room.seats.filter(Boolean).length}/${room.capacity}. Матч начнётся, когда все войдут.`);
      hud.setTimer('Ждём');
      hud.setPills([]);
    } else if (room.phase === 'playing' || room.phase === 'done') {
      const score = room.cup?.points || room.scores;
      const value = i => room.mode === 'square' ? score[i] + '/10' : score[i];
      if (!this.pillsSet) {
        const pills = score.map((_,i) => ({id:'room'+i,lbl:this.team(i),val:value(i)}));
        if (room.cup) pills.push({id:'sets',lbl:'Сеты',val:room.cup.wins.join(':')});
        hud.setPills(pills);
        this.pillsSet = true;
      } else {
        score.forEach((_,i) => hud.setPill('room'+i,value(i)));
        if (room.cup) hud.setPill('sets',room.cup.wins.join(':'));
      }
      if (room.last && before?.last?.time !== room.last.time) {
        this.animate = { ...room.last, start:performance.now() };
        hud.toast(room.last.label);
      }
    }
    if (room.phase === 'done' || room.phase === 'cancelled') this.endAt = this.endAt || performance.now()+650;
  }
  async send(action = '',body) {
    if (this.pending || this.closed) return;
    this.pending = true;
    try {
      const next = await OnlineRooms.request(this.session.origin,'/'+this.room.code+action,{body,token:this.session.token});
      this.accept(OnlineRooms.check(next));
      this.failures = 0;
    } catch (e) {
      if (!this.closed) {
        this.env.hud.toast(e.message,'bad');
        if (++this.failures >= 4 || e.message.includes('не найдена')) {
          this.accept({...this.room,phase:'cancelled',serverNow:this.room.serverNow});
        }
      }
    } finally { this.pending = false; }
  }
  update(dt) {
    if (this.endAt && performance.now() >= this.endAt) {
      const won = this.room.winner === this.seat;
      const cup = this.room.cup;
      this.env.finish({aborted:this.room.phase === 'cancelled', title:this.room.phase === 'cancelled' ? 'Комната закрыта' :
        won ? 'Победа!' : cup && this.room.winner === null ? 'Ничья' : 'Матч окончен',
        score:(cup?.wins || this.room.scores).join(' : '),
        sub:cup ? 'Счёт по сетам · '+cup.history.map(points => points.join(':')).join(' · ') :
          this.room.mode === 'square' ? 'Штрафы по порядку игроков' : 'Очки по порядку игроков', coins:0});
      return;
    }
    this.pollIn -= dt;
    if (this.pollIn <= 0) { this.pollIn = .32; this.send(); }
    if (this.room.phase === 'playing') {
      const turn = this.room.turn;
      this.env.hud.setTimer(Math.max(0,Math.ceil((this.room.deadline-this.time())/1000)));
      if (this.lastTurn !== turn || this.lastVersion !== this.room.version) {
        this.lastTurn = turn; this.lastVersion = this.room.version;
        const prefix = this.room.cup ? `Сет ${this.room.cup.set}/3 · ` : '';
        const hint = turn === this.seat
          ? this.room.mode === 'square' ? 'Твой мяч. Тап или свайп к сопернику.' : 'Твой удар. Свайп вверх к цели.'
          : `Ход: ${this.team(turn)}`;
        this.env.hud.hint(prefix+hint);
      }
    }
  }
  draw(ctx) {
    const {W,H} = this.env;
    const g = RoomField.goal;
    const square = this.room.mode === 'square';
    this.env.bgFor('room', bg => {
      if (square) {
        Yards.paintCourt(bg,W,H,{x:40,y:H*.53,w:W-80,h:H*.35});
        Yards.drawCourtMarks(bg,RoomField.quad,{outer:true});
      } else Yards.paintGoalScene(bg,W,H,g);
    });
    if (!square) {
      const top = g.y-g.h, radius = g.w*.08;
      ctx.save(); ctx.fillStyle='#ffe8a5'; ctx.strokeStyle='#ffe8a5';
      ctx.font='800 13px Rubik'; ctx.textAlign='center';
      ctx.fillText('ПЕРЕКЛАДИНА 100',g.x+g.w/2,top-11);
      ctx.fillText('50',g.x-16,top+g.h*.56); ctx.fillText('50',g.x+g.w+16,top+g.h*.56);
      ctx.lineWidth=2; ctx.setLineDash([5,6]);
      for (const x of [g.x+radius*.8,g.x+g.w-radius*.8]) {
        const y = top+radius*1.65;
        ctx.beginPath(); ctx.arc(x,y,radius,0,7); ctx.stroke(); ctx.fillText('75',x,y+5);
      }
      ctx.restore();
    }
    const elapsed = this.animate ? (performance.now()-this.animate.start)/550 : 1;
    const turn = this.room.turn;
    const colors = ['#3f7fba','#c0392b','#7a9f4b','#4e9fd1'];
    const positions = square ? RoomField.places : [{x:W*.34,y:H*.84},{x:W*.75,y:H*.76}];
    const order = square ? [2,3,0,1] : [1,0];
    for (const i of order) {
      if (!this.room.seats[i] || (square && this.room.scores[i] >= 10)) continue;
      const p = square ? positions[i] : positions[i === turn ? 0 : 1];
      if (i === turn) {
        ctx.strokeStyle = i === this.seat ? '#a3ec75' : '#ffda78';
        ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x,p.y,23,8,0,0,7); ctx.stroke();
      }
      Yards.drawPlayer(ctx,p.x,p.y,square ? .71 : .88,colors[i],'field',
        { me:i===this.seat, outfit:Wardrobe.roomOutfit(this.room.outfits?.[i]), moving:false, kick:elapsed<.4 && this.animate?.seat===i });
      ctx.fillStyle = '#fff3d4'; ctx.font = '800 13px Rubik'; ctx.textAlign = 'center';
      ctx.fillText(i === this.seat ? 'ТЫ' : i+1,p.x,p.y+20);
    }
    let ball = square ? {...positions[turn]} : RoomField.ball;
    if (square && this.room.phase === 'playing') {
      const phase = Math.max(0,(this.time()-this.room.turnReadyAt)/2800);
      ball.x += 16;
      ball.y -= 7 + Math.sin(Math.PI*(phase%1))*32;
    }
    if (this.animate && elapsed < 1) {
      const t = U.easeOut(U.clamp(elapsed,0,1));
      ball = { x:U.lerp(this.animate.from.x,this.animate.to.x,t),
        y:U.lerp(this.animate.from.y,this.animate.to.y,t)-Math.sin(t*Math.PI)*this.animate.arc };
    }
    Yards.drawBall(ctx,ball.x,ball.y,12,undefined,elapsed<1);
    if (this.drag) {
      if (square) {
        U.drawAim(ctx,{...this.drag,sx:ball.x,sy:ball.y},'#fff5d9');
        U.drawPower(ctx,this.drag,W*.37);
      } else {
        const target = ShotRules.aim(g,ball,this.drag,RoomField.maxDrag);
        ctx.strokeStyle='#fff5d9'; ctx.lineWidth=3; ctx.setLineDash([10,8]);
        ctx.beginPath(); ctx.moveTo(ball.x,ball.y); ctx.quadraticCurveTo((target.x+ball.x)/2,target.y-60,target.x,target.y); ctx.stroke();
        ctx.setLineDash([]);
        const phase = (Math.sin((performance.now()-this.startedAt)/1000*4.6)+1)/2;
        const width = W*.55, left = (W-width)/2, y = H*.88;
        ctx.fillStyle='#293340'; ctx.fillRect(left,y,width,12);
        ctx.fillStyle='#ffd86d'; ctx.fillRect(left+width*.395,y,width*.21,12);
        ctx.fillStyle='#fff'; ctx.fillRect(left+phase*width-3,y-3,6,18);
      }
    }
  }
  destroy() {
    this.closed = true;
    try { sessionStorage.removeItem(OnlineRooms.memoryKey(this.session.origin,this.room.code)); } catch { /* storage unavailable */ }
    if (Save.data.roomCode === this.room.code) { Save.data.roomCode = ''; Save.save(); }
    OnlineRooms.request(this.session.origin,'/'+this.room.code+'/leave',{body:{},token:this.session.token,keepalive:true}).catch(() => {});
  }
}
