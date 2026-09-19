import { HamsterGame, restoreState, saveSnapshot, SAVE_KEY, POSES, ZONES } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('room'), ctx = canvas.getContext('2d', { alpha: false });
const portrait = $('portrait'), portraitCtx = portrait.getContext('2d');
const W = 960, H = 640;
let storageOK = true;
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }
  catch { storageOK = false; return null; }
}
const game = new HamsterGame(restoreState(loadSave()));
const s = game.s;
let ready = false, paused = false, lastFrame = 0, lastSave = 0, lastUI = 0;
let pointer = null, seedDrag = null, bubbleUntil = 0, hintUntil = 0, hintShown = false;
let roomImage, atlasImage, wheelImage, tiles = [];
let audio;
const particles = [];
const modeNames = { idle: '正在发呆', walking: '到处逛逛', carried: '在你手心里', running: '小短腿开跑', eating: '咔嚓咔嚓', sleeping: '呼呼睡着了', searching: '找我的小瓜子', crying: '委屈巴巴', hiding: '偷偷藏好', posing: '舒服地团一团' };

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveSnapshot(s))); storageOK = true; }
  catch { storageOK = false; }
  $('save-status').textContent = storageOK ? '已存档' : '本次未能存档';
}
function announce(text) { $('activity').textContent = text; }
function dismissHint() { $('first-hint').classList.add('dismissed'); }
function showBubble(symbol, seconds = 2.5) {
  $('bubble').textContent = symbol; $('bubble').hidden = false; bubbleUntil = s.time + seconds;
}
function sparkles(symbol = '♡', count = 4) {
  for (let i = 0; i < count; i++) particles.push({ x: s.x * W + (Math.random() - .5) * 75, y: s.y * H - 65, vx: (Math.random() - .5) * 28, vy: -22 - Math.random() * 24, age: 0, life: 1.2 + Math.random() * .4, symbol });
}
function enableAudio() {
  if (!s.sound) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); void audio.resume().catch(() => {}); } catch { /* Sound is optional. */ }
}
function sound(kind) {
  if (!s.sound || !audio || audio.state !== 'running') return;
  const notes = { eat: [700, 900], pet: [660, 880, 990], run: [440, 550], cry: [520, 390, 330], wake: [450, 650], sleep: [600, 450], stash: [800, 600], discovery: [660, 880, 1100] }[kind];
  if (!notes) return;
  try {
    notes.forEach((f, i) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const t = audio.currentTime + i * .11;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.035, t + .015); gain.gain.exponentialRampToValueAtTime(.001, t + .12);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(t); oscillator.stop(t + .14);
    });
  } catch { /* Continue playing if audio is unavailable. */ }
}
function flushEvents() {
  for (const event of game.drainEvents()) {
    announce(event.text); sound(event.type);
    if (event.type === 'pet' || event.type === 'eat') { sparkles(); showBubble(event.type === 'eat' ? '♪' : '♡'); }
    else if (event.type === 'cry') showBubble('…', 4);
    else if (event.type === 'search') showBubble('？', 3);
    else if (event.type === 'discovery') sparkles('✧');
  }
}

function drawTile(context, index, x, y, scale = .43, facing = 1, bounce = 0) {
  const tile = tiles[index]; if (!tile) return;
  context.save(); context.translate(x, y + bounce); context.scale(facing * scale, scale);
  context.imageSmoothingEnabled = false;
  context.drawImage(tile.image, -tile.width / 2, -tile.height);
  context.restore();
}

function prepareTiles(image) {
  const cellW = image.width / 4, cellH = image.height / 2;
  for (let index = 0; index < 8; index++) {
    const tile = document.createElement('canvas'); tile.width = cellW; tile.height = cellH;
    const context = tile.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, (index % 4) * cellW, Math.floor(index / 4) * cellH, cellW, cellH, 0, 0, cellW, cellH);
    const pixels = context.getImageData(0, 0, cellW, cellH);
    let left = cellW, top = cellH, right = 0, bottom = 0;
    // Texture mask removes the generated translucent atlas backdrop; source alpha is preserved on disk.
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) {
      const p = (y * cellW + x) * 4;
      if (pixels.data[p + 3] < 246) pixels.data[p + 3] = 0;
      else { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
    }
    context.putImageData(pixels, 0, 0);
    if (left > right) throw new Error('仓鼠姿态素材没有可用轮廓');
    const cropped = document.createElement('canvas'); cropped.width = right - left + 1; cropped.height = bottom - top + 1;
    cropped.getContext('2d').drawImage(tile, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    tiles.push({ image: cropped, width: cropped.width, height: cropped.height });
  }
}

function seed(context, x, y, big = false) {
  context.save(); context.translate(x, y); context.rotate(-.3);
  const k = big ? 1.2 : 1;
  context.scale(k, k); context.fillStyle = '#6b6044'; context.strokeStyle = '#3d493b'; context.lineWidth = 2;
  context.beginPath(); context.moveTo(0, -13); context.bezierCurveTo(-14, 0, -9, 14, 0, 15); context.bezierCurveTo(9, 14, 14, 0, 0, -13); context.fill(); context.stroke();
  context.strokeStyle = '#e3d1a0'; context.lineWidth = 2.5; context.beginPath(); context.moveTo(0, -7); context.lineTo(0, 10); context.moveTo(-5, -1); context.lineTo(-4, 9); context.moveTo(5, -1); context.lineTo(4, 9); context.stroke(); context.restore();
}
function drawStash() {
  if (!s.stash) return;
  const x = s.stash.x * W, y = s.stash.y * H;
  if (seedDrag) { seed(ctx, seedDrag.x * W, seedDrag.y * H, true); return; }
  ctx.save(); ctx.fillStyle = '#e4ba62'; ctx.strokeStyle = '#f9e2a3'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y + 3, 23, 10, -.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff2c5'; ctx.fillRect(x - 8, y - 6, 11, 5); ctx.fillRect(x + 4, y - 2, 9, 4);
  ctx.fillStyle = '#86683d'; ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✧', x, y - 14); ctx.restore();
}

function render(dt) {
  ctx.imageSmoothingEnabled = false; ctx.drawImage(roomImage, 0, 0, W, H);
  // The wheel's separate texture allows the running animal to sit inside the rim.
  ctx.drawImage(wheelImage, 574, 196, 291, 291);
  if (s.mode === 'running') {
    ctx.save(); ctx.translate(722, 329); ctx.rotate(s.wheelAngle);
    ctx.strokeStyle = '#ffd2dd80'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(104, 0); ctx.stroke(); }
    ctx.restore();
  }
  if (pointer?.dragging && pointer.kind === 'hamster') {
    ctx.save(); ctx.strokeStyle = '#ffffffd9'; ctx.fillStyle = '#bdf2e841'; ctx.lineWidth = 3; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.ellipse(ZONES.wheel.x * W, ZONES.wheel.y * H - 45, 72, 52, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ZONES.house.x * W, ZONES.house.y * H - 20, 50, 43, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]); ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#425e69'; ctx.textAlign = 'center';
    ctx.fillText('跑一跑', ZONES.wheel.x * W, ZONES.wheel.y * H - 109); ctx.fillText('睡一觉', ZONES.house.x * W, ZONES.house.y * H - 73); ctx.restore();
  }
  drawStash();
  const wheelBlend = s.motion?.wheelBlend ?? 0;
  const sleepBlend = s.motion?.sleepBlend ?? (s.mode === 'sleeping' ? 1 : 0);
  const isWheel = wheelBlend > .5 || s.mode === 'running' || (s.mode === 'sleeping' && Math.hypot(s.x - ZONES.wheel.x, s.y - ZONES.wheel.y) < .04);
  const lift = s.motion?.lift ?? (s.mode === 'carried' ? 1 : 0);
  const px = s.x * W, py = s.y * H, bodyY = py - lift * 14 + sleepBlend * 2;
  ctx.save(); ctx.fillStyle = '#6b68412a'; ctx.globalAlpha = 1 - lift * .45; ctx.beginPath(); ctx.ellipse(px, py + 2, isWheel ? 38 : 45 - lift * 4, 9 - lift * 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  let bounce = 0, angle = 0;
  const stride = s.motion?.stride ?? s.time * 14;
  const activity = s.motion?.activityPhase ?? s.time;
  const sniffing = s.mode === 'searching' && !s.target;
  const burying = s.mode === 'hiding' && !s.target;
  if (s.mode === 'running') {
    const runRate = Math.max(.16, (s.motion?.wheelSpeed ?? 5) / 5);
    bounce = Math.sin(s.time * (8 + runRate * 13)) * 2.7 * runRate;
    angle = Math.sin(s.time * (6 + runRate * 7)) * .04 * runRate;
  } else if (sniffing) {
    bounce = -Math.abs(Math.sin(activity * 8)) * 1.1;
    angle = Math.sin(activity * 5) * .055;
  } else if (burying) {
    bounce = -Math.abs(Math.sin(activity * 12)) * 1.8;
    angle = Math.sin(activity * 12) * .03;
  } else if (s.mode === 'walking' || s.mode === 'hiding' || s.mode === 'searching') {
    bounce = -Math.abs(Math.sin(stride)) * 3.2;
    angle = Math.sin(stride) * .045;
  } else if (s.mode === 'eating') {
    bounce = -Math.abs(Math.sin(activity * 10)) * 1.6;
    angle = Math.sin(activity * 5) * .018;
  } else if (s.mode === 'posing') {
    const settle = Math.min(1, activity / .5);
    bounce = -Math.sin(settle * Math.PI) * 3.5;
  } else if (s.mode === 'sleeping') {
    bounce = Math.sin(activity * 2) * 1.15;
    angle = -sleepBlend * .012;
  } else if (s.mode === 'crying') angle = Math.sin(s.time * 15) * .035;
  else if (s.mode === 'carried') angle = Math.sin(s.time * 3) * .045;
  if (lift > .02) {
    ctx.save(); ctx.globalAlpha = Math.min(1, lift * 1.35); ctx.font = '108px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🫴', px, py + 34 - lift * 3); ctx.restore();
  }
  let scale = .43 - wheelBlend * .08 + lift * .012 + sleepBlend * .006;
  if (s.mode === 'eating' || burying) scale += Math.abs(Math.sin(activity * 10)) * .006;
  if (s.mode === 'posing') scale += Math.sin(Math.min(1, activity / .5) * Math.PI) * .012;
  const renderFacing = s.mode === 'running' ? 1 : (s.motion?.renderFacing ?? s.facing);
  const poseBlend = s.motion?.poseBlend ?? 1;
  const fromPose = s.motion?.fromPose;
  ctx.save(); ctx.translate(px, bodyY); ctx.rotate(angle);
  if (fromPose && POSES[fromPose] !== undefined && poseBlend < 1) {
    ctx.globalAlpha = 1 - poseBlend; drawTile(ctx, POSES[fromPose], 0, 0, scale, renderFacing, bounce);
    ctx.globalAlpha = poseBlend; drawTile(ctx, POSES[s.pose] ?? 0, 0, 0, scale, renderFacing, bounce);
  } else drawTile(ctx, POSES[s.pose] ?? 0, 0, 0, scale, renderFacing, bounce);
  ctx.restore();
  if (sleepBlend > .04) {
    ctx.save(); ctx.globalAlpha = sleepBlend; ctx.fillStyle = '#7195c9'; ctx.font = 'bold 21px monospace'; ctx.fillText('z', px + 39, py - 65 - (s.time % 2) * 6); ctx.font = 'bold 15px monospace'; ctx.fillText('z', px + 55, py - 84 - (s.time % 2) * 6); ctx.restore();
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.age >= p.life) { particles.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = 1 - p.age / p.life; ctx.font = 'bold 25px system-ui'; ctx.fillStyle = '#ed739d'; ctx.strokeStyle = '#fffaf4'; ctx.lineWidth = 4;
    ctx.strokeText(p.symbol, p.x, p.y); ctx.fillText(p.symbol, p.x, p.y); ctx.restore();
  }
  if (hintShown && s.time < hintUntil && s.stash && !seedDrag) {
    ctx.save(); ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7a643d'; ctx.fillText('拖动这个小鼓包', s.stash.x * W, s.stash.y * H - 37); ctx.restore();
  }
  if (s.time >= bubbleUntil) $('bubble').hidden = true;
  else { $('bubble').style.left = `${s.x * 100}%`; $('bubble').style.top = `${(s.y - .19) * 100}%`; }
}

function updateUI() {
  $('pet-name').textContent = s.name; $('room-title').textContent = `${s.name}的小笼子`;
  $('mode-label').textContent = modeNames[s.mode] || '正在发呆';
  for (const stat of ['energy', 'hunger', 'mood']) { $(stat).value = s[stat]; $(`${stat}-value`).textContent = Math.round(s[stat]); }
  $('sleep-button-label').textContent = s.mode === 'sleeping' || s.forcedSleep ? '叫醒它' : '睡一觉';
  document.querySelector('[data-action="shape"] span').textContent = s.pose === 'pancake' ? '团成球' : '变鼠饼';
  $('sound-button').setAttribute('aria-pressed', String(s.sound));
  $('sound-button').setAttribute('aria-label', s.sound ? '关闭声音' : '开启声音');
  $('sound-button').style.color = s.sound ? '#dc83a1' : '#6b8c95';
  $('room-clock').textContent = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  portraitCtx.clearRect(0, 0, 96, 96); drawTile(portraitCtx, 0, 48, 88, .27);
}

function doAction(action) {
  if (!ready) return false;
  enableAudio(); dismissHint();
  if (pointer?.dragging) finishPointer(true);
  const result = game.act(action); flushEvents(); updateUI(); persist();
  if (action === 'stash') { hintShown = true; hintUntil = s.time + 8; }
  return result;
}

function normalized(event) {
  const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
}
function hitHamster(p) {
  return Math.abs(p.x - s.x) < .082 && p.y > s.y - .2 && p.y < s.y + .04;
}
canvas.addEventListener('pointerdown', event => {
  if (!ready || paused || pointer || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const p = normalized(event); enableAudio(); dismissHint();
  if (hitHamster(p)) {
    const wasSleeping = s.mode === 'sleeping'; game.wake();
    pointer = { id: event.pointerId, kind: 'hamster', x: p.x, y: p.y, startX: p.x, startY: p.y, offsetX: s.x - p.x, offsetY: s.y - p.y, dragging: false, wasSleeping };
  } else if (s.stash && Math.hypot((p.x - s.stash.x) * 1.5, p.y - s.stash.y) < .055) {
    game.revealStash(); seedDrag = { ...s.stash };
    pointer = { id: event.pointerId, kind: 'seed', startX: p.x, startY: p.y, x: p.x, y: p.y, dragging: true };
  } else if (Math.hypot(p.x - ZONES.wheel.x, p.y - (ZONES.wheel.y - .12)) < .17) doAction('wheel');
  else if (Math.hypot(p.x - ZONES.house.x, p.y - ZONES.house.y) < .10) doAction('sleep');
  else if (Math.hypot(p.x - ZONES.bowl.x, p.y - ZONES.bowl.y) < .09) doAction('feed');
  if (pointer) { canvas.setPointerCapture(event.pointerId); event.preventDefault(); }
  flushEvents();
});
canvas.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const p = normalized(event); pointer.x = p.x; pointer.y = p.y;
  if (pointer.kind === 'hamster') {
    if (!pointer.dragging && Math.hypot(p.x - pointer.startX, p.y - pointer.startY) > .008) { pointer.dragging = true; game.pickUp(); flushEvents(); }
    if (pointer.dragging) game.move(p.x + pointer.offsetX, p.y + pointer.offsetY);
  } else { seedDrag.x = Math.max(.12, Math.min(.9, p.x)); seedDrag.y = Math.max(.61, Math.min(.85, p.y)); }
  canvas.classList.toggle('dragging', pointer.dragging); event.preventDefault();
});
function finishPointer(cancelled = false) {
  if (!pointer) return;
  const p = pointer;
  if (p.kind === 'hamster') {
    if (p.dragging) game.drop(s.x, s.y);
    else if (!cancelled && !p.wasSleeping) game.act('pet');
    else if (!cancelled) showBubble('？');
  } else if (seedDrag) { game.moveStash(seedDrag.x, seedDrag.y); seedDrag = null; }
  pointer = null; canvas.classList.remove('dragging');
  try { if (canvas.hasPointerCapture(p.id)) canvas.releasePointerCapture(p.id); } catch { /* Capture may already be lost. */ }
  flushEvents(); updateUI(); persist();
}
canvas.addEventListener('pointerup', event => { if (pointer?.id === event.pointerId) finishPointer(); });
canvas.addEventListener('pointercancel', event => { if (pointer?.id === event.pointerId) finishPointer(true); });
canvas.addEventListener('lostpointercapture', () => { if (pointer) finishPointer(true); });
canvas.addEventListener('contextmenu', event => event.preventDefault());
for (const button of document.querySelectorAll('[data-action]')) { button.disabled = true; button.addEventListener('click', () => doAction(button.dataset.action)); }
document.addEventListener('keydown', event => {
  if (!ready || paused || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const actions = { '1': 'feed', '2': 'pet', '3': 'wheel', '4': 'sleep', '5': 'shape', '6': 'stash' };
  if (actions[event.key]) { event.preventDefault(); doAction(actions[event.key]); }
  else if (event.target === canvas && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); doAction('pet'); }
});

$('sound-button').addEventListener('click', () => { s.sound = !s.sound; enableAudio(); sound('pet'); updateUI(); persist(); });
function openDialog(dialog) { if (!ready) return; finishPointer(true); paused = true; dialog.showModal(); }
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('close', () => { paused = false; lastFrame = 0; });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
}
$('settings-button').addEventListener('click', () => {
  $('name-input').value = s.name; $('sleep-start').value = s.sleepStart; $('sleep-end').value = s.sleepEnd; openDialog($('settings-dialog'));
});
$('settings-form').addEventListener('submit', event => {
  event.preventDefault(); s.name = $('name-input').value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 12) || '团团';
  s.sleepStart = $('sleep-start').value; s.sleepEnd = $('sleep-end').value;
  updateUI(); persist(); $('settings-dialog').close(); announce(`好啦，${s.name}记住了。`);
});

function frame(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0; lastFrame = now;
  if (ready && !paused && !document.hidden) {
    game.update(dt); flushEvents(); render(dt);
    if (s.time - lastUI > .25) { updateUI(); lastUI = s.time; }
    if (s.time - lastSave > 5) { persist(); lastSave = s.time; }
  }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { lastFrame = 0; if (document.hidden) { finishPointer(true); persist(); } });
window.addEventListener('pagehide', persist);

function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`素材加载失败: ${src}`)); image.src = src; });
}
try {
  [roomImage, atlasImage, wheelImage] = await Promise.all(['assets/room.webp', 'assets/hamster-atlas.webp', 'assets/wheel.webp'].map(loadImage));
  prepareTiles(atlasImage); ready = true; $('load-screen').hidden = true;
  for (const button of document.querySelectorAll('[data-action]')) button.disabled = false;
  updateUI(); game.update(0); flushEvents(); render(0);
  if (!storageOK) $('save-status').textContent = '本次未能读取存档';
  announce(s.mode === 'sleeping' ? `${s.name}睡着啦，轻轻拖一下能叫醒它。` : `你好呀，来陪${s.name}玩一会儿。`);
  requestAnimationFrame(frame);
} catch (error) {
  $('load-screen').replaceChildren();
  const title = document.createElement('strong'); title.textContent = '小仓鼠还没准备好';
  const note = document.createElement('span'); note.textContent = '请检查网络，再试一次。';
  const retry = document.createElement('button'); retry.className = 'primary-button'; retry.textContent = '重新加载'; retry.addEventListener('click', () => location.reload());
  $('load-screen').append(title, note, retry); console.error(error);
}

// Optional imperative WebMCP surface; unsupported browsers simply use the normal UI.
if (ready && document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const readState = () => ({ name: s.name, mode: s.mode, energy: Math.round(s.energy), hunger: Math.round(s.hunger), mood: Math.round(s.mood), x: s.x, y: s.y, hiddenSeed: s.stash ? { x: s.stash.x, y: s.stash.y } : null });
  const tools = [
    { name: 'read_hamster', title: '查看仓鼠状态', description: 'Read the current hamster status and hidden seed position without changing the game.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input) { if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('Expected an empty object'); return readState(); } },
    { name: 'care_for_hamster', title: '照顾仓鼠', description: 'Feed, pet, start a wheel run, toggle sleep, change pose, or have the hamster hide a seed using the same actions as the visible buttons.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['feed', 'pet', 'wheel', 'sleep', 'shape', 'stash'] } }, required: ['action'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) { if (!input || Object.keys(input).some(k => k !== 'action') || !['feed', 'pet', 'wheel', 'sleep', 'shape', 'stash'].includes(input.action)) throw new Error('Invalid hamster action'); if (paused) throw new Error('Close the settings before playing'); const completed = doAction(input.action); return { completed, ...readState() }; } },
    { name: 'move_hamster', title: '移动仓鼠', description: 'Pick up and place the hamster at normalized cage coordinates; placement on the wheel starts running, and placement at the house starts sleeping.', inputSchema: { type: 'object', properties: { x: { type: 'number', minimum: .08, maximum: .92 }, y: { type: 'number', minimum: .38, maximum: .86 } }, required: ['x', 'y'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) { if (!input || Object.keys(input).some(k => !['x', 'y'].includes(k)) || !Number.isFinite(input.x) || !Number.isFinite(input.y) || input.x < .08 || input.x > .92 || input.y < .38 || input.y > .86) throw new Error('Invalid cage coordinates'); if (paused) throw new Error('Close the settings before playing'); finishPointer(true); game.pickUp(); game.drop(input.x, input.y); flushEvents(); updateUI(); render(0); persist(); return readState(); } },
  ];
  for (const tool of tools) {
    try { void Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional API. */ }
  }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
