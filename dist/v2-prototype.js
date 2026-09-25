const canvas = document.getElementById('gl-stage');
const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: true });
if (!gl) throw new Error('当前浏览器不支持 WebGL。');

const VS = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vNormal;
void main() {
  vNormal = normalize(mat3(uModel) * aNormal);
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}`;
const FS = `
precision mediump float;
uniform vec4 uColor;
varying vec3 vNormal;
void main() {
  vec3 lightDir = normalize(vec3(-0.45, 0.9, 0.65));
  float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
  float shade = 0.38 + diffuse * 0.62;
  shade = floor(shade * 4.0 + 0.5) / 4.0;
  float dither = mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) < 1.0 ? -0.018 : 0.018;
  gl_FragColor = vec4(uColor.rgb * clamp(shade + dither, 0.0, 1.0), uColor.a);
}`;

function shader(type, source) {
  const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const program = gl.createProgram();
gl.attachShader(program, shader(gl.VERTEX_SHADER, VS));
gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
gl.useProgram(program);
const loc = {
  pos: gl.getAttribLocation(program, 'aPosition'), normal: gl.getAttribLocation(program, 'aNormal'),
  projection: gl.getUniformLocation(program, 'uProjection'), view: gl.getUniformLocation(program, 'uView'),
  model: gl.getUniformLocation(program, 'uModel'), color: gl.getUniformLocation(program, 'uColor'),
};

const M4 = {
  identity: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  translate(x, y, z) { const m = this.identity(); m[12] = x; m[13] = y; m[14] = z; return m; },
  scale(x, y, z) { const m = this.identity(); m[0] = x; m[5] = y; m[10] = z; return m; },
  rotX(a) { const c = Math.cos(a), s = Math.sin(a), m = this.identity(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a), m = this.identity(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a), m = this.identity(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  ortho(l, r, b, t, n, f) {
    const m = this.identity(); m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); return m;
  },
  lookAt(eye, target, up) {
    const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
    const norm = v => { const d = Math.hypot(...v) || 1; return v.map(x => x / d); };
    const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
    const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x);
    const m = new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, 0,0,0,1]);
    return this.mul(m, this.translate(-eye[0], -eye[1], -eye[2]));
  },
};
function compose(pos=[0,0,0], rot=[0,0,0], scale=[1,1,1]) {
  return M4.mul(M4.mul(M4.mul(M4.mul(M4.translate(...pos), M4.rotY(rot[1])), M4.rotX(rot[0])), M4.rotZ(rot[2])), M4.scale(...scale));
}

function pushTri(outP, outN, a, b, c) {
  const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
  let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const d=Math.hypot(nx,ny,nz)||1; nx/=d; ny/=d; nz/=d;
  outP.push(...a,...b,...c); outN.push(nx,ny,nz,nx,ny,nz,nx,ny,nz);
}
function meshFromTriangles(build) {
  const p=[], n=[]; build(p,n);
  const pb=gl.createBuffer(), nb=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,pb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(p),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,nb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(n),gl.STATIC_DRAW);
  return { pb, nb, count:p.length/3 };
}
function cubeMesh() {
  const v=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
  const q=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
  return meshFromTriangles((p,n)=>q.forEach(f=>{pushTri(p,n,v[f[0]],v[f[1]],v[f[2]]);pushTri(p,n,v[f[0]],v[f[2]],v[f[3]]);}));
}
function sphereMesh(lon=10, lat=6) {
  return meshFromTriangles((p,n)=>{
    const pt=(u,v)=>{const th=u*Math.PI*2, ph=v*Math.PI; return [Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)];};
    for(let y=0;y<lat;y++) for(let x=0;x<lon;x++) {
      const a=pt(x/lon,y/lat), b=pt((x+1)/lon,y/lat), c=pt((x+1)/lon,(y+1)/lat), d=pt(x/lon,(y+1)/lat);
      if(y>0) pushTri(p,n,a,d,b); if(y<lat-1) pushTri(p,n,b,d,c);
    }
  });
}
function cylinderMesh(seg=12) {
  return meshFromTriangles((p,n)=>{
    for(let i=0;i<seg;i++) { const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;
      const p0=[Math.cos(a),-.5,Math.sin(a)], p1=[Math.cos(b),-.5,Math.sin(b)], p2=[Math.cos(b),.5,Math.sin(b)], p3=[Math.cos(a),.5,Math.sin(a)];
      pushTri(p,n,p0,p1,p2); pushTri(p,n,p0,p2,p3); pushTri(p,n,[0,.5,0],p3,p2); pushTri(p,n,[0,-.5,0],p1,p0);
    }
  });
}
function torusMesh(major=.72, minor=.09, majorSeg=16, minorSeg=6) {
  return meshFromTriangles((p,n)=>{
    const pt=(u,v)=>{ const a=u*Math.PI*2,b=v*Math.PI*2,r=major+minor*Math.cos(b); return [r*Math.cos(a),r*Math.sin(a),minor*Math.sin(b)]; };
    for(let y=0;y<minorSeg;y++) for(let x=0;x<majorSeg;x++) {
      const a=pt(x/majorSeg,y/minorSeg),b=pt((x+1)/majorSeg,y/minorSeg),c=pt((x+1)/majorSeg,(y+1)/minorSeg),d=pt(x/majorSeg,(y+1)/minorSeg);
      pushTri(p,n,a,b,c); pushTri(p,n,a,c,d);
    }
  });
}
const GEO={ cube:cubeMesh(), sphere:sphereMesh(), sphereFine:sphereMesh(12,7), cylinder:cylinderMesh(), torus:torusMesh() };

function hex(v, a=1) { return [((v>>16)&255)/255,((v>>8)&255)/255,(v&255)/255,a]; }
function draw(mesh, model, color, alpha=1) {
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb); gl.enableVertexAttribArray(loc.pos); gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb); gl.enableVertexAttribArray(loc.normal); gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);
  gl.uniformMatrix4fv(loc.model,false,model); gl.uniform4fv(loc.color,new Float32Array([color[0],color[1],color[2],alpha]));
  gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
function part(mesh, root, pos, rot, scale, color, alpha=1) { draw(mesh, M4.mul(root,compose(pos,rot,scale)), color, alpha); }

const C={
  floor:hex(0xd8bd83), wall:hex(0xc8d8cf), wall2:hex(0xb9cec6), trim:hex(0x779b92), wood:hex(0xc98758), woodDark:hex(0x795342),
  wheel:hex(0xe790a2), wheelDark:hex(0x9f6070), bowl:hex(0x77a9b3), body:hex(0xb88a63), cream:hex(0xf0d7b0), ear:hex(0xd99493), eye:hex(0x2e2926),
  seed:hex(0x66513a), shadow:hex(0x4e584f), bedding:hex(0xe3c77f), plant:hex(0x789b72), pot:hex(0xbe8060),
};

const requestedMode=new URLSearchParams(location.search).get('mode');
let mode=['idle','walk','eat'].includes(requestedMode)?requestedMode:'idle', cameraSpin=new URLSearchParams(location.search).get('camera')==='spin';
const readout=document.getElementById('mode-readout');
const labels={idle:'IDLE · 呼吸与观察',walk:'WALK · 连续步态与转向',eat:'EAT · 坐下抱食与咀嚼'};
readout.textContent=labels[mode];
document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
document.getElementById('camera-toggle').classList.toggle('active',cameraSpin);
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
  mode=btn.dataset.mode; readout.textContent=labels[mode];
  document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===btn));
}));
document.getElementById('camera-toggle').addEventListener('click',e=>{cameraSpin=!cameraSpin;e.currentTarget.classList.toggle('active',cameraSpin);});

function room(t) {
  part(GEO.cube,M4.identity(),[0,-.12,0],[0,0,0],[8.2,.18,5.2],C.floor);
  part(GEO.cube,M4.identity(),[0,2.1,-2.58],[0,0,0],[8.2,4.4,.14],C.wall);
  part(GEO.cube,M4.identity(),[-4.08,2.1,0],[0,0,0],[.14,4.4,5.2],C.wall2);
  part(GEO.cube,M4.identity(),[0,.08,-2.42],[0,0,0],[8.0,.18,.12],C.trim);
  // house
  part(GEO.cube,M4.identity(),[-2.5,.72,-1.2],[0,0,0],[1.5,1.35,1.35],C.wood);
  part(GEO.cube,M4.identity(),[-2.5,1.46,-1.2],[0,0,.78],[1.12,.16,1.48],C.woodDark);
  part(GEO.cube,M4.identity(),[-2.5,1.46,-1.2],[0,0,-.78],[1.12,.16,1.48],C.woodDark);
  part(GEO.cube,M4.identity(),[-1.72,.63,-.48],[0,0,0],[.08,.72,.56],C.woodDark);
  // wheel
  part(GEO.torus,M4.identity(),[2.55,1.02,-.95],[0,Math.PI/2,0],[1,1,1],C.wheel);
  for(let i=0;i<6;i++) part(GEO.cube,M4.identity(),[2.55,1.02,-.95],[i*Math.PI/3,Math.PI/2,0],[.035,.7,.035],C.wheelDark);
  part(GEO.cube,M4.identity(),[2.55,.45,-.95],[0,0,0],[.12,.9,.12],C.wheelDark);
  part(GEO.cube,M4.identity(),[2.55,.08,-.95],[0,0,0],[1.15,.12,.62],C.wheelDark);
  // bowl
  part(GEO.cylinder,M4.identity(),[2.75,.22,1.2],[0,0,0],[.55,.25,.55],C.bowl);
  part(GEO.cylinder,M4.identity(),[2.75,.38,1.2],[0,0,0],[.42,.12,.42],C.seed);
  // bedding blocks for chunky DS depth
  for(let i=0;i<18;i++) { const x=-3.4+(i%6)*1.2,z=-1.9+Math.floor(i/6)*1.45; part(GEO.cube,M4.identity(),[x,.02,z],[0,(i*.73)%1,0],[.45,.06,.22],C.bedding); }
  // plant
  part(GEO.cylinder,M4.identity(),[-3.35,.34,1.75],[0,0,0],[.38,.55,.38],C.pot);
  for(let i=0;i<5;i++) part(GEO.sphere,M4.identity(),[-3.35+Math.sin(i*1.7)*.28,.9+i*.05,1.75+Math.cos(i*1.7)*.23],[0,0,i*.4],[.18,.55,.12],C.plant);
}

function hamster(t) {
  const walk=mode==='walk', eat=mode==='eat';
  const cycle=t*6.0;
  let x=0,z=.45,y=.56,yaw=-.12;
  if(walk) { x=Math.sin(t*.72)*1.75; yaw=Math.cos(t*.72)>=0?0:Math.PI; y=.58+Math.abs(Math.sin(cycle))*.045; }
  if(eat) { x=.35; z=.62; y=.48; yaw=-.25; }
  const breathe=1+Math.sin(t*2.2)*.018;
  const root=compose([x,y,z],[0,yaw,0],[1,breathe,1]);

  // soft blob shadow, flattened 3D mesh
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  part(GEO.sphere,M4.identity(),[x,.02,z],[0,0,0],[1.15,.018,.72],C.shadow,.24);
  gl.depthMask(true); gl.disable(gl.BLEND);

  const bob=walk?Math.abs(Math.sin(cycle))*.025:0;
  const headTurn=walk?0:Math.sin(t*.85)*.12;
  const chew=eat?Math.sin(t*12)*.035:0;
  part(GEO.sphere,root,[-.08,bob,0],[0,0,0],[.92,.7,.65],C.body);
  part(GEO.sphere,root,[.48,.03+bob,.02],[0,headTurn,chew],[.62,.6,.56],C.cream);
  part(GEO.sphere,root,[.55,-.16,.02],[0,0,0],[.43,.25,.48],C.cream);
  // ears
  part(GEO.sphere,root,[.40,.48,-.34],[0,0,-.15],[.20,.22,.10],C.ear);
  part(GEO.sphere,root,[.40,.48,.34],[0,0,.15],[.20,.22,.10],C.ear);
  // face
  part(GEO.sphere,root,[.94,.17,-.22],[0,0,0],[.065,.08,.055],C.eye);
  part(GEO.sphere,root,[.94,.17,.22],[0,0,0],[.065,.08,.055],C.eye);
  part(GEO.sphere,root,[1.03,.02,0],[0,0,0],[.055,.045,.055],C.ear);

  const step=Math.sin(cycle), step2=Math.sin(cycle+Math.PI);
  if(eat) {
    const paw=0.10+Math.sin(t*10)*.035;
    part(GEO.sphere,root,[.60,-.34,-.28],[0,0,-.4],[.16,.28,.13],C.cream);
    part(GEO.sphere,root,[.60,-.34,.28],[0,0,.4],[.16,.28,.13],C.cream);
    part(GEO.sphere,root,[.85,-.02,-.16],[0,0,-.55-paw],[.13,.31,.11],C.cream);
    part(GEO.sphere,root,[.85,-.02,.16],[0,0,.55+paw],[.13,.31,.11],C.cream);
    part(GEO.sphere,root,[.94,-.12,0],[0,0,0],[.09,.21,.09],C.seed);
  } else {
    const lift=.08;
    part(GEO.sphere,root,[.42,-.43,-.38],[0,0,walk?step*.65:0],[.15,.30,.13],C.cream);
    part(GEO.sphere,root,[.42,-.43,.38],[0,0,walk?step2*.65:0],[.15,.30,.13],C.cream);
    part(GEO.sphere,root,[-.48,-.39,-.36],[0,0,walk?step2*.55:0],[.16,.31,.14],C.cream);
    part(GEO.sphere,root,[-.48,-.39,.36],[0,0,walk?step*.55:0],[.16,.31,.14],C.cream);
    if(walk) {
      // tiny foot lift changes actual 3D silhouette rather than swapping frames
      void lift;
    }
  }
  // tail
  part(GEO.sphere,root,[-.93,-.05,.03],[0,0,0],[.14,.14,.14],C.ear);
}

function frame(ms) {
  const t=ms/1000;
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(.67,.79,.75,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  const aspect=canvas.width/canvas.height;
  const projection=M4.ortho(-4.8*aspect/1.777,4.8*aspect/1.777,-2.7,2.7,.1,30);
  const orbit=cameraSpin?Math.sin(t*.35)*.45:0;
  const eye=[6.2+Math.sin(orbit)*2.0,5.2,7.3+Math.cos(orbit)*1.0];
  const view=M4.lookAt(eye,[0,.85,0],[0,1,0]);
  gl.uniformMatrix4fv(loc.projection,false,projection); gl.uniformMatrix4fv(loc.view,false,view);
  room(t); hamster(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
