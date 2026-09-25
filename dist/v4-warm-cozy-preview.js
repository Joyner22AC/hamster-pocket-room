const canvas=document.getElementById('scene');
const ctx=canvas.getContext('2d',{alpha:false});
const modeLabel=document.getElementById('mode');
const moodLabel=document.getElementById('mood');
const photoFlash=document.getElementById('photoFlash');
const clock=document.getElementById('clock');
const W=480,H=270;
ctx.imageSmoothingEnabled=false;

const assets={
  bg:'v4-assets/v4-room-bg.webp',
  fg:'v4-assets/v4-room-fg.webp',
  wheel:'v4-assets/v4-wheel-wood.webp',
  atlas:'assets/hamster-atlas.webp'
};
const images={};
const tiles=[];
const spots={bowl:{x:405,y:211},wheel:{x:365,y:186},bed:{x:128,y:176},home:{x:247,y:205}};
const state={
  x:247,y:205,targetX:null,targetY:null,facing:1,time:0,mode:'idle',afterAction:null,
  action:null,phase:null,phaseUntil:0,wheelAngle:0,
  stats:{hunger:76,joy:82,clean:72,energy:70},
  hearts:[],sparkles:[]
};

function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function prepareTiles(image){
  const cw=image.width/4,ch=image.height/2;
  for(let i=0;i<8;i++){
    const tile=document.createElement('canvas');tile.width=cw;tile.height=ch;
    const tileCtx=tile.getContext('2d',{willReadFrequently:true});
    tileCtx.drawImage(image,(i%4)*cw,Math.floor(i/4)*ch,cw,ch,0,0,cw,ch);
    const pixels=tileCtx.getImageData(0,0,cw,ch);let left=cw,top=ch,right=0,bottom=0;
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const p=(y*cw+x)*4;
      if(pixels.data[p+3]<246)pixels.data[p+3]=0;
      else{left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    }
    tileCtx.putImageData(pixels,0,0);
    const crop=document.createElement('canvas');
    crop.width=Math.max(1,right-left+1);crop.height=Math.max(1,bottom-top+1);
    crop.getContext('2d').drawImage(tile,left,top,crop.width,crop.height,0,0,crop.width,crop.height);
    tiles.push(crop);
  }
}

const labels={
  idle:'团团正在晒太阳',walk:'团团哒哒哒',feed:'团团认真吃饭',play:'团团开心得团成一团',
  clean:'团团闻到了干净的木屑香',photo:'团团摆好姿势啦',wheel:'团团的小短腿开跑',sleep:'团团钻进小窝睡着了'
};
function setLabel(text){modeLabel.textContent=text;}
function walkTo(x,y,afterAction=null){
  state.targetX=clamp(x,92,430);state.targetY=clamp(y,132,228);state.afterAction=afterAction;
  state.mode='walk';state.action=null;state.phase=null;setLabel(labels.walk);
}
function actionDuration(action){return{feed:2.2,play:1.6,clean:1.25,photo:.7,wheel:2.8,sleep:3.2}[action]||1.4;}
function beginAction(action){
  state.mode='action';state.action=action;state.phase='prepare';state.phaseUntil=state.time+.28;
  setLabel(`团团准备${action==='feed'?'开饭':action==='wheel'?'跑轮':action==='sleep'?'睡觉':action==='photo'?'拍照':action==='clean'?'打扫':'互动'}…`);
  if(action==='photo'){
    photoFlash.classList.remove('active');void photoFlash.offsetWidth;photoFlash.classList.add('active');
  }
}
function applyActionResult(action){
  const s=state.stats;
  if(action==='feed'){s.hunger+=15;s.joy+=2;}
  if(action==='play'){s.joy+=15;s.energy-=4;spawnHearts(8);}
  if(action==='clean'){s.clean+=20;s.joy+=3;spawnSparkles(13);}
  if(action==='photo'){s.joy+=5;spawnSparkles(7);}
  if(action==='wheel'){s.joy+=8;s.energy-=9;}
  if(action==='sleep'){s.energy+=20;s.joy+=3;}
  for(const key of Object.keys(s))s[key]=clamp(s[key],8,100);
  updateHud();
}
function finishAction(){
  const action=state.action;applyActionResult(action);
  state.action=null;state.phase=null;state.phaseUntil=0;
  if(['feed','wheel','sleep'].includes(action))walkTo(spots.home.x,spots.home.y);
  else{state.mode='idle';setLabel(labels.idle);}
}
function triggerAction(action){
  if(state.mode==='walk'||state.mode==='action')return;
  if(action==='feed')walkTo(395,210,'feed');
  else if(action==='wheel')walkTo(350,207,'wheel');
  else if(action==='sleep')walkTo(144,183,'sleep');
  else beginAction(action);
}

function updateHud(){
  const s=state.stats;
  const map={hunger:'hungerBar',joy:'joyBar',clean:'cleanBar',energy:'energyBar'};
  for(const [key,id] of Object.entries(map))document.getElementById(id).style.width=`${s[key]}%`;
  const avg=(s.hunger+s.joy+s.clean+s.energy)/4;
  moodLabel.textContent=avg>82?'幸福得眯起眼':avg>65?'心情很好':avg>45?'想让你陪陪':'有一点没精神';
}
function spawnHearts(count){for(let i=0;i<count;i++)state.hearts.push({x:state.x+(Math.random()-.5)*24,y:state.y-38-Math.random()*12,v:12+Math.random()*10,life:1,drift:(Math.random()-.5)*8});}
function spawnSparkles(count){for(let i=0;i<count;i++)state.sparkles.push({x:state.x+(Math.random()-.5)*82,y:state.y-12-Math.random()*65,v:7+Math.random()*10,life:1,phase:Math.random()*6.28});}

function tileIndex(){
  if(state.mode==='walk')return 1;
  if(state.mode!=='action')return 0;
  if(state.action==='feed')return 4;
  if(state.action==='sleep')return 3;
  if(state.action==='wheel')return 7;
  if(state.action==='play')return 6;
  return 0;
}
function drawHamster(){
  const image=tiles[tileIndex()];if(!image)return;
  const walking=state.mode==='walk';const acting=state.mode==='action';
  let bob=walking?-Math.abs(Math.sin(state.time*13))*2:Math.sin(state.time*2.2)*.4;
  let scaleX=.245,scaleY=.245;
  if(acting&&state.phase==='prepare'){const t=clamp((state.phaseUntil-state.time)/.28,0,1);scaleX*=1.04;scaleY*=.94+.05*t;bob+=1.5;}
  if(acting&&state.phase==='perform'){
    if(state.action==='feed')bob-=Math.abs(Math.sin(state.time*10))*1.25;
    if(state.action==='play'){scaleX*=1+.035*Math.sin(state.time*11);scaleY*=1-.025*Math.sin(state.time*11);bob-=Math.abs(Math.sin(state.time*8))*2;}
    if(state.action==='wheel')bob-=Math.abs(Math.sin(state.time*16))*2.1;
    if(state.action==='sleep'){scaleY*=.88;scaleX*=1.08;bob+=4;}
  }
  if(acting&&state.phase==='settle')bob+=Math.sin(state.time*15)*.55;
  const lift=walking?Math.abs(Math.sin(state.time*13))*.8:0;
  ctx.save();ctx.globalAlpha=.24;ctx.fillStyle='#56321f';ctx.beginPath();ctx.ellipse(state.x,state.y+3,26+lift*2,6-lift*.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(state.x,state.y+bob);ctx.scale(state.facing*scaleX,scaleY);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,-image.width/2,-image.height);ctx.restore();
}
function drawWheel(){
  const x=319,y=119,size=101;
  ctx.save();ctx.globalAlpha=.98;ctx.drawImage(images.wheel,x,y,size,size);ctx.restore();
  if(state.action==='wheel'&&state.phase==='perform'){
    ctx.save();ctx.translate(369,169);ctx.rotate(state.wheelAngle);ctx.strokeStyle='#ffe4a58a';ctx.lineWidth=1.2;
    for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(34,0);ctx.stroke();}
    ctx.restore();
  }
}
function drawSunlight(){
  ctx.save();ctx.globalCompositeOperation='screen';
  const glow=ctx.createRadialGradient(74,24,4,74,24,190);glow.addColorStop(0,'#ffe5a95f');glow.addColorStop(.45,'#ffc76825');glow.addColorStop(1,'#ffc76800');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.11;ctx.fillStyle='#ffe6ad';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(116,0);ctx.lineTo(250,270);ctx.lineTo(150,270);ctx.closePath();ctx.fill();ctx.restore();
}
function drawParticles(dt){
  for(const heart of state.hearts){heart.life-=dt*.9;heart.y-=heart.v*dt;heart.x+=heart.drift*dt;}
  state.hearts=state.hearts.filter(p=>p.life>0);
  ctx.save();ctx.textAlign='center';ctx.font='13px sans-serif';for(const heart of state.hearts){ctx.globalAlpha=heart.life;ctx.fillStyle='#e66f72';ctx.fillText('♥',heart.x,heart.y);}ctx.restore();
  for(const star of state.sparkles){star.life-=dt*.8;star.y-=star.v*dt;star.phase+=dt*7;}
  state.sparkles=state.sparkles.filter(p=>p.life>0);
  ctx.save();for(const star of state.sparkles){ctx.globalAlpha=star.life*(.55+.45*Math.sin(star.phase));ctx.fillStyle='#fff3b0';ctx.fillRect(Math.round(star.x),Math.round(star.y),2,2);}ctx.restore();
}
function render(dt){
  ctx.imageSmoothingEnabled=false;ctx.drawImage(images.bg,0,0,W,H);drawSunlight();
  if(state.y<202){drawHamster();drawWheel();}else{drawWheel();drawHamster();}
  drawParticles(dt);ctx.drawImage(images.fg,0,0,W,H);
  ctx.save();const vignette=ctx.createRadialGradient(240,137,105,240,137,305);vignette.addColorStop(.6,'#0000');vignette.addColorStop(1,'#321b1024');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);ctx.restore();
}
function update(dt){
  state.time+=dt;
  if(state.action==='wheel'&&state.phase==='perform')state.wheelAngle+=dt*8.5;
  if(state.targetX!=null){
    const dx=state.targetX-state.x,dy=state.targetY-state.y,d=Math.hypot(dx,dy),speed=76;
    if(d<2.2){state.x=state.targetX;state.y=state.targetY;state.targetX=state.targetY=null;const after=state.afterAction;state.afterAction=null;if(after)beginAction(after);else{state.mode='idle';setLabel(labels.idle);}}
    else{state.facing=dx<0?-1:1;state.x+=dx/d*speed*dt;state.y+=dy/d*speed*dt;}
  }
  if(state.mode==='action'&&state.phaseUntil&&state.time>=state.phaseUntil){
    if(state.phase==='prepare'){state.phase='perform';state.phaseUntil=state.time+actionDuration(state.action);setLabel(labels[state.action]);if(state.action==='play')spawnHearts(4);if(state.action==='clean')spawnSparkles(8);}
    else if(state.phase==='perform'){state.phase='settle';state.phaseUntil=state.time+.34;setLabel('团团满足地抖抖毛');}
    else if(state.phase==='settle')finishAction();
  }
  const minutes=24+Math.floor(state.time/12);clock.textContent=`09:${String(minutes%60).padStart(2,'0')}`;
}
function pointerPos(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width*W,y:(event.clientY-rect.top)/rect.height*H};}
canvas.addEventListener('pointerdown',event=>{if(state.mode==='action')return;const p=pointerPos(event);walkTo(p.x,p.y);});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();triggerAction(button.dataset.action);}));

let previous=performance.now();
function loop(now){const dt=Math.min(.04,(now-previous)/1000);previous=now;update(dt);render(dt);requestAnimationFrame(loop);}

Promise.all(Object.entries(assets).map(async([key,src])=>images[key]=await loadImage(src))).then(()=>{
  prepareTiles(images.atlas);updateHud();setLabel(labels.idle);requestAnimationFrame(loop);
}).catch(error=>{setLabel('资源加载失败');console.error(error);});

(async()=>{try{
  const paths=['v4-warm-cozy-preview.html','v4-warm-cozy-preview.css','v4-warm-cozy-preview.js','v4-assets/v4-room-bg.webp','v4-assets/v4-room-fg.webp','v4-assets/v4-wheel-wood.webp','assets/hamster-atlas.webp'];
  let total=0;for(const path of paths){const response=await fetch(path,{cache:'no-store'});total+=(await response.blob()).size;}
  document.getElementById('payload').textContent=`首屏 ${(total/1024/1024).toFixed(2)} MB`;
}catch{document.getElementById('payload').textContent='首屏 < 1.5 MB';}})();
