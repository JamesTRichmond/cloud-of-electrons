// Opt-in GPU particle sim (?sim=gpu). index.html imports this file only when that flag is set; without it the page
// never fetches it and the CPU sim() runs exactly as on main.
//
// KERNEL is the backend-agnostic contract: one per-particle update with one state layout and one uniform set.
// This file implements it with WebGL2 transform feedback, which is the fallback backend. A WebGPU compute shader can
// implement the same spec later: one invocation per particle, the state/static fields below as storage buffers in the
// same order and packing, the uniforms as one uniform block. The reference implementation is the CPU sim() in
// index.html; ?simcheck=n runs both from the same state at frame n and stores the difference in window.coeSimParity.
//
// Every layer (near, mid, far, deep, abyss, infinite, synapse) is updated every frame by the kernel, including dots
// that are forming letters. What stays on the CPU: picking which dots form letters (recruit, which reads positions
// back once per section), the text targets, the poem timeline, the calm box, the scatter kick (pull velocities,
// kick, push), the void's borrowReturn (pull, edit, push) and the ?fix drift guard (?fix keeps the whole CPU path).
export const KERNEL = {
  id: 'coe-sim-v1',
  // read/write per particle, ping-ponged; each is vec4 (16-byte stride) so WebGPU storage alignment matches
  state: { posPm: 'pos.xyz, pm (1 = was on a letter last step)', velRk: 'vel.xyz, rk (release kick 0..1)', colE: 'rgb, te (text ease 0..1, drawn as attribute te)' },
  // read-only per particle (mark and target are re-uploaded when a poem section starts or ends)
  statics: { home: 'vec3 start-layout offset', homeR: 'f32 home shell radius', layer: 'f32 layer index', mark: 'f32 1 = on a letter', target: 'vec3 letter target (text plane)' },
  maxAttractors: 8, maxLayers: 8,
  uniforms: {
    uDt: 'f32 step seconds', uT: 'f32 scene clock', uRot: 'vec2 cos/sin of per-step home spin da (0 when reduced)',
    uK: 'f32 integration gain (0.3 when reduced)', uHome: 'vec2 cos/sin of home rotation ra', uKc: 'f32 KC_CLOUD',
    uKr: 'f32 KR_DEPTH', uDim: 'f32 DIM', uWt: 'f32 text weight wt', uCw: 'vec3 cloud centre', uWake: 'vec4 pointer x, y, on, speed',
    uWakeV: 'vec2 pointer velocity', uNA: 'i32 attractor count', uA: 'vec4[8] attractor pos.xyz, radius',
    uAD: 'vec4[8] attractor dir from cloud centre, angular width', uAH: 'vec2[8] hue, dim flag',
    uLP: 'vec4[8] per layer: swirl, brightness, kind (0 shell, 1 near, 2 mid, 3 synapse), depth clamp on', uLB: 'vec2[8] per layer inner, outer',
    uTxt: 'vec4 text dx, dy, cos(tilt), sin(tilt)', uOff: 'vec4 text origin ox, oy, cos/sin of text plane angle',
    uCalm: 'vec4 calm box x0, x1, y0, y1', uCalm2: 'vec4 line height, CALM_EDGE, rotA*.04, on', uCam: 'vec3 camera', uTextW: 'vec3 text colour TEXT_TINT*TEXT_LUM',
  },
};

const VS = `#version 300 es
precision highp float;
in vec4 aPP;in vec4 aVR;in vec4 aCE;in vec3 aH;in float aHr;in float aLy;in float aM;in vec3 aT;
uniform float uDt,uT,uK,uKc,uKr,uDim,uWt;uniform vec2 uRot,uHome,uWakeV;uniform vec3 uCw,uCam,uTextW;uniform vec4 uWake,uTxt,uOff,uCalm,uCalm2;
uniform int uNA;uniform vec4 uA[8];uniform vec4 uAD[8];uniform vec2 uAH[8];uniform vec4 uLP[8];uniform vec2 uLB[8];
out vec4 oPP;out vec4 oVR;out vec4 oCE;
vec3 hsl(float h,float s,float l){vec3 k=mod(vec3(0.,8.,4.)+h/30.,12.);float a=s*min(l,1.-l);return l-a*max(vec3(-1.),min(min(k-3.,9.-k),vec3(1.)));}
float calmAt(vec3 p){if(uCalm2.w<.5)return 0.;float c=cos(uCalm2.z),s=sin(uCalm2.z),qx=p.x*c-p.z*s,qz=p.x*s+p.z*c-uCam.z,sc=3.5/max(.3,-qz);
 float px=(qx-uCam.x)*sc+uCam.x,py=(p.y-uCam.y)*sc+uCam.y,L=uCalm2.x;
 float r=length(vec2((px-(uCalm.x+uCalm.y)/2.)/((uCalm.y-uCalm.x)/2.+L),(py-(uCalm.z+uCalm.w)/2.)/((uCalm.w-uCalm.z)/2.+L)));
 float u=clamp((r-1.)/uCalm2.y,0.,1.);return 1.-u*u*(3.-2.*u);}
void main(){
 vec3 p=aPP.xyz,v=aVR.xyz;float pm=aPP.w,rk=aVR.w;int li=int(aLy+.5);vec4 lp=uLP[li];float sw=lp.x,br=lp.y;
 bool near=lp.z>.5&&lp.z<1.5,mid=lp.z>1.5&&lp.z<2.5,syn=lp.z>2.5,mk=aM>.5;
 float rotF=mk?max(0.,1.-uWt*1.2):1.;
 if(rotF>0.){float x2=p.x*uRot.x+p.z*uRot.y,z2=-p.x*uRot.y+p.z*uRot.x;p.x+=(x2-p.x)*rotF;p.z+=(z2-p.z)*rotF;}
 vec3 a=vec3(sin(p.y*1.7+uT*.3)-cos(p.z*1.3),sin(p.z*1.9+uT*.2)-cos(p.x*1.5),sin(p.x*1.1+uT*.25)-cos(p.y*1.6))*.3*sw;
 int best=0;float bd=1e9;
 for(int m=0;m<8;m++){if(m>=uNA)break;vec3 e=uA[m].xyz-p;float d=length(e)+.05;if(d<bd){bd=d;best=m;}if(!near)a+=e*(.07*uA[m].w/(d*d+.3));}
 if(uWake.z>.5&&!mk){float mdx=(p.x-uCw.x)-uWake.x*2.2,mdy=(p.y-uCw.y)-uWake.y*1.4,md2=mdx*mdx+mdy*mdy;
  if(md2<1.2){float f=min(1.,uWake.w*.08)/(md2+.14);a.x+=(-mdy*uWakeV.x+mdx*uWakeV.y)*f*.22;a.y+=(mdx*uWakeV.x+mdy*uWakeV.y)*f*.22;}}
 if(!mk){if(pm>.5){pm=0.;rk=1.;}float kc=uKc+(near?1.2:1.)*rk;vec3 h=vec3(aH.x*uHome.x+aH.z*uHome.y,aH.y,-aH.x*uHome.y+aH.z*uHome.x);a-=(p-uCw-h)*kc;}
 float dm=pow(mk&&uWt>.05?.95:rk>.05?.95:.97,uDt*60.);v=(v+a*uDt)*dm;
 float cz=(!mk&&uWt>0.&&mid&&(p.x*p.x+p.y*p.y<2.5))?calmAt(p)*uWt*.15:0.;
 if(syn)v*=.92;
 p+=v*uDt*uK*(1.-cz);
 if(mk)pm=1.;else{rk*=exp(-uDt/.7);
  if(lp.w>.5){vec2 B=uLB[li];vec3 e=p-uCw;float r0=length(e)+1e-6,sp5=.05*(B.y-B.x),Ht=min(B.y-sp5,max(B.x+sp5,aHr)),rc=min(B.y,max(B.x,r0+(Ht-r0)*min(1.,uKr*uDt)));
   if(rc!=r0){p=uCw+e*(rc/r0);float vr=dot(v,e)/r0;if((r0>rc&&vr>0.)||(r0<rc&&vr<0.))v-=vr*e/r0;}}}
 float arr=0.;
 if(mk&&uWt>0.){float ge=uWt*uWt*(3.-2.*uWt),s=uWt>=.999?1.:min(1.,ge*.45*uDt*60.);vec2 u=aT.xy-uOff.xy;
  float lx=uOff.x+u.x*uTxt.z-u.y*uTxt.w+uTxt.x,ly=uOff.y+u.x*uTxt.w+u.y*uTxt.z+uTxt.y;vec3 tg=vec3(lx*uOff.z,ly,-lx*uOff.w);
  p+=(tg-p)*s;if(s>=.999)v=vec3(0.);float q=max(0.,1.-length(tg-p)/.35);arr=q*q*(3.-2.*q);}
 vec3 c=aCE.rgb;float te=0.;
 if(mk&&uWt>0.){float u=min(1.,uWt/.4);te=u*u*(3.-2.*u)*arr;}
 if(!syn){vec3 e=p-uCw;float rr=length(e)+1e-4,hb=0.;int ab=-1;
  for(int m=0;m<8;m++){if(m>=uNA)break;vec3 u=e/rr-uAD[m].xyz;float g2=dot(u,u)/(uAD[m].w*uAD[m].w*2.56),q2=g2<1.?1.-g2:0.,hv=q2*q2*q2;if(hv>hb){hb=hv;ab=m;}}
  if(ab>=0)best=ab;float hw=max(hb,max(0.,1.-bd/(uA[best].w*2.)));
  c=hsl(220.+(uAH[best].x-220.)*hw,.15+.4*hw,.33+.12*hw);
  if(uAH[best].y>.5)c*=1.-.25*uWt*hw;
  if(mk&&uWt>0.){vec3 cb=c*br*uDim;c=cb+(uTextW-cb)*te;}else c*=(cz>0.?1.-.12*cz:1.)*br*uDim;}
 oPP=vec4(p,pm);oVR=vec4(v,rk);oCE=vec4(c,te);gl_Position=vec4(0.);gl_PointSize=1.;}`;
const FS = `#version 300 es
precision mediump float;out vec4 o;void main(){o=vec4(0.);}`;

// o: {N,P,V,RK,PM,C,E,HV,H,LY,mark,T,FILL,A,draw:{lp,lq,lc,le}}
export function createGpuSim(gl, o) {
  const { N, P, V, RK, PM, C, E, HV, H, LY, mark, T, FILL, A, draw } = o, F = 4, prev = gl.getParameter(gl.CURRENT_PROGRAM);
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.transformFeedbackVaryings(pr, ['oPP', 'oVR', 'oCE'], gl.SEPARATE_ATTRIBS);
  gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  const U = {}; for (const k of Object.keys(KERNEL.uniforms)) U[k] = gl.getUniformLocation(pr, k);
  const mk = (data, usage = gl.DYNAMIC_COPY) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
  const pack = (a3, a1, i0, i1) => { const out = new Float32Array((i1 - i0) * 4); for (let i = i0, k = 0; i < i1; i++, k += 4) { out[k] = a3[i * 3]; out[k + 1] = a3[i * 3 + 1]; out[k + 2] = a3[i * 3 + 2]; out[k + 3] = a1[i]; } return out; };
  const ST = [[P, PM], [V, RK], [C, E]]; // posPm, velRk, colE
  const st = ST.map(([a3, a1]) => { const d = pack(a3, a1, 0, N); return [mk(d), mk(d)]; });
  const bH = mk(HV, gl.STATIC_DRAW), bHr = mk(H, gl.STATIC_DRAW), bL = mk(LY, gl.STATIC_DRAW);
  const MF = new Float32Array(N), bM = mk(MF, gl.DYNAMIC_DRAW), bT = mk(T, gl.DYNAMIC_DRAW);
  const vao = [0, 1].map(s => { const va = gl.createVertexArray(); gl.bindVertexArray(va);
    const at = (name, b, k) => { const l = gl.getAttribLocation(pr, name); if (l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, 0, 0); };
    at('aPP', st[0][s], 4); at('aVR', st[1][s], 4); at('aCE', st[2][s], 4); at('aH', bH, 3); at('aHr', bHr, 1); at('aLy', bL, 1); at('aM', bM, 1); at('aT', bT, 3); return va; });
  gl.bindVertexArray(null); gl.useProgram(prev);
  const tf = gl.createTransformFeedback();
  const LP = new Float32Array(32), LB = new Float32Array(16);
  FILL.forEach((L, li) => { if (li >= 8) return; const kind = L.name === 'near' ? 1 : L.name === 'mid' ? 2 : L.name === 'synapse' ? 3 : 0;
    LP.set([L.swirl ?? 1, L.brightness ?? 1, kind, kind === 1 || kind === 2 ? 1 : 0], li * 4); LB.set([L.inner, L.outer], li * 2); });
  let cur = 0;
  // Point the draw program's p, p0, c and te attributes at the newest state (default VAO, 16-byte stride): no copies.
  const bindDraw = () => { gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, st[0][cur]); for (const l of [draw.lp, draw.lq]) if (l >= 0) gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 16, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, st[2][cur]); if (draw.lc >= 0) gl.vertexAttribPointer(draw.lc, 3, gl.FLOAT, false, 16, 0); if (draw.le >= 0) gl.vertexAttribPointer(draw.le, 1, gl.FLOAT, false, 16, 12); };
  // Re-upload mark and letter targets (called when a poem section starts or ends).
  function setMarks(i0 = 0, i1 = N) { for (let i = i0; i < i1; i++) MF[i] = mark[i]; gl.bindBuffer(gl.ARRAY_BUFFER, bM); gl.bufferSubData(gl.ARRAY_BUFFER, i0 * F, MF, i0, i1 - i0); gl.bindBuffer(gl.ARRAY_BUFFER, bT); gl.bufferSubData(gl.ARRAY_BUFFER, i0 * 3 * F, T, i0 * 3, (i1 - i0) * 3); }
  const AD = new Float32Array(32), AP = new Float32Array(32), AH = new Float32Array(16);
  function step(u) {
    const na = Math.min(8, A.length);
    for (let m = 0; m < na; m++) { const a = A[m], ex = a.pos[0] - u.cw[0], ey = a.pos[1] - u.cw[1], ez = a.pos[2] - u.cw[2], r = Math.hypot(ex, ey, ez);
      AD.set([ex / r, ey / r, ez / r, Math.max(.12, a.radius / r) * 2.4], m * 4); AP.set([a.pos[0], a.pos[1], a.pos[2], a.radius], m * 4); AH.set([a.hue, u.dimIds && u.dimIds.has(a.id) ? 1 : 0], m * 2); }
    gl.useProgram(pr);
    gl.uniform1f(U.uDt, u.dt); gl.uniform1f(U.uT, u.t); gl.uniform2f(U.uRot, Math.cos(u.da), Math.sin(u.da)); gl.uniform1f(U.uK, u.k);
    gl.uniform2f(U.uHome, Math.cos(u.ra), Math.sin(u.ra)); gl.uniform1f(U.uKc, u.kc); gl.uniform1f(U.uKr, u.kr); gl.uniform1f(U.uDim, u.dim); gl.uniform1f(U.uWt, u.wt);
    gl.uniform3fv(U.uCw, u.cw); gl.uniform3fv(U.uCam, u.cam); gl.uniform3fv(U.uTextW, u.textW); gl.uniform4fv(U.uWake, u.wake); gl.uniform2fv(U.uWakeV, u.wakeV);
    gl.uniform4fv(U.uTxt, u.txt); gl.uniform4fv(U.uOff, u.off); gl.uniform4fv(U.uCalm, u.calm); gl.uniform4fv(U.uCalm2, u.calm2);
    gl.uniform1i(U.uNA, na); gl.uniform4fv(U.uA, AP); gl.uniform4fv(U.uAD, AD); gl.uniform2fv(U.uAH, AH); gl.uniform4fv(U.uLP, LP); gl.uniform2fv(U.uLB, LB);
    gl.bindVertexArray(vao[cur]); gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    for (let w = 0; w < 3; w++) gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, w, st[w][1 - cur]);
    gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, N); gl.endTransformFeedback(); gl.disable(gl.RASTERIZER_DISCARD);
    for (let w = 0; w < 3; w++) gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, w, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    cur = 1 - cur; bindDraw(); gl.useProgram(prev);
  }
  // Sync readback of the newest state for [i0,i1) into the CPU arrays. which: subset of [0,1,2] = posPm, velRk, colE.
  function pull(i0, i1, which = [0, 1, 2]) { const tmp = new Float32Array((i1 - i0) * 4);
    for (const w of which) { gl.bindBuffer(gl.ARRAY_BUFFER, st[w][cur]); gl.getBufferSubData(gl.ARRAY_BUFFER, i0 * 16, tmp); const [a3, a1] = ST[w];
      for (let i = i0, k = 0; i < i1; i++, k += 4) { a3[i * 3] = tmp[k]; a3[i * 3 + 1] = tmp[k + 1]; a3[i * 3 + 2] = tmp[k + 2]; a1[i] = tmp[k + 3]; } } }
  function push(i0, i1, which = [0, 1, 2]) { for (const w of which) { const [a3, a1] = ST[w]; gl.bindBuffer(gl.ARRAY_BUFFER, st[w][cur]); gl.bufferSubData(gl.ARRAY_BUFFER, i0 * 16, pack(a3, a1, i0, i1)); } }
  setMarks(); bindDraw();
  return { step, pull, push, setMarks, n: N, kernel: KERNEL.id };
}
