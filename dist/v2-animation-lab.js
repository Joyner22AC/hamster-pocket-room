import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';

const canvas=document.getElementById('stage');
const state=document.getElementById('state');
const clipsOut=document.getElementById('clips');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false});
renderer.setSize(320,180,false);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;renderer.setClearColor(0xbfd5cf,1);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-3.4,3.4,1.9,-1.9,.1,30);
camera.position.set(4.4,3.4,5.7);camera.lookAt(0,.62,0);
scene.add(new THREE.HemisphereLight(0xfff4df,0x76948e,1.25));
const sun=new THREE.DirectionalLight(0xffdfbd,1.55);sun.position.set(-3,6,4);sun.castShadow=true;scene.add(sun);
const floor=new THREE.Mesh(new THREE.BoxGeometry(7,.14,4.5),new THREE.MeshLambertMaterial({color:0xdabf86}));floor.position.y=-.07;floor.receiveShadow=true;scene.add(floor);
const rug=new THREE.Mesh(new THREE.CylinderGeometry(1.45,1.45,.035,32),new THREE.MeshLambertMaterial({color:0xeac9bc}));rug.position.y=.015;rug.receiveShadow=true;scene.add(rug);

let model,mixer,currentAction=null,actions={},clock=new THREE.Clock();
function normalize(root,size=2){const box=new THREE.Box3().setFromObject(root),d=new THREE.Vector3();box.getSize(d);root.scale.multiplyScalar(size/Math.max(d.x,d.y,d.z));let b=new THREE.Box3().setFromObject(root),c=new THREE.Vector3();b.getCenter(c);root.position.sub(c);b=new THREE.Box3().setFromObject(root);root.position.y-=b.min.y;}
function tuneMaterials(root){root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m?.map){m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.NearestFilter;m.map.generateMipmaps=false;m.map.colorSpace=THREE.SRGBColorSpace}if(m){m.metalness=0;m.roughness=1;if(m.emissive)m.emissive.setHex(0)}}});}
function play(name,fade=.3){const next=actions[name];if(!next)return;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();if(currentAction&&currentAction!==next)currentAction.crossFadeTo(next,fade,false);currentAction=next;state.textContent=name.toUpperCase();document.body.dataset.clip=name;document.querySelectorAll('[data-clip]').forEach(b=>b.classList.toggle('active',b.dataset.clip===name));}

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

  return {idle,walk,run,eat,sleep,pickup,wheel,bones,boneCount:Object.keys(bones).length};
}

new GLTFLoader().load('./v2-assets-real/hamchan-cc0.glb',g=>{
  model=g.scene;normalize(model,1.8);model.position.z=.15;model.rotation.y=-.55;tuneMaterials(model);scene.add(model);
  const built=buildBoneClips(model);mixer=new THREE.AnimationMixer(model);
  const names=['idle','walk','run','eat','sleep','pickup','wheel'];
  for(const name of names)actions[name]=mixer.clipAction(built[name]);
  clipsOut.textContent=`${names.join(' · ')} · ${built.boneCount} bones`;
  const params=new URLSearchParams(location.search),requested=params.get('clip');play(actions[requested]?requested:'idle',0);
  const phase=Number(params.get('phase')||0);if(Number.isFinite(phase)&&phase>0)mixer.update(phase);if(params.get('freeze')==='1')mixer.timeScale=0;
  if(params.get('demo')==='1'){let i=0;setInterval(()=>{i=(i+1)%names.length;play(names[i],.32)},1200)}
  document.body.dataset.ready='1';
},undefined,e=>{console.error(e);state.textContent='ERROR';document.body.dataset.ready='error'});

document.querySelectorAll('[data-clip]').forEach(b=>b.addEventListener('click',()=>play(b.dataset.clip)));
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(mixer)mixer.update(dt);renderer.render(scene,camera)}
frame();
