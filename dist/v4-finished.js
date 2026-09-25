import { HamsterGame, restoreState, saveSnapshot, POSES, ZONES } from './engine.js';

const $=id=>document.getElementById(id);
const canvas=$('scene');
const ctx=canvas.getContext('2d',{alpha:false});
const W=480,H=270;
const SAVE_KEY='hamster-pocket-room-v4-candidate-v1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

let storageOK=true;
function loadCandidate(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}
  catch{storageOK=false;return null;}
}
const saved=loadCandidate();
const game=new HamsterGame(restoreState(saved?.engine));
const s=game.s;
const savedCleanliness=Number(saved?.meta?.cleanliness),savedPhotos=Number(saved?.meta?.photos);
const meta={cleanliness:clamp(Number.isFinite(savedCleanliness)?savedCleanliness:86,0,100),photos:Math.max(0,Number.isFinite(savedPhotos)?savedPhotos:0)};

const images={};
const tiles=[];
const particles=[];
let ready=false,paused=false,lastFrame=0,lastSave=0,lastUI=0;
let pointer=null,seedDrag=null,bubbleUntil=0,audio;

const assetPaths={bg:'v4-assets/v4-room-bg.webp',fg:'v4-assets/v4-room-fg.webp',wheel:'v4-assets/v4-wheel-wood.webp',atlas:'assets/hamster-atlas.webp'};
const modeNames={idle:'正在晒太阳',walking:'哒哒逛小屋',carried:'在你手心里',running:'小短腿开跑',eating:'咔嚓咔嚓',sleeping:'呼呼睡着了',searching:'找我的小瓜子',crying:'委屈巴巴',hiding:'偷偷藏瓜子',posing:'软乎乎摆姿势'};

function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`素材加载失败: ${src}`));image.src=src;});}
function prepareTiles(image){
  const cellW=image.width/4,cellH=image.height/2;
  for(let index=0;index<8;index++){
    const tile=document.createElement('canvas');tile.width=cellW;tile.height=cellH;
    const tileCtx=tile.getContext('2d',{willReadFrequently:true});
    tileCtx.drawImage(image,(index%4)*cellW,Math.floor(index/4)*cellH,cellW,cellH,0,0,cellW,cellH);
    const pixels=tileCtx.getImageData(0,0,cellW,cellH);let left=cellW,top=cellH,right=0,bottom=0;
    for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++){
      const p=(y*cellW+x)*4;
      if(pixels.data[p+3]<246)pixels.data[p+3]=0;
      else{left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    }
    tileCtx.putImageData(pixels,0,0);
    const crop=document.createElement('canvas');crop.width=Math.max(1,right-left+1);crop.height=Math.max(1,bottom-top+1);
    crop.getContext('2d').drawImage(tile,left,top,crop.width,crop.height,0,0,crop.width,crop.height);
    tiles.push(crop);
  }
}

function persist(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,engine:saveSnapshot(s),meta}));
    storageOK=true;$('saveStatus').textContent='已存档';document.querySelector('.save-pill').classList.add('saved');
  }catch{storageOK=false;$('saveStatus').textContent='本次未能存档';document.querySelector('.save-pill').classList.remove('saved');}
}
function announce(text){$('eventToast').textContent=text;}
function showBubble(symbol,seconds=2.2){$('bubble').textContent=symbol;$('bubble').hidden=false;bubbleUntil=s.time+seconds;}
function sparkles(symbol='✦',count=8){for(let i=0;i<count;i++)particles.push({x:s.x*W+(Math.random()-.5)*58,y:s.y*H-32-Math.random()*14,vx:(Math.random()-.5)*18,vy:-13-Math.random()*18,age:0,life:.9+Math.random()*.55,symbol});}

function enableAudio(){if(!s.sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();void audio.resume().catch(()=>{});}catch{/* optional */}}
function sound(kind){
  if(!s.sound||!audio||audio.state!=='running')return;
  const notes={eat:[700,900],pet:[660,880,990],run:[440,550],cry:[520,390,330],wake:[450,650],sleep:[600,450],stash:[800,600],discovery:[660,880,1100]}[kind];
  if(!notes)return;
  try{notes.forEach((frequency,index)=>{const oscillator=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime+index*.1;oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,time);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.03,time+.015);gain.gain.exponentialRampToValueAtTime(.001,time+.12);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(time);oscillator.stop(time+.14);});}catch{/* continue */}
}
function flushEvents(){
  for(const event of game.drainEvents()){
    announce(event.text);sound(event.type);
    if(event.type==='pet'||event.type==='eat'){sparkles(event.type==='eat'?'♪':'♡',6);showBubble(event.type==='eat'?'♪':'♡');}
    else if(event.type==='cry')showBubble('…',4);
    else if(event.type==='search')showBubble('？',3);
    else if(event.type==='discovery')sparkles('✧',10);
  }
}

function drawTile(index,x,y,scale=.245,facing=1,bounce=0,alpha=1){const tile=tiles[index];if(!tile)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y+bounce);ctx.scale(facing*scale,scale);ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,-tile.width/2,-tile.height);ctx.restore();}
function drawSeed(x,y,big=false){ctx.save();ctx.translate(x,y);ctx.rotate(-.3);const k=big?1.05:.78;ctx.scale(k,k);ctx.fillStyle='#6f573c';ctx.strokeStyle='#3e3428';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-8);ctx.bezierCurveTo(-8,0,-6,9,0,10);ctx.bezierCurveTo(6,9,8,0,0,-8);ctx.fill();ctx.stroke();ctx.strokeStyle='#e7c889';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,7);ctx.stroke();ctx.restore();}
function drawStash(){
  if(!s.stash)return;
  const drag=seedDrag||s.stash,x=drag.x*W,y=drag.y*H;
  if(seedDrag){drawSeed(x,y,true);return;}
  ctx.save();ctx.fillStyle='#b4783f66';ctx.beginPath();ctx.ellipse(x,y+2,12,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#efd89d';ctx.fillRect(x-4,y-3,6,2);ctx.fillRect(x+2,y-1,5,2);ctx.fillStyle='#fff2c6';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('✧',x,y-8);ctx.restore();
}
function drawSunlight(){ctx.save();ctx.globalCompositeOperation='screen';const glow=ctx.createRadialGradient(68,18,5,68,18,190);glow.addColorStop(0,'#ffe5a861');glow.addColorStop(.48,'#ffc66a28');glow.addColorStop(1,'#ffc66a00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.globalAlpha=.11;ctx.fillStyle='#ffe5a3';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(112,0);ctx.lineTo(244,270);ctx.lineTo(153,270);ctx.closePath();ctx.fill();ctx.restore();}
function drawWheel(){
  const x=319,y=119,size=101;ctx.drawImage(images.wheel,x,y,size,size);
  if(s.mode==='running'){
    ctx.save();ctx.translate(ZONES.wheel.x*W,ZONES.wheel.y*H-8);ctx.rotate(s.wheelAngle);ctx.strokeStyle='#ffe1a777';ctx.lineWidth=1.2;
    for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(31,0);ctx.stroke();}ctx.restore();
  }
}
function drawHamster(){
  const motion=s.motion||{};const px=s.x*W,py=s.y*H;
  const wheelBlend=motion.wheelBlend??0,sleepBlend=motion.sleepBlend??(s.mode==='sleeping'?1:0),lift=motion.lift??(s.mode==='carried'?1:0);
  const inWheel=wheelBlend>.5||s.mode==='running';
  ctx.save();ctx.globalAlpha=.24-lift*.08;ctx.fillStyle='#57331e';ctx.beginPath();ctx.ellipse(px,py+2,inWheel?21:25-lift*2,5-lift,0,0,Math.PI*2);ctx.fill();ctx.restore();
  let bounce=0,angle=0;const stride=motion.stride??s.time*14,activity=motion.activityPhase??s.time;const sniffing=s.mode==='searching'&&!s.target,burying=s.mode==='hiding'&&!s.target;
  if(s.mode==='running'){const rate=Math.max(.2,(motion.wheelSpeed??5)/5);bounce=Math.sin(s.time*(8+rate*13))*1.7*rate;angle=Math.sin(s.time*(6+rate*7))*.035*rate;}
  else if(sniffing){bounce=-Math.abs(Math.sin(activity*8))*.8;angle=Math.sin(activity*5)*.045;}
  else if(burying){bounce=-Math.abs(Math.sin(activity*12))*1.2;angle=Math.sin(activity*12)*.028;}
  else if(['walking','hiding','searching'].includes(s.mode)){bounce=-Math.abs(Math.sin(stride))*2.1;angle=Math.sin(stride)*.04;}
  else if(s.mode==='eating'){bounce=-Math.abs(Math.sin(activity*10))*1.1;angle=Math.sin(activity*5)*.016;}
  else if(s.mode==='posing')bounce=-Math.sin(Math.min(1,activity/.5)*Math.PI)*2.2;
  else if(s.mode==='sleeping'){bounce=Math.sin(activity*2)*.7;angle=-sleepBlend*.012;}
  else if(s.mode==='crying')angle=Math.sin(s.time*15)*.03;
  else if(s.mode==='carried')angle=Math.sin(s.time*3)*.04;
  const scale=.245-wheelBlend*.03+lift*.008+sleepBlend*.004;const facing=s.mode==='running'?1:(motion.renderFacing??s.facing);const poseBlend=motion.poseBlend??1,fromPose=motion.fromPose;
  ctx.save();ctx.translate(px,py-lift*8+sleepBlend);ctx.rotate(angle);
  if(fromPose&&POSES[fromPose]!==undefined&&poseBlend<1){drawTile(POSES[fromPose],0,0,scale,facing,bounce,1-poseBlend);drawTile(POSES[s.pose]??0,0,0,scale,facing,bounce,poseBlend);}else drawTile(POSES[s.pose]??0,0,0,scale,facing,bounce,1);
  ctx.restore();
  if(lift>.08){ctx.save();ctx.globalAlpha=Math.min(1,lift*1.4);ctx.font='46px "Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.fillText('🫴',px,py+21);ctx.restore();}
  if(sleepBlend>.05){ctx.save();ctx.globalAlpha=sleepBlend;ctx.fillStyle='#7da1c8';ctx.font='bold 11px monospace';ctx.fillText('z',px+23,py-34-(s.time%2)*3);ctx.font='bold 8px monospace';ctx.fillText('z',px+31,py-45-(s.time%2)*3);ctx.restore();}
}
function drawParticles(dt){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.age>=p.life){particles.splice(i,1);continue;}ctx.save();ctx.globalAlpha=1-p.age/p.life;ctx.font='bold 13px system-ui';ctx.fillStyle=p.symbol==='♡'?'#e87379':'#fff0ae';ctx.textAlign='center';ctx.fillText(p.symbol,p.x,p.y);ctx.restore();}
}
function render(dt){
  ctx.imageSmoothingEnabled=false;ctx.drawImage(images.bg,0,0,W,H);drawSunlight();drawStash();
  if(s.y<.73){drawHamster();drawWheel();}else{drawWheel();drawHamster();}
  drawParticles(dt);ctx.drawImage(images.fg,0,0,W,H);
  ctx.save();const vignette=ctx.createRadialGradient(240,135,108,240,135,300);vignette.addColorStop(.62,'#0000');vignette.addColorStop(1,'#2f180f25');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);ctx.restore();
  if(s.time<bubbleUntil){$('bubble').hidden=false;$('bubble').style.left=`${s.x*100}%`;$('bubble').style.top=`${(s.y-.16)*100}%`;}else $('bubble').hidden=true;
}

function updateUI(){
  $('petName').textContent=s.name;$('roomTitle').textContent=`${s.name}小屋`;$('avatar').textContent=(s.name||'团').slice(0,1);
  const stats={hunger:s.hunger,mood:s.mood,energy:s.energy,clean:meta.cleanliness};
  for(const [key,value] of Object.entries(stats)){const rounded=Math.round(value);$(`${key}Bar`).style.width=`${rounded}%`;$(`${key}Value`).textContent=rounded;}
  const avg=(s.hunger+s.mood+s.energy+meta.cleanliness)/4;$('moodText').textContent=avg>82?'幸福得眯起眼':avg>65?'心情很好':avg>45?'想让你陪陪':'有一点没精神';
  $('sleepLabel').textContent=s.mode==='sleeping'||s.forcedSleep?'叫醒它':'睡觉';$('shapeLabel').textContent=s.pose==='pancake'?'团成球':'变鼠饼';
  $('soundButton').setAttribute('aria-pressed',String(s.sound));$('soundLabel').textContent=s.sound?'声音开':'声音关';
  $('feedCount').textContent=Math.round(s.totalFeeds);$('petCount').textContent=Math.round(s.totalPets);$('runCount').textContent=Math.round(s.totalRuns);$('discoveryCount').textContent=s.discoveries.length;$('photoCount').textContent=meta.photos;
  const now=new Date();$('clock').textContent=new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(now);$('weatherLabel').textContent=now.getHours()>=18||now.getHours()<6?'☾ 夜':'☀ 晴';
}
function doAction(action){
  if(!ready||paused)return false;enableAudio();if(pointer)finishPointer(true);const result=game.act(action);flushEvents();updateUI();persist();return result;
}
function moveToPoint(point){
  if(s.mode==='carried')return;game.wake();s.motion.pendingWheel=false;s.motion.wheelStopping=false;s.mode='walking';game.setPose('idle');s.target={x:clamp(point.x,.1,.9),y:clamp(point.y,.48,.85)};announce(`${s.name}哒哒哒地走过去。`);flushEvents();
}
function normalized(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};}
function hitHamster(point){return Math.abs(point.x-s.x)<.078&&point.y>s.y-.18&&point.y<s.y+.04;}

canvas.addEventListener('pointerdown',event=>{
  if(!ready||paused||pointer||(event.pointerType==='mouse'&&event.button!==0))return;
  const point=normalized(event);enableAudio();
  if(hitHamster(point)){
    const wasSleeping=s.mode==='sleeping';game.wake();pointer={id:event.pointerId,kind:'hamster',startX:point.x,startY:point.y,offsetX:s.x-point.x,offsetY:s.y-point.y,dragging:false,wasSleeping};
  }else if(s.stash&&Math.hypot((point.x-s.stash.x)*1.5,point.y-s.stash.y)<.06){
    game.revealStash();seedDrag={...s.stash};pointer={id:event.pointerId,kind:'seed',startX:point.x,startY:point.y,dragging:true};flushEvents();
  }else if(Math.hypot(point.x-ZONES.wheel.x,point.y-(ZONES.wheel.y-.08))<.16)doAction('wheel');
  else if(Math.hypot(point.x-ZONES.house.x,point.y-ZONES.house.y)<.11)doAction('sleep');
  else if(Math.hypot(point.x-ZONES.bowl.x,point.y-ZONES.bowl.y)<.09)doAction('feed');
  else moveToPoint(point);
  if(pointer){canvas.setPointerCapture(event.pointerId);event.preventDefault();}
});
canvas.addEventListener('pointermove',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;const point=normalized(event);
  if(pointer.kind==='hamster'){
    if(!pointer.dragging&&Math.hypot(point.x-pointer.startX,point.y-pointer.startY)>.008){pointer.dragging=true;game.pickUp();flushEvents();}
    if(pointer.dragging)game.move(point.x+pointer.offsetX,point.y+pointer.offsetY);
  }else if(seedDrag){seedDrag.x=clamp(point.x,.12,.9);seedDrag.y=clamp(point.y,.61,.85);}
  canvas.classList.toggle('dragging',pointer.dragging);event.preventDefault();
});
function finishPointer(cancelled=false){
  if(!pointer)return;const active=pointer;
  if(active.kind==='hamster'){
    if(active.dragging)game.drop(s.x,s.y);else if(!cancelled&&!active.wasSleeping)game.act('pet');else if(!cancelled)showBubble('？');
  }else if(seedDrag){game.moveStash(seedDrag.x,seedDrag.y);seedDrag=null;}
  pointer=null;canvas.classList.remove('dragging');try{if(canvas.hasPointerCapture(active.id))canvas.releasePointerCapture(active.id);}catch{/* ignored */}
  flushEvents();updateUI();persist();
}
canvas.addEventListener('pointerup',event=>{if(pointer?.id===event.pointerId)finishPointer();});
canvas.addEventListener('pointercancel',event=>{if(pointer?.id===event.pointerId)finishPointer(true);});
canvas.addEventListener('lostpointercapture',()=>{if(pointer)finishPointer(true);});
canvas.addEventListener('contextmenu',event=>event.preventDefault());

document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>doAction(button.dataset.action)));
$('cleanButton').addEventListener('click',()=>{if(!ready||paused)return;meta.cleanliness=100;sparkles('✧',14);showBubble('✦');announce('换上干净木屑，小屋闻起来香香的。');persist();updateUI();});
$('photoButton').addEventListener('click',()=>{if(!ready||paused)return;meta.photos++;$('photoFlash').classList.remove('active');void $('photoFlash').offsetWidth;$('photoFlash').classList.add('active');sparkles('♡',5);announce(`${s.name}看镜头——咔嚓！`);persist();updateUI();});
$('soundButton').addEventListener('click',()=>{s.sound=!s.sound;enableAudio();sound('pet');persist();updateUI();announce(s.sound?'小屋的声音打开啦。':'安静模式，轻轻陪着它。');});

document.addEventListener('keydown',event=>{
  if(!ready||paused||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.ctrlKey||event.metaKey||event.altKey)return;
  const actions={'1':'feed','2':'pet','3':'wheel','4':'sleep','5':'shape','6':'stash'};
  if(actions[event.key]){event.preventDefault();doAction(actions[event.key]);}
});

const settingsDialog=$('settingsDialog');
$('settingsButton').addEventListener('click',()=>{if(!ready)return;finishPointer(true);paused=true;$('nameInput').value=s.name;$('sleepStart').value=s.sleepStart;$('sleepEnd').value=s.sleepEnd;settingsDialog.showModal();});
document.querySelector('[data-close]').addEventListener('click',()=>settingsDialog.close());
settingsDialog.addEventListener('close',()=>{paused=false;lastFrame=0;});
$('settingsForm').addEventListener('submit',event=>{event.preventDefault();s.name=$('nameInput').value.replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,12)||'团团';s.sleepStart=$('sleepStart').value;s.sleepEnd=$('sleepEnd').value;persist();updateUI();settingsDialog.close();announce(`好啦，${s.name}记住新作息了。`);});

function frame(now){
  const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;
  if(ready&&!paused&&!document.hidden){game.update(dt);meta.cleanliness=clamp(meta.cleanliness-dt*.004,0,100);flushEvents();render(dt);if(s.time-lastUI>.2){updateUI();lastUI=s.time;}if(s.time-lastSave>5){persist();lastSave=s.time;}}
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{lastFrame=0;if(document.hidden){finishPointer(true);persist();}});window.addEventListener('pagehide',persist);

try{
  await Promise.all(Object.entries(assetPaths).map(async([key,src])=>{images[key]=await loadImage(src);}));prepareTiles(images.atlas);ready=true;$('loadScreen').hidden=true;game.update(0);flushEvents();updateUI();render(0);persist();announce(s.mode==='sleeping'?`${s.name}睡着啦，轻轻拖一下能叫醒它。`:`欢迎回家，${s.name}正在暖阳里等你。`);requestAnimationFrame(frame);
}catch(error){$('loadScreen').innerHTML='<strong>团团的小屋加载失败</strong><span>请刷新页面再试一次。</span>';console.error(error);}
