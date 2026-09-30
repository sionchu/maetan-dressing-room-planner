import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const root = document.getElementById("threeView");
if (!root) throw new Error("threeView container not found");

let renderer;
let scene;
let camera;
let controls;
let modelGroup;
let currentSnapshot;
let firstBuild = true;

const palette = {
  wall: 0xf1e9df,
  wallEdge: 0xd4c5b5,
  floor: 0xdcc8ad,
  frame: 0x6d645c,
  shelf: 0xd8c6af,
  air: 0xe9ebec,
  airFront: 0xf7f7f5,
  vanity: 0xe6cdbb,
  mirror: 0xbfd0d6,
  rug: 0xe7ded2
};

const clothingColors = [
  0x463c36,0x7a6b61,0xc9b397,0xf0e8dd,0x9b8b7c,
  0x56636b,0x262626,0xc9c1b4,0x8a735f,0xe7ddd0
];

function m(mm) {
  return mm / 1000;
}

function material(color, roughness=.72, metalness=.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const mats = {
  wall: material(palette.wall,.9,0),
  wallEdge: material(palette.wallEdge,.85,0),
  floor: material(palette.floor,.9,0),
  frame: material(palette.frame,.5,.35),
  shelf: material(palette.shelf,.78,0),
  air: material(palette.air,.45,.08),
  airFront: material(palette.airFront,.35,.04),
  vanity: material(palette.vanity,.75,0),
  mirror: new THREE.MeshStandardMaterial({color:palette.mirror,roughness:.08,metalness:.65}),
  rug: material(palette.rug,1,0),
  glass: new THREE.MeshPhysicalMaterial({
    color:0xb8d8e5,transparent:true,opacity:.34,roughness:.05,metalness:0,
    transmission:.35,thickness:.02
  })
};

function box(w,h,d,mat,cast=true,receive=true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function addBox(group,x,y,z,w,h,d,mat) {
  const mesh = box(w,h,d,mat);
  mesh.position.set(x,y,z);
  group.add(mesh);
  return mesh;
}

function addRoom(group,s) {
  const w = m(s.roomW);
  const d = m(s.roomD);
  const h = m(s.roomH);

  const floor = addBox(group,w/2,-.025,d/2,w,.05,d,mats.floor);
  floor.receiveShadow = true;

  addBox(group,-.025,h/2,d/2,.05,h,d,mats.wall);
  addBox(group,w+.025,h/2,d/2,.05,h,d,mats.wall);
  addBox(group,w/2,h/2,d+.025,w,h,.05,mats.wall);

  const rug = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w,d)*.22,Math.min(w,d)*.22,.012,48),mats.rug);
  rug.position.set(w*.52,.008,d*.52);
  rug.receiveShadow = true;
  group.add(rug);

  addWindow(group,s);
  addDoor(group,s);
}

function addWindow(group,s) {
  const w = m(s.roomW);
  const d = m(s.roomD);
  const winW = Math.min(m(s.windowW),w-.2);
  const winH = Math.min(1.05,m(s.roomH)-.35);
  const y = Math.min(1.45,m(s.roomH)*.64);
  const x = w/2;

  const glass = addBox(group,x,y,d-.002,winW,winH,.012,mats.glass);
  glass.castShadow = false;

  const frameMat = mats.wallEdge;
  const t = .035;
  addBox(group,x-winW/2,y,d-.025,t,winH+.08,.04,frameMat);
  addBox(group,x+winW/2,y,d-.025,t,winH+.08,.04,frameMat);
  addBox(group,x,y-winH/2,d-.025,winW+.08,t,.04,frameMat);
  addBox(group,x,y+winH/2,d-.025,winW+.08,t,.04,frameMat);
  addBox(group,x,y,d-.025,t,winH,.04,frameMat);
}

function addDoor(group,s) {
  const doorW = m(s.doorW);
  const doorH = Math.min(2.05,m(s.roomH)-.08);
  const hingeX = .12;

  const pivot = new THREE.Group();
  pivot.position.set(hingeX,0,.015);
  pivot.rotation.y = -Math.PI * .34;

  const panel = box(doorW,doorH,.035,material(0xd7c5b2,.8,0));
  panel.geometry.translate(doorW/2,doorH/2,0);
  panel.castShadow = true;
  pivot.add(panel);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(.025,16,12),material(0x7b7169,.3,.55));
  knob.position.set(doorW*.88,doorH*.52,.035);
  pivot.add(knob);
  group.add(pivot);
}

function addPost(group,x,z,height) {
  addBox(group,x,height/2,z,.028,height,.028,mats.frame);
}

function addRodX(group,x,z,length,y) {
  addBox(group,x,y,z,length,.022,.022,mats.frame);
}

function addRodZ(group,x,z,length,y) {
  addBox(group,x,y,z,.022,.022,length,mats.frame);
}

function garmentMat(i) {
  return material(clothingColors[i % clothingColors.length],.88,0);
}

function addGarmentsX(group,x,z,length,y,drop,depth=.34) {
  const n = Math.max(4,Math.min(14,Math.floor(length/.11)));
  const start = x-length/2+.06;
  const span = Math.max(.02,length-.12);
  for (let i=0;i<n;i++) {
    const gx = start + span*(i/(Math.max(1,n-1)));
    const h = drop*(.88 + ((i%4)*.035));
    const garment = addBox(group,gx,y-h/2-.035,z,.035,h,depth,garmentMat(i));
    garment.castShadow = true;
  }
}

function addGarmentsZ(group,x,z,length,y,drop,depth=.34) {
  const n = Math.max(4,Math.min(14,Math.floor(length/.11)));
  const start = z-length/2+.06;
  const span = Math.max(.02,length-.12);
  for (let i=0;i<n;i++) {
    const gz = start + span*(i/(Math.max(1,n-1)));
    const h = drop*(.88 + ((i%4)*.035));
    const garment = addBox(group,x,y-h/2-.035,gz,depth,h,.035,garmentMat(i));
    garment.castShadow = true;
  }
}

function addHangerModule(group,mod,role,s) {
  if (!mod || mod.w <= 0 || mod.d <= 0) return;
  const x0 = m(mod.x);
  const z0 = m(mod.y);
  const w = m(mod.w);
  const d = m(mod.d);
  const h = Math.min(2.08,m(s.roomH)-.08);
  const alongX = w >= d;
  const cx = x0+w/2;
  const cz = z0+d/2;

  addPost(group,x0+.035,z0+.035,h);
  addPost(group,x0+w-.035,z0+.035,h);
  addPost(group,x0+.035,z0+d-.035,h);
  addPost(group,x0+w-.035,z0+d-.035,h);

  addBox(group,cx,h-.045,cz,Math.max(.08,w-.05),.055,Math.max(.08,d-.05),mats.shelf);

  if (alongX) {
    const rodZ = z0 + d*.28;
    const rodLen = Math.max(.18,w-.12);
    addRodX(group,cx,rodZ,rodLen,1.70);
    addGarmentsX(group,cx,rodZ+.16,rodLen,1.68,.78,.32);
    if (role !== "back") {
      addRodX(group,cx,rodZ,rodLen,.95);
      addGarmentsX(group,cx,rodZ+.16,rodLen,.93,.52,.32);
    }
  } else {
    const isLeft = x0 < m(s.roomW)/2;
    const rodX = isLeft ? x0+w*.70 : x0+w*.30;
    const total = Math.max(.18,d-.12);

    if (role === "side" && isLeft && s.longLen > 0) {
      const longLen = Math.min(total*.62,m(s.longLen),total-.25);
      const shortLen = Math.max(.18,total-longLen-.04);
      const longCenter = z0+d-.06-longLen/2;
      const shortCenter = z0+.06+shortLen/2;

      addRodZ(group,rodX,longCenter,longLen,1.72);
      addGarmentsZ(group,rodX+(isLeft?.15:-.15),longCenter,longLen,1.70,1.15,.30);

      addRodZ(group,rodX,shortCenter,shortLen,1.72);
      addGarmentsZ(group,rodX+(isLeft?.15:-.15),shortCenter,shortLen,1.70,.60,.30);
      addRodZ(group,rodX,shortCenter,shortLen,.95);
      addGarmentsZ(group,rodX+(isLeft?.15:-.15),shortCenter,shortLen,.93,.52,.30);
    } else {
      addRodZ(group,rodX,cz,total,1.72);
      addGarmentsZ(group,rodX+(isLeft?.15:-.15),cz,total,1.70,.60,.30);
      addRodZ(group,rodX,cz,total,.95);
      addGarmentsZ(group,rodX+(isLeft?.15:-.15),cz,total,.93,.52,.30);
    }
  }

  const basketMat = material(0xc9b79f,.92,0);
  const basketW = Math.min(w*.55,.42);
  const basketD = Math.min(d*.55,.38);
  addBox(group,cx,.16,cz,basketW,.30,basketD,basketMat);
}

function addAirDresser(group,mod) {
  if (!mod) return;
  const x = m(mod.x), z = m(mod.y), w=m(mod.w), d=m(mod.d), h=m(mod.h);
  const cx=x+w/2,cz=z+d/2;

  addBox(group,cx,h/2,cz,w,h,d,mats.air);
  addBox(group,x+.008,h/2,cz,.018,h-.05,d-.05,mats.airFront);

  const displayMat = material(0x343a3d,.2,.3);
  addBox(group,x-.004,h*.73,cz-d*.22,.012,.19,.16,displayMat);
  addBox(group,x-.008,h*.5,cz+d*.34,.012,.56,.018,displayMat);
}

function addVanity(group,mod) {
  if (!mod) return;
  const x=m(mod.x),z=m(mod.y),w=m(mod.w),d=m(mod.d);
  const cx=x+w/2,cz=z+d/2;

  addBox(group,cx,.72,cz,w,.08,d,mats.vanity);
  addBox(group,x+w*.72,.36,cz,w*.48,.64,d*.92,mats.vanity);

  const frontX = x+.012;
  const mirrorW = Math.min(.82,d*.80);
  const mirrorH = .72;
  const mirrorY = 1.24;
  addBox(group,frontX,mirrorY,cz,.025,mirrorH,mirrorW,mats.mirror);
  const frame = material(0xc19e82,.65,.05);
  addBox(group,frontX-.008,mirrorY,cz-mirrorW/2,.035,mirrorH+.05,.025,frame);
  addBox(group,frontX-.008,mirrorY,cz+mirrorW/2,.035,mirrorH+.05,.025,frame);
  addBox(group,frontX-.008,mirrorY-mirrorH/2,cz,.035,.025,mirrorW+.05,frame);
  addBox(group,frontX-.008,mirrorY+mirrorH/2,cz,.035,.025,mirrorW+.05,frame);

  const stoolMat = material(0xe9ded2,.92,0);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.11,32),stoolMat);
  seat.position.set(Math.max(.30,x-.38),.48,cz);
  seat.castShadow = true;
  group.add(seat);

  for (const dz of [-.13,.13]) {
    for (const dx of [-.12,.12]) {
      const leg = addBox(group,Math.max(.30,x-.38)+dx,.24,cz+dz,.035,.43,.035,frame);
      leg.rotation.z = dx*.25;
    }
  }
}

function addLighting() {
  const hemi = new THREE.HemisphereLight(0xfff8ee,0x7d7168,1.35);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff4df,2.2);
  key.position.set(3.5,5.5,2.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.near = .1;
  key.shadow.camera.far = 15;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe5eef4,.75);
  fill.position.set(-3,3,5);
  scene.add(fill);
}

function clearModel() {
  if (!modelGroup) return;
  scene.remove(modelGroup);
  modelGroup.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material && !Object.values(mats).includes(obj.material)) {
      if (Array.isArray(obj.material)) obj.material.forEach(x=>x.dispose?.());
      else obj.material.dispose?.();
    }
  });
  modelGroup = null;
}

function resetCamera(snapshot=currentSnapshot) {
  if (!snapshot) return;
  const s = snapshot.state;
  const w=m(s.roomW),d=m(s.roomD),h=m(s.roomH);
  const radius = Math.max(w,d,h);
  camera.position.set(w*1.65,h*1.18,-d*.58);
  controls.target.set(w*.50,Math.min(1.0,h*.43),d*.53);
  controls.minDistance = radius*.48;
  controls.maxDistance = radius*3.1;
  controls.update();
}

function rebuild(snapshot) {
  if (!snapshot) return;
  currentSnapshot = snapshot;
  clearModel();

  modelGroup = new THREE.Group();
  scene.add(modelGroup);

  addRoom(modelGroup,snapshot.state);
  addHangerModule(modelGroup,snapshot.layout.back,"back",snapshot.state);
  addHangerModule(modelGroup,snapshot.layout.left,"side",snapshot.state);
  addHangerModule(modelGroup,snapshot.layout.right,"side",snapshot.state);
  addAirDresser(modelGroup,snapshot.layout.air);
  addVanity(modelGroup,snapshot.layout.vanity);

  if (firstBuild) {
    resetCamera(snapshot);
    firstBuild = false;
  } else {
    controls.target.set(m(snapshot.state.roomW)*.5,.95,m(snapshot.state.roomD)*.52);
    controls.update();
  }
}

function resize() {
  if (!renderer || !camera) return;
  const width = Math.max(1,root.clientWidth);
  const height = Math.max(1,root.clientHeight);
  renderer.setSize(width,height,false);
  camera.aspect = width/height;
  camera.updateProjectionMatrix();
}

function init() {
  try {
    renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  } catch (err) {
    root.innerHTML = '<div style="padding:24px;color:#6f6257">이 브라우저에서 WebGL 3D를 초기화하지 못했습니다. 다른 브라우저에서 다시 시도해 주세요.</div>';
    console.error(err);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setClearColor(0xf6efe6,1);
  root.prepend(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6efe6);
  scene.fog = new THREE.Fog(0xf6efe6,7,13);

  camera = new THREE.PerspectiveCamera(46,1,.03,30);

  controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.minPolarAngle = .18;
  controls.maxPolarAngle = Math.PI*.49;
  controls.rotateSpeed = .72;
  controls.zoomSpeed = .85;
  controls.panSpeed = .65;

  addLighting();

  const snap = window.getDressRoom3DState?.();
  if (snap) rebuild(snap);

  const ro = new ResizeObserver(() => resize());
  ro.observe(root);
  resize();

  root.addEventListener("dblclick", () => resetCamera());

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene,camera);
  });
}

window.addEventListener("dressroom:update3d", e => {
  if (scene) rebuild(e.detail);
  else currentSnapshot = e.detail;
});

window.addEventListener("dressroom:show3d", () => {
  requestAnimationFrame(() => {
    resize();
    if (currentSnapshot) rebuild(currentSnapshot);
    else {
      const snap = window.getDressRoom3DState?.();
      if (snap) rebuild(snap);
    }
  });
});

init();
