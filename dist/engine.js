export const SAVE_KEY = 'hamster-pocket-room-v1';
export const ZONES = {
  wheel: { x: .745, y: .66, radius: .095 },
  house: { x: .22, y: .405, radius: .085 },
  bowl: { x: .875, y: .81, radius: .065 },
};
export const POSES = { idle: 0, ball: 1, pancake: 2, sleeping: 3, eating: 4, crying: 5, searching: 6, running: 7 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const number = (v, fallback, lo, hi) => typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
const validTime = v => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);

export function isSleepTime(date, start, end) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const parse = v => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  const a = parse(start), b = parse(end);
  return a === b ? false : a < b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

export function freshState() {
  return {
    version: 1, name: '团团', energy: 82, hunger: 74, mood: 84,
    x: .49, y: .73, facing: 1, mode: 'idle', pose: 'idle',
    sleepStart: '06:00', sleepEnd: '18:00', sound: false,
    seeds: [], stash: null, forcedSleep: false, awakeUntil: 0,
    actionUntil: 0, nextIdle: 7, searchStarted: 0, memory: null,
    wheelAngle: 0, target: null, time: 0, lastInteraction: 0,
    totalFeeds: 0, totalPets: 0, totalRuns: 0, discoveries: [],
  };
}

export function restoreState(raw) {
  const s = freshState();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return s;
  s.name = typeof raw.name === 'string' ? raw.name.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 12) || '团团' : s.name;
  for (const k of ['energy', 'hunger', 'mood']) s[k] = number(raw[k], s[k], 0, 100);
  s.x = number(raw.x, s.x, .08, .92); s.y = number(raw.y, s.y, .38, .86);
  for (const k of ['sleepStart', 'sleepEnd']) if (validTime(raw[k])) s[k] = raw[k];
  s.sound = raw.sound === true;
  s.forcedSleep = raw.forcedSleep === true;
  for (const k of ['totalFeeds', 'totalPets', 'totalRuns']) s[k] = number(raw[k], 0, 0, 1e6);
  s.discoveries = Array.isArray(raw.discoveries) ? raw.discoveries.filter(v => ['ball', 'pancake', 'wheel-nap', 'stash', 'cry', 'found'].includes(v)).slice(0, 6) : [];
  const seed = v => v && typeof v.id === 'string' && Number.isFinite(v.x) && Number.isFinite(v.y)
    ? { id: v.id.slice(0, 40), x: clamp(v.x, .12, .9), y: clamp(v.y, .58, .86) } : null;
  s.seeds = Array.isArray(raw.seeds) ? raw.seeds.slice(0, 12).map(seed).filter(Boolean) : [];
  s.stash = seed(raw.stash);
  s.memory = raw.memory && Number.isFinite(raw.memory.x) && Number.isFinite(raw.memory.y)
    ? { x: clamp(raw.memory.x, .12, .9), y: clamp(raw.memory.y, .58, .86) } : s.stash ? { x: s.stash.x, y: s.stash.y } : null;
  return s;
}

export function saveSnapshot(state) {
  const { version, name, energy, hunger, mood, x, y, sleepStart, sleepEnd, sound,
    seeds, stash, memory, forcedSleep, totalFeeds, totalPets, totalRuns, discoveries } = state;
  return { version, name, energy, hunger, mood, x, y, sleepStart, sleepEnd, sound,
    seeds, stash, memory, forcedSleep, totalFeeds, totalPets, totalRuns, discoveries };
}

export class HamsterGame {
  constructor(state = freshState(), random = Math.random) {
    this.s = state; this.random = random; this.events = [];
  }
  emit(text, type = 'normal') { this.events.push({ text, type }); }
  discover(id, text) {
    if (!this.s.discoveries.includes(id)) {
      this.s.discoveries.push(id); this.emit(text, 'discovery');
    }
  }
  wake() {
    const s = this.s;
    if (s.mode === 'sleeping') this.emit('嗯？谁在叫我呀…', 'wake');
    s.awakeUntil = s.time + 10; s.lastInteraction = s.time;
    if (s.mode === 'sleeping') { s.mode = 'idle'; s.pose = 'idle'; s.nextIdle = s.time + 5; }
  }
  act(action, interactive = true) {
    const s = this.s;
    if (action === 'sleep') {
      if (s.forcedSleep || s.mode === 'sleeping') {
        s.forcedSleep = false; this.wake(); this.emit('陪你再玩一小会儿。');
      } else {
        s.forcedSleep = true; s.awakeUntil = 0; this.sleep(); this.emit('晚安，做个瓜子味的梦。', 'sleep');
      }
      return true;
    }
    if (interactive) this.wake();
    if (action === 'feed') {
      if (s.mode === 'carried') return false;
      s.hunger = clamp(s.hunger + 22, 0, 100); s.energy = clamp(s.energy + 16, 0, 100);
      s.mood = clamp(s.mood + 5, 0, 100); s.mode = 'eating'; s.pose = 'eating';
      s.actionUntil = s.time + 3.5; s.target = null; s.totalFeeds++;
      this.emit('咔嚓咔嚓，小肚子满足了。', 'eat'); return true;
    }
    if (action === 'pet') {
      s.mood = clamp(s.mood + 10, 0, 100); s.totalPets++;
      if (s.mode !== 'carried') { s.mode = 'posing'; s.pose = 'ball'; s.actionUntil = s.time + 2.5; }
      this.emit('缩成一颗软乎乎的团子。', 'pet');
      this.discover('ball', '发现小动作 · 仓鼠球'); return true;
    }
    if (action === 'wheel') {
      if (s.energy < 12) { s.pose = 'pancake'; s.mode = 'posing'; s.actionUntil = s.time + 3; this.emit('跑不动啦，先喂点东西吧。'); return false; }
      s.x = ZONES.wheel.x; s.y = ZONES.wheel.y;
      s.mode = 'running'; s.pose = 'running'; s.actionUntil = s.time + 18;
      s.totalRuns++; this.emit('小短腿，开跑！', 'run'); return true;
    }
    if (action === 'shape') {
      s.mode = 'posing'; s.pose = s.pose === 'pancake' ? 'ball' : 'pancake'; s.actionUntil = s.time + 5;
      this.discover(s.pose, s.pose === 'ball' ? '发现小动作 · 仓鼠球' : '发现小动作 · 软软鼠饼');
      this.emit(s.pose === 'ball' ? '团起来，谁也看不见我。' : '摊平一下，舒服～'); return true;
    }
    if (action === 'stash') {
      if (s.stash) { this.emit('它的小秘密已经藏好了，找找木屑里的小鼓包。'); return false; }
      const x = .15 + this.random() * .47, y = .72 + this.random() * .11;
      s.stash = { id: `stash-${Math.floor(s.time * 1000)}`, x, y };
      s.memory = { x, y }; s.mode = 'hiding'; s.pose = 'eating'; s.target = { x, y };
      s.actionUntil = s.time + 4; s.searchStarted = 0;
      this.emit('偷偷藏一颗瓜子，记住这个位置哦。', 'stash');
      this.discover('stash', '发现小动作 · 秘密粮仓'); return true;
    }
    return false;
  }
  pickUp() {
    this.wake(); this.s.mode = 'carried'; this.s.target = null;
    this.s.pose = 'ball'; this.emit('被捧起来啦，小爪子收好。', 'pet');
  }
  move(x, y) { this.s.x = clamp(x, .08, .92); this.s.y = clamp(y, .38, .86); }
  drop(x, y) {
    this.move(x, y); const s = this.s; this.wake();
    s.mode = 'idle'; s.pose = 'idle'; s.nextIdle = s.time + 3;
    if (distance(s, ZONES.wheel) < ZONES.wheel.radius + .035) this.act('wheel');
    else if (distance(s, ZONES.house) < ZONES.house.radius) {
      s.forcedSleep = true; s.awakeUntil = 0; this.sleep(); this.emit('钻进小窝，晚安。', 'sleep');
    } else { s.y = clamp(s.y, .61, .85); this.emit('轻轻放下，继续逛逛。'); }
  }
  moveStash(x, y) {
    const s = this.s; if (!s.stash) return false;
    s.stash.x = clamp(x, .12, .9); s.stash.y = clamp(y, .61, .85);
    s.searchStarted = s.time + 4; this.emit('换个地方藏好，看它能不能找到。'); return true;
  }
  revealStash() {
    if (!this.s.stash) return null;
    this.wake(); this.emit('找到它的小粮仓了！拖到别处，再松手藏好。');
    return this.s.stash;
  }
  sleep() {
    const s = this.s; const inWheel = s.mode === 'running' || distance(s, ZONES.wheel) < .035;
    s.mode = 'sleeping'; s.pose = 'sleeping'; s.target = null;
    if (inWheel) this.discover('wheel-nap', '发现小动作 · 在滚轮里睡着了');
  }
  walkTo(target, dt, speed = .047) {
    const s = this.s, d = distance(s, target);
    if (d < .008) { s.x = target.x; s.y = target.y; return true; }
    const step = Math.min(d, speed * dt);
    s.facing = target.x < s.x ? -1 : 1;
    s.x += (target.x - s.x) / d * step; s.y += (target.y - s.y) / d * step;
    return false;
  }
  update(dt, date = new Date()) {
    const s = this.s; dt = clamp(dt, 0, 1); s.time += dt;
    const wantsSleep = s.forcedSleep || isSleepTime(date, s.sleepStart, s.sleepEnd) || s.energy < 6;
    if (s.mode === 'carried') return;
    if (wantsSleep && s.time >= s.awakeUntil) {
      if (s.mode !== 'sleeping') this.sleep();
    } else if (s.mode === 'sleeping' && !wantsSleep) {
      s.mode = 'idle'; s.pose = 'idle'; s.nextIdle = s.time + 4; this.emit('睡饱了，起来伸个懒腰。', 'wake');
    }
    s.hunger = clamp(s.hunger - dt * (s.mode === 'sleeping' ? .012 : .026), 0, 100);
    s.mood = clamp(s.mood - dt * (s.hunger < 25 ? .045 : .004), 0, 100);
    if (s.mode === 'sleeping') { s.energy = clamp(s.energy + dt * .9, 0, 100); return; }
    s.energy = clamp(s.energy - dt * (s.mode === 'running' ? 1.2 : .055), 0, 100);
    if (s.mode === 'running') {
      s.wheelAngle += dt * 5;
      if (s.energy < 9) { this.sleep(); this.emit('呼…直接在滚轮里睡着了。', 'sleep'); }
      else if (s.time >= s.actionUntil) {
        s.mode = 'idle'; s.pose = 'idle'; s.x -= .09; s.y = .77; s.nextIdle = s.time + 6;
        this.emit('跑完啦，休息一下。');
      }
      return;
    }
    if (s.mode === 'hiding') {
      if (s.target) this.walkTo(s.target, dt, .09);
      if (s.time >= s.actionUntil) { s.mode = 'idle'; s.pose = 'idle'; s.nextIdle = s.time + 5; s.target = null; }
      return;
    }
    if (['eating', 'posing'].includes(s.mode)) {
      if (s.time >= s.actionUntil) { s.mode = 'idle'; s.pose = 'idle'; s.nextIdle = s.time + 4; }
      return;
    }
    if (s.searchStarted > 0 && s.time >= s.searchStarted && s.stash && s.memory && !['searching', 'crying'].includes(s.mode)) {
      s.mode = 'searching'; s.pose = 'searching'; s.target = { ...s.memory }; s.actionUntil = s.time + 30;
      this.emit('咦？我记得瓜子藏在这里呀。', 'search');
    }
    if (s.mode === 'searching') {
      if (distance(s, s.stash) < .055) {
        s.stash = null; s.memory = null; s.searchStarted = 0; s.target = null;
        this.act('feed', false); this.discover('found', '发现小动作 · 找回小瓜子');
        this.emit('找到了！原来在这里，抱紧我的小瓜子。', 'eat');
      } else if (s.time >= s.actionUntil) {
        s.mode = 'crying'; s.pose = 'crying'; s.actionUntil = s.time + 6; s.target = null;
        this.emit('呜呜，我的小瓜子去哪了…', 'cry'); this.discover('cry', '发现小动作 · 委屈巴巴');
      } else if (this.walkTo(s.target, dt, .055)) {
        s.target = { x: .14 + this.random() * .72, y: .63 + this.random() * .2 };
      }
      return;
    }
    if (s.mode === 'crying') {
      if (s.stash && distance(s, s.stash) < .09) {
        s.mode = 'searching'; s.pose = 'searching'; s.actionUntil = s.time + 10; s.target = { ...s.stash };
      } else if (s.time >= s.actionUntil) {
        s.searchStarted = 0; s.mode = 'idle'; s.pose = 'idle'; s.nextIdle = s.time + 10;
      }
      return;
    }
    if (s.mode === 'walking') {
      if (!s.target || this.walkTo(s.target, dt, s.energy < 20 ? .022 : .045)) {
        s.mode = 'idle'; s.pose = 'idle'; s.target = null; s.nextIdle = s.time + 4 + this.random() * 5;
      }
      return;
    }
    if (s.time >= s.nextIdle) {
      const choice = this.random(); s.nextIdle = s.time + 8 + this.random() * 10;
      if (s.stash && s.memory && choice < .18) s.searchStarted = s.time + 1;
      else if (!s.stash && choice < .13) this.act('stash', false);
      else if (choice < .38) {
        s.mode = 'posing'; s.pose = this.random() < .5 ? 'ball' : 'pancake'; s.actionUntil = s.time + 4;
        this.discover(s.pose, s.pose === 'ball' ? '发现小动作 · 仓鼠球' : '发现小动作 · 软软鼠饼');
      } else {
        s.mode = 'walking'; s.pose = 'idle'; s.target = { x: .16 + this.random() * .52, y: .66 + this.random() * .16 };
      }
    }
  }
  drainEvents() { const e = this.events; this.events = []; return e; }
}
