const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function runtime() {
  const context = vm.createContext({
    Image: class { addEventListener() {} }, window: { dispatchEvent() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    performance: { now: () => 100 },
    Sound: new Proxy({}, { get: () => () => {} }),
    Math: Object.assign(Object.create(Math), { random: () => .5 })
  });
  for (const file of ['save', 'yards', 'gesture', 'mode_dog', 'mode_square', 'mode_am300', 'mode_cross']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
  }
  return vm.runInContext('({Save,Yards,BALLS,YARDS,Gesture,DogMode,SquareMode,Am300Mode,CrossMode})', context);
}
function env() {
  return { W: 520, H: 1125, difficulty: 'normal', opponentCount: 3, gesture: {},
    hud: new Proxy({}, { get: () => () => {} }), finish() {} };
}

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
    Yards.drawCourtLines(ctx,{x:10,y:20,w:300,h:300},true);
    assert.deepEqual(widths,[6,3]);
  }
  assert.equal(colors[1],'#fff3d4'); assert.equal(colors[3],'#243444');
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
