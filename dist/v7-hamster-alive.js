import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { HamsterGame, restoreState, saveSnapshot } from './engine.js';

const SAVE_KEY='hamster-pocket-room-v7-candidate-v1';
const $=s=>document.querySelector(s);
const stage=$('#hamsterStage'),wrap=$('#sceneWrap'),loadScreen=$('#loadScreen'),modeText=$('#modeText'),hint=$('#hint'),thought=$('#thought');
const mood=$('#mood'),energy=$('#energy'),hunger=$('#hunger'),fpsReadout=$('#fpsReadout'),shadow=$('#contactShadow');
const saved=(()=>{try{return restoreState(JSON.parse(localStorage.getItem(SAVE_KEY)||'null')?.state)}catch{return restoreState(null)}})();
const game=new HamsterGame(saved);
game.s.awakeUntil=Math.max(game.s.awakeUntil,30);
let saveTimer=0;

const renderer=new THREE.WebGLRenderer({canvas:stage,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-3.6,3.6,2.05,-2.05,.1,30);
camera.position.set(0,2.25,6.4);camera.lookAt(0,.62,0);
scene.add(new THREE.HemisphereLight(0xfff5df,0x8fa6a5,2.0));
const key=new THREE.DirectionalLight(0xffe0b8,2.8);key.position.set(-3,5.5,4);scene.add(key);
const fill=new THREE.DirectionalLight(0xbcd6d4,.75);fill.position.set(4,2.2,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffd8b2,.7);rim.position.set(1,4,-4);scene.add(rim);

let hamster=null,actor=null,mixer=null,currentAction=null,currentClip='',bones={},boneCount=0;
let clock=new THREE.Clock(),lastFrame=performance.now(),fps=60,minFps=60,fpsAccum=0,fpsFrames=0;
let idleKind='breath',nextIdleAt=2.5,gestureCount=0,lastGesture='none',lastMode='';
let pointer=null,carriedOffset={x:0,y:0},manualOverride='',overrideUntil=0;

function resize(){
  const r=wrap.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  renderer.setPixelRatio(dpr);renderer.setSize(r.width,r.height,false);
}
window.addEventListener('resize',resize,{passive:true});resize();

function normalize(root,size=1.72){
  let box=new THREE.Box3().setFromObject(root),d=new THREE.Vector3();box.getSize(d);
  root.scale.multiplyScalar(size/Math.max(d.x,d.y,d.z));
  box=new THREE.Box3().setFromObject(root);const c=new THREE.Vector3();box.getCenter(c);root.position.sub(c);
  box=new THREE.Box3().setFromObject(root);root.position.y-=box.min.y;
}
function tuneMaterials(root){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.frustumCulled=false;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const m of mats){
      if(!m)continue;
      if(m.map){m.map.colorSpace=THREE.SRGBColorSpace;m.map.magFilter=THREE.LinearFilter;m.map.minFilter=THREE.LinearMipmapLinearFilter;m.map.generateMipmaps=true;m.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);m.map.needsUpdate=true}
      if('metalness'in m)m.metalness=0;
      if('roughness'in m)m.roughness=m.name==='Eye'?.58:.9;
      if(m.color){
        if(m.name==='Ham')m.color.set(0xffd2aa);
        else if(m.name==='Hige')m.color.set(0xdcc5ae);
      }
      if(m.emissive)m.emissive.setHex(0x000000);
      m.needsUpdate=true;
    }
  });
}
function collectBones(root){
  const out={};
  root.traverse(o=>{if(!o.isBone)return;const source=o.userData?.name||o.name;const short=source.includes(':')?source.split(':').pop():source.replace(/^mixamorig[_-]?/,'');o.name=o.name.replace(/[^A-Za-z0-9_-]/g,'_');out[short]=o;});
  return out;
}
function buildClips(root){
  bones=collectBones(root);boneCount=Object.keys(bones).length;
  const q=(b,x=0,y=0,z=0)=>b.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)));
  const qt=(b,t,p)=>{if(!b)return null;const v=[];for(const a of p){const z=q(b,a[0]||0,a[1]||0,a[2]||0);v.push(z.x,z.y,z.z,z.w)}return new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`,t,v)};
  const pt=(b,t,p)=>{if(!b)return null;const base=b.position.clone(),v=[];for(const a of p)v.push(base.x+(a[0]||0),base.y+(a[1]||0),base.z+(a[2]||0));return new THREE.VectorKeyframeTrack(`${b.name}.position`,t,v)};
  const clip=(name,d,tracks)=>new THREE.AnimationClip(name,d,tracks.filter(Boolean));
  const H=bones.Hips,S=bones.Spine2||bones.Spine1||bones.Spine,Head=bones.Head,LA=bones.LeftArm,RA=bones.RightArm,LFA=bones.LeftForeArm,RFA=bones.RightForeArm,LL=bones.LeftUpLeg,RL=bones.RightUpLeg,LK=bones.LeftLeg,RK=bones.RightLeg;
  const idleT=[0,.65,1.3,1.95,2.6];
  const breath=clip('breath',2.6,[pt(H,idleT,[[0,0,0],[0,.00025,0],[0,0,0],[0,-.00018,0],[0,0,0]]),qt(S,idleT,[[0,0,0],[.022,0,.01],[0,0,0],[-.014,0,-.008],[0,0,0]]),qt(Head,idleT,[[0,0,0],[.008,.018,0],[0,0,0],[.012,-.015,0],[0,0,0]]),qt(LA,idleT,[[-.36,0,.13],[-.35,0,.135],[-.36,0,.13],[-.37,0,.125],[-.36,0,.13]]),qt(RA,idleT,[[-.36,0,-.13],[-.37,0,-.125],[-.36,0,-.13],[-.35,0,-.135],[-.36,0,-.13]]),qt(LFA,idleT,[[-.28,0,.02],[-.29,0,.025],[-.28,0,.02],[-.27,0,.015],[-.28,0,.02]]),qt(RFA,idleT,[[-.28,0,-.02],[-.27,0,-.015],[-.28,0,-.02],[-.29,0,-.025],[-.28,0,-.02]])]);
  const sniffT=[0,.18,.36,.54,.82,1.2];
  const sniff=clip('sniff',1.2,[qt(S,sniffT,[[0,0,0],[.035,0,0],[.06,0,0],[.035,0,0],[.02,0,0],[0,0,0]]),qt(Head,sniffT,[[0,0,0],[-.035,.03,0],[-.07,-.025,0],[-.03,.035,0],[.02,-.02,0],[0,0,0]]),qt(LA,sniffT,[[-.35,0,.13],[-.34,0,.14],[-.32,0,.15],[-.34,0,.14],[-.35,0,.13],[-.35,0,.13]]),qt(RA,sniffT,[[-.35,0,-.13],[-.355,0,-.125],[-.33,0,-.135],[-.345,0,-.13],[-.35,0,-.13],[-.35,0,-.13]]),qt(LFA,sniffT,[[-.27,0,.02],[-.26,0,.03],[-.24,0,.035],[-.26,0,.03],[-.27,0,.02],[-.27,0,.02]]),qt(RFA,sniffT,[[-.27,0,-.02],[-.27,0,-.018],[-.25,0,-.03],[-.265,0,-.02],[-.27,0,-.02],[-.27,0,-.02]])]);
  const lookT=[0,.35,.8,1.25,1.7];
  const look=clip('look',1.7,[qt(S,lookT,[[0,0,0],[.01,.025,.025],[.018,.04,.035],[.008,.02,.018],[0,0,0]]),qt(Head,lookT,[[0,0,0],[.025,.12,.02],[.04,.19,.025],[.02,.09,.01],[0,0,0]]),qt(LA,lookT,[[-.36,0,.13],[-.35,0,.14],[-.34,0,.15],[-.35,0,.14],[-.36,0,.13]]),qt(RA,lookT,[[-.36,0,-.13],[-.365,0,-.125],[-.37,0,-.12],[-.365,0,-.125],[-.36,0,-.13]]),qt(LFA,lookT,[[-.28,0,.02],[-.27,0,.03],[-.26,0,.035],[-.27,0,.03],[-.28,0,.02]]),qt(RFA,lookT,[[-.28,0,-.02],[-.285,0,-.018],[-.29,0,-.015],[-.285,0,-.018],[-.28,0,-.02]])]);
  const groomT=[0,.25,.5,.75,1,1.4];
  const groom=clip('groom',1.4,[qt(S,groomT,[[0,0,0],[.055,0,0],[.07,0,0],[.06,0,0],[.035,0,0],[0,0,0]]),qt(Head,groomT,[[0,0,0],[.04,.035,0],[.015,-.025,0],[.045,.03,0],[.01,0,0],[0,0,0]]),qt(LA,groomT,[[-.24,0,.08],[-.34,0,.13],[-.48,0,.19],[-.36,0,.13],[-.27,0,.09],[-.24,0,.08]]),qt(RA,groomT,[[-.24,0,-.08],[-.25,0,-.075],[-.26,0,-.07],[-.25,0,-.075],[-.24,0,-.08],[-.24,0,-.08]]),qt(LFA,groomT,[[-.12,0,.02],[-.24,0,.04],[-.4,0,.06],[-.26,0,.03],[-.14,0,.02],[-.12,0,.02]]),qt(RFA,groomT,[[-.12,0,-.02],[-.12,0,-.018],[-.13,0,-.015],[-.12,0,-.018],[-.12,0,-.02],[-.12,0,-.02]])]);
  const walkT=[0,.225,.45,.675,.9];
  const walk=clip('walk',.9,[pt(H,walkT,[[0,-.001,0],[0,.0002,.0004],[0,-.001,0],[0,.00015,-.00035],[0,-.001,0]]),qt(H,walkT,[[.02,0,.016],[.006,0,0],[.02,0,-.016],[.006,0,0],[.02,0,.016]]),qt(LL,walkT,[[.34,0,0],[.08,0,0],[-.32,0,0],[-.06,0,0],[.34,0,0]]),qt(RL,walkT,[[-.32,0,0],[-.06,0,0],[.34,0,0],[.08,0,0],[-.32,0,0]]),qt(LK,walkT,[[-.1,0,0],[.05,0,0],[.14,0,0],[.02,0,0],[-.1,0,0]]),qt(RK,walkT,[[.14,0,0],[.02,0,0],[-.1,0,0],[.05,0,0],[.14,0,0]]),qt(LA,walkT,[[-.14,0,.035],[.02,0,0],[.16,0,-.025],[0,0,0],[-.14,0,.035]]),qt(RA,walkT,[[.16,0,-.025],[0,0,0],[-.14,0,.035],[.02,0,0],[.16,0,-.025]]),qt(S,walkT,[[.04,0,.045],[.025,0,0],[.04,0,-.045],[.025,0,0],[.04,0,.045]]),qt(Head,walkT,[[-.012,-.02,-.015],[.008,0,0],[-.012,.02,.015],[.008,0,0],[-.012,-.02,-.015]])]);
  const eatT=[0,.22,.46,.7,.94,1.2,1.45];
  const eat=clip('eat',1.45,[qt(S,eatT,[[0,0,0],[.05,0,0],[.085,0,0],[.06,0,0],[.09,0,0],[.045,0,0],[0,0,0]]),qt(LA,eatT,[[0,0,0],[-.22,0,.09],[-.4,0,.16],[-.34,0,.13],[-.42,0,.17],[-.2,0,.08],[0,0,0]]),qt(RA,eatT,[[0,0,0],[-.22,0,-.09],[-.4,0,-.16],[-.34,0,-.13],[-.42,0,-.17],[-.2,0,-.08],[0,0,0]]),qt(LFA,eatT,[[0,0,0],[-.14,0,.02],[-.32,0,.03],[-.24,0,.02],[-.33,0,.04],[-.12,0,0],[0,0,0]]),qt(RFA,eatT,[[0,0,0],[-.14,0,-.02],[-.32,0,-.03],[-.24,0,-.02],[-.33,0,-.04],[-.12,0,0],[0,0,0]]),qt(Head,eatT,[[0,0,0],[.035,0,0],[.095,.012,0],[.045,-.01,0],[.1,.014,0],[.025,0,0],[0,0,0]])]);
  const petT=[0,.22,.5,.82,1.15,1.5];
  const pet=clip('pet',1.5,[qt(S,petT,[[0,0,0],[.015,.015,.035],[.025,.04,.07],[.02,.055,.085],[.012,.025,.04],[0,0,0]]),qt(Head,petT,[[0,0,0],[.015,.08,.035],[.035,.19,.07],[.045,.25,.09],[.02,.1,.04],[0,0,0]]),qt(LA,petT,[[0,0,0],[.01,0,.02],[.025,0,.04],[.02,0,.03],[.01,0,.015],[0,0,0]]),qt(RA,petT,[[0,0,0],[-.01,0,-.01],[-.025,0,-.025],[-.02,0,-.02],[-.01,0,-.01],[0,0,0]])]);
  const pickT=[0,.28,.6,.95,1.3];
  const pickup=clip('pickup',1.3,[qt(H,pickT,[[0,0,0],[.03,0,.02],[.02,0,-.018],[-.02,0,.018],[0,0,0]]),qt(LA,pickT,[[0,0,0],[-.25,0,.11],[-.46,0,.18],[-.5,0,.19],[-.46,0,.18]]),qt(RA,pickT,[[0,0,0],[-.25,0,-.11],[-.46,0,-.18],[-.5,0,-.19],[-.46,0,-.18]]),qt(LL,pickT,[[0,0,0],[.18,0,.06],[.42,0,.13],[.48,0,.14],[.42,0,.13]]),qt(RL,pickT,[[0,0,0],[.18,0,-.06],[.42,0,-.13],[.48,0,-.14],[.42,0,-.13]]),qt(Head,pickT,[[0,0,0],[.01,-.025,0],[.025,.04,.015],[.02,-.035,-.01],[0,0,0]])]);
  const dropT=[0,.16,.38,.66,.95];
  const drop=clip('drop',.95,[qt(H,dropT,[[0,0,0],[.07,0,0],[.1,0,.015],[.035,0,-.01],[0,0,0]]),qt(S,dropT,[[0,0,0],[.08,0,0],[.12,0,0],[.045,0,0],[0,0,0]]),qt(Head,dropT,[[0,0,0],[-.03,0,0],[-.055,0,0],[.018,0,0],[0,0,0]]),qt(LA,dropT,[[-.35,0,.12],[-.2,0,.07],[.04,0,0],[.015,0,0],[0,0,0]]),qt(RA,dropT,[[-.35,0,-.12],[-.2,0,-.07],[.04,0,0],[.015,0,0],[0,0,0]])]);
  const runT=[0,.13,.26,.39,.52];
  const run=clip('run',.52,[qt(H,runT,[[.075,0,.03],[.045,0,0],[.075,0,-.03],[.045,0,0],[.075,0,.03]]),qt(S,runT,[[.14,0,.08],[.1,0,0],[.14,0,-.08],[.1,0,0],[.14,0,.08]]),qt(LL,runT,[[.56,0,0],[.1,0,0],[-.53,0,0],[-.1,0,0],[.56,0,0]]),qt(RL,runT,[[-.53,0,0],[-.1,0,0],[.56,0,0],[.1,0,0],[-.53,0,0]]),qt(LK,runT,[[-.19,0,0],[.11,0,0],[.23,0,0],[.05,0,0],[-.19,0,0]]),qt(RK,runT,[[.23,0,0],[.05,0,0],[-.19,0,0],[.11,0,0],[.23,0,0]]),qt(LA,runT,[[-.32,0,.055],[.04,0,0],[.32,0,-.055],[0,0,0],[-.32,0,.055]]),qt(RA,runT,[[.32,0,-.055],[0,0,0],[-.32,0,.055],[.04,0,0],[.32,0,-.055]]),qt(Head,runT,[[-.045,-.025,-.018],[-.01,0,0],[-.045,.025,.018],[-.01,0,0],[-.045,-.025,-.018]])]);
  const sleepT=[0,.8,1.6,2.4,3.2];
  const sleep=clip('sleep',3.2,[qt(H,sleepT,[[.1,0,.78],[.09,.01,.8],[.1,0,.78],[.09,-.01,.76],[.1,0,.78]]),qt(S,sleepT,[[-.13,0,-.1],[-.15,.01,-.11],[-.13,0,-.1],[-.15,-.01,-.09],[-.13,0,-.1]]),qt(Head,sleepT,[[-.13,-.05,-.14],[-.11,-.03,-.15],[-.13,-.05,-.14],[-.12,-.07,-.13],[-.13,-.05,-.14]]),qt(LA,sleepT,[[-.35,0,.2],[-.38,0,.21],[-.35,0,.2],[-.36,0,.19],[-.35,0,.2]]),qt(RA,sleepT,[[-.35,0,-.2],[-.38,0,-.21],[-.35,0,-.2],[-.36,0,-.19],[-.35,0,-.2]])]);
  return {breath,sniff,look,groom,walk,eat,pet,pickup,drop,run,sleep};
}

const actions={};
function play(name,fade=.28){
  if(!mixer||!actions[name]||currentClip===name)return;
  const next=actions[name];next.enabled=true;next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if(currentAction)currentAction.crossFadeTo(next,fade,false);
  currentAction=next;currentClip=name;
}
function setOverride(name,seconds){manualOverride=name;overrideUntil=game.s.time+seconds;play(name,.16)}
function chooseIdle(){
  const kinds=['breath','sniff','look','groom'];
  const roll=Math.random();
  idleKind=game.s.hunger<30?'sniff':game.s.mood>88&&roll>.72?'groom':roll>.48?'look':roll>.2?'sniff':'breath';
  if(!kinds.includes(idleKind))idleKind='breath';
  nextIdleAt=game.s.time+2.3+Math.random()*4.5;
}
function desiredClip(){
  if(manualOverride&&game.s.time<overrideUntil)return manualOverride;
  if(manualOverride){manualOverride='';}
  if(game.s.mode==='carried')return'pickup';
  if(game.s.mode==='running')return'run';
  if(['walking','hiding','searching'].includes(game.s.mode))return'walk';
  if(game.s.mode==='eating')return'eat';
  if(game.s.mode==='sleeping')return'sleep';
  if(game.s.mode==='posing'&&game.s.pose==='ball')return'pet';
  if(game.s.time>=nextIdleAt)chooseIdle();
  return idleKind;
}
function worldFromState(){
  const s=game.s;
  const x=(s.x-.5)*5.5;
  const z=(s.y-.72)*4.1;
  return{x,z};
}
function updateModel(dt){
  if(!hamster||!actor)return;
  const target=worldFromState();
  actor.position.x=THREE.MathUtils.damp(actor.position.x,target.x,8,dt);
  actor.position.z=THREE.MathUtils.damp(actor.position.z,target.z,8,dt);
  const lift=game.s.mode==='carried'?1:0;
  actor.position.y=THREE.MathUtils.damp(actor.position.y,lift*.88,10,dt);
  const facing=game.s.facing<0?-1:1;
  const yaw=facing>0?-.92:Math.PI-.92;
  actor.rotation.y=THREE.MathUtils.damp(actor.rotation.y,yaw,8,dt);
  const depthScale=THREE.MathUtils.clamp(1-(game.s.y-.72)*.22,.9,1.08);
  actor.scale.set(depthScale*1.12,depthScale*.88,depthScale*1.06);
  const px=46.5+(game.s.x-.5)*67,py=66+(game.s.y-.72)*38;
  shadow.style.left=`${px-7.5}%`;shadow.style.top=`${py}%`;
  wrap.classList.toggle('is-carried',game.s.mode==='carried');wrap.classList.toggle('is-running',game.s.mode==='running');
  play(desiredClip(),currentClip==='walk'||currentClip==='run'?.16:.28);
}

function setThought(text,ms=1100){thought.textContent=text;thought.hidden=false;clearTimeout(setThought.t);setThought.t=setTimeout(()=>thought.hidden=true,ms)}
function persist(){localStorage.setItem(SAVE_KEY,JSON.stringify({state:saveSnapshot(game.s),meta:{v:7}}))}
function drainEvents(){while(game.events.length){const e=game.events.shift();if(e?.text){modeText.textContent=e.text;setThought(e.text,1200)}}}
function meter(v){return`${Math.round(v)}%`}
function updateUI(){mood.textContent=meter(game.s.mood);energy.textContent=meter(game.s.energy);hunger.textContent=meter(game.s.hunger);if(!game.events.length)modeText.textContent=({idle:'在房间里发呆',walking:'哒哒走路',eating:'认真吃东西',running:'小短腿跑轮',sleeping:'睡得香香的',carried:'被你抱起来了',posing:'软乎乎地回应你',hiding:'偷偷藏粮',searching:'在找瓜子',crying:'有点委屈'})[game.s.mode]||game.s.mode;}
function activate(action){
  if(action==='pet'){game.act('pet');lastGesture='button-pet';gestureCount++;setOverride('pet',1.35)}
  else if(action==='feed'){game.act('feed');setOverride('eat',1.4)}
  else if(action==='wheel'){game.act('wheel')}
  else if(action==='sleep'){game.act('sleep')}
  else if(action==='shape'){game.act('shape');setOverride('pet',1.0)}
  else if(action==='stash'){game.act('stash')}
  drainEvents();persist();
}
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.action)));

function normPointer(ev){const r=wrap.getBoundingClientRect();return{x:(ev.clientX-r.left)/r.width,y:(ev.clientY-r.top)/r.height,clientX:ev.clientX,clientY:ev.clientY};}
function onHamster(p){return Math.hypot((p.x-game.s.x)/.16,(p.y-game.s.y)/.22)<1.05}
wrap.addEventListener('pointerdown',ev=>{
  const p=normPointer(ev);wrap.setPointerCapture(ev.pointerId);
  pointer={id:ev.pointerId,start:p,last:p,t:performance.now(),moved:false,long:false,timer:null};
  if(onHamster(p))pointer.timer=setTimeout(()=>{if(pointer&&!pointer.moved){pointer.long=true;game.pickUp();setOverride('pickup',2.5);lastGesture='pickup';gestureCount++;updateUI();}},340);
});
wrap.addEventListener('pointermove',ev=>{
  if(!pointer||pointer.id!==ev.pointerId)return;const p=normPointer(ev);const dx=p.x-pointer.start.x,dy=p.y-pointer.start.y;
  if(Math.hypot(dx,dy)>.018)pointer.moved=true;
  if(pointer.long||game.s.mode==='carried'){game.move(p.x,p.y);pointer.long=true;clearTimeout(pointer.timer);updateUI();return;}
  pointer.last=p;
});
function finishPointer(ev){
  if(!pointer||pointer.id!==ev.pointerId)return;clearTimeout(pointer.timer);const p=normPointer(ev);const dx=p.x-pointer.start.x,dy=p.y-pointer.start.y,dt=Math.max(1,performance.now()-pointer.t);const wasOn=onHamster(pointer.start);
  if(pointer.long||game.s.mode==='carried'){
    game.drop(p.x,p.y);setOverride('drop',.9);lastGesture='drop';gestureCount++;setThought('轻轻放下');
  }else if(wasOn&&Math.abs(dx)>.035&&Math.abs(dx)>Math.abs(dy)*1.25&&dt<900){
    game.act('pet');setOverride('pet',1.45);lastGesture='nuzzle';gestureCount++;setThought('舒服地蹭过来');
  }else if(wasOn&&Math.hypot(dx,dy)<.018){
    game.act('pet');setOverride('pet',1.1);lastGesture='pet';gestureCount++;setThought('眯起眼睛');
  }else if(!wasOn){
    game.wake();game.s.mode='walking';game.s.target={x:THREE.MathUtils.clamp(p.x,.1,.9),y:THREE.MathUtils.clamp(p.y,.58,.84)};game.setPose('idle');setThought('哒哒哒');
  }
  pointer=null;drainEvents();persist();
}
wrap.addEventListener('pointerup',finishPointer);wrap.addEventListener('pointercancel',finishPointer);

async function init(){
  const gltf=await new GLTFLoader().loadAsync('./v2-assets-real/hamchan-cc0.glb');
  hamster=gltf.scene;normalize(hamster,1.72);tuneMaterials(hamster);actor=new THREE.Group();actor.add(hamster);scene.add(actor);
  const clips=buildClips(hamster);mixer=new THREE.AnimationMixer(hamster);for(const [name,clip] of Object.entries(clips)){actions[name]=mixer.clipAction(clip);actions[name].setLoop(THREE.LoopRepeat,Infinity)}
  const pos=worldFromState();actor.position.set(pos.x,0,pos.z);actor.rotation.y=-.92;chooseIdle();play('breath',0);
  loadScreen.classList.add('hidden');setTimeout(()=>loadScreen.hidden=true,330);document.body.dataset.ready='1';
  hint.textContent='在仓鼠身上横向滑动会蹭你；长按约 0.34 秒再拖动可以抱起。';
}
init().catch(err=>{console.error(err);loadScreen.textContent='团团加载失败，请刷新试试';document.body.dataset.ready='error'});

function loop(){requestAnimationFrame(loop);const now=performance.now(),dt=Math.min(clock.getDelta(),.05);game.update(dt,new Date());if(game.s.target&&['walking','hiding','searching'].includes(game.s.mode)){}updateModel(dt);if(mixer)mixer.update(dt);drainEvents();updateUI();saveTimer+=dt;if(saveTimer>1.5){saveTimer=0;persist()}
  const inst=1000/Math.max(1,now-lastFrame);lastFrame=now;fpsAccum+=inst;fpsFrames++;if(fpsFrames>=24){fps=Math.round(fpsAccum/fpsFrames);minFps=Math.min(minFps,fps);fpsAccum=0;fpsFrames=0;fpsReadout.textContent=`${fps} FPS`}
  renderer.render(scene,camera);
}
loop();

window.__v7Debug={
  snapshot:()=>({mode:game.s.mode,pose:game.s.pose,x:game.s.x,y:game.s.y,feed:game.s.totalFeeds,pet:game.s.totalPets,run:game.s.totalRuns,mood:game.s.mood,energy:game.s.energy,hunger:game.s.hunger,clip:currentClip,idle:idleKind,lastGesture,gestureCount,fps,minFps,bones:boneCount,modelReady:!!hamster}),
  setIdle:k=>{if(['breath','sniff','look','groom'].includes(k)){idleKind=k;nextIdleAt=game.s.time+99;manualOverride='';play(k,.12)}return idleKind},
  play:n=>{if(actions[n]){setOverride(n,1.5);return true}return false},
  save:()=>{persist();return true}
};
