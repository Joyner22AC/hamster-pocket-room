const canvas=document.getElementById('scene');
const ctx=canvas.getContext('2d',{alpha:false});
const modeLabel=document.getElementById('mode');
const W=480,H=270;
ctx.imageSmoothingEnabled=false;

const assets={room:'assets/room.webp',atlas:'assets/hamster-atlas.webp',wheel:'assets/wheel.webp'};
const images={};
const tiles=[];
const state={x:238,y:205,targetX:null,targetY:null,facing:1,mode:'idle',until:0,time:0,runAngle:0};
const spots={bowl:{x:432,y:220},wheel:{x:360,y:184},house:{x:108,y:130}};
const particles=Array.from({length:15},(_,i)=>({x:(i*37)%W,y:18+(i*23)%160,s:.4+(i%3)*.22,v:.5+(i%4)*.12,a:.16+(i%4)*.035}));

function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
function prepareTiles(image){
  const cw=image.width/4,ch=image.height/2;
  for(let i=0;i<8;i++){
    const t=document.createElement('canvas');t.width=cw;t.height=ch;
    const c=t.getContext('2d',{willReadFrequently:true});
    c.drawImage(image,(i%4)*cw,Math.floor(i/4)*ch,cw,ch,0,0,cw,ch);
    const px=c.getImageData(0,0,cw,ch);let l=cw,top=ch,r=0,b=0;
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const p=(y*cw+x)*4;if(px.data[p+3]<246)px.data[p+3]=0;else{l=Math.min(l,x);top=Math.min(top,y);r=Math.max(r,x);b=Math.max(b,y)}
    }
    c.putImageData(px,0,0);
    const crop=document.createElement('canvas');crop.width=r-l+1;crop.height=b-top+1;
    crop.getContext('2d').drawImage(t,l,top,crop.width,crop.height,0,0,crop.width,crop.height);
    tiles.push(crop);
  }
}
function tileForMode(){return state.mode==='eat'?4:state.mode==='sleep'?3:state.mode==='run'?7:0}
function drawHamster(){
  const img=tiles[tileForMode()];if(!img)return;
  const walking=state.mode==='walk';
  const bob=walking?-Math.abs(Math.sin(state.time*13))*2:state.mode==='eat'?-Math.abs(Math.sin(state.time*10))*1.2:Math.sin(state.time*2.1)*.45;
  const squash=state.mode==='eat'?1+Math.abs(Math.sin(state.time*10))*.025:1;
  const lift=walking?Math.abs(Math.sin(state.time*13))*.7:0;
  ctx.save();
  ctx.globalAlpha=.22;ctx.fillStyle='#4e3d2b';ctx.beginPath();ctx.ellipse(state.x,state.y+2,25+lift*2,6-lift*.5,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.save();ctx.translate(state.x,state.y+bob);ctx.scale(state.facing*.235,.235*squash);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,-img.width/2,-img.height);ctx.restore();
}
function drawWheel(){ctx.save();ctx.globalAlpha=.98;ctx.drawImage(images.wheel,288,86,145,145);ctx.restore();if(state.mode==='run'){ctx.save();ctx.translate(360,155);ctx.rotate(state.runAngle);ctx.strokeStyle='#f7d9c77a';ctx.lineWidth=1.5;for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(50,0);ctx.stroke()}ctx.restore()}}
function drawBowlGlow(){ctx.save();const g=ctx.createRadialGradient(spots.bowl.x,spots.bowl.y,2,spots.bowl.x,spots.bowl.y,28);g.addColorStop(0,'#fff2bf55');g.addColorStop(1,'#fff2bf00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(spots.bowl.x,spots.bowl.y,28,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawLighting(){
  ctx.save();ctx.globalCompositeOperation='screen';let g=ctx.createRadialGradient(88,18,8,88,18,210);g.addColorStop(0,'#ffd98b70');g.addColorStop(.45,'#ffc66a28');g.addColorStop(1,'#ffc66a00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
  ctx.save();g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#fff4d714');g.addColorStop(.72,'#6d443000');g.addColorStop(1,'#51392922');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
}
function drawParticles(dt){ctx.save();for(const p of particles){p.y-=p.v*dt*7;if(p.y<-4){p.y=190;p.x=Math.random()*340}ctx.globalAlpha=p.a*(.65+.35*Math.sin(state.time*1.4+p.x));ctx.fillStyle='#fff3c5';ctx.fillRect(Math.round(p.x),Math.round(p.y),p.s<.65?1:2,p.s<.65?1:2)}ctx.restore()}
function drawForeground(){
  // Repaint the lower strip from the original raster to create a cheap foreground occlusion layer.
  ctx.save();ctx.globalAlpha=.96;ctx.drawImage(images.room,0,500,960,140,0,216,480,70);ctx.restore();
  ctx.save();const g=ctx.createRadialGradient(240,135,110,240,135,290);g.addColorStop(.62,'#0000');g.addColorStop(1,'#2f261a2b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
}
function render(dt){
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(images.room,0,48,960,540,0,0,W,H);
  drawLighting();drawBowlGlow();
  // Y-sort demonstration: hamster passes behind the wheel when it is higher in the room.
  if(state.y<207){drawHamster();drawWheel()}else{drawWheel();drawHamster()}
  drawParticles(dt);drawForeground();
}
function setMode(mode,seconds=0){state.mode=mode;state.until=seconds?state.time+seconds:0;const names={idle:'团团正在发呆',walk:'团团哒哒哒',eat:'团团咔嚓咔嚓',run:'团团小短腿开跑',sleep:'团团睡着了'};modeLabel.textContent=names[mode]||'团团的小屋'}
function walkTo(x,y,after){state.targetX=Math.max(90,Math.min(430,x));state.targetY=Math.max(118,Math.min(226,y));state.after=after||null;setMode('walk')}
function update(dt){state.time+=dt;if(state.mode==='run')state.runAngle+=dt*7.5;
  if(state.targetX!=null){const dx=state.targetX-state.x,dy=state.targetY-state.y,d=Math.hypot(dx,dy),speed=73;if(d<2.2){state.x=state.targetX;state.y=state.targetY;state.targetX=state.targetY=null;const next=state.after;state.after=null;if(next==='eat')setMode('eat',2.6);else if(next==='run')setMode('run',3);else if(next==='sleep')setMode('sleep',3.5);else setMode('idle')}else{state.facing=dx<0?-1:1;state.x+=dx/d*speed*dt;state.y+=dy/d*speed*dt}}
  if(state.until&&state.time>=state.until){state.until=0;if(state.mode==='eat')walkTo(238,205);else if(state.mode==='run')walkTo(270,204);else if(state.mode==='sleep')walkTo(238,205);else setMode('idle')}
}
function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
canvas.addEventListener('pointerdown',e=>{const p=pointerPos(e);if(Math.hypot(p.x-spots.bowl.x,p.y-spots.bowl.y)<44)walkTo(402,214,'eat');else if(Math.hypot(p.x-spots.wheel.x,p.y-spots.wheel.y)<70)walkTo(342,202,'run');else if(Math.hypot(p.x-spots.house.x,p.y-spots.house.y)<62)walkTo(135,160,'sleep');else walkTo(p.x,p.y)});

let prev=performance.now();function loop(now){const dt=Math.min(.04,(now-prev)/1000);prev=now;update(dt);render(dt);requestAnimationFrame(loop)}
Promise.all(Object.entries(assets).map(async([k,v])=>images[k]=await loadImage(v))).then(()=>{prepareTiles(images.atlas);setMode('idle');requestAnimationFrame(loop);}).catch(err=>{modeLabel.textContent='资源加载失败';console.error(err)});

(async()=>{try{const paths=['v3-soft-pixel-preview.html','v3-soft-pixel-preview.css','v3-soft-pixel-preview.js','assets/room.webp','assets/hamster-atlas.webp','assets/wheel.webp'];let total=0;for(const p of paths){const r=await fetch(p,{cache:'no-store'});total+=(await r.blob()).size}document.getElementById('payload').textContent=(total/1024/1024).toFixed(2)+' MB'}catch{document.getElementById('payload').textContent='<1.5 MB'}})();
