import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { HamsterGame, restoreState, saveSnapshot, SAVE_KEY, ZONES } from './engine.js';

const $=id=>document.getElementById(id);
const canvas=$('stage'),status=$('status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.setSize(320,180,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;renderer.setClearColor(0xbfd5cf,1);

function loadSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch{return null}}
const game=new HamsterGame(restoreState(loadSave()));
const s=game.s;
let storageOK=true,lastSave=0;
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(saveSnapshot(s)));storageOK=true}catch{storageOK=false}updateHUD()}

const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xbfd5cf,9,18);
const camera=new THREE.OrthographicCamera(-3.65,3.65,2.06,-2.06,.1,30);camera.position.set(5.6,4.65,6.8);camera.lookAt(0,.48,0);
scene.add(new THREE.HemisphereLight(0xfff3de,0x78948e,1.45));
const sun=new THREE.DirectionalLight(0xffe0bd,1.9);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(512,512);scene.add(sun);
const floor=new THREE.Mesh(new THREE.BoxGeometry(8,.16,5.2),new THREE.MeshLambertMaterial({color:0xd8bc82}));floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
const back=new THREE.Mesh(new THREE.BoxGeometry(8,3.8,.12),new THREE.MeshLambertMaterial({color:0xdde7df}));back.position.set(0,1.82,-2.56);back.receiveShadow=true;scene.add(back);
const side=new THREE.Mesh(new THREE.BoxGeometry(.12,3.8,5.2),new THREE.MeshLambertMaterial({color:0xcbded8}));side.position.set(-3.94,1.82,0);side.receiveShadow=true;scene.add(side);
const trim=new THREE.Mesh(new THREE.BoxGeometry(7.85,.13,.12),new THREE.MeshLambertMaterial({color:0x789d96}));trim.position.set(0,.08,-2.43);scene.add(trim);

const loader=new GLTFLoader();
let hamster=null,hamsterBaseScale=null,mixer=null,currentAction=null,wheelRotor=null,stashMarker=null,seedCarry=null,looseSeed=null,orbit=false,targetYaw=-.35,targetPitch=0,targetTilt=0,time=0;
const sniffPuffs=[],tearDrops=[],dirtBits=[];
const worldFromGame=(x,y)=>new THREE.Vector3((x-.5)*5,.02,(y-.68)*4.2);
const CARE={bowl:worldFromGame(ZONES.bowl.x,ZONES.bowl.y),bed:worldFromGame(ZONES.house.x,ZONES.house.y),wheel:worldFromGame(ZONES.wheel.x,ZONES.wheel.y)};
const FURNITURE_POS={feed:CARE.bowl.clone().add(new THREE.Vector3(.22,0,.12)),sleep:CARE.bed.clone(),wheel:CARE.wheel.clone()};
const visual={pos:worldFromGame(s.x,s.y),nav:null,returnTo:null,lastMode:null};
const query=new URLSearchParams(location.search),AUTO_ACTION=query.get('action');
const raycaster=new THREE.Raycaster(),pointerNdc=new THREE.Vector2(),dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.02),dragPoint=new THREE.Vector3();
const drag={active:false,pointerId:null,target:'ground',offsetX:0,offsetZ:0};
const gesture={active:false,pointerId:null,startX:0,startY:0,longTimer:null,consumed:false};
const stashDrag={active:false,pointerId:null,offsetX:0,offsetZ:0,preview:null};
const interactiveHits=[];
let dropHalo=null,hoverHalo=null,hoverAction=null;
const gameFromWorld=point=>({x:Math.max(.08,Math.min(.92,point.x/5+.5)),y:Math.max(.38,Math.min(.86,point.z/4.2+.68))});
const zoneDistance=(p,z)=>Math.hypot(p.x-z.x,p.y-z.y);

function nearestTextures(root){root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m?.map){m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.NearestFilter;m.map.generateMipmaps=false;m.map.colorSpace=THREE.SRGBColorSpace}if(m){m.metalness=0;m.roughness=1;if(m.emissive)m.emissive.setHex(0)}}});}
function normalize(root,size=1){const box=new THREE.Box3().setFromObject(root),dims=new THREE.Vector3();box.getSize(dims);const k=size/Math.max(dims.x,dims.y,dims.z);root.scale.multiplyScalar(k);const box2=new THREE.Box3().setFromObject(root),c=new THREE.Vector3();box2.getCenter(c);root.position.sub(c);root.position.y-=new THREE.Box3().setFromObject(root).min.y;return root;}
function tint(root,color){root.traverse(o=>{if(!o.isMesh)return;const src=Array.isArray(o.material)?o.material:[o.material];const out=src.map(m=>{const n=m.clone();if(n.color)n.color.setHex(color);n.metalness=0;n.roughness=1;return n});o.material=Array.isArray(o.material)?out:out[0]});}
function load(url){return new Promise((resolve,reject)=>loader.load(url,g=>resolve(g.scene),undefined,reject));}
async function addFurniture(file,pos,size,color,rot=0){const root=normalize(await load(`./v2-assets-real/${file}`),size);nearestTextures(root);tint(root,color);root.position.add(new THREE.Vector3(...pos));root.rotation.y=rot;scene.add(root);return root;}
function addInteractiveHit(root,geometry,position,action){const hit=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.position.copy(position);hit.userData.interactAction=action;root.add(hit);interactiveHits.push(hit);return hit;}

function makeCareProps(){
  const bowl=new THREE.Group();
  const outer=new THREE.Mesh(new THREE.CylinderGeometry(.34,.29,.15,20),new THREE.MeshLambertMaterial({color:0xd78f86}));outer.position.y=.08;outer.castShadow=true;outer.receiveShadow=true;bowl.add(outer);
  const food=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.025,18),new THREE.MeshLambertMaterial({color:0x8d6648}));food.position.y=.17;bowl.add(food);bowl.position.copy(CARE.bowl).add(new THREE.Vector3(.22,0,.12));addInteractiveHit(bowl,new THREE.CylinderGeometry(.5,.5,.36,16),new THREE.Vector3(0,.18,0),'feed');scene.add(bowl);
  const bed=new THREE.Group();
  const cushion=new THREE.Mesh(new THREE.CylinderGeometry(.58,.63,.14,24),new THREE.MeshLambertMaterial({color:0xe9c7bd}));cushion.position.y=.08;cushion.receiveShadow=true;bed.add(cushion);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.54,.11,8,28),new THREE.MeshLambertMaterial({color:0xc9958b}));rim.rotation.x=Math.PI/2;rim.position.y=.13;rim.castShadow=true;bed.add(rim);bed.position.copy(CARE.bed);addInteractiveHit(bed,new THREE.CylinderGeometry(.76,.76,.3,20),new THREE.Vector3(0,.15,0),'sleep');scene.add(bed);
  const wheel=new THREE.Group(),standMat=new THREE.MeshLambertMaterial({color:0x8caaa3}),wheelMat=new THREE.MeshLambertMaterial({color:0xd9a5a6});
  const stand=new THREE.Mesh(new THREE.BoxGeometry(.1,1.7,.1),standMat);stand.position.set(0,.78,-.18);stand.castShadow=true;wheel.add(stand);
  const foot=new THREE.Mesh(new THREE.BoxGeometry(.9,.1,.65),standMat);foot.position.set(0,.05,-.18);foot.castShadow=true;wheel.add(foot);wheelRotor=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.82,.06,8,32),wheelMat);ring.castShadow=true;wheelRotor.add(ring);
  for(let i=0;i<6;i++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(1.48,.035,.04),wheelMat);spoke.rotation.z=i*Math.PI/6;wheelRotor.add(spoke)}
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.18,12),standMat);hub.rotation.x=Math.PI/2;wheelRotor.add(hub);wheelRotor.position.y=.98;wheel.add(wheelRotor);wheel.position.copy(CARE.wheel);addInteractiveHit(wheel,new THREE.BoxGeometry(1.9,2.05,.9),new THREE.Vector3(0,.98,-.04),'wheel');scene.add(wheel);

  dropHalo=new THREE.Mesh(new THREE.RingGeometry(.32,.45,28),new THREE.MeshBasicMaterial({color:0x89b8ae,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));
  dropHalo.rotation.x=-Math.PI/2;dropHalo.position.y=.035;dropHalo.visible=false;scene.add(dropHalo);
  hoverHalo=new THREE.Mesh(new THREE.RingGeometry(.38,.54,28),new THREE.MeshBasicMaterial({color:0x89b8ae,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));hoverHalo.rotation.x=-Math.PI/2;hoverHalo.position.y=.03;hoverHalo.visible=false;scene.add(hoverHalo);
  stashMarker=new THREE.Group();
  const mound=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),new THREE.MeshLambertMaterial({color:0x9a7658}));mound.scale.set(1,.34,.78);mound.position.y=.045;mound.castShadow=true;stashMarker.add(mound);
  const hiddenSeed=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.18,8),new THREE.MeshLambertMaterial({color:0xcaa45f}));hiddenSeed.rotation.z=Math.PI/2;hiddenSeed.position.set(.03,.095,0);stashMarker.add(hiddenSeed);addInteractiveHit(stashMarker,new THREE.CylinderGeometry(.27,.27,.24,12),new THREE.Vector3(0,.11,0),'move-stash');stashMarker.visible=false;scene.add(stashMarker);
  seedCarry=hiddenSeed.clone();seedCarry.visible=false;scene.add(seedCarry);
  looseSeed=new THREE.Group();const seedA=hiddenSeed.clone();seedA.scale.setScalar(1.7);seedA.position.set(0,.08,0);looseSeed.add(seedA);const seedB=hiddenSeed.clone();seedB.scale.setScalar(1.35);seedB.rotation.y=.8;seedB.position.set(.11,.075,.05);looseSeed.add(seedB);looseSeed.position.copy(FURNITURE_POS.feed).add(new THREE.Vector3(-.68,.02,.22));addInteractiveHit(looseSeed,new THREE.SphereGeometry(.23,10,8),new THREE.Vector3(.05,.09,.02),'stash');scene.add(looseSeed);
  for(let i=0;i<3;i++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshLambertMaterial({color:0xf6efe4,transparent:true,opacity:.75}));puff.visible=false;sniffPuffs.push(puff);scene.add(puff)}
  for(let i=0;i<2;i++){const tear=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshLambertMaterial({color:0x87b9c7,transparent:true,opacity:.9}));tear.visible=false;tearDrops.push(tear);scene.add(tear)}
  for(let i=0;i<5;i++){const bit=new THREE.Mesh(new THREE.SphereGeometry(.025,6,5),new THREE.MeshLambertMaterial({color:i%2?0xa57d58:0xc39a69}));bit.visible=false;dirtBits.push(bit);scene.add(bit)}
}

function buildBoneClips(root){
  const bones={};
  root.traverse(o=>{if(!o.isBone)return;const source=o.userData?.name||o.name;const short=source.includes(':')?source.split(':').pop():source.replace(/^mixamorig[_-]?/,'');o.name=o.name.replace(/[^A-Za-z0-9_-]/g,'_');bones[short]=o;});
  const q=(bone,x=0,y=0,z=0)=>bone.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)));
  const qTrack=(bone,times,poses)=>{if(!bone)return null;const values=[];for(const p of poses){const v=q(bone,p[0]||0,p[1]||0,p[2]||0);values.push(v.x,v.y,v.z,v.w)}return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,times,values)};
  const pTrack=(bone,times,offsets)=>{if(!bone)return null;const base=bone.position.clone(),values=[];for(const o of offsets)values.push(base.x+(o[0]||0),base.y+(o[1]||0),base.z+(o[2]||0));return new THREE.VectorKeyframeTrack(`${bone.name}.position`,times,values)};
  const clip=(name,duration,tracks)=>new THREE.AnimationClip(name,duration,tracks.filter(Boolean));

  const idleTimes=[0,.6,1.2,1.8,2.4];
  const idle=clip('idle',2.4,[
    pTrack(bones.Hips,idleTimes,[[0,0,0],[0,.00035,0],[0,0,0],[0,-.0002,0],[0,0,0]]),
    qTrack(bones.Spine2,idleTimes,[[0,0,0],[.026,0,.015],[0,0,0],[-.016,0,-.012],[0,0,0]]),
    qTrack(bones.Head,idleTimes,[[0,0,0],[.012,.05,0],[0,0,0],[.018,-.04,0],[0,0,0]]),
    qTrack(bones.LeftArm,idleTimes,[[0,0,0],[.016,0,.012],[0,0,0],[-.01,0,-.008],[0,0,0]]),
    qTrack(bones.RightArm,idleTimes,[[0,0,0],[-.01,0,-.01],[0,0,0],[.014,0,.01],[0,0,0]])
  ]);

  const walkTimes=[0,.225,.45,.675,.9];
  const walk=clip('walk',.9,[
    pTrack(bones.Hips,walkTimes,[[0,-.0015,0],[0,-.00035,.0005],[0,-.0013,0],[0,-.00025,-.0004],[0,-.0015,0]]),
    qTrack(bones.Hips,walkTimes,[[.025,0,.018],[.01,0,0],[.025,0,-.018],[.01,0,0],[.025,0,.018]]),
    qTrack(bones.LeftUpLeg,walkTimes,[[.34,0,0],[.08,0,0],[-.32,0,0],[-.06,0,0],[.34,0,0]]),
    qTrack(bones.RightUpLeg,walkTimes,[[-.32,0,0],[-.06,0,0],[.34,0,0],[.08,0,0],[-.32,0,0]]),
    qTrack(bones.LeftLeg,walkTimes,[[-.1,0,0],[.05,0,0],[.14,0,0],[.02,0,0],[-.1,0,0]]),
    qTrack(bones.RightLeg,walkTimes,[[.14,0,0],[.02,0,0],[-.1,0,0],[.05,0,0],[.14,0,0]]),
    qTrack(bones.LeftArm,walkTimes,[[-.14,0,.035],[.02,0,0],[.16,0,-.025],[0,0,0],[-.14,0,.035]]),
    qTrack(bones.RightArm,walkTimes,[[.16,0,-.025],[0,0,0],[-.14,0,.035],[.02,0,0],[.16,0,-.025]]),
    qTrack(bones.Spine2,walkTimes,[[.04,0,.05],[.025,0,0],[.04,0,-.05],[.025,0,0],[.04,0,.05]]),
    qTrack(bones.Head,walkTimes,[[-.012,-.025,-.018],[.008,0,0],[-.012,.025,.018],[.008,0,0],[-.012,-.025,-.018]])
  ]);

  const runTimes=[0,.15,.3,.45,.6];
  const run=clip('run',.6,[
    pTrack(bones.Hips,runTimes,[[0,-.0011,0],[0,.0012,.0009],[0,-.001,0],[0,.0011,-.0007],[0,-.0011,0]]),
    qTrack(bones.Hips,runTimes,[[.065,0,.028],[.035,0,0],[.065,0,-.028],[.035,0,0],[.065,0,.028]]),
    qTrack(bones.LeftUpLeg,runTimes,[[.5,0,0],[.12,0,0],[-.48,0,0],[-.12,0,0],[.5,0,0]]),
    qTrack(bones.RightUpLeg,runTimes,[[-.48,0,0],[-.12,0,0],[.5,0,0],[.12,0,0],[-.48,0,0]]),
    qTrack(bones.LeftLeg,runTimes,[[-.16,0,0],[.1,0,0],[.2,0,0],[.04,0,0],[-.16,0,0]]),
    qTrack(bones.RightLeg,runTimes,[[.2,0,0],[.04,0,0],[-.16,0,0],[.1,0,0],[.2,0,0]]),
    qTrack(bones.LeftArm,runTimes,[[-.3,0,.055],[.02,0,0],[.3,0,-.055],[0,0,0],[-.3,0,.055]]),
    qTrack(bones.RightArm,runTimes,[[.3,0,-.055],[0,0,0],[-.3,0,.055],[.02,0,0],[.3,0,-.055]]),
    qTrack(bones.Spine2,runTimes,[[.095,0,.075],[.065,0,0],[.095,0,-.075],[.065,0,0],[.095,0,.075]]),
    qTrack(bones.Head,runTimes,[[-.035,-.035,-.02],[.005,0,0],[-.035,.035,.02],[.005,0,0],[-.035,-.035,-.02]])
  ]);

  const eatTimes=[0,.25,.5,.75,1,1.25];
  const eat=clip('eat',1.25,[
    pTrack(bones.Hips,eatTimes,[[0,-.0025,0],[0,-.0028,0],[0,-.0025,0],[0,-.0028,0],[0,-.0025,0],[0,-.0025,0]]),
    qTrack(bones.Spine2,eatTimes,[[.075,0,0],[.1,0,0],[.07,0,0],[.105,0,0],[.075,0,0],[.075,0,0]]),
    qTrack(bones.LeftArm,eatTimes,[[-.37,0,.13],[-.46,.02,.18],[-.36,0,.11],[-.47,-.015,.18],[-.38,0,.13],[-.37,0,.13]]),
    qTrack(bones.RightArm,eatTimes,[[-.37,0,-.13],[-.46,-.02,-.18],[-.36,0,-.11],[-.47,.015,-.18],[-.38,0,-.13],[-.37,0,-.13]]),
    qTrack(bones.LeftForeArm,eatTimes,[[-.3,0,0],[-.4,0,.03],[-.3,0,0],[-.4,0,-.02],[-.31,0,0],[-.3,0,0]]),
    qTrack(bones.RightForeArm,eatTimes,[[-.3,0,0],[-.4,0,-.03],[-.3,0,0],[-.4,0,.02],[-.31,0,0],[-.3,0,0]]),
    qTrack(bones.Head,eatTimes,[[.055,0,0],[.13,.018,0],[.045,0,0],[.125,-.018,0],[.055,0,0],[.055,0,0]])
  ]);

  const sleepTimes=[0,.8,1.6,2.4,3.2];
  const sleep=clip('sleep',3.2,[
    pTrack(bones.Hips,sleepTimes,[[0,-.014,0],[0,-.015,.0005],[0,-.0145,0],[0,-.015,-.0004],[0,-.014,0]]),
    qTrack(bones.Hips,sleepTimes,[[.12,0,1.0],[.1,.02,1.04],[.12,0,1.0],[.1,-.02,.96],[.12,0,1.0]]),
    qTrack(bones.Spine2,sleepTimes,[[-.18,0,-.12],[-.2,.015,-.14],[-.18,0,-.12],[-.2,-.015,-.1],[-.18,0,-.12]]),
    qTrack(bones.Head,sleepTimes,[[-.18,-.08,-.2],[-.15,-.04,-.22],[-.18,-.08,-.2],[-.16,-.1,-.18],[-.18,-.08,-.2]]),
    qTrack(bones.LeftArm,sleepTimes,[[-.45,0,.25],[-.48,0,.27],[-.45,0,.25],[-.46,0,.23],[-.45,0,.25]]),
    qTrack(bones.RightArm,sleepTimes,[[-.45,0,-.25],[-.48,0,-.27],[-.45,0,-.25],[-.46,0,-.23],[-.45,0,-.25]]),
    qTrack(bones.LeftUpLeg,sleepTimes,[[.3,0,.18],[.32,0,.2],[.3,0,.18],[.28,0,.16],[.3,0,.18]]),
    qTrack(bones.RightUpLeg,sleepTimes,[[.3,0,-.18],[.32,0,-.2],[.3,0,-.18],[.28,0,-.16],[.3,0,-.18]])
  ]);

  const pickupTimes=[0,.4,.8,1.2,1.6];
  const pickup=clip('pickup',1.6,[
    pTrack(bones.Hips,pickupTimes,[[0,.014,0],[.001,.018,0],[0,.016,0],[-.001,.018,0],[0,.014,0]]),
    qTrack(bones.Hips,pickupTimes,[[0,0,.035],[.02,0,-.025],[0,0,.02],[-.02,0,-.03],[0,0,.035]]),
    qTrack(bones.LeftArm,pickupTimes,[[-.48,0,.18],[-.54,0,.22],[-.5,0,.18],[-.54,0,.2],[-.48,0,.18]]),
    qTrack(bones.RightArm,pickupTimes,[[-.48,0,-.18],[-.54,0,-.22],[-.5,0,-.18],[-.54,0,-.2],[-.48,0,-.18]]),
    qTrack(bones.LeftForeArm,pickupTimes,[[-.36,0,.04],[-.42,0,.02],[-.38,0,.04],[-.42,0,.02],[-.36,0,.04]]),
    qTrack(bones.RightForeArm,pickupTimes,[[-.36,0,-.04],[-.42,0,-.02],[-.38,0,-.04],[-.42,0,-.02],[-.36,0,-.04]]),
    qTrack(bones.LeftUpLeg,pickupTimes,[[.48,0,.12],[.55,0,.15],[.5,0,.12],[.55,0,.14],[.48,0,.12]]),
    qTrack(bones.RightUpLeg,pickupTimes,[[.48,0,-.12],[.55,0,-.15],[.5,0,-.12],[.55,0,-.14],[.48,0,-.12]]),
    qTrack(bones.Head,pickupTimes,[[0,-.04,0],[.02,.055,.02],[0,-.03,0],[.02,.045,-.02],[0,-.04,0]])
  ]);

  const wheelTimes=[0,.13,.26,.39,.52];
  const wheel=clip('wheel',.52,[
    pTrack(bones.Hips,wheelTimes,[[0,-.001,0],[0,.0016,.001],[0,-.0008,0],[0,.0015,-.0008],[0,-.001,0]]),
    qTrack(bones.Hips,wheelTimes,[[.09,0,.035],[.06,0,0],[.09,0,-.035],[.06,0,0],[.09,0,.035]]),
    qTrack(bones.Spine2,wheelTimes,[[.15,0,.09],[.11,0,0],[.15,0,-.09],[.11,0,0],[.15,0,.09]]),
    qTrack(bones.LeftUpLeg,wheelTimes,[[.58,0,0],[.1,0,0],[-.55,0,0],[-.1,0,0],[.58,0,0]]),
    qTrack(bones.RightUpLeg,wheelTimes,[[-.55,0,0],[-.1,0,0],[.58,0,0],[.1,0,0],[-.55,0,0]]),
    qTrack(bones.LeftLeg,wheelTimes,[[-.2,0,0],[.12,0,0],[.24,0,0],[.05,0,0],[-.2,0,0]]),
    qTrack(bones.RightLeg,wheelTimes,[[.24,0,0],[.05,0,0],[-.2,0,0],[.12,0,0],[.24,0,0]]),
    qTrack(bones.LeftArm,wheelTimes,[[-.34,0,.06],[.04,0,0],[.34,0,-.06],[0,0,0],[-.34,0,.06]]),
    qTrack(bones.RightArm,wheelTimes,[[.34,0,-.06],[0,0,0],[-.34,0,.06],[.04,0,0],[.34,0,-.06]]),
    qTrack(bones.Head,wheelTimes,[[-.06,-.04,-.025],[-.02,0,0],[-.06,.04,.025],[-.02,0,0],[-.06,-.04,-.025]])
  ]);

  const ballTimes=[0,.45,.9,1.35];
  const ball=clip('ball',1.35,[
    pTrack(bones.Hips,ballTimes,[[0,-.010,0],[0,-.011,0],[0,-.0105,0],[0,-.010,0]]),
    qTrack(bones.Hips,ballTimes,[[.12,0,0],[.15,.02,0],[.12,0,0],[.12,0,0]]),
    qTrack(bones.Spine2,ballTimes,[[.2,0,0],[.23,0,.03],[.2,0,-.02],[.2,0,0]]),
    qTrack(bones.Head,ballTimes,[[.13,0,0],[.16,.04,0],[.13,-.03,0],[.13,0,0]]),
    qTrack(bones.LeftArm,ballTimes,[[-.52,0,.24],[-.56,0,.27],[-.52,0,.24],[-.52,0,.24]]),
    qTrack(bones.RightArm,ballTimes,[[-.52,0,-.24],[-.56,0,-.27],[-.52,0,-.24],[-.52,0,-.24]]),
    qTrack(bones.LeftUpLeg,ballTimes,[[.5,0,.18],[.54,0,.2],[.5,0,.18],[.5,0,.18]]),
    qTrack(bones.RightUpLeg,ballTimes,[[.5,0,-.18],[.54,0,-.2],[.5,0,-.18],[.5,0,-.18]])
  ]);

  const pancakeTimes=[0,.55,1.1,1.65];
  const pancake=clip('pancake',1.65,[
    pTrack(bones.Hips,pancakeTimes,[[0,-.015,0],[0,-.016,0],[0,-.0155,0],[0,-.015,0]]),
    qTrack(bones.Hips,pancakeTimes,[[.34,0,0],[.36,0,.02],[.34,0,-.02],[.34,0,0]]),
    qTrack(bones.Spine2,pancakeTimes,[[.27,0,0],[.29,0,.02],[.27,0,-.02],[.27,0,0]]),
    qTrack(bones.Head,pancakeTimes,[[-.02,0,0],[.01,.035,0],[-.02,-.035,0],[-.02,0,0]]),
    qTrack(bones.LeftArm,pancakeTimes,[[-.08,0,.42],[-.1,0,.46],[-.08,0,.42],[-.08,0,.42]]),
    qTrack(bones.RightArm,pancakeTimes,[[-.08,0,-.42],[-.1,0,-.46],[-.08,0,-.42],[-.08,0,-.42]]),
    qTrack(bones.LeftUpLeg,pancakeTimes,[[.12,0,.34],[.14,0,.38],[.12,0,.34],[.12,0,.34]]),
    qTrack(bones.RightUpLeg,pancakeTimes,[[.12,0,-.34],[.14,0,-.38],[.12,0,-.34],[.12,0,-.34]])
  ]);

  const searchTimes=[0,.3,.6,.9,1.2];
  const search=clip('search',1.2,[
    pTrack(bones.Hips,searchTimes,[[0,-.004,0],[0,-.0035,.0005],[0,-.004,0],[0,-.0035,-.0005],[0,-.004,0]]),
    qTrack(bones.Spine2,searchTimes,[[.11,0,.03],[.13,0,-.02],[.11,0,-.03],[.13,0,.02],[.11,0,.03]]),
    qTrack(bones.Head,searchTimes,[[.16,-.24,-.04],[.22,0,0],[.16,.24,.04],[.22,0,0],[.16,-.24,-.04]]),
    qTrack(bones.LeftArm,searchTimes,[[-.16,0,.06],[-.08,0,0],[.12,0,-.04],[0,0,0],[-.16,0,.06]]),
    qTrack(bones.RightArm,searchTimes,[[.12,0,-.04],[0,0,0],[-.16,0,.06],[-.08,0,0],[.12,0,-.04]])
  ]);

  const buryTimes=[0,.22,.44,.66,.88];
  const bury=clip('bury',.88,[
    pTrack(bones.Hips,buryTimes,[[0,-.006,0],[0,-.007,0],[0,-.006,0],[0,-.007,0],[0,-.006,0]]),
    qTrack(bones.Spine2,buryTimes,[[.18,0,0],[.24,0,.03],[.18,0,0],[.24,0,-.03],[.18,0,0]]),
    qTrack(bones.Head,buryTimes,[[.2,0,0],[.27,.03,0],[.2,0,0],[.27,-.03,0],[.2,0,0]]),
    qTrack(bones.LeftArm,buryTimes,[[-.5,0,.12],[-.18,0,.05],[-.52,0,.12],[-.18,0,.05],[-.5,0,.12]]),
    qTrack(bones.RightArm,buryTimes,[[-.18,0,-.05],[-.52,0,-.12],[-.18,0,-.05],[-.5,0,-.12],[-.18,0,-.05]])
  ]);

  const cryTimes=[0,.28,.56,.84,1.12];
  const cry=clip('cry',1.12,[
    pTrack(bones.Hips,cryTimes,[[0,-.008,0],[.0004,-.0085,0],[-.0004,-.008,0],[.0004,-.0085,0],[0,-.008,0]]),
    qTrack(bones.Spine2,cryTimes,[[.18,0,.025],[.2,0,-.025],[.18,0,.025],[.2,0,-.025],[.18,0,.025]]),
    qTrack(bones.Head,cryTimes,[[.26,0,.035],[.29,-.025,-.035],[.26,.025,.035],[.29,-.025,-.035],[.26,0,.035]]),
    qTrack(bones.LeftArm,cryTimes,[[-.5,0,.2],[-.54,0,.22],[-.5,0,.2],[-.54,0,.22],[-.5,0,.2]]),
    qTrack(bones.RightArm,cryTimes,[[-.5,0,-.2],[-.54,0,-.22],[-.5,0,-.2],[-.54,0,-.22],[-.5,0,-.2]])
  ]);

  return {idle,walk,run,eat,sleep,pickup,wheel,ball,pancake,search,bury,cry,bones,boneCount:Object.keys(bones).length};
}

const actions={};
function play(name,fade=.28){const next=actions[name];if(!next||currentAction===next)return;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();if(currentAction)currentAction.crossFadeTo(next,fade,false);currentAction=next;document.body.dataset.clip=name;}
function flushEvents(){const events=game.drainEvents();if(events.length)status.textContent=events.at(-1).text;}
function setCareActive(kind){document.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('active',b.dataset.action===kind));}
function moveVisualToward(target,dt,speed=.9){const dx=target.x-visual.pos.x,dz=target.z-visual.pos.z,d=Math.hypot(dx,dz);if(d<.035){visual.pos.x=target.x;visual.pos.z=target.z;return true}const step=Math.min(d,speed*dt);visual.pos.x+=dx/d*step;visual.pos.z+=dz/d*step;targetYaw=Math.atan2(dx,dz);return false;}
function engineWorld(){return worldFromGame(s.x,s.y)}

function queueFurnitureAction(kind){
  if(!hamster)return false;
  if(kind==='sleep'&&s.mode==='sleeping'){game.act('sleep');flushEvents();visual.nav={stage:'return',kind:'sleep',target:engineWorld()};persist();return true;}
  if(visual.nav||s.mode==='carried')return false;
  const target=kind==='feed'?CARE.bowl:CARE.bed;
  visual.nav={stage:'to-action',kind,target:target.clone()};setCareActive(kind);play('walk');status.textContent=kind==='feed'?'团团走去食盆…':'团团走去小窝…';return true;
}
function beginAction(kind){
  if(kind==='feed'||kind==='sleep')return queueFurnitureAction(kind);
  if(kind==='wheel'){if(visual.nav)return false;const ok=game.act('wheel');flushEvents();persist();return ok;}
  if(kind==='pickup'){
    if(visual.nav)return false;
    if(s.mode==='carried'){game.drop(s.x,s.y);status.textContent='轻轻放回地面。'}else{game.pickUp();status.textContent='被捧起来啦，小爪子收好。'}
    flushEvents();persist();return true;
  }
  if(['pet','shape','stash'].includes(kind)){
    if(visual.nav||s.mode==='carried')return false;const ok=game.act(kind);flushEvents();persist();return ok;
  }
  if(kind==='move-stash'){
    if(visual.nav||s.mode==='carried'||!s.stash)return false;
    game.revealStash();const nx=s.stash.x>.5?.22:.78,ny=s.stash.y>.74?.66:.82;game.moveStash(nx,ny);flushEvents();persist();return true;
  }
  return false;
}

function pointerRay(event){
  const rect=canvas.getBoundingClientRect();
  pointerNdc.set(((event.clientX-rect.left)/rect.width)*2-1,-(((event.clientY-rect.top)/rect.height)*2-1));
  raycaster.setFromCamera(pointerNdc,camera);
}
function pointerGround(event){pointerRay(event);return raycaster.ray.intersectPlane(dragPlane,dragPoint)?dragPoint.clone():null;}
function adjustedDragPoint(point){const p=point.clone();p.x+=drag.offsetX;p.z+=drag.offsetZ;return p;}
function pointerHitsHamster(event){if(!hamster)return false;pointerRay(event);return raycaster.intersectObject(hamster,true).length>0;}
function pointerInteractionAction(event){
  pointerRay(event);const hits=raycaster.intersectObjects(interactiveHits,false),valid=[];
  for(const hit of hits){const action=hit?.object?.userData?.interactAction;if(!action)continue;
    if(action==='stash'&&(s.stash||visual.nav||s.mode==='carried'))continue;
    if(action==='move-stash'&&(!s.stash||s.mode==='hiding'||visual.nav||s.mode==='carried'))continue;
    valid.push(action);
  }
  for(const preferred of ['move-stash','stash','feed','sleep','wheel'])if(valid.includes(preferred))return preferred;
  return valid[0]||null;
}
function interactionPosition(action){if(FURNITURE_POS[action])return FURNITURE_POS[action];if(action==='stash'&&looseSeed)return looseSeed.position;if(action==='move-stash'&&stashMarker)return stashMarker.position;return null;}
function setInteractionHover(action){
  hoverAction=action||null;document.body.dataset.hoverAction=hoverAction||'';
  if(!hoverHalo)return;if(!hoverAction||drag.active||gesture.active||stashDrag.active){hoverHalo.visible=false;return;}
  const pos=interactionPosition(hoverAction);if(!pos){hoverHalo.visible=false;return;}hoverHalo.visible=true;hoverHalo.position.set(pos.x,.031,pos.z);
  const color=hoverAction==='feed'?0xd78f86:hoverAction==='sleep'?0xd8ad83:hoverAction==='wheel'?0x89b8ae:hoverAction==='stash'?0xe0b25d:0x9a7658;hoverHalo.material.color.setHex(color);
}
function classifyDrop(point){const g=gameFromWorld(point);if(zoneDistance(g,ZONES.wheel)<ZONES.wheel.radius+.035)return'wheel';if(zoneDistance(g,ZONES.house)<ZONES.house.radius)return'house';return'ground';}
function updateDropFeedback(point){
  if(!dropHalo)return;const g=gameFromWorld(point),w=worldFromGame(g.x,g.y),kind=classifyDrop(point);
  dropHalo.visible=true;dropHalo.position.set(w.x,.026,w.z);drag.target=kind;document.body.dataset.dropTarget=kind;
  if(kind==='wheel')dropHalo.material.color.setHex(0xd7949d);else if(kind==='house')dropHalo.material.color.setHex(0xd8ad83);else dropHalo.material.color.setHex(0x89b8ae);
  status.textContent=kind==='wheel'?'松手：放进滚轮':kind==='house'?'松手：放进小窝':'拖动中…松手轻轻放下';
}
function startStashDrag(event){
  if(!s.stash||!stashMarker)return false;event.preventDefault();setInteractionHover(null);gesture.active=false;clearGestureTimer();stashDrag.active=true;stashDrag.pointerId=event.pointerId;document.body.dataset.stashDragging='1';canvas.classList.add('dragging');canvas.style.cursor='grabbing';
  try{canvas.setPointerCapture(event.pointerId)}catch{}
  const point=pointerGround(event),current=worldFromGame(s.stash.x,s.stash.y);if(point){stashDrag.offsetX=current.x-point.x;stashDrag.offsetZ=current.z-point.z;stashDrag.preview=current.clone();}
  if(dropHalo){dropHalo.visible=true;dropHalo.material.color.setHex(0x9a7658);dropHalo.position.set(current.x,.026,current.z);}
  status.textContent='偷偷挪粮仓中…松手重新藏好';return true;
}
function moveStashDrag(event){
  if(!stashDrag.active||event.pointerId!==stashDrag.pointerId)return false;event.preventDefault();const point=pointerGround(event);if(!point)return true;point.x+=stashDrag.offsetX;point.z+=stashDrag.offsetZ;const g=gameFromWorld(point);g.y=Math.max(.61,Math.min(.85,g.y));const w=worldFromGame(g.x,g.y);stashDrag.preview=w.clone();if(stashMarker)stashMarker.position.set(w.x,.02,w.z);if(dropHalo){dropHalo.visible=true;dropHalo.position.set(w.x,.026,w.z);dropHalo.material.color.setHex(0x9a7658);}document.body.dataset.stashTarget=`${g.x.toFixed(3)},${g.y.toFixed(3)}`;return true;
}
function finishStashDrag(event,cancelled=false){
  if(!stashDrag.active||event.pointerId!==stashDrag.pointerId)return false;event.preventDefault?.();let g={x:s.stash?.x??.5,y:s.stash?.y??.75};if(!cancelled){const point=pointerGround(event);if(point){point.x+=stashDrag.offsetX;point.z+=stashDrag.offsetZ;g=gameFromWorld(point);g.y=Math.max(.61,Math.min(.85,g.y));}game.revealStash();game.moveStash(g.x,g.y);flushEvents();persist();}
  stashDrag.active=false;stashDrag.pointerId=null;stashDrag.preview=null;document.body.dataset.stashDragging='0';document.body.dataset.stashTarget='';canvas.classList.remove('dragging');canvas.style.cursor='pointer';if(dropHalo)dropHalo.visible=false;try{if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId)}catch{}return true;
}
function clearGestureTimer(){if(gesture.longTimer){clearTimeout(gesture.longTimer);gesture.longTimer=null;}}
function resetGesture(){clearGestureTimer();gesture.active=false;gesture.pointerId=null;gesture.consumed=false;document.body.dataset.gesture='';}
function beginActualDrag(event){
  clearGestureTimer();gesture.active=false;event.preventDefault();orbit=false;$('camera-orbit')?.classList.remove('active');drag.active=true;drag.pointerId=event.pointerId;document.body.dataset.dragging='1';document.body.dataset.gesture='drag';canvas.classList.add('dragging');setInteractionHover(null);
  try{canvas.setPointerCapture(event.pointerId)}catch{}
  if(s.mode!=='carried')game.pickUp();flushEvents();const point=pointerGround(event);if(point){const current=engineWorld();drag.offsetX=current.x-point.x;drag.offsetZ=current.z-point.z;const adjusted=adjustedDragPoint(point),g=gameFromWorld(adjusted);game.move(g.x,g.y);updateDropFeedback(adjusted)}persist();
}
function startPointerGesture(event){
  if((event.pointerType==='mouse'&&event.button!==0)||!hamster)return;
  const hitsHamster=!visual.nav&&pointerHitsHamster(event);
  if(!hitsHamster){const action=pointerInteractionAction(event);if(action){event.preventDefault();setInteractionHover(action);if(action==='move-stash')startStashDrag(event);else beginAction(action)}return;}
  event.preventDefault();setInteractionHover(null);gesture.active=true;gesture.pointerId=event.pointerId;gesture.startX=event.clientX;gesture.startY=event.clientY;gesture.consumed=false;document.body.dataset.gesture='press';
  try{canvas.setPointerCapture(event.pointerId)}catch{}
  gesture.longTimer=setTimeout(()=>{if(!gesture.active||gesture.pointerId!==event.pointerId||drag.active)return;gesture.consumed=true;document.body.dataset.gesture='longpress';beginAction('shape');status.textContent=s.pose==='pancake'?'长按变成软软鼠饼～':'长按团成仓鼠球～';},520);
}
function movePointerGesture(event){
  if(stashDrag.active&&event.pointerId===stashDrag.pointerId){moveStashDrag(event);return;}
  if(drag.active&&event.pointerId===drag.pointerId){event.preventDefault();const point=pointerGround(event);if(!point)return;const adjusted=adjustedDragPoint(point),g=gameFromWorld(adjusted);game.move(g.x,g.y);updateDropFeedback(adjusted);return;}
  if(gesture.active&&event.pointerId===gesture.pointerId){const d=Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY);if(d>10&&!gesture.consumed){beginActualDrag(event);return;}return;}
  if(!drag.active&&hamster){const overHamster=pointerHitsHamster(event),action=overHamster?null:pointerInteractionAction(event);setInteractionHover(action);canvas.style.cursor=overHamster?'pointer':action?'pointer':'default';}
}
function finishPointerGesture(event,cancelled=false){
  if(stashDrag.active&&event.pointerId===stashDrag.pointerId){finishStashDrag(event,cancelled);return;}
  if(drag.active&&event.pointerId===drag.pointerId){event.preventDefault?.();let g={x:s.x,y:s.y};if(!cancelled){const point=pointerGround(event);if(point)g=gameFromWorld(adjustedDragPoint(point))}game.drop(g.x,g.y);flushEvents();persist();drag.active=false;drag.pointerId=null;document.body.dataset.dragging='0';document.body.dataset.dropTarget='';document.body.dataset.gesture='';canvas.classList.remove('dragging');canvas.style.cursor='pointer';if(dropHalo)dropHalo.visible=false;try{if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId)}catch{}return;}
  if(!gesture.active||event.pointerId!==gesture.pointerId)return;event.preventDefault?.();clearGestureTimer();const shouldPet=!cancelled&&!gesture.consumed;if(shouldPet){document.body.dataset.gesture='tap';beginAction('pet');}try{if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId)}catch{}resetGesture();
}
canvas.addEventListener('pointerdown',startPointerGesture);
canvas.addEventListener('pointermove',movePointerGesture);
canvas.addEventListener('pointerup',event=>finishPointerGesture(event,false));
canvas.addEventListener('pointercancel',event=>finishPointerGesture(event,true));
canvas.addEventListener('pointerleave',()=>{if(!drag.active&&!gesture.active&&!stashDrag.active){setInteractionHover(null);canvas.style.cursor='default'}});

function updateVisualNav(dt){
  if(!visual.nav)return false;
  const nav=visual.nav;
  document.body.dataset.visualStage=nav.stage;
  if(nav.stage==='to-action'){
    play('walk');
    if(moveVisualToward(nav.target,dt,.9)){
      const action=nav.kind==='feed'?'feed':'sleep';game.act(action);flushEvents();persist();nav.stage='acting';
      if(nav.kind==='feed')play('eat');else play('sleep');
    }
    return true;
  }
  if(nav.stage==='acting'){
    if(nav.kind==='feed'){
      game.update(dt,new Date());flushEvents();
      if(s.mode!=='eating'){nav.stage='return';nav.target=engineWorld();play('walk');status.textContent='吃饱啦，慢慢走回来。'}
    }else if(nav.kind==='sleep'){
      game.update(dt,new Date());flushEvents();
      if(s.mode!=='sleeping'){nav.stage='return';nav.target=engineWorld();play('walk');}
    }
    return true;
  }
  if(nav.stage==='return'){
    play('walk');
    if(moveVisualToward(nav.target,dt,.9)){visual.nav=null;setCareActive(null);status.textContent='团团回来了。';play('idle');}
    return true;
  }
  return false;
}

function desiredClip(){
  if(visual.nav){if(visual.nav.stage==='to-action'||visual.nav.stage==='return')return'walk';if(visual.nav.kind==='feed')return'eat';if(visual.nav.kind==='sleep')return'sleep';}
  if(s.mode==='carried')return'pickup';
  if(s.mode==='running')return'wheel';
  if(s.mode==='sleeping')return'sleep';
  if(s.mode==='eating')return'eat';
  if(s.mode==='posing')return s.pose==='pancake'?'pancake':'ball';
  if(s.mode==='crying')return'cry';
  if(s.mode==='searching')return'search';
  if(s.mode==='hiding')return s.target?'walk':'bury';
  if(s.mode==='walking')return'walk';
  return'idle';
}
function updateStashVisual(){
  if(stashMarker){const show=Boolean(s.stash)&&(!(s.mode==='hiding'&&s.target)||stashDrag.active);stashMarker.visible=show;if(show){const w=stashDrag.active&&stashDrag.preview?stashDrag.preview:worldFromGame(s.stash.x,s.stash.y);stashMarker.position.set(w.x,.02,w.z);}}
  if(looseSeed)looseSeed.visible=!s.stash&&s.mode!=='hiding';
  if(seedCarry){const carry=s.mode==='hiding'&&Boolean(s.target);seedCarry.visible=carry;if(carry)seedCarry.position.set(visual.pos.x,visual.pos.y+.62,visual.pos.z+.12);}
}

function updateModeFx(){
  const forward=new THREE.Vector3(Math.sin(targetYaw),0,Math.cos(targetYaw)),right=new THREE.Vector3(forward.z,0,-forward.x);
  const searching=s.mode==='searching',crying=s.mode==='crying',burying=s.mode==='hiding'&&!s.target;
  sniffPuffs.forEach((p,i)=>{p.visible=searching;if(!searching)return;const phase=(time*1.65+i/3)%1;p.position.copy(visual.pos).addScaledVector(forward,.38+phase*.34).addScaledVector(right,(i-1)*.035);p.position.y=visual.pos.y+.72+Math.sin(phase*Math.PI)*.06;p.scale.setScalar(.7+phase*.55);p.material.opacity=.8*(1-phase);});
  tearDrops.forEach((p,i)=>{p.visible=crying;if(!crying)return;const phase=(time*1.3+i*.48)%1;p.position.copy(visual.pos).addScaledVector(forward,.34).addScaledVector(right,(i?1:-1)*.11);p.position.y=visual.pos.y+.78-phase*.38;p.scale.set(.72,.72+phase*.7,.72);p.material.opacity=.9*(1-phase*.55);});
  dirtBits.forEach((p,i)=>{p.visible=burying;if(!burying)return;const phase=(time*2.1+i*.17)%1,ang=i*1.256+time*.7;p.position.set(visual.pos.x+Math.cos(ang)*(.1+phase*.18),.03+Math.sin(phase*Math.PI)*.18,visual.pos.z+Math.sin(ang)*(.1+phase*.18));p.scale.setScalar(.7+phase*.35);});
}

function syncRenderFromEngine(dt){
  if(!hamster)return;
  const navBusy=updateVisualNav(dt);
  if(!navBusy){
    game.update(dt,new Date());flushEvents();
    const w=engineWorld();visual.pos.x=w.x;visual.pos.z=w.z;
    visual.pos.y=.02+(s.motion?.lift||0)*.66;
  }
  if(!visual.nav&&s.mode!=='carried')visual.pos.y=.02;
  hamster.position.copy(visual.pos);
  const clip=desiredClip();play(clip);
  if(hamsterBaseScale){let sx=1,sy=1,sz=1;if(s.mode==='posing'&&s.pose==='pancake'){sx=1.18;sy=.66;sz=1.15}else if(s.mode==='posing'&&s.pose==='ball'){sx=1.07;sy=.9;sz=1.07}hamster.scale.x=THREE.MathUtils.damp(hamster.scale.x,hamsterBaseScale.x*sx,7,dt);hamster.scale.y=THREE.MathUtils.damp(hamster.scale.y,hamsterBaseScale.y*sy,7,dt);hamster.scale.z=THREE.MathUtils.damp(hamster.scale.z,hamsterBaseScale.z*sz,7,dt);}
  if(s.mode==='running'){targetYaw=.15;actions.wheel?.setEffectiveTimeScale(Math.max(.25,(s.motion?.wheelSpeed||0)/4));if(wheelRotor)wheelRotor.rotation.z=-s.wheelAngle;}
  else if(!visual.nav&&s.target&&['walking','hiding','searching'].includes(s.mode)){const t=worldFromGame(s.target.x,s.target.y);targetYaw=Math.atan2(t.x-visual.pos.x,t.z-visual.pos.z);}
  else if(!visual.nav&&s.mode!=='carried')targetYaw=s.facing<0?-1.45:-.35;
  targetPitch=s.mode==='sleeping'?-.22:s.mode==='posing'&&s.pose==='pancake'?.18:s.mode==='crying'?.1:0;targetTilt=s.mode==='sleeping'?.08:0;
  hamster.rotation.y=THREE.MathUtils.damp(hamster.rotation.y,targetYaw,7,dt);hamster.rotation.x=THREE.MathUtils.damp(hamster.rotation.x,targetPitch,5,dt);hamster.rotation.z=THREE.MathUtils.damp(hamster.rotation.z,targetTilt,5,dt);updateStashVisual();updateModeFx();
  document.body.dataset.engineMode=s.mode;document.body.dataset.pose=s.pose;document.body.dataset.hasStash=s.stash?'1':'0';document.body.dataset.visualStage=visual.nav?.stage||'follow';document.body.dataset.hunger=s.hunger.toFixed(2);document.body.dataset.energy=s.energy.toFixed(2);document.body.dataset.mood=s.mood.toFixed(2);document.body.dataset.wheelSpeed=(s.motion?.wheelSpeed||0).toFixed(2);document.body.dataset.lift=(s.motion?.lift||0).toFixed(2);
}

function updateHUD(){
  const modeText={idle:'悠闲发呆',walking:'到处逛逛',eating:'吧唧吃饭',sleeping:'呼呼睡觉',running:'开心跑轮',carried:'被你捧着',posing:s.pose==='pancake'?'摊成鼠饼':'团成小球',hiding:'偷偷藏粮',searching:'努力找瓜子',crying:'委屈巴巴'}[s.mode]||s.mode;
  $('stat-hunger').textContent=Math.round(s.hunger);$('stat-energy').textContent=Math.round(s.energy);$('stat-mood').textContent=Math.round(s.mood);$('stat-mode').textContent=modeText;
  if($('top-status'))$('top-status').textContent=s.mode==='idle'?'摸摸团团，或者直接点房间里的东西':modeText;
  $('bar-hunger').style.width=`${s.hunger}%`;$('bar-energy').style.width=`${s.energy}%`;$('bar-mood').style.width=`${s.mood}%`;$('stat-save').textContent=storageOK?'与正式内核共用存档结构':'当前无法写入存档';
  const sleepBtn=document.querySelector('[data-action="sleep"]'),pickBtn=document.querySelector('[data-action="pickup"]'),stashBtn=document.querySelector('[data-action="stash"]'),moveBtn=document.querySelector('[data-action="move-stash"]');if(sleepBtn)sleepBtn.textContent=s.mode==='sleeping'?'☀️ 叫醒团团':'💤 去睡觉';if(pickBtn)pickBtn.textContent=s.mode==='carried'?'👇 放下来':'👐 捧起来';if(stashBtn)stashBtn.textContent=s.stash?'🌻 已藏好瓜子':'🌻 藏一颗瓜子';
  document.querySelectorAll('[data-action]').forEach(b=>{const navBlocked=Boolean(visual.nav)&&!(b.dataset.action==='sleep'&&s.mode==='sleeping');const stashBlocked=b.dataset.action==='stash'&&Boolean(s.stash);const moveBlocked=b.dataset.action==='move-stash'&&!s.stash;b.disabled=drag.active||stashDrag.active||navBlocked||stashBlocked||moveBlocked;});
}

async function init(){
  try{
    makeCareProps();
    const furnitureReady=Promise.all([
      addFurniture('rugRound.glb',[.05,.01,.30],2.65,0xe9c9bc,0),addFurniture('chairRounded.glb',[-2.45,.02,.72],1.06,0x93bdb7,.35),addFurniture('bookcaseOpen.glb',[-2.55,.02,-1.42],1.45,0xc28f66,0),addFurniture('plantSmall1.glb',[2.48,.02,-1.48],.74,0x789b73,-.2),addFurniture('lampRoundFloor.glb',[2.60,.02,.42],1.20,0xe5a9ad,-.1),addFurniture('tableCoffee.glb',[2.45,.02,1.45],.82,0xc58e64,.1)
    ]);
    hamster=normalize(await load('./v2-assets-real/hamchan-cc0.glb'),1.58);nearestTextures(hamster);hamsterBaseScale=hamster.scale.clone();hamster.position.copy(visual.pos);hamster.rotation.y=targetYaw;scene.add(hamster);
    const built=buildBoneClips(hamster);mixer=new THREE.AnimationMixer(hamster);for(const name of ['idle','walk','run','eat','sleep','pickup','wheel','ball','pancake','search','bury','cry'])actions[name]=mixer.clipAction(built[name]);play(desiredClip(),0);
    await furnitureReady;updateHUD();status.textContent='团团的小房间准备好啦';document.body.dataset.ready='1';
    if(AUTO_ACTION&&['feed','sleep','wheel','pickup','pet','shape','stash','move-stash'].includes(AUTO_ACTION))setTimeout(()=>beginAction(AUTO_ACTION),200);
  }catch(err){console.error(err);status.textContent='加载失败，请看控制台';document.body.dataset.ready='error';}
}
init();

function setYaw(y,button){if(visual.nav)return;targetYaw=y;document.querySelectorAll('.camera-controls button').forEach(b=>b.classList.remove('active'));button.classList.add('active')}
$('turn-left').onclick=e=>setYaw(1.2,e.currentTarget);$('turn-front').onclick=e=>setYaw(-.35,e.currentTarget);$('turn-right').onclick=e=>setYaw(-1.85,e.currentTarget);$('camera-orbit').onclick=e=>{orbit=!orbit;e.currentTarget.classList.toggle('active',orbit)};
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>beginAction(b.dataset.action)));
const creditsDialog=$('credits-dialog');$('credits-toggle')?.addEventListener('click',()=>creditsDialog?.showModal());$('credits-close')?.addEventListener('click',()=>creditsDialog?.close());creditsDialog?.addEventListener('click',e=>{if(e.target===creditsDialog)creditsDialog.close()});

const clock=new THREE.Clock();
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);time+=dt;if(mixer)mixer.update(dt);syncRenderFromEngine(dt);updateHUD();if(time-lastSave>5){persist();lastSave=time}if(orbit){const a=Math.sin(time*.32)*.34;camera.position.set(6.2+Math.sin(a)*2.1,5.1,7.4+Math.cos(a)*.8);camera.lookAt(0,.55,0)}if(hoverHalo?.visible)hoverHalo.material.opacity=.42+Math.sin(time*4)*.12;renderer.render(scene,camera)}
frame();

