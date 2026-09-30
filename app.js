const defaults={roomPreset:"r3",roomW:2330,roomD:2980,roomH:2300,doorW:800,windowW:1500,layoutPreset:"max",hangerDepth:550,longLen:850,hangerPitch:45,airOn:true,airW:445,airD:632,airH:1850};
const ids=["roomPreset","roomW","roomD","roomH","doorW","windowW","layoutPreset","hangerDepth","longLen","hangerPitch","airOn","airW","airD","airH"];
const $=id=>document.getElementById(id), els=Object.fromEntries(ids.map(id=>[id,$(id)]));
let state=loadState();
function loadState(){try{return {...defaults,...JSON.parse(localStorage.getItem("maetanDressState")||"{}")}}catch{return {...defaults}}}
function saveState(){localStorage.setItem("maetanDressState",JSON.stringify(state))}
function syncUI(){for(const id of ids){const el=els[id]; if(el.type==="checkbox")el.checked=!!state[id]; else el.value=state[id]} $("depthOut").textContent=state.hangerDepth+" mm"; $("longOut").textContent=state.longLen+" mm"; $("pitchOut").textContent=state.hangerPitch+" mm"}
function readUI(){for(const id of ids){const el=els[id]; state[id]=el.type==="checkbox"?el.checked:(el.type==="number"||el.type==="range"?Number(el.value):el.value)} saveState(); renderAll()}
ids.forEach(id=>els[id].addEventListener("input",readUI));
els.roomPreset.addEventListener("change",()=>{if(els.roomPreset.value==="r3"){state.roomW=2330;state.roomD=2980}else if(els.roomPreset.value==="r2"){state.roomW=2600;state.roomD=2980}state.roomPreset=els.roomPreset.value;syncUI();saveState();renderAll()});
["roomW","roomD"].forEach(id=>els[id].addEventListener("input",()=>{if(state.roomPreset!=="custom"){state.roomPreset="custom";els.roomPreset.value="custom"}}));
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));const v=b.dataset.view;$("planCanvas").hidden=v!=="plan";$("isoCanvas").hidden=v!=="iso";renderAll()});
$("resetBtn").onclick=()=>{state={...defaults};syncUI();saveState();renderAll()};
$("applyBtn").onclick=()=>{state.layoutPreset="max";state.hangerDepth=550;state.longLen=850;state.hangerPitch=45;state.airOn=true;syncUI();saveState();renderAll()};
function layoutData(){
  const s=state, hd=s.hangerDepth, airY=110, topGap=140, leftStart=Math.max(s.doorW+130,930), leftEnd=s.roomD-topGap;
  let rightStart=s.airOn?airY+s.airW+140:180, rightEnd=s.roomD-topGap, rightOn=true;
  if(s.layoutPreset==="balanced")rightStart=Math.max(rightStart,rightEnd-1350);
  if(s.layoutPreset==="single")rightOn=false;
  const leftLen=Math.max(0,leftEnd-leftStart), rightLen=rightOn?Math.max(0,rightEnd-rightStart):0;
  const air=s.airOn?{x:s.roomW-s.airD,y:airY,w:s.airD,d:s.airW,h:s.airH}:null;
  return {hd,airY,left:{x:0,y:leftStart,w:hd,d:leftLen,h:2100},right:rightOn?{x:s.roomW-hd,y:rightStart,w:hd,d:rightLen,h:2100}:null,air};
}function metrics(L){
  const s=state; let minA=s.roomW, minY=0;
  for(let y=0;y<=s.roomD;y+=10){let l=(y>=L.left.y&&y<=L.left.y+L.left.d)?L.left.w:0,r=0;if(L.right&&y>=L.right.y&&y<=L.right.y+L.right.d)r=Math.max(r,L.right.w);if(L.air&&y>=L.air.y&&y<=L.air.y+L.air.d)r=Math.max(r,L.air.w);const a=s.roomW-l-r;if(a<minA){minA=a;minY=y}}
  const long=Math.min(s.longLen,L.left.d), leftRod=long+Math.max(0,L.left.d-long)*2, rightRod=L.right?L.right.d*2:0, rod=leftRod+rightRod;
  const cap=Math.floor(rod/s.hangerPitch), notes=[]; if(minA<800)notes.push("통로 800mm 미만"); if(L.left.y<s.doorW+100)notes.push("방문 스윙 간섭");
  const openDepth=1001, airPass=L.air?s.roomW-openDepth-((L.air.y>=L.left.y&&L.air.y<=L.left.y+L.left.d)?L.left.w:0):9999;if(L.air&&airPass<700)notes.push("에어드레서 문 열림 협소");
  return {minA,minY,rod,cap,notes,airPass,long};
}
function rr(ctx,x,y,w,h,r=9){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawPlan(){
  const c=$("planCanvas"),ctx=c.getContext("2d"),L=layoutData(),M=metrics(L),s=state;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#f4f6f8";ctx.fillRect(0,0,c.width,c.height);
  const pad=75,sc=Math.min((c.width-pad*2)/s.roomW,(c.height-pad*2)/s.roomD),ox=(c.width-s.roomW*sc)/2,oy=(c.height-s.roomD*sc)/2,px=x=>ox+x*sc,py=y=>oy+(s.roomD-y)*sc;
  ctx.fillStyle="#fff";ctx.fillRect(px(0),py(s.roomD),s.roomW*sc,s.roomD*sc);ctx.strokeStyle="#1d2733";ctx.lineWidth=8;ctx.strokeRect(px(0),py(s.roomD),s.roomW*sc,s.roomD*sc);
  const doorX=120,doorEnd=Math.min(s.roomW-100,doorX+s.doorW),baseY=py(0);ctx.strokeStyle="#fff";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(px(doorX),baseY);ctx.lineTo(px(doorEnd),baseY);ctx.stroke();
  ctx.strokeStyle="#596574";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px(doorX),baseY);ctx.lineTo(px(doorX),py(s.doorW));ctx.stroke();ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(px(doorX),baseY,s.doorW*sc,-Math.PI/2,0);ctx.stroke();ctx.setLineDash([]);
  const winX=(s.roomW-s.windowW)/2;ctx.strokeStyle="#78a9c2";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(px(winX),py(s.roomD));ctx.lineTo(px(winX+s.windowW),py(s.roomD));ctx.stroke();ctx.fillStyle="#517f96";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText("창 / 발코니",px(s.roomW/2),py(s.roomD)-13);
  drawModule(ctx,L.left,sc,px,py,"행거 · 롱+2단","#dcece6");if(L.right)drawModule(ctx,L.right,sc,px,py,"행거 · 2단","#dcece6");if(L.air)drawModule(ctx,L.air,sc,px,py,"에어드레서","#dce6f2");
  const yy=Math.min(s.roomD-450,Math.max(1100,M.minY)),lx=(yy>=L.left.y&&yy<=L.left.y+L.left.d)?L.left.w:0,rx=(L.right&&yy>=L.right.y&&yy<=L.right.y+L.right.d)?L.right.w:((L.air&&yy>=L.air.y&&yy<=L.air.y+L.air.d)?L.air.w:0);
  ctx.strokeStyle="#8b95a1";ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(px(lx),py(yy));ctx.lineTo(px(s.roomW-rx),py(yy));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#26313d";ctx.font="bold 13px sans-serif";ctx.fillText("통로 "+Math.round(s.roomW-lx-rx)+" mm",px((lx+s.roomW-rx)/2),py(yy)-8);
  ctx.fillStyle="#596574";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText(s.roomW+" mm",px(s.roomW/2),py(0)+32);ctx.save();ctx.translate(px(0)-34,py(s.roomD/2));ctx.rotate(-Math.PI/2);ctx.fillText(s.roomD+" mm",0,0);ctx.restore();
  ctx.textAlign="left";ctx.fillStyle="#7a8593";ctx.font="11px sans-serif";ctx.fillText("문",px(doorX)+4,baseY-12);ctx.fillText("※ 가구 치수는 벽 안쪽 기준",18,c.height-18);
}
function drawModule(ctx,m,sc,px,py,label,fill){
  const x=px(m.x),y=py(m.y+m.d),w=m.w*sc,h=m.d*sc;ctx.fillStyle=fill;ctx.strokeStyle="#567064";ctx.lineWidth=1.5;rr(ctx,x,y,w,h,4);ctx.fill();ctx.stroke();
  ctx.save();ctx.translate(x+w/2,y+h/2);if(h>w*1.6)ctx.rotate(-Math.PI/2);ctx.fillStyle="#27343d";ctx.font="bold 11px sans-serif";ctx.textAlign="center";ctx.fillText(label,0,-2);ctx.font="10px sans-serif";ctx.fillStyle="#607080";ctx.fillText(Math.round(m.d)+" × "+Math.round(m.w),0,13);ctx.restore();
}
function updateStats(){
  const L=layoutData(),M=metrics(L),aisle=$("aisleStat"),note=$("aisleNote");aisle.textContent=Math.round(M.minA)+" mm";note.className=M.minA>=900?"good":M.minA>=800?"":"bad";note.textContent=M.minA>=1000?"넉넉함":M.minA>=900?"편한 편":M.minA>=800?"사용 가능":"타이트";
  $("rodStat").textContent=(M.rod/1000).toFixed(1)+" m";const practical=Math.floor(M.cap*.72);$("capStat").textContent="약 "+practical+"~"+M.cap+"벌";$("capNote").textContent="셔츠~아우터 혼합에 따라 변동";
  $("checkStat").textContent=M.notes.length?"주의 "+M.notes.length+"건":"간섭 없음";$("checkNote").textContent=M.notes.length?M.notes.join(" · "):"도면 가정 내";$("checkNote").className=M.notes.length?"bad":"good";
  const lp=state.layoutPreset==="max"?"양측 벽 행거를 최대한 쓰는 구성":state.layoutPreset==="balanced"?"한쪽 밀도를 낮춰 여유를 둔 구성":"한쪽 벽에 행거를 집중한 구성";
  $("summary").innerHTML="<b>"+lp+"</b><br>왼쪽은 롱의류 "+Math.round(M.long)+"mm + 2단 행거, "+(L.right?"오른쪽은 2단 행거":"오른쪽 행거는 비움")+"으로 구성했습니다.<br>"+(state.airOn?"에어드레서는 출입문과 반대인 오른쪽 하단에 배치했습니다.":"에어드레서는 현재 제외했습니다.")+"<br>최소 통로는 <b>"+Math.round(M.minA)+"mm</b>입니다.<br>전신거울은 바닥을 쓰지 않는 방문 후면형이 잘 맞습니다.";
}
function poly(ctx,pts,fill,stroke="#64707d",lw=1){ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function drawIso(){
  const c=$("isoCanvas"),ctx=c.getContext("2d"),s=state,L=layoutData(),M=metrics(L);ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#f4f6f8";ctx.fillRect(0,0,c.width,c.height);
  const dx=(s.roomW+s.roomD)*.55,dy=(s.roomW+s.roomD)*.25+s.roomH*.65,k=Math.min((c.width-190)/dx,(c.height-120)/dy),cx=c.width/2+45,cy=c.height-65;
  const pr=(x,y,z)=>[cx+(x-y)*.55*k,cy-(x+y)*.25*k-z*.65*k];
  poly(ctx,[pr(0,0,0),pr(s.roomW,0,0),pr(s.roomW,s.roomD,0),pr(0,s.roomD,0)],"#e9ecef","#aeb7c1",1.5);
  poly(ctx,[pr(0,0,0),pr(0,s.roomD,0),pr(0,s.roomD,s.roomH),pr(0,0,s.roomH)],"rgba(255,255,255,.55)","#c8cfd6",1);
  poly(ctx,[pr(0,s.roomD,0),pr(s.roomW,s.roomD,0),pr(s.roomW,s.roomD,s.roomH),pr(0,s.roomD,s.roomH)],"rgba(255,255,255,.42)","#c8cfd6",1);
  drawIsoHanger(ctx,pr,L.left,"left",M.long);if(L.right)drawIsoHanger(ctx,pr,L.right,"right",0);
  if(L.air)drawIsoBox(ctx,pr,L.air.x,L.air.y,0,L.air.w,L.air.d,L.air.h,"#d6e4f3","#63758b","에어드레서");
  const wx=(s.roomW-s.windowW)/2;ctx.strokeStyle="#74a9c4";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(...pr(wx,s.roomD,950));ctx.lineTo(...pr(wx+s.windowW,s.roomD,950));ctx.stroke();
  ctx.beginPath();ctx.moveTo(...pr(wx,s.roomD,950));ctx.lineTo(...pr(wx,s.roomD,1900));ctx.lineTo(...pr(wx+s.windowW,s.roomD,1900));ctx.lineTo(...pr(wx+s.windowW,s.roomD,950));ctx.stroke();
  ctx.fillStyle="#28333f";ctx.font="bold 13px sans-serif";ctx.textAlign="left";ctx.fillText("3D 배치 미리보기",22,30);ctx.font="11px sans-serif";ctx.fillStyle="#718090";ctx.fillText("실측 전 가안 · 최소 통로 "+Math.round(M.minA)+"mm",22,49);
}function drawIsoBox(ctx,p,x,y,z,w,d,h,fill,stroke,label){
  const a=p(x,y,z),b=p(x+w,y,z),c=p(x+w,y+d,z),d0=p(x,y+d,z),A=p(x,y,z+h),B=p(x+w,y,z+h),C=p(x+w,y+d,z+h),D=p(x,y+d,z+h);
  poly(ctx,[a,b,B,A],fill,stroke,1);poly(ctx,[b,c,C,B],fill,stroke,1);poly(ctx,[A,B,C,D],"rgba(255,255,255,.82)",stroke,1);poly(ctx,[d0,a,A,D],"rgba(255,255,255,.18)",stroke,1);
  if(label){const q=p(x+w/2,y+d/2,z+h+55);ctx.fillStyle="#32414f";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(label,q[0],q[1])}
}
function isoLine(ctx,p,a,b,color="#5f6d79",lw=2){ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(...p(...a));ctx.lineTo(...p(...b));ctx.stroke()}
function drawIsoHanger(ctx,p,m,side,longLen){
  drawIsoBox(ctx,p,m.x,m.y,0,m.w,m.d,2050,"rgba(220,236,230,.38)","#71877e","");
  const frontX=side==="left"?m.x+m.w:m.x,rodX=side==="left"?m.x+m.w-70:m.x+70,topZ=1780,lowZ=980;
  drawIsoBox(ctx,p,m.x,m.y,2020,m.w,m.d,55,"#d4ddd8","#71877e","");
  if(longLen>0){const ll=Math.min(longLen,m.d);isoLine(ctx,p,[rodX,m.y+20,topZ],[rodX,m.y+ll-20,topZ],"#59636f",3);drawGarments(ctx,p,frontX,m.y,ll,topZ,1120,side);
    const y2=m.y+ll;if(m.d-ll>100){isoLine(ctx,p,[rodX,y2+20,topZ],[rodX,m.y+m.d-20,topZ],"#59636f",3);isoLine(ctx,p,[rodX,y2+20,lowZ],[rodX,m.y+m.d-20,lowZ],"#59636f",3);drawGarments(ctx,p,frontX,y2,m.d-ll,topZ,570,side);drawGarments(ctx,p,frontX,y2,m.d-ll,lowZ,520,side)}}
  else{isoLine(ctx,p,[rodX,m.y+20,topZ],[rodX,m.y+m.d-20,topZ],"#59636f",3);isoLine(ctx,p,[rodX,m.y+20,lowZ],[rodX,m.y+m.d-20,lowZ],"#59636f",3);drawGarments(ctx,p,frontX,m.y,m.d,topZ,570,side);drawGarments(ctx,p,frontX,m.y,m.d,lowZ,520,side)}
}
function drawGarments(ctx,p,x,y,len,z,drop,side){const n=Math.max(3,Math.min(11,Math.floor(len/180)));for(let i=1;i<=n;i++){const yy=y+(len*i/(n+1));isoLine(ctx,p,[x,yy,z-30],[x,yy,z-drop],i%3===0?"#9b7f76":i%3===1?"#8ba0a8":"#7d8e83",3)}}
function renderAll(){syncUI();drawPlan();drawIso();updateStats()}
syncUI();renderAll();if(new URLSearchParams(location.search).get("view")==="iso")document.querySelector('[data-view="iso"]').click();