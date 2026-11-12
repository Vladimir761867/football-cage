const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function runtime(storage = new Map()) {
  const context = vm.createContext({
    Image: class { addEventListener() {} }, window: { dispatchEvent() {} },
    URL, location: { href: 'https://example.test/football-cage/' },
    localStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); } },
    performance: { now: () => 100 },
    Sound: new Proxy({}, { get: () => () => {} }),
    Math: Object.assign(Object.create(Math), { random: () => .5 })
  });
  for (const file of ['save', 'wardrobe', 'competition', 'activity', 'shot-rules', 'yards', 'gesture', 'mode_dog', 'mode_square', 'mode_am300', 'mode_cross']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
  }
  return vm.runInContext('({Save,Wardrobe,Difficulty,Cups,Activities,YardEditor,ShotRules,Yards,BALLS,YARDS,Gesture,DogMode,SquareMode,Am300Mode,CrossMode})', context);
}
function env() {
  return { W: 520, H: 1125, difficulty: 'normal', opponentCount: 3, gesture: {},
    hud: new Proxy({}, { get: () => () => {} }), finish() {} };
}

function crossWithPlayerInGoal(difficulty = 'normal') {
  const { CrossMode } = runtime();
  const clips = [];
  const mode = new CrossMode({
    ...env(), difficulty, highlight: clip => clips.push(clip), random: () => .99
  });
  mode.keeperIndex = 0;
  mode.shooterIndex = 1;
  mode._roles();
  mode._startCross();
  return { mode, clips, swipe: { dx: 40, dy: 4 } };
}

test('keeper saves a shot with a fresh swipe during flight and rotates after the rebound', () => {
  const { mode, clips, swipe } = crossWithPlayerInGoal();
  const gesture = mode.env.gesture;
  gesture.onStart();
  mode.update(mode.flight.dur * .73);
  assert.equal(mode.state, 'shot');
  assert.equal(mode.players[1].score, 0);
  gesture.onEnd(swipe);
  assert.equal(mode.dive, 0);

  gesture.onStart();
  gesture.onEnd({ dx: 5, dy: -50 });
  assert.equal(mode.dive, 0);
  gesture.onStart();
  gesture.onEnd(swipe);
  mode.update(mode.shot.dur);
  assert.equal(mode.players[1].score, 0);
  assert.equal(mode.keeperIndex, 0);
  assert.equal(clips.length, 1);
  assert.equal(clips[0].label, 'Сейв');
  assert.ok(clips[0].rebound);
  mode.update(mode.shot.rebound.dur);
  assert.equal(mode.state, 'wait');
  assert.equal(mode.keeperIndex, 1);
});

test('a wrong first dive and a swipe released after the deadline both concede', () => {
  const { mode, swipe } = crossWithPlayerInGoal();
  const gesture = mode.env.gesture;
  mode.update(mode.flight.dur * .73);
  gesture.onStart();
  gesture.onEnd({ dx: -40, dy: 4 });
  gesture.onStart();
  gesture.onEnd(swipe);
  mode.update(mode.shot.dur);
  assert.equal(mode.players[1].score, 100);
  assert.equal(mode.keeperIndex, 0);

  const { mode: harder } = crossWithPlayerInGoal('expert');
  harder.update(harder.flight.dur * .73);
  assert.ok(harder.shot.dur < mode.saveWindow);
  harder.env.gesture.onStart();
  harder.update(harder.shot.dur);
  harder.env.gesture.onEnd(swipe);
  assert.equal(harder.players[1].score, 100);
  assert.equal(harder.keeperIndex, 0);
});

test('each decade has exactly three balls and a free default; every yard selects its era', () => {
  const { Yards, YARDS, Save } = runtime();
  for (const era of ['80', '90', '00', '10', '20']) {
    assert.equal(Yards.ballsForEra(era).length, 3);
    assert.equal(Yards.ballsForEra(era).filter(b => b.price === 0).length, 1);
  }
  for (const yard of Object.values(YARDS)) {
    Save.data.selectedYard = yard.id;
    const ball = Yards.syncBallToYard();
    assert.equal(ball.decade, Yards.ballEra(yard));
    assert.ok(Save.data.ownedBalls.includes(ball.id));
  }
});
test('era choices and earlier purchases survive switching yards', () => {
  const { Yards, Save } = runtime();
  Save.data.ownedBalls.push('patch90'); Save.data.selectedBall = 'patch90';
  Save.data.selectedYard = 'ru80_1'; Yards.syncBallToYard();
  assert.equal(Save.data.selectedBall, 'leather80');
  Save.data.selectedYard = 'ru90_1'; Yards.syncBallToYard();
  assert.equal(Save.data.selectedBall, 'patch90');
  Save.data.selectedBall = 'missing'; Yards.syncBallToYard();
  assert.equal(Save.data.selectedBall, 'patch90');
});
test('gesture coordinates are identical at different pixel densities; second finger and cancellation do not shoot', () => {
  const { Gesture } = runtime();
  for (const dpr of [1, 1.25, 2, 3]) {
    const canvas = { width:390*dpr, height:844*dpr, logicalWidth:520, logicalHeight:1125,
      addEventListener(){}, getBoundingClientRect:()=>({left:0,top:0,width:390,height:844}) };
    const g = new Gesture(canvas);
    const e = (id, x) => ({ pointerId:id, clientX:x, clientY:422, preventDefault(){} });
    assert.equal(g._pos(e(1,195)).x,260);
    let result = 'untouched'; g.onEnd = d => { result = d; };
    g._down(e(1,100)); g._down(e(2,250)); g._move(e(2,300)); g._up(e(2,300));
    assert.equal(result,'untouched'); assert.equal(g.pointerId,1);
    g._cancel(e(1,300)); assert.equal(result,null); assert.equal(g.active,false);
  }
});
test('bots can complete legal passes in both passing modes', () => {
  const { DogMode, SquareMode } = runtime();
  const dog = new DogMode(env()); dog.holder=1; dog.dogs=[]; dog._botPass();
  assert.equal(dog.fly.outcome,'ok');
  const square = new SquareMode(env()); square.holder=1; square._botHit();
  assert.equal(square.fly.outcome,'ok');
});
test('two remaining dog players keep playing', () => {
  const { DogMode } = runtime(); const e=env(); let finished=false; e.finish=()=>{finished=true;};
  const dog=new DogMode(e); dog.active=[true,true,false,false]; dog._nextHolder();
  assert.equal(finished,false); assert.equal(dog.holder,1);
});
test('square counts only your completed hits and does not award a timeout victory', () => {
  const { SquareMode } = runtime(); const e=env(); let result; e.finish=r=>{result=r;};
  const mode=new SquareMode(e);
  mode.holder=1; mode.fly={outcome:'ok',target:2}; mode._arrive(); assert.equal(mode.score,0);
  mode.holder=0; mode.fly={outcome:'ok',target:2}; mode._arrive(); assert.equal(mode.score,1);
  mode.timeLeft=0; mode.update(.01); assert.equal(result.title,'Время вышло');
});
test('court paint changes with background brightness and uses equal line widths', () => {
  const { Yards } = runtime();
  const colors=[];
  for (const brightness of [30,220]) {
    const widths=[];
    const ctx = new Proxy({ getTransform:()=>({a:1,d:1}), getImageData:()=>({data:[brightness,brightness,brightness,255]}),
      stroke(){ colors.push(this.strokeStyle); widths.push(this.lineWidth); } }, {get:(o,k)=>k in o?o[k]:()=>{}});
    Yards.drawCourtMarks(ctx,[{x:10,y:20},{x:310,y:20},{x:310,y:320},{x:10,y:320}],{outer:true});
    assert.deepEqual(widths,[6,6,6,6,3,3,3,3]);
  }
  assert.equal(colors[4],'#fff3d4'); assert.equal(colors[12],'#243444');
});
test('American impact delay advances only with simulation time, including on pause', () => {
  const { Am300Mode }=runtime(); const mode=new Am300Mode(env());
  mode.fly={to:{x:-100,y:-100},golden:false}; mode._impact();
  assert.equal(mode.state,'impact'); mode.update(0); assert.equal(mode.impactDelay,.65);
  mode.update(.7); assert.equal(mode.state,'aim');
});
test('all 15 photographed goal mouths stay visible and both goal modes share their geometry', () => {
  const { YARDS, Yards, Save, Am300Mode, CrossMode }=runtime();
  for (const yard of Object.values(YARDS).filter(y=>y.atlas)) {
    Save.data.selectedYard=yard.id;
    for (const [W,H] of [[360,740],[390,844],[430,932]]) {
      const e={...env(),W,H}; const g=Yards.goalGeometry(W,H);
      assert.ok(g.x>=0 && g.x+g.w<=W, yard.id);
      assert.ok(g.y-g.h>H*.25 && g.y<H*.55, yard.id);
      assert.deepEqual(new Am300Mode(e).goal,g);
      assert.deepEqual(new CrossMode(e).goal,g);
    }
  }
});

test('square cup resumes after reload, replays a tie at the cutoff, and pays the trophy once', () => {
  const storage = new Map();
  let { Cups } = runtime(storage);
  Cups.start('square','normal');
  Cups.begin();
  assert.equal(Cups.settle({penalties:[2,1,3,4]}).outcome,'win');
  const restored = runtime(storage);
  Cups = restored.Cups;
  assert.equal(Cups.current().stage,1);
  assert.equal(Cups.difficulty(),'hard');
  Cups.begin();
  assert.equal(Cups.settle({penalties:[2,1,2,4]}).outcome,'draw');
  assert.equal(Cups.current().stage,1);
  Cups.begin(); Cups.settle({penalties:[2,1,3,4]});
  assert.equal(Cups.difficulty(),'expert');
  Cups.begin();
  assert.equal(Cups.settle({penalties:[1,2,3,4]}).status,'won');
  assert.equal(Cups.settle({penalties:[1,2,3,4]}),null);
  assert.equal(restored.Save.data.coins,120);
  assert.equal(restored.Save.data.cupsWon.square,1);
});

test('american cup ends after a lost duel and does not award a trophy', () => {
  const { Cups, Save } = runtime();
  Cups.start('am300','easy');
  Cups.begin(); Cups.settle({won:true,score:'350 : 285'});
  Cups.begin();
  assert.equal(Cups.settle({won:false,score:'275 : 325'}).status,'lost');
  assert.equal(Cups.begin(),null);
  assert.equal(Save.data.cupsWon.am300,0);
});

test('dog pace ramps actual defender movement after successful passes', () => {
  const { DogMode } = runtime();
  function moved(passes, difficulty) {
    const mode = new DogMode({...env(),difficulty});
    mode.passes = passes;
    mode._giveBall(0);
    const d = mode.dogs[0], start = {...d};
    mode.update(.05);
    return { distance:Math.hypot(d.x-start.x,d.y-start.y), level:mode.paceLevel };
  }
  const initial = moved(0,'beginner');
  const later = moved(32,'beginner');
  assert.equal(initial.level,1);
  assert.equal(later.level,5);
  assert.ok(later.distance > initial.distance * 1.4);
  assert.ok(moved(0,'expert').distance > initial.distance * 2);
});

test('three-target challenge counts each part once and daily rewards cannot be repeated', () => {
  const { Activities, Save } = runtime();
  const series = Activities.tracker(Activities.definition('targets'));
  ['bar','bar','post','miss','corner'].forEach(event => series.push(event));
  assert.equal(series.score,3);
  const daily = Activities.daily();
  assert.equal(Activities.record(daily,daily.goal).bonus,30);
  assert.equal(Activities.record(daily,daily.goal+1).bonus,0);
  assert.equal(Save.data.coins,30);
  assert.equal(Save.data.badges,1);
});

test('friend links preserve fixtures and reject invalid dates or custom field values', () => {
  const { Activities } = runtime();
  const params = new URLSearchParams('challenge=2026-11-12.targets&score=3&yard=ru80_1.wet.retro.warm.green.untrusted');
  const c = Activities.fromLink(params);
  assert.equal(c.yard,'ru80_1');
  assert.equal(c.friend,3);
  assert.equal(c.custom.prop,'none');
  assert.equal(Activities.fromLink(new URLSearchParams('challenge=2026-02-31.targets')),null);
  const a = Activities.random(c.key), b = Activities.random(c.key);
  assert.deepEqual([a(),a(),a()],[b(),b(),b()]);
});

test('a Spanish yard invitation preserves several decorations and loads with the correct decade', () => {
  const { Activities, YardEditor, Yards } = runtime();
  const challenge = Activities.definition('targets', '2026-11-12');
  const legacy = YardEditor.clean({ base: 'ru90_1', prop: 'bench' });
  assert.deepEqual(Array.from(legacy.props), ['bench']);
  const custom = YardEditor.clean({
    base: 'es00_sevilla', props: ['boys', 'bench', 'neighbor', 'grandma', 'boys', 'invalid']
  });
  const received = Activities.fromLink(new URL(Activities.link({ ...challenge, custom })).searchParams);
  assert.equal(received.yard, 'es00_sevilla');
  assert.deepEqual(Array.from(received.custom.props), ['bench', 'grandma', 'boys', 'neighbor']);
  const scene = Yards.editedTheme(received.custom);
  assert.equal(Yards.ballEra(scene), '00');
  Yards.withScene(scene, () => {
    for (const [w, h] of [[320,568], [360,740], [390,844], [430,932]]) {
      const goal = Yards.goalGeometry(w,h);
      assert.ok(goal.x > 0 && goal.x + goal.w < w);
      assert.ok(goal.y < Yards.courtQuad(w,h)[0].y);
    }
  });
});

test('wardrobe offers free everyday clothes in every era and purchases charge once', () => {
  const storage=new Map();
  const {Wardrobe,Save}=runtime(storage);
  for (const era of ['80','90','00','10','20']) {
    assert.equal(Wardrobe.list(era).length,2);
    assert.equal(Wardrobe.selected(era).id,era+'-street');
    assert.equal(Wardrobe.owns(era+'-street'),true);
    assert.equal(Wardrobe.equip(era+'-football'),false);
  }
  Save.data.coins=119;
  assert.equal(Wardrobe.buy('80-football'),false);
  assert.equal(Save.data.coins,119);
  Save.data.coins=240;
  assert.equal(Wardrobe.buy('80-football'),true);
  assert.equal(Wardrobe.buy('80-football'),true);
  assert.equal(Save.data.coins,120);
  assert.equal(Wardrobe.buy('20-football'),true);
  assert.equal(Save.data.coins,0);
  const restored=runtime(storage);
  assert.equal(restored.Wardrobe.selected('80').id,'80-football');
  assert.equal(restored.Wardrobe.selected('20').id,'20-football');
  assert.equal(restored.Wardrobe.selected('90').id,'90-street');
  Wardrobe.equip('80-street');
  assert.equal(Wardrobe.owns('80-football'),true);
});

test('keeper wears the same owned outfit and a challenge uses its own yard era', () => {
  const {Wardrobe,Save,Yards,YARDS}=runtime();
  Save.data.coins=120; Wardrobe.buy('80-football');
  Save.data.selectedYard='ru80_1';
  const calls=[];
  Wardrobe.draw=(ctx,x,y,s,id,pose) => {calls.push({id,pose}); return true;};
  const ctx=new Proxy({}, {get:()=>()=>{}});
  Yards.drawPlayer(ctx,50,50,1,'#3f7fba','field',{});
  Yards.drawPlayer(ctx,50,50,1,'#caa23c','keeper',{me:true,dive:1});
  assert.equal(calls[0].id,'80-football');
  assert.equal(calls[1].id,'80-football');
  Yards.withScene(YARDS.ru20_1,()=>Yards.drawPlayer(ctx,50,50,1,'#3f7fba','field',{}));
  assert.equal(calls[2].id,'20-street');
  assert.equal(Wardrobe.selected('80').id,'80-football');
});

test('quick duel results describe five attempts even when the winner scores below 300', () => {
  const {Am300Mode}=runtime();
  let result;
  const mode=new Am300Mode({...env(),quick:true,opponentCount:1,finish:r=>{result=r;}});
  mode.you=25; mode._finish(true);
  assert.match(result.sub,/пять ударов/);
  assert.doesNotMatch(result.sub,/300/);
});
