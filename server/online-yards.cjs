const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { YARDS, Yards } = require('../js/yards.js');
const { YardEditor } = require('../js/activity.js');
const field = require('../js/room-rules.js');

const yardCode = /^[a-f0-9]{24}$/;
const memberToken = /^[a-f0-9]{48}$/;
const hash = token => createHash('sha256').update(token).digest('hex');

function createYards({file,error}) {
  const yards = new Map();
  if (file && fs.existsSync(file)) {
    for (const yard of JSON.parse(fs.readFileSync(file,'utf8'))) yards.set(yard.code,yard);
  }
  function save() {
    if (!file) return;
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file+'.tmp',JSON.stringify([...yards.values()]),{mode:0o600});
    fs.renameSync(file+'.tmp',file);
  }
  function find(code) {
    const yard = yardCode.test(code) && yards.get(code);
    if (!yard) throw error(404,'Двор не найден');
    return yard;
  }
  function member(code,token) {
    const yard = find(code);
    const id = typeof token === 'string' && memberToken.test(token) ? hash(token) : '';
    if (!Object.hasOwn(yard.members,id)) throw error(401,'Вступи в этот двор по приглашению');
    return {yard,id};
  }
  function details(yard) {
    const base = Yards.seasonal(YARDS[yard.preset.base],yard.preset.season);
    return {code:yard.code,name:yard.name,preset:yard.preset,
      goal:Yards.goalGeometry(field.W,field.H,field.goal,base)};
  }
  function enroll(yard,team) {
    const name = field.teamName(team);
    if (!name) throw error(400,'Введи название команды');
    const members = Object.values(yard.members);
    if (members.length >= 100) throw error(409,'В этом дворе уже 100 команд');
    if (members.some(entry => entry.name.toLowerCase() === name.toLowerCase())) {
      throw error(409,'Такое название команды уже занято в этом дворе');
    }
    const token = randomBytes(24).toString('hex');
    const id = hash(token);
    yard.members[id] = {name,results:{}};
    try { save(); }
    catch (e) { delete yard.members[id]; throw e; }
    return {yard:details(yard),token};
  }
  function create(body) {
    const name = field.teamName(body.name);
    if (!name) throw error(400,'Введи название двора');
    if (yards.size >= 200) throw error(503,'Достигнут предел числа дворов');
    const code = randomBytes(12).toString('hex');
    const yard = {code,name,preset:YardEditor.clean(body.preset || {},YARDS),members:{}};
    yards.set(code,yard);
    try { return enroll(yard,body.team); }
    catch (e) { yards.delete(code); throw e; }
  }
  function standings(yard) {
    const table = {};
    for (const entry of Object.values(yard.members)) {
      for (const [mode,result] of Object.entries(entry.results)) {
        (table[mode] ??= []).push({name:entry.name,...result});
      }
    }
    for (const rows of Object.values(table)) {
      rows.sort((a,b) => b.points-a.points || b.wins-a.wins || a.played-b.played || a.name.localeCompare(b.name));
    }
    return table;
  }
  function record(room,winner) {
    const {yard} = room;
    const mode = room.tournament ? room.mode+'-tournament' : room.cup ? 'cup' :
      room.mode === 'square' ? 'square-'+room.capacity : room.mode;
    room.yardMembers.forEach((id,seat) => {
      const entry = yard.members[id];
      const result = entry.results[mode] ??= {points:0,played:0,wins:0};
      result.played++;
      if (winner === seat) { result.wins++; result.points += 3; }
      else if (winner === null) result.points++;
    });
    // Матч уже закончен. Ошибка диска не должна отменять его результат в комнате.
    try { save(); } catch (e) { console.error('Не удалось сохранить таблицу двора:',e.code || e.message); }
  }
  return { create, find, member, enroll, details, standings, record };
}

module.exports = { createYards, yardCode };
