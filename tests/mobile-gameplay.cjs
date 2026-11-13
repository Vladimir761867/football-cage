const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function runtime(storage = new Map(), openCatalog = false) {
  const context = vm.createContext({
    Image: class { addEventListener() {} }, window: { dispatchEvent() {} },
    URL, location: { href: 'https://example.test/football-cage/' },
    localStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); } },
    performance: { now: () => 100 },
    Sound: new Proxy({}, { get: () => () => {} }),
    Math: Object.assign(Object.create(Math), { random: () => .5 })
  });
  for (const file of ['save', 'collections', 'wardrobe', 'competition', 'activity', 'shot-rules', 'yards', 'gesture', 'mode_dog', 'mode_square', 'mode_am300', 'mode_cross']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
  }
  vm.runInContext('Save.openCatalog = ' + openCatalog, context);
  return vm.runInContext('({Save,Collections,Wardrobe,Difficulty,Cups,Activities,YardEditor,ShotRules,Yards,BALLS,YARDS,Gesture,DogMode,SquareMode,Am300Mode,CrossMode})', context);
}
function env() {
  return { W: 520, H: 1125, difficulty: 'normal', opponentCount: 3, gesture: {},
    hud: new Proxy({}, { get: () => () => {} }), finish() {} };
}

test('bots increase team tempo without contributing to the player passing challenge', () => {
  const { Activities, DogMode } = runtime();
  const challenge = Activities.definition('dog','2026-11-12');
  const tracker = Activities.tracker(challenge);
  const mode = new DogMode({...env(),challenge,progress:event => tracker.push(event)});
  for (let i = 0; i < 8; i++) {
    mode._giveBall(1);
    mode.fly = {target:2,outcome:'ok'};
    mode._resolve();
  }
  assert.equal(mode.passes,8);
  assert.equal(mode.paceLevel,2);
  assert.equal(mode.score,0);
  assert.equal(tracker.score,0);
  mode._giveBall(0);
  mode.fly = {target:1,outcome:'ok'};
  mode._resolve();
  assert.equal(tracker.score,1);
});

test('after an untouched cross the player stays the striker and the next cross comes from the bots', () => {
  const { CrossMode } = runtime();
  const mode = new CrossMode({...env(),attackOnly:true});
  mode.update(.8);
  assert.notEqual(mode.combo.holder,0);
  mode.update(1.4);
  mode.update(.43);
  assert.equal(mode.state,'serve');
  mode.update(mode.flight.dur);
  mode.update(mode.shot.dur);
  assert.equal(mode.shooterIndex,0);
  assert.notEqual(mode.keeperIndex,0);
  mode.update(.7);
  assert.equal(mode.serveN,2);
  assert.notEqual(mode.combo.holder,0);
});

test('the same placed shot beats the beginner keeper and is saved on expert', () => {
  const { Am300Mode } = runtime();
  function shot(difficulty) {
    const mode = new Am300Mode({...env(),difficulty,opponentCount:0,practice:'keeper'});
    const g = mode.goal;
    mode.state = 'fly';
    mode.fly = {from:{...mode.ballPos},to:{x:g.x+g.w*.71,y:g.y-g.h*.35},t:0,dur:.55};
    for (let i = 0; i < 56; i++) mode.update(.01);
    assert.equal(mode.ballsLeft,9);
    return [mode.you,mode.saves];
  }
  assert.deepEqual(shot('beginner'),[1,0]);
  assert.deepEqual(shot('expert'),[0,1]);
});

test('keeper practice keeps the selected bend and launches the path shown by the preview', () => {
  const { Am300Mode, ShotRules } = runtime();
  const e = env();
  let controls;
  const mode = new Am300Mode({...e,opponentCount:0,practice:'keeper',choose:options => { controls = options; }});
  assert.equal(controls.findIndex(option => option.selected),1);
  const drag = {dx:0,dy:-450};
  const straight = mode._shot(drag);
  controls[0].action();
  const preview = mode._shot(drag);
  assert.ok(preview.to.x < straight.to.x);
  assert.ok(ShotRules.flightPoint(preview,.5).x > ShotRules.flightPoint(straight,.5).x);
  e.gesture.onEnd(drag);
  assert.deepEqual(mode.fly.to,preview.to);
  assert.deepEqual(ShotRules.flightPoint(mode.fly,1),preview.to);
  mode._impact();
  assert.equal(mode._shot(drag).bend,preview.bend);
  controls[2].action();
  const right = mode._shot(drag);
  assert.ok(right.to.x > straight.to.x);
  assert.ok(ShotRules.flightPoint(right,.5).x < ShotRules.flightPoint(straight,.5).x);
  controls = null;
  const competitive = new Am300Mode({...env(),choose:options => { controls = options; }});
  assert.equal(controls,null);
  assert.equal(competitive._shot(drag).bend,0);
});

test('new countries have a free and a paid court, aligned targets and independent outfits', () => {
  const { Save, Yards, YARDS, Wardrobe, Am300Mode, CrossMode } = runtime(new Map(),true);
  for (const country of ['Бразилия','Китай','Индия']) {
    const courts = Object.values(YARDS).filter(y => y.country === country);
    assert.equal(courts.length,2);
    assert.equal(courts.filter(y => y.free).length,1);
    for (const court of courts) {
      Save.data.selectedYard = court.id;
      Save.data.yardSeason = 'winter';
      assert.equal(Yards.theme().photo.file,court.photo.file);
      assert.notEqual(Yards.theme().season,'winter');
      const american = new Am300Mode(env()).goal;
      const cross = new CrossMode(env()).goal;
      assert.deepEqual(american,cross);
      assert.ok(american.x > 0 && american.x+american.w < 520);
    }
    const kit = Wardrobe.list('90',country).find(item => item.price > 0);
    assert.equal(Wardrobe.buy(kit.id),true);
    assert.equal(Wardrobe.selected('20',country).id,kit.id);
    assert.equal(Wardrobe.selected('90').id,'90-street');
  }
  assert.equal(Save.data.coins,0);
});

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

test('each decade has four balls and a free default; every yard selects its era', () => {
  const { Yards, YARDS, Save } = runtime();
  for (const era of ['80', '90', '00', '10', '20']) {
    assert.equal(Yards.ballsForEra(era).length, 4);
    assert.equal(Yards.ballsForEra(era).filter(b => b.price === 0).length, 1);
  }
  for (const yard of Object.values(YARDS)) {
    Save.data.selectedYard = yard.id;
    const ball = Yards.syncBallToYard();
    assert.equal(ball.decade, Yards.ballEra(yard));
    assert.ok(Save.data.ownedBalls.includes(ball.id));
  }
});

test('open catalog allows selection without spending or writing purchases', () => {
  const storage = new Map();
  const { Save, Collections, Wardrobe, Yards, YardEditor } = runtime(storage,true);
  assert.equal(Collections.equipShoes('90',true),true);
  assert.equal(Collections.hasShoesEquipped('90'),true);
  assert.equal(Collections.equipEffect('lights'),true);
  assert.equal(Wardrobe.buy('90-football'),true);
  assert.equal(YardEditor.available('light','dusk'),true);
  Save.data.selectedBall = 'rubber90';
  assert.equal(Yards.syncBallToYard().id,'rubber90');
  assert.equal(Save.data.coins,0);
  assert.equal(Save.data.collection.shoes.length,0);
  assert.equal(Save.data.collection.effects.length,0);
  assert.equal(Save.data.ownedOutfits.length,0);
  assert.equal(Save.data.ownedBalls.includes('rubber90'),false);
  const closed = runtime(storage);
  assert.equal(closed.Collections.hasShoesEquipped('90'),false);
  assert.equal(closed.Collections.effect(),'net');
  assert.equal(closed.Yards.syncBallToYard().id,'classic');
});

test('mastery earns one badge and one photo per yard season', () => {
  const storage = new Map();
  const { Save, Collections, Yards, YARDS } = runtime(storage,true);
  const day = '2026-11-12';
  const custom = {base:'ru90_1',season:'winter',props:['bench','coach']};
  const winter = Yards.editedTheme(custom);
  const warmup = Collections.match();
  for (let i=0;i<4;i++) warmup.note('pass');
  warmup.note('loss');
  warmup.note('pass');
  assert.equal(warmup.finish(winter,false,day).photo,false);
  const match = Collections.match();
  for (let i=0;i<5;i++) match.note('pass');
  const earned = match.finish(winter,false,day);
  assert.deepEqual(Array.from(earned.badges),['pass']);
  assert.equal(earned.photo,true);
  assert.equal(match.finish(winter,false,day).photo,false);
  assert.equal(match.finish(YARDS.ru90_1,false,day).photo,true);
  assert.equal(Save.data.collection.badges.length,1);
  const reloaded = runtime(storage,true);
  assert.deepEqual(Array.from(reloaded.Save.data.collection.photos['ru90_1:winter'].custom.props),['bench','coach']);
  assert.equal(Object.keys(reloaded.Save.data.collection.photos).length,2);
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
test('close camera maps taps to players without changing the strength of an equal screen swipe', () => {
  const { Gesture } = runtime();
  const canvas = { addEventListener(){}, getBoundingClientRect:()=>({left:12,top:160}) };
  const g = new Gesture(canvas, {left:0,top:300,scale:.6,overviewScale:.3});
  const event = (x,y) => ({pointerId:1,clientX:x,clientY:y,preventDefault(){}});
  g._down(event(132,280));
  g._move(event(162,220));
  const drag = g.drag();
  assert.equal(drag.sx,200);
  assert.equal(drag.sy,500);
  assert.equal(drag.dx,100);
  assert.equal(drag.dy,-200);
  g._cancel();
  g.onTap = (point, radius) => {
    assert.equal(point.y,500);
    assert.equal(radius,40);
  };
  g._down(event(132,280));
  g._up(event(132,280));
});
test('cross corner buttons use the same contact window as a swipe', () => {
  const { CrossMode } = runtime();
  const e = env();
  let buttons, meter;
  e.choose = options => { buttons = options; };
  e.hud = { setPills(){}, setTimer(){}, hint(){}, setPill(){}, timing(state){ meter = state; } };
  const mode = new CrossMode({...e,attackOnly:true});
  mode._roles();
  mode._startCross();
  mode.update(mode.flight.dur * .1);
  assert.equal(meter.ready,false);
  mode.update(mode.flight.dur * .5);
  assert.equal(meter.ready,true);
  buttons[0].action();
  assert.equal(mode.shot.side,-1);
  assert.equal(mode.shot.potential,100);
  assert.equal(buttons.length,0);
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
  const { Am300Mode }=runtime(); const mode=new Am300Mode({...env(),opponentCount:0,practice:'solo'});
  mode.fly={to:{x:-100,y:-100},golden:false}; mode._impact();
  assert.equal(mode.state,'impact'); mode.update(0); assert.equal(mode.impactDelay,.65);
  mode.update(.7); assert.equal(mode.state,'aim');
});
test('regular American matches give each opponent one reply before returning to the player', () => {
  const { Am300Mode } = runtime();
  const mode = new Am300Mode(env());
  mode.fly = {to:{x:-100,y:-100},golden:false};
  mode._impact();
  mode.update(.65);
  assert.equal(mode.state,'bot');
  assert.equal(mode.ballsLeft,4);
  const replies = mode.botQueue.length + Number(Boolean(mode.botFly));
  assert.equal(replies,3);
  for (let i = 0; i < 400 && mode.state === 'bot'; i++) mode.update(.02);
  assert.equal(mode.state,'aim');
  assert.equal(mode.ballsLeft,4);
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

test('Russian winter persists and travels in invitations while Spanish yards stay summer', () => {
  const { Activities, Save, Yards, YARDS } = runtime();
  Save.data.selectedYard = 'ru90_2';
  const summerGoal = Yards.goalGeometry(360,740);
  Save.data.yardSeason = 'winter';
  assert.equal(Yards.theme().season, 'winter');
  assert.deepEqual(Yards.goalGeometry(360,740), summerGoal);
  Save.data.selectedYard = 'es80_madrid';
  assert.equal(Yards.theme().season, undefined);

  const challenge = Activities.definition('targets', '2026-11-12');
  const custom = { base: 'ru90_2', props: ['bench', 'neighbor'], season: 'winter' };
  const received = Activities.fromLink(new URL(Activities.link({ ...challenge, custom })).searchParams);
  assert.equal(received.custom.season, 'winter');
  assert.equal(Yards.editedTheme(received.custom).variant, 1);
  assert.equal(Yards.editedTheme({ base: YARDS.es80_madrid.id, season: 'winter' }).custom.season, 'summer');
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
