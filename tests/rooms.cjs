const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server/rooms.cjs');
const field = require('../js/room-rules.js');

async function setup(t) {
  let now = 100000;
  const server = createServer({now:()=>now,random:()=>.5});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:'+server.address().port;
  async function request(path='',body,token) {
    const response = await fetch(origin+'/api/rooms'+path,{
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
  const a = (await request('',{mode:'am300'})).data;
  const path = '/'+a.room.code;
  assert.equal(a.room.phase,'lobby');
  const b = (await request(path+'/join',{})).data;
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
