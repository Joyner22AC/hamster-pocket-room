import { HamsterGame, restoreState, saveSnapshot, ZONES } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const W = 480, H = 270;
const SAVE_KEY = 'hamster-pocket-room-v6-candidate-v1';
const CELL = 256, COLS = 5;
const FRAME = Object.freeze({
  idle:0,sniff:1,groom:2,look:3,
  walkA:4,walkMid:5,walkB:6,settle:7,
  eatLook:8,eatHold:9,eatChew:10,eatHappy:11,
  pickupSquash:12,pickupHold:13,dropImpact:14,
  runCrouch:15,runA:16,runB:17,sleep:18,petNuzzle:19,
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const nowSec=()=>performance.now()/1000;

let storageOK=true;
function readSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch{storageOK=false;return null}}
const saved=readSave();
const game=new HamsterGame(restoreState(saved?.engine));
const s=game.s;
const meta={cleanliness:clamp(Number(saved?.meta?.cleanliness??90),0,100),photos:Math.max(0,Number(saved?.meta?.photos)||0)};
const images={};
const particles=[];
const visual={
  lastMode:s.mode, modeStarted:s.time, previousMode:s.mode,
  idleKind:'idle', idleStarted:s.time, nextIdleChoice:s.time+3,
  reaction:null,reactionStarted:-99,reactionDirection:1,lastGesture:'none',gestureCount:0,
  pickupStarted:-99,dropStarted:-99,settleStarted:-99,
};
const perf={frames:0,acc:0,fps:60,min:60};
let ready=false,paused=false,lastFrame=0,lastSave=0,lastUI=0,pointer=null,seedDrag=null,bubbleUntil=0,audio;
const modeNames={idle:'安静地待着',walking:'小短腿认真赶路',carried:'被你捧在手里',running:'在木轮里飞奔',eating:'抱着食物咔嚓咔嚓',sleeping:'蜷着身子呼呼睡',searching:'贴着地面闻味道',crying:'委屈巴巴地找东西',hiding:'刨木屑藏秘密',posing:'软乎乎地回应你'};
const idleNames={idle:'慢慢呼吸',sniff:'鼻子一抽一抽',groom:'认真洗脸',look:'竖耳张望'};

function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`素材加载失败: ${src}`));i.src=src;});}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,engine:saveSnapshot(s),meta}));storageOK=true;$('saveStatus').textContent='已存档';document.querySelector('.save-pill').classList.add('saved');}catch{storageOK=false;$('saveStatus').textContent='本次未能存档';document.querySelector('.save-pill').classList.remove('saved');}}
function announce(t){$('eventToast').textContent=t;}
function showBubble(symbol,seconds=1.6){$('bubble').textContent=symbol;$('bubble').hidden=false;bubbleUntil=s.time+seconds;}
function puff(x,y,symbol='·',count=5){for(let i=0;i<count;i++)particles.push({x:x+(Math.random()-.5)*12,y:y+(Math.random()-.5)*7,vx:(Math.random()-.5)*15,vy:-9-Math.random()*10,age:0,life:.55+Math.random()*.45,symbol});}
function hearts(count=5){for(let i=0;i<count;i++)particles.push({x:s.x*W+(Math.random()-.5)*32,y:s.y*H-48-Math.random()*9,vx:(Math.random()-.5)*12,vy:-12-Math.random()*12,age:0,life:.8+Math.random()*.5,symbol:'♡'});}
function enableAudio(){if(!s.sound)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();void audio.resume().catch(()=>{});}catch{}}
function sound(kind){if(!s.sound||!audio||audio.state!=='running')return;const notes={eat:[660,820],pet:[620,820,980],run:[400,520],sleep:[560,420],wake:[460,660],stash:[760,610],discovery:[650,870,1050]}[kind];if(!notes)return;try{notes.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.085;o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.11);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.13);});}catch{}}
function flushEvents(){for(const e of game.drainEvents()){announce(e.text);sound(e.type);if(e.type==='eat')showBubble('♪');if(e.type==='pet'){hearts(4);showBubble('♡');}if(e.type==='discovery')puff(s.x*W,s.y*H-44,'✧',8);}}

function chooseIdle(force=false){if(!force&&s.time<visual.nextIdleChoice)return;let pool;if(s.energy<35)pool=['idle','groom','idle','look'];else if(s.hunger<40)pool=['sniff','sniff','look','groom'];else if(s.mood>78)pool=['look','groom','sniff','idle'];else pool=['idle','sniff','groom','look'];visual.idleKind=pool[Math.floor(Math.random()*pool.length)];visual.idleStarted=s.time;visual.nextIdleChoice=s.time+3.8+Math.random()*3.8;}
function modeTransition(){if(s.mode===visual.lastMode)return;const prev=visual.lastMode;visual.previousMode=prev;visual.lastMode=s.mode;visual.modeStarted=s.time;if(s.mode==='carried')visual.pickupStarted=s.time;if(prev==='carried'&&s.mode!=='carried'){visual.dropStarted=s.time;puff(s.x*W,s.y*H,'·',5);}if(prev==='walking'&&s.mode==='idle')visual.settleStarted=s.time;if(s.mode==='idle')chooseIdle(true);}

function frameRect(index){return{sx:(index%COLS)*CELL,sy:Math.floor(index/COLS)*CELL};}
function drawFrame(index,x,y,size,alpha=1,flip=s.facing<0){const r=frameRect(index);ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.drawImage(images.hamster,r.sx,r.sy,CELL,CELL,-size/2,-size*.78,size,size);ctx.restore();}
function blendFrames(a,b,mix,x,y,size){mix=clamp(mix,0,1);drawFrame(a,x,y,size,1-mix);drawFrame(b,x,y,size,mix);}
function idleFrame(){return FRAME[visual.idleKind] ?? FRAME.idle;}
function drawHamster(){
  const x=s.x*W,y=s.y*H,size=142;
  const reactionAge=s.time-visual.reactionStarted;
  const dropAge=s.time-visual.dropStarted;
  const settleAge=s.time-visual.settleStarted;
  if(visual.reaction&&reactionAge<.95){const q=smooth(reactionAge/.2)*smooth((.95-reactionAge)/.28);blendFrames(idleFrame(),FRAME.petNuzzle,q,x,y,size);return;}else if(visual.reaction&&reactionAge>=.95)visual.reaction=null;
  if(dropAge>=0&&dropAge<.62){if(dropAge<.22)blendFrames(FRAME.pickupHold,FRAME.dropImpact,smooth(dropAge/.22),x,y,size);else blendFrames(FRAME.dropImpact,FRAME.settle,smooth((dropAge-.22)/.40),x,y,size);return;}
  if(s.mode==='walking'){
    const p=((s.motion?.stride??s.time*7.5)%(Math.PI*2))/(Math.PI*2)*4;const seq=[FRAME.walkA,FRAME.walkMid,FRAME.walkB,FRAME.walkMid,FRAME.walkA];const i=Math.floor(p),m=p-i;blendFrames(seq[i],seq[i+1],smooth(m),x,y,size);return;
  }
  if(s.mode==='eating'){
    const t=s.time-visual.modeStarted;if(t<.38)blendFrames(FRAME.idle,FRAME.eatLook,smooth(t/.38),x,y,size);else if(t<.82)blendFrames(FRAME.eatLook,FRAME.eatHold,smooth((t-.38)/.44),x,y,size);else if(t<2.45){const q=((t-.82)*5)%2;blendFrames(FRAME.eatHold,FRAME.eatChew,q<1?smooth(q):smooth(2-q),x,y,size);}else blendFrames(FRAME.eatChew,FRAME.eatHappy,smooth((t-2.45)/.55),x,y,size);return;
  }
  if(s.mode==='carried'){
    const age=s.time-visual.pickupStarted;if(age<.22)blendFrames(idleFrame(),FRAME.pickupSquash,smooth(age/.22),x,y,size);else if(age<.5)blendFrames(FRAME.pickupSquash,FRAME.pickupHold,smooth((age-.22)/.28),x,y-4,size);else drawFrame(FRAME.pickupHold,x,y-7,size);return;
  }
  if(s.mode==='running'){
    const t=s.time-visual.modeStarted;if(t<.45){blendFrames(FRAME.idle,FRAME.runCrouch,smooth(t/.45),x,y,size);return;}const phase=((t-.45)*(5+clamp((s.motion?.wheelSpeed??3),0,5)))%2;blendFrames(FRAME.runA,FRAME.runB,phase<1?smooth(phase):smooth(2-phase),x,y,size);return;
  }
  if(s.mode==='sleeping'){drawFrame(FRAME.sleep,x,y+3,size);return;}
  if(s.mode==='searching'||s.mode==='hiding'){const m=(Math.sin(s.time*6)+1)/2;blendFrames(FRAME.sniff,FRAME.walkMid,m,x,y,size);return;}
  if(s.mode==='crying'){blendFrames(FRAME.look,FRAME.petNuzzle,.28,x,y,size);return;}
  if(settleAge>=0&&settleAge<.42){blendFrames(FRAME.settle,idleFrame(),smooth(settleAge/.42),x,y,size);return;}
  if(s.mode==='posing'){drawFrame(FRAME.petNuzzle,x,y,size);return;}
  drawFrame(idleFrame(),x,y,size);
}

function drawStash(){if(!s.stash)return;const q=seedDrag||s.stash,x=q.x*W,y=q.y*H;ctx.save();ctx.fillStyle='#b2774166';ctx.beginPath();ctx.ellipse(x,y+2,11,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0b9';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('✧',x,y-7);ctx.restore();}
function drawWheel(){ctx.drawImage(images.wheel,319,119,101,101);if(s.mode==='running'){ctx.save();ctx.translate(ZONES.wheel.x*W,ZONES.wheel.y*H-9);ctx.rotate(s.wheelAngle);ctx.strokeStyle='#ffe3ab88';ctx.lineWidth=1.2;for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(31,0);ctx.stroke();}ctx.restore();}}
function drawSun(){ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(64,16,4,64,16,188);g.addColorStop(0,'#ffe5aa62');g.addColorStop(.5,'#ffc96c22');g.addColorStop(1,'#ffc96c00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();}
function drawParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.age>=p.life){particles.splice(i,1);continue;}ctx.save();ctx.globalAlpha=1-p.age/p.life;ctx.fillStyle=p.symbol==='♡'?'#e77880':'#fff0b4';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(p.symbol,p.x,p.y);ctx.restore();}}
function render(dt){ctx.imageSmoothingEnabled=true;ctx.drawImage(images.bg,0,0,W,H);drawSun();drawStash();drawWheel();drawHamster();drawParticles(dt);ctx.drawImage(images.fg,0,0,W,H);if(s.time<bubbleUntil){$('bubble').hidden=false;$('bubble').style.left=`${s.x*100}%`;$('bubble').style.top=`${(s.y-.19)*100}%`;}else $('bubble').hidden=true;}

function updateUI(){
  $('petName').textContent=s.name;$('roomTitle').textContent=`${s.name}小屋`;$('avatar').textContent=(s.name||'团').slice(0,1);
  const stats={hunger:s.hunger,mood:s.mood,energy:s.energy,clean:meta.cleanliness};for(const[k,v]of Object.entries(stats)){const r=Math.round(v);$(`${k}Bar`).style.width=`${r}%`;$(`${k}Value`).textContent=r;}
  $('moodText').textContent=s.mode==='idle'?idleNames[visual.idleKind]:(modeNames[s.mode]||'认真生活中');$('sleepLabel').textContent=s.mode==='sleeping'||s.forcedSleep?'叫醒它':'睡觉';$('shapeLabel').textContent=s.pose==='pancake'?'团成球':'变鼠饼';$('soundButton').setAttribute('aria-pressed',String(s.sound));$('soundLabel').textContent=s.sound?'声音开':'声音关';
  $('feedCount').textContent=Math.round(s.totalFeeds);$('petCount').textContent=Math.round(s.totalPets);$('runCount').textContent=Math.round(s.totalRuns);$('discoveryCount').textContent=s.discoveries.length;$('photoCount').textContent=meta.photos;
  const n=new Date();$('clock').textContent=new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(n);$('weatherLabel').textContent=n.getHours()>=18||n.getHours()<6?'☾ 夜':'☀ 晴';
}
function reaction(kind,dir=1,text=''){visual.reaction=kind;visual.reactionStarted=s.time;visual.reactionDirection=dir;visual.lastGesture=kind;visual.gestureCount++;if(text)announce(text);hearts(kind==='melt'?3:5);}
function doAction(action){if(!ready||paused)return false;enableAudio();if(pointer)finishPointer(true);if(action==='pet'){game.act('pet');reaction('nuzzle',Math.random()<.5?-1:1,`${s.name}把胡须蹭到你手边。`);}else game.act(action);flushEvents();updateUI();persist();return true;}
function moveTo(p){if(s.mode==='carried')return;game.wake();s.motion.pendingWheel=false;s.motion.wheelStopping=false;s.mode='walking';game.setPose('idle');s.target={x:clamp(p.x,.1,.9),y:clamp(p.y,.47,.85)};announce(`${s.name}迈着短短的小腿跑过去。`);}
function normalized(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
function hitHamster(p){return Math.abs(p.x-s.x)<.095&&p.y>s.y-.235&&p.y<s.y+.035;}
function beginPickup(p){game.pickUp();visual.pickupStarted=s.time;pointer.kind='carry';pointer.offsetX=s.x-p.x;pointer.offsetY=s.y-p.y;announce('团团先压低身体，再把四只小爪收起来。');flushEvents();}
function petStroke(dx,dy,dt){const speed=Math.hypot(dx,dy)/Math.max(.016,dt),dir=dx<0?-1:1;let kind;if(Math.abs(dx)>Math.abs(dy)*1.1){kind='nuzzle';announce(speed>.5?`${s.name}追着你的手蹭过去，胡须都抖起来了。`:`${s.name}慢慢把脸侧过去蹭你的手。`);}else if(dy<0&&speed>.25){kind='lift';announce(`${s.name}顺着手势抬起鼻尖，耳朵也跟着立起来。`);}else{kind='melt';announce(`${s.name}把身体压低一点，舒服得眯起眼。`);}game.act('pet');reaction(kind,dir);flushEvents();persist();updateUI();}

canvas.addEventListener('pointerdown',e=>{if(!ready||paused||pointer||(e.pointerType==='mouse'&&e.button!==0))return;const p=normalized(e);enableAudio();if(hitHamster(p)){pointer={id:e.pointerId,kind:'touch',start:p,last:p,startAt:nowSec(),lastAt:nowSec(),moved:0,petDone:false,offsetX:0,offsetY:0};canvas.setPointerCapture(e.pointerId);e.preventDefault();return;}if(s.stash&&Math.hypot((p.x-s.stash.x)*1.5,p.y-s.stash.y)<.06){game.revealStash();seedDrag={...s.stash};pointer={id:e.pointerId,kind:'seed',start:p,last:p,startAt:nowSec(),lastAt:nowSec(),moved:0};canvas.setPointerCapture(e.pointerId);flushEvents();e.preventDefault();return;}if(Math.hypot(p.x-ZONES.wheel.x,p.y-(ZONES.wheel.y-.08))<.16)doAction('wheel');else if(Math.hypot(p.x-ZONES.house.x,p.y-ZONES.house.y)<.11)doAction('sleep');else if(Math.hypot(p.x-ZONES.bowl.x,p.y-ZONES.bowl.y)<.09)doAction('feed');else moveTo(p);});
canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=normalized(e),t=nowSec(),dx=p.x-pointer.last.x,dy=p.y-pointer.last.y,dt=t-pointer.lastAt;pointer.moved+=Math.hypot(dx,dy);pointer.last=p;pointer.lastAt=t;if(pointer.kind==='touch'){const age=t-pointer.startAt,total=Math.hypot(p.x-pointer.start.x,p.y-pointer.start.y);if(age>.32&&total>.012)beginPickup(p);else if(total>.018&&!pointer.petDone){pointer.petDone=true;pointer.kind='pet';petStroke(p.x-pointer.start.x,p.y-pointer.start.y,age);}}else if(pointer.kind==='carry')game.move(p.x+pointer.offsetX,p.y+pointer.offsetY);else if(pointer.kind==='seed'&&seedDrag){seedDrag.x=clamp(p.x,.12,.9);seedDrag.y=clamp(p.y,.61,.85);}canvas.classList.toggle('dragging',pointer.kind==='carry');e.preventDefault();});
function finishPointer(cancelled=false){if(!pointer)return;const q=pointer;if(q.kind==='touch'&&!cancelled){game.act('pet');reaction('melt',1,`${s.name}低下头等你继续摸。`);flushEvents();}else if(q.kind==='carry'){game.drop(s.x,s.y);visual.dropStarted=s.time;announce('小脚先碰地，圆滚滚的身体压一下再站稳。');flushEvents();}else if(q.kind==='seed'&&seedDrag){game.moveStash(seedDrag.x,seedDrag.y);seedDrag=null;flushEvents();}pointer=null;canvas.classList.remove('dragging');try{if(canvas.hasPointerCapture(q.id))canvas.releasePointerCapture(q.id);}catch{}updateUI();persist();}
canvas.addEventListener('pointerup',e=>{if(pointer?.id===e.pointerId)finishPointer();});canvas.addEventListener('pointercancel',e=>{if(pointer?.id===e.pointerId)finishPointer(true);});canvas.addEventListener('lostpointercapture',()=>{if(pointer)finishPointer(true);});canvas.addEventListener('contextmenu',e=>e.preventDefault());

document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>doAction(b.dataset.action)));
$('cleanButton').addEventListener('click',()=>{if(!ready)return;meta.cleanliness=100;puff(s.x*W,s.y*H-34,'✧',10);announce('换好干净木屑，团团低头闻了闻。');persist();updateUI();});
$('photoButton').addEventListener('click',()=>{if(!ready)return;meta.photos++;$('photoFlash').classList.remove('active');void $('photoFlash').offsetWidth;$('photoFlash').classList.add('active');reaction('lift',1);announce(`${s.name}听到咔嚓声，抬起鼻尖看你。`);persist();updateUI();});
$('soundButton').addEventListener('click',()=>{s.sound=!s.sound;enableAudio();sound('pet');persist();updateUI();announce(s.sound?'小屋的声音打开啦。':'安静模式开启。');});
document.addEventListener('keydown',e=>{if(!ready||paused||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;const a={'1':'feed','2':'pet','3':'wheel','4':'sleep','5':'shape','6':'stash'};if(a[e.key]){e.preventDefault();doAction(a[e.key]);}});
const dialog=$('settingsDialog');$('settingsButton').addEventListener('click',()=>{if(!ready)return;if(pointer)finishPointer(true);paused=true;$('nameInput').value=s.name;$('sleepStart').value=s.sleepStart;$('sleepEnd').value=s.sleepEnd;dialog.showModal();});document.querySelector('[data-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{paused=false;lastFrame=0;});$('settingsForm').addEventListener('submit',e=>{e.preventDefault();s.name=$('nameInput').value.replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,12)||'团团';s.sleepStart=$('sleepStart').value;s.sleepEnd=$('sleepEnd').value;persist();updateUI();dialog.close();announce(`${s.name}记住新作息了。`);});

function frame(now){const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;if(dt>0){perf.frames++;perf.acc+=dt;if(perf.acc>=1){perf.fps=perf.frames/perf.acc;perf.min=Math.min(perf.min,perf.fps);perf.frames=0;perf.acc=0;}}if(ready&&!paused&&!document.hidden){game.update(dt);modeTransition();if(s.mode==='idle')chooseIdle();meta.cleanliness=clamp(meta.cleanliness-dt*.003,0,100);flushEvents();render(dt);if(s.time-lastUI>.2){updateUI();lastUI=s.time;}if(s.time-lastSave>5){persist();lastSave=s.time;}}requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{lastFrame=0;if(document.hidden){if(pointer)finishPointer(true);persist();}});window.addEventListener('pagehide',persist);
window.__v6Debug={snapshot:()=>({mode:s.mode,idle:visual.idleKind,idleVariants:['idle','sniff','groom','look'],lastGesture:visual.lastGesture,gestureCount:visual.gestureCount,fps:Number(perf.fps.toFixed(1)),minFps:Number(perf.min.toFixed(1)),frames:20,name:s.name,feed:s.totalFeeds,pet:s.totalPets,run:s.totalRuns,save:storageOK,x:s.x,y:s.y}),setIdle:k=>{if(['idle','sniff','groom','look'].includes(k)){visual.idleKind=k;visual.idleStarted=s.time;visual.nextIdleChoice=s.time+10;return true;}return false;}};

try{[images.bg,images.fg,images.wheel,images.hamster]=await Promise.all(['v4-assets/v4-room-bg.webp','v4-assets/v4-room-fg.webp','v4-assets/v4-wheel-wood.webp','v6-assets/hamster-v6-frames.webp'].map(loadImage));ready=true;$('loadScreen').hidden=true;s.awakeUntil=Math.max(s.awakeUntil,s.time+12);chooseIdle(true);game.update(0);modeTransition();flushEvents();updateUI();render(0);persist();announce(`V6：${s.name}现在用完整角色关键帧表演，不再把脸和身体拆成零件拼接。`);requestAnimationFrame(frame);}catch(error){$('loadScreen').innerHTML='<strong>V6 角色素材加载失败</strong><span>请刷新页面再试一次。</span>';console.error(error);}
