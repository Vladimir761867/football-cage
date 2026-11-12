const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server/rooms.cjs');
const field = require('../js/room-rules.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

async function setup(t,options = {}) {
  let now = 100000;
  const server = createServer({now:()=>now,random:()=>.5,...options});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:'+server.address().port;
  async function request(path='',body,token,resource='rooms') {
    const response = await fetch(origin+'/api/'+resource+path,{
      method:body === undefined ? 'GET' : 'POST',
      headers:{...(body !== undefined ? {'Content-Type':'application/json'} : {}),...(token ? {Authorization:'Bearer '+token} : {})},
      body:body === undefined ? undefined : JSON.stringify(body)
    });
    return {status:response.status,data:await response.json()};
  }
  return {request,go:time => { now = time; }};
}

test('American room waits for both players and awards the win after equally many turns', async t => {
  const { request, go } = await setup(t);
  const a = (await request('',{mode:'am300',outfit:'90-football'})).data;
  const path = '/'+a.room.code;
  assert.equal(a.room.phase,'lobby');
  const b = (await request(path+'/join',{outfit:'20-football'})).data;
  assert.deepEqual(b.room.outfits,['90-football','90-street']);
  assert.deepEqual((await request(path,undefined,a.token)).data.outfits,b.room.outfits);
  assert.equal(b.room.phase,'playing');
  assert.equal((await request(path,undefined,'invalid')).status,401);
  let room = b.room;
  const delta = field.ball.y-field.goal.y+field.goal.h;
  const dy = -delta/(delta+40)*field.maxDrag;
  for (let i=0;i<3;i++) {
    go(room.turnReadyAt+1);
    const shot = {version:room.version,dx:0,dy,phase:0};
    assert.equal((await request(path+'/play',shot,b.token)).status,409);
    room = (await request(path+'/play',shot,a.token)).data;
    assert.equal(room.scores[0],(i+1)*100);
    assert.equal(room.phase,'playing');
    assert.equal((await request(path+'/play',shot,a.token)).status,409);
    go(room.turnReadyAt+1);
    room = (await request(path+'/play',{version:room.version,dx:750,dy:-120,phase:0},b.token)).data;
  }
  assert.equal(room.phase,'done');
  assert.equal(room.winner,0);
  await request(path+'/leave',{},a.token);
  assert.equal((await request(path,undefined,b.token)).data.phase,'done');
});

test('one friend fills a two-seat Square and a player is out after ten penalties', async t => {
  const {request,go} = await setup(t);
  const a = (await request('',{mode:'square',size:2,team:'Первый'})).data;
  const path = '/'+a.room.code;
  const b = (await request(path+'/join',{team:'Второй'})).data;
  let room = b.room;
  assert.equal(room.phase,'playing');
  assert.equal(room.capacity,2);
  assert.equal((await request(path+'/join',{})).status,409);
  for (let i = 0; i < 10; i++) {
    go(room.turnReadyAt+1);
    room = (await request(path+'/play',{dx:110,dy:0,phase:0,version:room.version},a.token)).data;
    assert.equal(room.turn,1);
    assert.deepEqual(room.last.to,field.squarePlaces(2)[1]);
    go(room.deadline+1);
    room = (await request(path,undefined,b.token)).data;
  }
  assert.equal(room.phase,'done');
  assert.equal(room.winner,0);
  assert.deepEqual(room.scores,[0,10]);
});

test('American tournament sends both semifinal winners into the final', async t => {
  const {request,go} = await setup(t);
  const host = (await request('',{mode:'am300',tournament:true})).data;
  const path = '/'+host.room.code;
  const players = [host];
  for (let i=0;i<3;i++) players.push((await request(path+'/join',{})).data);
  let room = players[3].room;
  const delta = field.ball.y-field.goal.y+field.goal.h;
  const dy = -delta/(delta+40)*field.maxDrag;
  for (const [stage,roster,winner] of [[0,[0,1],0],[1,[2,3],3],[2,[0,3],3]]) {
    assert.equal(room.tournament.stage,stage);
    assert.deepEqual(room.roster,roster);
    for (let i=0;i<10;i++) {
      go(room.turnReadyAt+1);
      const hit = room.turn === winner;
      const result = await request(path+'/play',{dx:hit ? 0 : 750,dy:hit ? dy : -120,phase:0,
        version:room.version},players[room.turn].token);
      assert.equal(result.status,200);
      room = result.data;
    }
  }
  assert.equal(room.phase,'done');
  assert.equal(room.winner,3);
  assert.deepEqual(room.tournament.history.map(match => match.winner),[0,3,3]);
});

test('a Square tournament ranks by three completed rounds rather than the final round alone', async t => {
  const {request,go} = await setup(t);
  const host = (await request('',{mode:'square',size:4,tournament:true})).data;
  const path = '/'+host.room.code;
  const players = [host];
  for (let i=0;i<3;i++) players.push((await request(path+'/join',{})).data);
  let room = players[3].room;
  for (const [stage,winner] of [[0,0],[1,0],[2,1]]) {
    assert.equal(room.tournament.stage,stage);
    for (let i=0;i<85 && room.phase === 'playing' && room.tournament.stage === stage;i++) {
      const seat = room.turn;
      go(room.turnReadyAt+1);
      let dx = 0, dy = 0;
      if (seat === winner) {
        const target = room.scores.findIndex((score,index) => score < 10 && index !== seat);
        const angle = Math.atan2(field.places[target].y-field.places[seat].y,field.places[target].x-field.places[seat].x);
        dx = 110*Math.cos(angle); dy = 110*Math.sin(angle);
      }
      const result = await request(path+'/play',{dx,dy,phase:0,version:room.version},players[seat].token);
      assert.equal(result.status,200);
      room = result.data;
    }
  }
  assert.equal(room.phase,'done');
  assert.equal(room.winner,0);
  assert.deepEqual(room.tournament.history.map(round => round.winner),[0,0,1]);
  assert.equal(room.tournament.points.reduce((sum,n) => sum+n,0),21);
});

test('private court membership gates access and only matches in that court count in its standings', async t => {
  const {request,go} = await setup(t);
  const create = (name,preset) => request('',{name,team:'Друзья',preset},undefined,'yards');
  const a = (await create('Двор А',{base:'br90_rio'})).data;
  const other = (await create('Двор Б',{base:'in00_mumbai'})).data;
  const aPath = '/'+a.yard.code, otherPath = '/'+other.yard.code;
  const b = (await request(aPath+'/join',{team:'Соседи'},undefined,'yards')).data;
  assert.equal((await request(aPath,undefined,other.token,'yards')).status,401);
  assert.equal((await request('',{mode:'square',size:2,yard:a.yard.code})).status,401);
  const host = (await request('',{mode:'square',size:2,yard:a.yard.code,yardToken:a.token})).data;
  const path = '/'+host.room.code;
  assert.equal(host.room.yard.preset.base,'br90_rio');
  assert.equal((await request(aPath,undefined,a.token,'yards')).data.rooms[0].code,host.room.code);
  assert.equal((await request(path+'/join',{yardToken:other.token})).status,401);
  assert.equal((await request(path+'/join',{yardToken:a.token})).status,409);
  const guest = (await request(path+'/join',{yardToken:b.token})).data;
  let room = guest.room;
  for (let i=0;i<10;i++) {
    go(room.turnReadyAt+1);
    room = (await request(path+'/play',{dx:110,dy:0,phase:0,version:room.version},host.token)).data;
    go(room.deadline+1);
    room = (await request(path,undefined,guest.token)).data;
  }
  assert.equal(room.phase,'done');
  const rows = (await request(aPath,undefined,a.token,'yards')).data.standings['square-2'];
  assert.deepEqual(rows.map(row => [row.name,row.points,row.played]),[['Друзья',3,1],['Соседи',0,1]]);
  assert.deepEqual((await request(otherPath,undefined,other.token,'yards')).data.standings,{});
});

test('a court and its membership survive a fresh server instance', async t => {
  const yardFile = path.join(os.tmpdir(),'football-yard-'+randomUUID()+'.json');
  t.after(() => fs.rmSync(yardFile,{force:true}));
  const before = await setup(t,{yardFile});
  const created = (await before.request('',{name:'Своя площадка',team:'Соседи',preset:{base:'ru90_1',season:'winter'}},undefined,'yards')).data;
  const after = await setup(t,{yardFile});
  const restored = await after.request('/'+created.yard.code,undefined,created.token,'yards');
  assert.equal(restored.status,200);
  assert.equal(restored.data.team,'Соседи');
  assert.equal(restored.data.preset.season,'winter');
  assert.equal(fs.readFileSync(yardFile,'utf8').includes(created.token),false);
});

test('four clients join the same Square, pass the turn and see the timeout penalty', async t => {
  const {request,go} = await setup(t);
  const host = (await request('',{mode:'square'})).data;
  const path = '/'+host.room.code;
  const players = [host];
  for (let i=0;i<3;i++) players.push((await request(path+'/join',{})).data);
  let room = players[3].room;
  assert.equal(room.capacity,4);
  assert.equal(room.phase,'playing');
  assert.equal((await request(path+'/join',{})).status,409);
  go(room.turnReadyAt+1);
  room = (await request(path+'/play',{version:room.version,dx:110,dy:0,phase:0},host.token)).data;
  assert.equal(room.turn,1);
  assert.equal(room.last.label,'Точная передача');
  const synced = (await request(path,undefined,players[2].token)).data;
  assert.equal(synced.version,room.version);
  go(room.deadline+1);
  room = (await request(path,undefined,players[1].token)).data;
  assert.equal(room.scores[1],1);
  assert.equal(room.last.label,'Два отскока · штраф');
});

test('named teams play a cup with equal attempts per set and two set wins end the match', async t => {
  const {request,go} = await setup(t);
  const a = (await request('',{mode:'am300',cup:true,team:'  Соседи  ' })).data;
  const path = '/'+a.room.code;
  const b = (await request(path+'/join',{team:'Équipe da Rua!'})).data;
  let room = b.room;
  assert.deepEqual(room.teams,['Соседи','Équipe da Rua']);
  const delta = field.ball.y-field.goal.y+field.goal.h;
  const dy = -delta/(delta+40)*field.maxDrag;
  for (let i = 0; i < 12; i++) {
    const seat = room.turn;
    go(room.turnReadyAt+1);
    const shot = seat ? {dx:750,dy:-120} : {dx:0,dy};
    room = (await request(path+'/play',{version:room.version,phase:0,...shot},seat ? b.token : a.token)).data;
    if (i === 4) assert.equal(room.cup.set,1);
    if (i === 5) assert.equal(room.cup.set,2);
  }
  assert.deepEqual(room.attempts,[6,6]);
  assert.deepEqual(room.cup.history,[[300,0],[300,0]]);
  assert.deepEqual(room.cup.wins,[2,0]);
  assert.equal(room.phase,'done');
  assert.equal(room.winner,0);
});
