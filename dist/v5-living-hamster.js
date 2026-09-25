import { HamsterGame, restoreState, saveSnapshot, ZONES } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const W = 480, H = 270;
const SAVE_KEY = 'hamster-pocket-room-v5-candidate-v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - (1 - clamp(t, 0, 1)) ** 3;
const bell = t => Math.sin(Math.PI * clamp(t, 0, 1));
const nowSec = () => performance.now() / 1000;

let storageOK = true;
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { storageOK = false; return null; } }
const saved = loadSave();
const game = new HamsterGame(restoreState(saved?.engine));
const s = game.s;
const meta = {
  cleanliness: clamp(Number.isFinite(Number(saved?.meta?.cleanliness)) ? Number(saved.meta.cleanliness) : 88, 0, 100),
  photos: Math.max(0, Number(saved?.meta?.photos) || 0),
};

const images = {};
let ready = false, paused = false, lastFrame = 0, lastSave = 0, lastUI = 0;
let pointer = null, seedDrag = null, bubbleUntil = 0, audio;
const particles = [];
const perf = { frames: 0, acc: 0, fps: 60, min: 60 };
const visual = {
  lastMode: s.mode,
  modeStarted: 0,
  idleKind: 'breath',
  idleStarted: 0,
  nextIdleChoice: 3.5,
  reaction: null,
  reactionStarted: 0,
  reactionDirection: 1,
  dropStarted: -99,
  pickupStarted: -99,
  lastGesture: 'none',
  gestureCount: 0,
  lastDirectInteraction: 0,
  wheelEntryStarted: 0,
};
const modeNames = { idle:'晒着太阳发呆', walking:'小短腿认真赶路', carried:'被你稳稳捧着', running:'在木轮里飞奔', eating:'两只小爪抱着吃', sleeping:'蜷成一团呼呼睡', searching:'贴着地面嗅瓜子', crying:'找不到瓜子委屈了', hiding:'刨木屑藏秘密', posing:'软乎乎地摆姿势' };
const idleNames = { breath:'慢慢呼吸', sniff:'四处嗅嗅', groom:'认真洗脸', look:'竖耳张望' };

function loadImage(src) { return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error(`素材加载失败: ${src}`)); im.src = src; }); }
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, engine: saveSnapshot(s), meta }));
    storageOK = true; $('saveStatus').textContent = '已存档'; document.querySelector('.save-pill').classList.add('saved');
  } catch { storageOK = false; $('saveStatus').textContent = '本次未能存档'; document.querySelector('.save-pill').classList.remove('saved'); }
}
function announce(text) { $('eventToast').textContent = text; }
function showBubble(symbol, seconds = 1.8) { $('bubble').textContent = symbol; $('bubble').hidden = false; bubbleUntil = s.time + seconds; }
function puff(x, y, symbol = '·', count = 4) { for (let i=0;i<count;i++) particles.push({ x:x+(Math.random()-.5)*12, y:y+(Math.random()-.5)*5, vx:(Math.random()-.5)*15, vy:-8-Math.random()*10, age:0, life:.55+Math.random()*.4, symbol }); }
function hearts(count = 5) { for (let i=0;i<count;i++) particles.push({ x:s.x*W+(Math.random()-.5)*35, y:s.y*H-52-Math.random()*10, vx:(Math.random()-.5)*13, vy:-12-Math.random()*13, age:0, life:.8+Math.random()*.5, symbol:'♡' }); }
function enableAudio(){ if(!s.sound)return; try{ audio ||= new(window.AudioContext||window.webkitAudioContext)(); void audio.resume().catch(()=>{});}catch{} }
function sound(kind){ if(!s.sound||!audio||audio.state!=='running')return; const notes={eat:[660,820],pet:[620,820,980],run:[400,520],sleep:[560,420],wake:[460,660],stash:[760,610],discovery:[650,870,1050]}[kind]; if(!notes)return; try{notes.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.085;o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.11);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.13);});}catch{} }
function flushEvents(){ for(const e of game.drainEvents()){ announce(e.text); sound(e.type); if(e.type==='eat')showBubble('♪'); if(e.type==='pet'){hearts(4);showBubble('♡');} if(e.type==='discovery')puff(s.x*W,s.y*H-45,'✧',8); } }

function chooseIdle(force=false){
  if(!force && s.time < visual.nextIdleChoice) return;
  let pool;
  if(s.energy < 35) pool=['breath','groom','breath','look'];
  else if(s.hunger < 40) pool=['sniff','sniff','look','groom'];
  else if(s.mood > 78) pool=['look','groom','sniff','breath'];
  else pool=['breath','sniff','groom','look'];
  const next=pool[Math.floor(Math.random()*pool.length)];
  visual.idleKind=next; visual.idleStarted=s.time; visual.nextIdleChoice=s.time+3.6+Math.random()*3.5;
}
function modeTransition(){
  if(s.mode===visual.lastMode)return;
  const prev=visual.lastMode; visual.lastMode=s.mode; visual.modeStarted=s.time;
  if(s.mode==='running')visual.wheelEntryStarted=s.time;
  if(s.mode==='carried')visual.pickupStarted=s.time;
  if(prev==='carried'&&s.mode!=='carried'){ visual.dropStarted=s.time; puff(s.x*W,s.y*H,'·',5); }
  if(s.mode==='idle')chooseIdle(true);
}

function atlasPart(index, x, y, w, h, rot=0, sx=1, sy=1, alpha=1){
  const col=index%4,row=Math.floor(index/4);
  ctx.save(); ctx.globalAlpha*=alpha; ctx.translate(x,y); ctx.rotate(rot); ctx.scale(sx,sy);
  ctx.drawImage(images.rig,col*256,row*256,256,256,-w/2,-h/2,w,h); ctx.restore();
}
function basePose(){
  return {
    rootX:0,rootY:0,rootRot:0,
    body:{x:0,y:-25,w:105,h:98,rot:0,sx:1,sy:1},
    head:{x:12,y:-58,w:94,h:94,rot:0,sx:1,sy:1},
    earL:{x:-21,y:-27,w:40,h:48,rot:-.14,sx:1,sy:1},
    earR:{x:20,y:-29,w:40,h:48,rot:.12,sx:1,sy:1},
    pawL:{x:-19,y:-25,w:43,h:36,rot:-.28,sx:1,sy:1},
    pawR:{x:19,y:-25,w:43,h:36,rot:.28,sx:1,sy:1},
    footL:{x:-24,y:-3,w:48,h:32,rot:-.05,sx:1,sy:1},
    footR:{x:22,y:-3,w:48,h:32,rot:.05,sx:1,sy:1},
    cheekL:{x:-19,y:10,w:37,h:37,rot:0,sx:1,sy:1},
    cheekR:{x:19,y:10,w:37,h:37,rot:0,sx:1,sy:1},
    muzzle:{x:0,y:20,w:43,h:31,rot:0,sx:1,sy:1},
    eyeL:{x:-17,y:-4,w:21,h:26,rot:0,sx:1,sy:1},
    eyeR:{x:17,y:-4,w:21,h:26,rot:0,sx:1,sy:1},
    eyeSY:1, eyeShift:0,
    showSeed:false, seedX:0, seedY:-32,
    shadowSX:1,shadowAlpha:.25,
  };
}
function applyWalk(p){
  const stride=s.motion?.stride ?? s.time*9; const wave=Math.sin(stride), opp=Math.sin(stride+Math.PI), lift=Math.max(0,wave), lift2=Math.max(0,opp);
  p.body.x=wave*2.4; p.body.y=-25-Math.abs(wave)*1.2; p.body.rot=wave*.035; p.body.sx=1+Math.abs(wave)*.025; p.body.sy=1-Math.abs(wave)*.018;
  p.head.x=12-wave*2.9; p.head.y=-58+Math.abs(wave)*.7; p.head.rot=-wave*.055;
  p.pawL.y=-25-lift*6; p.pawL.x=-19+wave*3; p.pawL.rot=-.28-wave*.22;
  p.pawR.y=-25-lift2*6; p.pawR.x=19-wave*3; p.pawR.rot=.28-wave*.22;
  p.footL.y=-3-lift2*7; p.footL.x=-24-wave*2.5; p.footL.rot=-.05-wave*.13;
  p.footR.y=-3-lift*7; p.footR.x=22+wave*2.5; p.footR.rot=.05+wave*.13;
  p.earL.rot=-.14-wave*.11; p.earR.rot=.12-wave*.09; p.cheekL.y=10+wave*.6; p.cheekR.y=10-wave*.6;
}
function applyIdle(p){
  const t=s.time-visual.idleStarted, k=visual.idleKind;
  if(k==='breath'){
    const b=(Math.sin(t*2.25)+1)/2; p.body.sy=1+b*.025; p.body.sx=1-b*.012; p.head.y=-58-b*.7; p.earL.rot=-.14+Math.sin(t*1.6)*.018; p.earR.rot=.12-Math.sin(t*1.55)*.017;
  } else if(k==='sniff'){
    const a=Math.sin(t*5.4); p.head.x=14+a*2.6; p.head.y=-57+Math.abs(a)*1.2; p.head.rot=a*.025; p.muzzle.x=1.2+Math.max(0,a)*1.4; p.eyeShift=a*.8; p.earL.rot=-.09-a*.07; p.earR.rot=.08-a*.05;
  } else if(k==='groom'){
    const a=(Math.sin(t*5)+1)/2; p.pawR.x=10; p.pawR.y=-46-a*5; p.pawR.rot=-.65+a*.3; p.head.rot=-.06; p.head.x=9; p.eyeSY=.55; p.cheekR.sx=1.05;
  } else {
    const a=Math.sin(t*1.9); p.head.x=12+a*5; p.head.rot=a*.09; p.eyeShift=a*1.5; p.earL.rot=-.05-a*.12; p.earR.rot=.02-a*.1;
  }
}
function applyReaction(p){
  if(!visual.reaction)return;
  const age=s.time-visual.reactionStarted; if(age>1.05){visual.reaction=null;return;}
  const q=bell(age/1.05), dir=visual.reactionDirection;
  if(visual.reaction==='nuzzle'){
    p.head.x=12+dir*10*q; p.head.rot=dir*.17*q; p.body.x=dir*3*q; p.cheekL.sx=1+.12*q; p.cheekR.sx=1+.12*q; p.eyeSY=1-.65*q; p.earL.rot-=dir*.12*q; p.earR.rot-=dir*.1*q;
  }else if(visual.reaction==='lift'){
    p.head.y=-58-9*q; p.head.rot=-.07*q; p.body.sy=1+.035*q; p.pawL.y-=4*q;p.pawR.y-=4*q;p.eyeSY=1-.72*q;p.earL.rot-=.08*q;p.earR.rot+=.08*q;
  }else{
    p.body.sy=1-.13*q; p.body.sx=1+.09*q; p.body.y=-21+4*q; p.head.y=-54+4*q; p.head.rot=.04*dir*q; p.eyeSY=1-.55*q; p.pawL.y-=2*q;p.pawR.y-=2*q;
  }
}
function applyCarried(p){
  const age=s.time-visual.pickupStarted; const lift=easeOut(age/.28); const compress=bell(age/.18)*(1-lift*.35);
  p.rootY=-10*lift; p.body.sy=1-.12*compress-.04*lift; p.body.sx=1+.08*compress+.02*lift; p.body.y=-25+3*compress;
  p.head.y=-56+2*lift; p.head.rot=.035*Math.sin(s.time*3.2); p.earL.rot=.02+.08*lift; p.earR.rot=-.02-.08*lift;
  p.pawL.x=-10;p.pawR.x=10;p.pawL.y=-34;p.pawR.y=-34;p.pawL.rot=-.75;p.pawR.rot=.75;
  p.footL.x=-13;p.footR.x=13;p.footL.y=-9;p.footR.y=-9;p.footL.rot=.42;p.footR.rot=-.42;
  p.shadowSX=1-lift*.28;p.shadowAlpha=.25-lift*.12;
}
function applyDrop(p){
  const age=s.time-visual.dropStarted;if(age<0||age>.72)return;
  const impact=bell(age/.28), rebound=age>.22?Math.sin((age-.22)/.5*Math.PI)*.055:0;
  p.body.sy=1-.16*impact+rebound;p.body.sx=1+.11*impact-rebound*.35;p.body.y=-22+4*impact;p.head.y=-54+3*impact-rebound*12;p.head.rot=-.05*impact;
  p.footL.sx=1+.15*impact;p.footR.sx=1+.15*impact;
}
function applyEat(p){
  const t=s.time-visual.modeStarted;
  if(t<.4){const q=smooth(t/.4);p.head.x=12+8*q;p.head.y=-58+3*q;p.head.rot=.11*q;p.eyeShift=1.3*q;}
  else if(t<.85){const q=smooth((t-.4)/.45);p.body.x=3*q;p.head.x=20;p.pawL.x=lerp(-19,-8,q);p.pawR.x=lerp(19,10,q);p.pawL.y=lerp(-25,-40,q);p.pawR.y=lerp(-25,-40,q);p.pawL.rot=-.55;p.pawR.rot=.55;p.showSeed=true;p.seedY=lerp(-18,-46,q);}
  else if(t<2.65){const chew=Math.sin((t-.85)*12);p.showSeed=true;p.seedY=-47;p.pawL.x=-8;p.pawR.x=10;p.pawL.y=-42;p.pawR.y=-42;p.pawL.rot=-.68;p.pawR.rot=.68;p.head.y=-58-Math.abs(chew)*1.2;p.head.rot=chew*.018;p.cheekL.sx=1+Math.max(0,chew)*.18;p.cheekR.sx=1+Math.max(0,-chew)*.18;p.cheekL.sy=1+.07*Math.abs(chew);p.cheekR.sy=1+.07*Math.abs(chew);p.eyeSY=.72;}
  else {const q=bell((t-2.65)/.8);p.eyeSY=1-.7*q;p.body.sy=1+.025*q;p.head.y=-59-q*2;p.pawL.y=-30-q*4;p.pawR.y=-30-q*4;}
}
function applyRun(p){
  const t=s.time-visual.modeStarted; const speed=clamp((s.motion?.wheelSpeed??4)/5,0,1);
  if(t<.45){const q=bell(t/.45);p.body.sy=1-.18*q;p.body.sx=1+.12*q;p.body.y=-20+5*q;p.head.y=-54+4*q;p.pawL.y=-18;p.pawR.y=-18;p.footL.y=-1;p.footR.y=-1;}
  else if(t<1.0){const q=smooth((t-.45)/.55);p.rootY=-7*bell(q);p.body.sy=1+.09*bell(q);p.head.x=18;p.head.rot=.16*q;p.pawL.x=-26;p.pawR.x=26;p.footL.x=-27;p.footR.x=27;}
  else {const phase=s.time*(10+speed*9),a=Math.sin(phase),b=Math.sin(phase+Math.PI);p.body.x=a*1.8;p.body.rot=.11+.025*a;p.body.sx=1+.02*Math.abs(a);p.head.x=18-a*2;p.head.y=-59+Math.abs(a)*1.4;p.head.rot=-.06-.035*a;p.pawL.y=-24-Math.max(0,a)*8;p.pawR.y=-24-Math.max(0,b)*8;p.pawL.x=-19+a*4;p.pawR.x=19-a*4;p.footL.y=-2-Math.max(0,b)*10;p.footR.y=-2-Math.max(0,a)*10;p.footL.x=-24-a*5;p.footR.x=22+a*5;p.earL.rot=-.2-a*.13;p.earR.rot=.04-a*.1;p.cheekL.y=10+a*.8;p.cheekR.y=10-a*.8;}
}
function applySleep(p){const t=s.time-visual.modeStarted,b=(Math.sin(t*1.8)+1)/2;p.body.sx=1.12;p.body.sy=.83+b*.018;p.body.y=-16;p.head.x=25;p.head.y=-39;p.head.rot=.24;p.eyeSY=.12;p.pawL.y=-19;p.pawR.y=-18;p.footL.y=-1;p.footR.y=-1;p.earL.rot=.16;p.earR.rot=.22;p.shadowSX=1.12;}
function applySearchOrHide(p){const a=Math.sin(s.time*7);p.head.y=-51-Math.abs(a)*2;p.head.x=17+a*3;p.head.rot=.16+a*.04;p.body.sy=.94;p.pawL.y=-20-Math.max(0,a)*6;p.pawR.y=-20-Math.max(0,-a)*6;p.muzzle.y=24;}
function computePose(){
  const p=basePose();
  if(s.mode==='walking')applyWalk(p); else if(s.mode==='eating')applyEat(p); else if(s.mode==='running')applyRun(p); else if(s.mode==='carried')applyCarried(p); else if(s.mode==='sleeping')applySleep(p); else if(s.mode==='searching'||s.mode==='hiding')applySearchOrHide(p); else if(s.mode==='idle')applyIdle(p);
  applyReaction(p); applyDrop(p); return p;
}
function drawSeed(x,y){ctx.save();ctx.translate(x,y);ctx.rotate(-.25);ctx.fillStyle='#6c5037';ctx.strokeStyle='#392a20';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-7);ctx.bezierCurveTo(-5,-1,-5,7,0,9);ctx.bezierCurveTo(5,7,5,-1,0,-7);ctx.fill();ctx.stroke();ctx.strokeStyle='#e6c484';ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,6);ctx.stroke();ctx.restore();}
function drawRig(p){
  const px=s.x*W, py=s.y*H;
  ctx.save();ctx.translate(px+p.rootX,py+p.rootY);ctx.scale(s.facing<0?-1:1,1);ctx.rotate(p.rootRot);
  ctx.save();ctx.globalAlpha=p.shadowAlpha;ctx.fillStyle='#4d2b1d';ctx.scale(p.shadowSX,1);ctx.beginPath();ctx.ellipse(0,4,31,6,0,0,Math.PI*2);ctx.fill();ctx.restore();
  atlasPart(2,p.head.x-18,p.head.y-25,p.earL.w,p.earL.h,p.earL.rot,p.earL.sx,p.earL.sy,.92);
  atlasPart(4,p.footL.x,p.footL.y,p.footL.w,p.footL.h,p.footL.rot,p.footL.sx,p.footL.sy);
  atlasPart(4,p.footR.x,p.footR.y,p.footR.w,p.footR.h,p.footR.rot,p.footR.sx,p.footR.sy);
  atlasPart(0,p.body.x,p.body.y,p.body.w,p.body.h,p.body.rot,p.body.sx,p.body.sy);
  atlasPart(3,p.pawL.x,p.pawL.y,p.pawL.w,p.pawL.h,p.pawL.rot,p.pawL.sx,p.pawL.sy);
  ctx.save();ctx.translate(p.head.x,p.head.y);ctx.rotate(p.head.rot);ctx.scale(p.head.sx,p.head.sy);
  atlasPart(2,20,-28,p.earR.w,p.earR.h,p.earR.rot,p.earR.sx,p.earR.sy,.96);
  atlasPart(1,0,0,p.head.w,p.head.h,0,1,1);
  atlasPart(5,p.cheekL.x,p.cheekL.y,p.cheekL.w,p.cheekL.h,p.cheekL.rot,p.cheekL.sx,p.cheekL.sy);
  atlasPart(5,p.cheekR.x,p.cheekR.y,p.cheekR.w,p.cheekR.h,p.cheekR.rot,p.cheekR.sx,p.cheekR.sy);
  atlasPart(7,p.muzzle.x,p.muzzle.y,p.muzzle.w,p.muzzle.h,p.muzzle.rot,p.muzzle.sx,p.muzzle.sy);
  atlasPart(6,p.eyeL.x+p.eyeShift,p.eyeL.y,p.eyeL.w,p.eyeL.h,p.eyeL.rot,p.eyeL.sx,p.eyeSY);
  atlasPart(6,p.eyeR.x+p.eyeShift,p.eyeR.y,p.eyeR.w,p.eyeR.h,p.eyeR.rot,p.eyeR.sx,p.eyeSY);
  ctx.restore();
  atlasPart(3,p.pawR.x,p.pawR.y,p.pawR.w,p.pawR.h,p.pawR.rot,p.pawR.sx,p.pawR.sy);
  if(p.showSeed)drawSeed(p.seedX,p.seedY);
  ctx.restore();
}
function drawStash(){ if(!s.stash)return; const q=seedDrag||s.stash,x=q.x*W,y=q.y*H;ctx.save();ctx.fillStyle='#b2774166';ctx.beginPath();ctx.ellipse(x,y+2,11,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0b9';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('✧',x,y-7);ctx.restore(); }
function drawWheel(){ctx.drawImage(images.wheel,319,119,101,101);if(s.mode==='running'){ctx.save();ctx.translate(ZONES.wheel.x*W,ZONES.wheel.y*H-9);ctx.rotate(s.wheelAngle);ctx.strokeStyle='#ffe3ab88';ctx.lineWidth=1.2;for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(31,0);ctx.stroke();}ctx.restore();}}
function drawSun(){ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(64,16,4,64,16,188);g.addColorStop(0,'#ffe5aa62');g.addColorStop(.5,'#ffc96c22');g.addColorStop(1,'#ffc96c00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();}
function drawParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.age>=p.life){particles.splice(i,1);continue;}ctx.save();ctx.globalAlpha=1-p.age/p.life;ctx.fillStyle=p.symbol==='♡'?'#e77880':'#fff0b4';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(p.symbol,p.x,p.y);ctx.restore();}}
function render(dt){ctx.imageSmoothingEnabled=true;ctx.drawImage(images.bg,0,0,W,H);drawSun();drawStash();drawWheel();drawRig(computePose());drawParticles(dt);ctx.drawImage(images.fg,0,0,W,H);if(s.time<bubbleUntil){$('bubble').hidden=false;$('bubble').style.left=`${s.x*100}%`;$('bubble').style.top=`${(s.y-.18)*100}%`;}else $('bubble').hidden=true;}

function updateUI(){
  $('petName').textContent=s.name;$('roomTitle').textContent=`${s.name}小屋`;$('avatar').textContent=(s.name||'团').slice(0,1);
  const stats={hunger:s.hunger,mood:s.mood,energy:s.energy,clean:meta.cleanliness};for(const [k,v] of Object.entries(stats)){const r=Math.round(v);$(`${k}Bar`).style.width=`${r}%`;$(`${k}Value`).textContent=r;}
  const avg=(s.hunger+s.mood+s.energy+meta.cleanliness)/4;$('moodText').textContent=s.mode==='idle'?idleNames[visual.idleKind]:(modeNames[s.mode]||'认真生活中');
  $('sleepLabel').textContent=s.mode==='sleeping'||s.forcedSleep?'叫醒它':'睡觉';$('shapeLabel').textContent=s.pose==='pancake'?'团成球':'变鼠饼';$('soundButton').setAttribute('aria-pressed',String(s.sound));$('soundLabel').textContent=s.sound?'声音开':'声音关';
  $('feedCount').textContent=Math.round(s.totalFeeds);$('petCount').textContent=Math.round(s.totalPets);$('runCount').textContent=Math.round(s.totalRuns);$('discoveryCount').textContent=s.discoveries.length;$('photoCount').textContent=meta.photos;
  const n=new Date();$('clock').textContent=new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(n);$('weatherLabel').textContent=n.getHours()>=18||n.getHours()<6?'☾ 夜':'☀ 晴';
}
function triggerReaction(kind,dir=1,text){visual.reaction=kind;visual.reactionStarted=s.time;visual.reactionDirection=dir;visual.lastGesture=kind;visual.gestureCount++;visual.lastDirectInteraction=s.time;if(text)announce(text);hearts(kind==='melt'?3:5);}
function doAction(action){
  if(!ready||paused)return false;enableAudio();if(pointer)finishPointer(true);
  if(action==='pet'){game.act('pet');triggerReaction('nuzzle',Math.random()<.5?-1:1,`${s.name}主动把脸颊蹭了过来。`);}
  else game.act(action);
  flushEvents();updateUI();persist();return true;
}
function moveTo(point){if(s.mode==='carried')return;game.wake();s.motion.pendingWheel=false;s.motion.wheelStopping=false;s.mode='walking';game.setPose('idle');s.target={x:clamp(point.x,.1,.9),y:clamp(point.y,.47,.85)};announce(`${s.name}压低身子，迈着小短腿走过去。`);}
function normalized(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
function hitHamster(p){return Math.abs(p.x-s.x)<.09&&p.y>s.y-.22&&p.y<s.y+.035;}
function beginPickup(point){game.pickUp();visual.pickupStarted=s.time;pointer.kind='carry';pointer.offsetX=s.x-point.x;pointer.offsetY=s.y-point.y;announce('先软软压低一下，再被你捧起来。');flushEvents();}
function petStroke(dx,dy,dt){const speed=Math.hypot(dx,dy)/Math.max(.016,dt);let kind,dir=dx<0?-1:1;if(Math.abs(dx)>Math.abs(dy)*1.15){kind='nuzzle';announce(speed>.5?`${s.name}追着你的手快速蹭脸。`:`${s.name}顺着你的手慢慢蹭过来。`);}else if(dy<0&&speed>.25){kind='lift';announce(`${s.name}顺着手势抬起下巴，耳朵也竖起来。`);}else{kind='melt';announce(`${s.name}被摸得压低身体，舒服得眯起眼。`);}game.act('pet');triggerReaction(kind,dir);flushEvents();persist();updateUI();}

canvas.addEventListener('pointerdown',e=>{
  if(!ready||paused||pointer||(e.pointerType==='mouse'&&e.button!==0))return;const p=normalized(e);enableAudio();
  if(hitHamster(p)){pointer={id:e.pointerId,kind:'touch',start:p,last:p,startAt:nowSec(),lastAt:nowSec(),moved:0,petDone:false,offsetX:0,offsetY:0};canvas.setPointerCapture(e.pointerId);e.preventDefault();return;}
  if(s.stash&&Math.hypot((p.x-s.stash.x)*1.5,p.y-s.stash.y)<.06){game.revealStash();seedDrag={...s.stash};pointer={id:e.pointerId,kind:'seed',start:p,last:p,startAt:nowSec(),lastAt:nowSec(),moved:0};canvas.setPointerCapture(e.pointerId);flushEvents();e.preventDefault();return;}
  if(Math.hypot(p.x-ZONES.wheel.x,p.y-(ZONES.wheel.y-.08))<.16)doAction('wheel');else if(Math.hypot(p.x-ZONES.house.x,p.y-ZONES.house.y)<.11)doAction('sleep');else if(Math.hypot(p.x-ZONES.bowl.x,p.y-ZONES.bowl.y)<.09)doAction('feed');else moveTo(p);
});
canvas.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;const p=normalized(e),t=nowSec(),dx=p.x-pointer.last.x,dy=p.y-pointer.last.y,dt=t-pointer.lastAt;pointer.moved+=Math.hypot(dx,dy);pointer.last=p;pointer.lastAt=t;
  if(pointer.kind==='touch'){
    const age=t-pointer.startAt,total=Math.hypot(p.x-pointer.start.x,p.y-pointer.start.y);
    if(age>.32&&total>.012){beginPickup(p);}
    else if(total>.018&&!pointer.petDone){pointer.petDone=true;pointer.kind='pet';petStroke(p.x-pointer.start.x,p.y-pointer.start.y,age);}
  }else if(pointer.kind==='carry'){game.move(p.x+pointer.offsetX,p.y+pointer.offsetY);}
  else if(pointer.kind==='seed'&&seedDrag){seedDrag.x=clamp(p.x,.12,.9);seedDrag.y=clamp(p.y,.61,.85);}
  canvas.classList.toggle('dragging',pointer.kind==='carry');e.preventDefault();
});
function finishPointer(cancelled=false){
  if(!pointer)return;const q=pointer;
  if(q.kind==='touch'&&!cancelled){game.act('pet');triggerReaction('melt',1,`${s.name}把肚皮压低一点，等你继续摸。`);flushEvents();}
  else if(q.kind==='carry'){game.drop(s.x,s.y);visual.dropStarted=s.time;announce('后脚先碰地，身体软软压下去再弹回来。');flushEvents();}
  else if(q.kind==='seed'&&seedDrag){game.moveStash(seedDrag.x,seedDrag.y);seedDrag=null;flushEvents();}
  pointer=null;canvas.classList.remove('dragging');try{if(canvas.hasPointerCapture(q.id))canvas.releasePointerCapture(q.id);}catch{}updateUI();persist();
}
canvas.addEventListener('pointerup',e=>{if(pointer?.id===e.pointerId)finishPointer();});canvas.addEventListener('pointercancel',e=>{if(pointer?.id===e.pointerId)finishPointer(true);});canvas.addEventListener('lostpointercapture',()=>{if(pointer)finishPointer(true);});canvas.addEventListener('contextmenu',e=>e.preventDefault());

document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>doAction(b.dataset.action)));
$('cleanButton').addEventListener('click',()=>{if(!ready)return;meta.cleanliness=100;puff(s.x*W,s.y*H-35,'✧',10);announce('换上松软干净的木屑，团团先闻了闻。');persist();updateUI();});
$('photoButton').addEventListener('click',()=>{if(!ready)return;meta.photos++;$('photoFlash').classList.remove('active');void $('photoFlash').offsetWidth;$('photoFlash').classList.add('active');visual.reaction='lift';visual.reactionStarted=s.time;announce(`${s.name}听见咔嚓声，抬起头看镜头。`);persist();updateUI();});
$('soundButton').addEventListener('click',()=>{s.sound=!s.sound;enableAudio();sound('pet');persist();updateUI();announce(s.sound?'小屋的声音打开啦。':'安静模式，只听见小爪子的声音。');});
document.addEventListener('keydown',e=>{if(!ready||paused||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;const a={'1':'feed','2':'pet','3':'wheel','4':'sleep','5':'shape','6':'stash'};if(a[e.key]){e.preventDefault();doAction(a[e.key]);}});
const dialog=$('settingsDialog');$('settingsButton').addEventListener('click',()=>{if(!ready)return;if(pointer)finishPointer(true);paused=true;$('nameInput').value=s.name;$('sleepStart').value=s.sleepStart;$('sleepEnd').value=s.sleepEnd;dialog.showModal();});document.querySelector('[data-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{paused=false;lastFrame=0;});$('settingsForm').addEventListener('submit',e=>{e.preventDefault();s.name=$('nameInput').value.replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,12)||'团团';s.sleepStart=$('sleepStart').value;s.sleepEnd=$('sleepEnd').value;persist();updateUI();dialog.close();announce(`${s.name}记住新作息了。`);});

function frame(now){
  const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;if(dt>0){perf.frames++;perf.acc+=dt;if(perf.acc>=1){perf.fps=perf.frames/perf.acc;perf.min=Math.min(perf.min,perf.fps);perf.frames=0;perf.acc=0;}}
  if(ready&&!paused&&!document.hidden){game.update(dt);modeTransition();if(s.mode==='idle')chooseIdle();meta.cleanliness=clamp(meta.cleanliness-dt*.003,0,100);flushEvents();render(dt);if(s.time-lastUI>.2){updateUI();lastUI=s.time;}if(s.time-lastSave>5){persist();lastSave=s.time;}}
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{lastFrame=0;if(document.hidden){if(pointer)finishPointer(true);persist();}});window.addEventListener('pagehide',persist);
window.__v5Debug={snapshot:()=>({mode:s.mode,idle:visual.idleKind,idleVariants:['breath','sniff','groom','look'],lastGesture:visual.lastGesture,gestureCount:visual.gestureCount,fps:Number(perf.fps.toFixed(1)),minFps:Number(perf.min.toFixed(1)),hasRig:!!images.rig,parts:8,name:s.name,feed:s.totalFeeds,pet:s.totalPets,run:s.totalRuns,save:storageOK,x:s.x,y:s.y}),setIdle:kind=>{if(['breath','sniff','groom','look'].includes(kind)){visual.idleKind=kind;visual.idleStarted=s.time;visual.nextIdleChoice=s.time+10;return true;}return false;}};

try{
  [images.bg,images.fg,images.wheel,images.rig]=await Promise.all(['v4-assets/v4-room-bg.webp','v4-assets/v4-room-fg.webp','v4-assets/v4-wheel-wood.webp','v5-assets/hamster-rig-parts.webp'].map(loadImage));
  ready=true;$('loadScreen').hidden=true;s.awakeUntil=Math.max(s.awakeUntil,s.time+12);chooseIdle(true);game.update(0);modeTransition();flushEvents();updateUI();render(0);persist();announce(`V5：${s.name}现在由 8 组独立身体部件驱动。直接在它身上滑动试试。`);requestAnimationFrame(frame);
}catch(error){$('loadScreen').innerHTML='<strong>V5 角色素材加载失败</strong><span>请刷新页面再试一次。</span>';console.error(error);}
