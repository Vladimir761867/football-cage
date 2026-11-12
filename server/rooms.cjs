/* Сервер дружеских комнат. Node.js 20+, без зависимостей. */
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const field = require('../js/room-rules.js');
const shots = require('../js/shot-rules.js');
const wardrobe = require('../js/wardrobe.js');
const { createYards, yardCode } = require('./online-yards.cjs');

const root = path.join(__dirname,'..');
const contentTypes = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg'
};
const codes = /^[A-F0-9]{6}$/;
const roomLifetime = 45 * 60 * 1000;

function createServer({now = Date.now, random = Math.random, yardFile,
  origin = process.env.CORS_ORIGIN || 'https://vladimir761867.github.io'} = {}) {
  const rooms = new Map();
  const rate = new Map();
  let lastPrune = 0;
  const error = (status,message) => Object.assign(new Error(message),{status});
  const yards = createYards({file:yardFile,error});
  const snapshot = room => ({
    code:room.code, mode:room.mode, phase:room.phase, seats:room.players.map(Boolean),
    capacity:room.capacity, version:room.version, turn:room.turn, scores:room.scores,
    attempts:room.attempts, turnReadyAt:room.turnReadyAt, deadline:room.deadline, serverNow:now(),
    last:room.last, winner:room.winner, outfits:room.outfits, teams:room.teams, cup:room.cup,
    roster:room.roster, tournament:room.tournament, yard:room.yardInfo
  });
  const turnDelay = room => room.mode === 'square' ? 5600 : 16000;

  function schedule(room, turn, time, delay = 620) {
    room.turn = turn;
    room.turnReadyAt = time + delay;
    room.deadline = room.turnReadyAt + turnDelay(room);
  }
  function finish(room,winner,time) {
    const tournament = room.tournament;
    if (tournament) {
      const squareMode = room.mode === 'square';
      const order = squareMode ? [winner,...room.eliminated.slice().reverse()] : [winner];
      tournament.history.push({roster:[...room.roster],scores:[...room.scores],winner,order});
      if (squareMode) {
        const awards = [4,2,1,0];
        order.forEach((seat,i) => { tournament.points[seat] += awards[i]; });
        tournament.wins[winner]++;
      }
      if (tournament.stage < 2) {
        room.last.label += ' · ' + field.stageName(room.mode,tournament.stage) + ' завершён';
        tournament.stage++;
        if (!squareMode) {
          room.roster = tournament.stage === 1 ? [2,3] : tournament.history.map(match => match.winner);
        }
        room.scores.fill(0);
        room.attempts.fill(0);
        room.eliminated = [];
        schedule(room,room.roster[tournament.stage % room.roster.length],time,2700);
        return;
      }
      if (squareMode) {
        const rank = order.slice().sort((a,b) =>
          tournament.points[b]-tournament.points[a] || tournament.wins[b]-tournament.wins[a]);
        tournament.order = rank;
        winner = rank[0];
      }
    }
    room.phase = 'done';
    room.winner = winner;
    if (room.yard) yards.record(room,winner);
  }
  function american(room, drag, time) {
    const seat = room.turn;
    let points = 0, label = 'Время удара вышло', from = field.ball, to = field.ball;
    if (drag) {
      const shot = shots.kick(room.yardInfo?.goal || field.goal,field.ball,drag,field.maxDrag,drag.phase,field.shot,random);
      points = shot.zone.id === 'corner' && shot.golden ? 100 : shot.zone.pts;
      label = points ? shot.zone.name + ' +' + points : shot.issue;
      from = shot.from; to = shot.to;
    }
    room.scores[seat] += points;
    room.attempts[seat]++;
    room.last = {seat, from, to, label, time, arc:drag ? 70 : 0};
    const [first,second] = room.roster;
    const other = seat === first ? second : first;
    if (room.tournament) {
      const equalAttempts = room.attempts[first] === room.attempts[second];
      if (equalAttempts && room.attempts[first] >= 5 && room.scores[first] !== room.scores[second]) {
        finish(room,room.scores[first] > room.scores[second] ? first : second,time);
      } else schedule(room,other,time);
      return;
    }
    if (room.cup) {
      const cup = room.cup;
      cup.points[seat] += points;
      const endOfSet = room.attempts.every(n => n === cup.set * 3);
      if (endOfSet) {
        const [a,b] = cup.points;
        if (a !== b) cup.wins[a > b ? 0 : 1]++;
        cup.history.push([...cup.points]);
        const [wonA,wonB] = cup.wins;
        if (Math.max(wonA,wonB) === 2 || cup.set === 3) {
          finish(room,wonA === wonB ? null : wonA > wonB ? 0 : 1);
          return;
        }
        cup.set++;
        cup.points.fill(0);
        room.last.label += ' · Сет завершён';
        schedule(room,1-seat,time,1500);
        return;
      }
      schedule(room,1-seat,time);
      return;
    }
    const [a,b] = room.scores;
    if (room.attempts[0] === room.attempts[1] && Math.max(a,b) >= 300 && a !== b) {
      finish(room, a > b ? 0 : 1);
    } else schedule(room, 1-seat, time);
  }
  function square(room, drag, time) {
    const places = field.squarePlaces(room.capacity);
    const seat = room.turn, from = places[seat];
    const alive = room.scores.map((n,i) => n < 10 && i !== seat ? i : -1).filter(i => i >= 0);
    let target = -1, best = Infinity;
    if (drag) {
      for (const id of alive) {
        const p = places[id];
        const angle = Math.atan2(p.y-from.y,p.x-from.x) - Math.atan2(drag.dy,drag.dx);
        const diff = Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));
        if (diff < best) { target = id; best = diff; }
      }
    }
    const strength = drag ? Math.hypot(drag.dx,drag.dy) / (field.W*.37) : 0;
    const valid = target >= 0 && best <= .60 && strength >= .24 && strength <= 1.04;
    if (!valid && ++room.scores[seat] === 10) room.eliminated.push(seat);
    const next = valid ? target : alive[0];
    room.last = { seat,from,to:valid ? places[next] : from,
      label:valid ? 'Точная передача' : drag ? 'Мяч за линией · штраф' : 'Два отскока · штраф', time,arc:valid ? 58 : 0 };
    if (!valid && alive.length === 1 && room.scores[seat] >= 10) finish(room,alive[0],time);
    else schedule(room,next,time);
  }
  function play(room,drag,time) {
    if (room.mode === 'am300') american(room,drag,time);
    else square(room,drag,time);
    room.version++;
  }
  function advanceClock(room,time) {
    if (room.phase === 'playing' && time > room.deadline) play(room,null,time);
  }
  async function read(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096) throw error(413,'Запрос слишком большой');
      chunks.push(chunk);
    }
    if (!size) return {};
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw error(400,'Неверный формат запроса'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw error(400,'Неверный формат запроса');
    return data;
  }
  function membership(req,room) {
    const token = (req.headers.authorization || '').replace(/^Bearer /,'');
    const seat = room.players.indexOf(token);
    if (!token || seat < 0) throw error(401,'Войди в комнату заново');
    return seat;
  }
  function addPlayer(room, outfit, team, memberId) {
    const seat = room.players.indexOf(null);
    if (seat < 0 || room.phase !== 'lobby') throw error(409,'Комната заполнена или матч уже начался');
    const token = randomBytes(24).toString('hex');
    room.players[seat] = token;
    room.outfits[seat] = wardrobe.roomOutfit(outfit);
    if (memberId) room.yardMembers[seat] = memberId;
    room.teams[seat] = memberId ? room.yard.members[memberId].name : field.teamName(team);
    room.version++;
    if (room.players.every(Boolean)) {
      room.phase = 'playing';
      schedule(room,0,now(),1000);
    }
    return { token, seat, room:snapshot(room) };
  }
  function prune(time) {
    if (time - lastPrune < 60000) return;
    lastPrune = time;
    for (const [code,room] of rooms) if (time - room.touched > roomLifetime) rooms.delete(code);
    for (const [ip,record] of rate) if (time > record.until) rate.delete(ip);
  }
  function limit(key,time) {
    let record = rate.get(key);
    if (!record || time > record.until) { record = {until:time+10000,count:0}; rate.set(key,record); }
    if (++record.count > 160) throw error(429,'Слишком много запросов. Попробуй чуть позже.');
  }
  function staticFile(req,res,pathname) {
    const route = pathname === '/' ? '/index.html' : pathname;
    if (req.method !== 'GET' || !/^\/(index\.html|(?:js|css|assets)\/[a-zA-Z0-9_.-]+)$/.test(route)) {
      throw error(404,'Страница не найдена');
    }
    const type = contentTypes[path.extname(route)];
    if (!type) throw error(404,'Страница не найдена');
    const file = path.join(root,route.slice(1));
    const stat = fs.statSync(file,{throwIfNoEntry:false});
    if (!stat?.isFile()) throw error(404,'Файл не найден');
    res.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'Cache-Control':route.startsWith('/assets/') ? 'public, max-age=3600' : 'no-cache'});
    const stream = fs.createReadStream(file);
    stream.on('error',() => res.destroy());
    stream.pipe(res);
  }
  return http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    const send = (status,body) => {
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      res.end(JSON.stringify(body));
    };
    try {
      const { pathname } = new URL(req.url,'http://local');
      if (!pathname.startsWith('/api/')) { staticFile(req,res,pathname); return; }
      if (req.headers.origin === origin) {
        res.setHeader('Access-Control-Allow-Origin',origin);
        res.setHeader('Vary','Origin');
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'});
        res.end(); return;
      }
      const time = now();
      prune(time);
      const [, , , code, action] = pathname.split('/');
      const room = codes.test(code || '') && rooms.get(code);
      const token = (req.headers.authorization || '').replace(/^Bearer /,'');
      limit(token && room?.players?.includes(token) ? 'player:'+token : 'guest:'+req.socket.remoteAddress,time);
      if (pathname === '/api/health' && req.method === 'GET') { send(200,{version:2}); return; }
      if (pathname === '/api/yards' && req.method === 'POST') {
        send(201,yards.create(await read(req))); return;
      }
      if (pathname.startsWith('/api/yards/')) {
        const [, , , id, task, extra] = pathname.split('/');
        if (!yardCode.test(id) || extra !== undefined) throw error(404,'Двор не найден');
        if (task === 'join' && req.method === 'POST') {
          const {team} = await read(req);
          send(201,yards.enroll(yards.find(id),team)); return;
        }
        if (task === undefined && req.method === 'GET') {
          const {yard, id:memberId} = yards.member(id,token);
          const openRooms = [...rooms.values()].filter(entry => entry.yard === yard && entry.phase === 'lobby')
            .map(entry => ({code:entry.code,mode:entry.mode,capacity:entry.capacity,
              joined:entry.players.filter(Boolean).length,tournament:Boolean(entry.tournament),cup:Boolean(entry.cup),
              host:entry.teams[0]}));
          send(200,{...yards.details(yard),team:yard.members[memberId].name,standings:yards.standings(yard),rooms:openRooms}); return;
        }
        throw error(404,'Действие не найдено');
      }
      if (pathname === '/api/rooms' && req.method === 'POST') {
        const {mode,outfit,team,cup,tournament,size,yard:yardId,yardToken} = await read(req);
        if (!['square','am300'].includes(mode)) throw error(400,'Выбери режим комнаты');
        if ((tournament !== undefined && typeof tournament !== 'boolean') || (cup && tournament) ||
            (size !== undefined && (mode !== 'square' || ![2,4].includes(size) || (tournament && size !== 4)))) {
          throw error(400,'Выбери формат комнаты');
        }
        if (rooms.size >= 500) throw error(503,'Все комнаты заняты');
        const membership = yardId ? yards.member(yardId,yardToken) : null;
        let code;
        do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
        const capacity = tournament ? 4 : mode === 'am300' ? 2 : size ?? 4;
        const room = { code, mode, capacity, phase:'lobby', players:Array(capacity).fill(null),
          yard:membership?.yard, yardInfo:membership && yards.details(membership.yard),
          yardMembers:Array(capacity).fill(null),
          roster:Array.from({length:mode === 'am300' ? 2 : capacity},(_,i)=>i), eliminated:[],
          tournament:tournament ? {stage:0,history:[],points:[0,0,0,0],wins:[0,0,0,0],order:[]} : null,
          scores:Array(capacity).fill(0), attempts:Array(capacity).fill(0), outfits:Array(capacity).fill('90-street'),
          teams:Array(capacity).fill(''), cup:mode === 'am300' && cup === true ?
            {set:1,points:[0,0],wins:[0,0],history:[]} : null,
          version:0, touched:time, turn:0, turnReadyAt:0, deadline:0, last:null, winner:null };
        rooms.set(code,room);
        send(201,addPlayer(room,outfit,team,membership?.id)); return;
      }
      if (!room || !/^\/api\/rooms\/[A-F0-9]{6}(\/(join|play|leave))?$/.test(pathname)) throw error(404,'Комната не найдена');
      if (action === 'join' && req.method === 'POST') {
        const data = await read(req);
        if (data.yard && data.yard !== room.yard?.code) throw error(409,'Эта комната не в твоём дворе');
        const membership = room.yard ? yards.member(room.yard.code,data.yardToken) : null;
        if (membership && room.yardMembers.includes(membership.id)) throw error(409,'Твоя команда уже заняла место в комнате');
        room.touched = time;
        send(200,addPlayer(room,data.outfit,data.team,membership?.id));
        return;
      }
      const seat = membership(req,room);
      room.touched = time;
      if (!action && req.method === 'GET') { advanceClock(room,time); send(200,snapshot(room)); return; }
      if (action === 'leave' && req.method === 'POST') {
        room.players[seat] = null;
        room.teams[seat] = '';
        room.yardMembers[seat] = null;
        if (room.phase === 'playing' || (room.phase === 'lobby' && seat === 0)) room.phase = 'cancelled';
        room.version++;
        if (!room.players.some(Boolean)) rooms.delete(code);
        send(200,{ok:true}); return;
      }
      if (action === 'play' && req.method === 'POST') {
        const drag = await read(req), at = now();
        advanceClock(room,at);
        if (room.phase !== 'playing' || room.turn !== seat || room.version !== drag.version || at < room.turnReadyAt) {
          throw error(409,'Ход уже сменился. Дождись своего мяча.');
        }
        if (![drag.dx,drag.dy,drag.phase].every(Number.isFinite) || Math.hypot(drag.dx,drag.dy) > 1500 ||
            drag.phase < 0 || drag.phase > 120 || (room.mode === 'am300' && drag.dy >= -20)) {
          throw error(400,'Проведи мяч в сторону цели');
        }
        play(room,drag,at);
        send(200,snapshot(room)); return;
      }
      throw error(404,'Действие не найдено');
    } catch (e) {
      if (!res.headersSent) send(e.status || 500,{error:e.status ? e.message : 'Ошибка сервера'});
      else res.destroy();
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8000;
  const host = process.env.HOST || '127.0.0.1';
  const yardFile = process.env.YARDS_FILE || path.join(root,'data','online-yards.json');
  createServer({yardFile}).listen(port,host,() => console.log(`Дворовый футбол · http://${host}:${port}`));
}
module.exports = { createServer };
