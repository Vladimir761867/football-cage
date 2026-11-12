/* Сервер дружеских комнат. Node.js 20+, без зависимостей. */
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const field = require('../js/room-rules.js');
const shots = require('../js/shot-rules.js');

const root = path.join(__dirname,'..');
const contentTypes = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg'
};
const codes = /^[A-F0-9]{6}$/;
const roomLifetime = 45 * 60 * 1000;

function createServer({now = Date.now, random = Math.random, origin = process.env.CORS_ORIGIN || 'https://vladimir761867.github.io'} = {}) {
  const rooms = new Map();
  const rate = new Map();
  let lastPrune = 0;
  const error = (status,message) => Object.assign(new Error(message),{status});
  const snapshot = room => ({
    code:room.code, mode:room.mode, phase:room.phase, seats:room.players.map(Boolean),
    capacity:room.capacity, version:room.version, turn:room.turn, scores:room.scores,
    attempts:room.attempts, turnReadyAt:room.turnReadyAt, deadline:room.deadline, serverNow:now(),
    last:room.last, winner:room.winner
  });
  const turnDelay = room => room.mode === 'square' ? 5600 : 16000;

  function schedule(room, turn, time, delay = 620) {
    room.turn = turn;
    room.turnReadyAt = time + delay;
    room.deadline = room.turnReadyAt + turnDelay(room);
  }
  function finish(room,winner) {
    room.phase = 'done';
    room.winner = winner;
  }
  function american(room, drag, time) {
    const seat = room.turn;
    let points = 0, label = 'Время удара вышло', from = field.ball, to = field.ball;
    if (drag) {
      const shot = shots.kick(field.goal,field.ball,drag,field.maxDrag,drag.phase,field.shot,random);
      points = shot.zone.id === 'corner' && shot.golden ? 100 : shot.zone.pts;
      label = points ? shot.zone.name + ' +' + points : shot.issue;
      from = shot.from; to = shot.to;
    }
    room.scores[seat] += points;
    room.attempts[seat]++;
    room.last = {seat, from, to, label, time, arc:drag ? 70 : 0};
    const [a,b] = room.scores;
    if (room.attempts[0] === room.attempts[1] && Math.max(a,b) >= 300 && a !== b) {
      finish(room, a > b ? 0 : 1);
    } else schedule(room, 1-seat, time);
  }
  function square(room, drag, time) {
    const seat = room.turn, from = field.places[seat];
    const alive = room.scores.map((n,i) => n < 10 && i !== seat ? i : -1).filter(i => i >= 0);
    let target = -1, best = Infinity;
    if (drag) {
      for (const id of alive) {
        const p = field.places[id];
        const angle = Math.atan2(p.y-from.y,p.x-from.x) - Math.atan2(drag.dy,drag.dx);
        const diff = Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));
        if (diff < best) { target = id; best = diff; }
      }
    }
    const strength = drag ? Math.hypot(drag.dx,drag.dy) / (field.W*.37) : 0;
    const valid = target >= 0 && best <= .60 && strength >= .24 && strength <= 1.04;
    if (!valid) room.scores[seat]++;
    const next = valid ? target : alive[0];
    room.last = { seat,from,to:valid ? field.places[next] : from,
      label:valid ? 'Точная передача' : drag ? 'Мяч за линией · штраф' : 'Два отскока · штраф', time,arc:valid ? 58 : 0 };
    if (!valid && alive.length === 1 && room.scores[seat] >= 10) finish(room,alive[0]);
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
  function addPlayer(room) {
    const seat = room.players.indexOf(null);
    if (seat < 0 || room.phase !== 'lobby') throw error(409,'Комната заполнена или матч уже начался');
    const token = randomBytes(24).toString('hex');
    room.players[seat] = token;
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
  function limit(req,time) {
    const ip = req.socket.remoteAddress;
    let record = rate.get(ip);
    if (!record || time > record.until) { record = {until:time+10000,count:0}; rate.set(ip,record); }
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
      prune(time); limit(req,time);
      if (pathname === '/api/health' && req.method === 'GET') { send(200,{version:1}); return; }
      if (pathname === '/api/rooms' && req.method === 'POST') {
        const {mode} = await read(req);
        if (!['square','am300'].includes(mode)) throw error(400,'Выбери режим комнаты');
        if (rooms.size >= 500) throw error(503,'Все комнаты заняты');
        let code;
        do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
        const capacity = mode === 'am300' ? 2 : 4;
        const room = { code, mode, capacity, phase:'lobby', players:Array(capacity).fill(null),
          scores:Array(capacity).fill(0), attempts:Array(capacity).fill(0),
          version:0, touched:time, turn:0, turnReadyAt:0, deadline:0, last:null, winner:null };
        rooms.set(code,room);
        send(201,addPlayer(room)); return;
      }
      const [, , , code, action] = pathname.split('/');
      const room = codes.test(code || '') && rooms.get(code);
      if (!room || !/^\/api\/rooms\/[A-F0-9]{6}(\/(join|play|leave))?$/.test(pathname)) throw error(404,'Комната не найдена');
      if (action === 'join' && req.method === 'POST') { room.touched = time; send(200,addPlayer(room)); return; }
      const seat = membership(req,room);
      room.touched = time;
      if (!action && req.method === 'GET') { advanceClock(room,time); send(200,snapshot(room)); return; }
      if (action === 'leave' && req.method === 'POST') {
        room.players[seat] = null;
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
  createServer().listen(port,host,() => console.log(`Дворовый футбол · http://${host}:${port}`));
}
module.exports = { createServer };
