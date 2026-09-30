const defaults={roomPreset:"r3",roomW:2330,roomD:2980,roomH:2300,doorW:800,windowW:1500,layoutPreset:"dresser",hangerDepth:500,longLen:850,hangerPitch:45,airOn:true,airW:445,airD:632,airH:1850,vanityOn:true,vanityW:800,vanityD:400};
const ids=["roomPreset","roomW","roomD","roomH","doorW","windowW","layoutPreset","hangerDepth","longLen","hangerPitch","airOn","airW","airD","airH","vanityOn","vanityW","vanityD"];
const $=id=>document.getElementById(id),els=Object.fromEntries(ids.map(id=>[id,$(id)]));
let state=loadState();
function loadState(){try{return {...defaults,...JSON.parse(localStorage.getItem("maetanDressStateV3")||"{}")}}catch{return {...defaults}}}
function saveState(){localStorage.setItem("maetanDressStateV3",JSON.stringify(state))}
function preset(v){if(v==="r3")return {roomW:2330,roomD:2980,roomH:2300,doorW:800,windowW:1500};if(v==="r2")return {roomW:2600,roomD:2980,roomH:2300,doorW:800,windowW:1500};if(v==="ref")return {roomW:2000,roomD:2620,roomH:2300,doorW:850,windowW:700};return null}
function syncUI(){ids.forEach(id=>{const el=els[id];if(!el)return;if(el.type==="checkbox")el.checked=!!state[id];else el.value=state[id]});$("depthOut").textContent=state.hangerDepth+" mm";$("longOut").textContent=state.longLen+" mm";$("pitchOut").textContent=state.hangerPitch+" mm"}
function readUI(){ids.forEach(id=>{const el=els[id];if(!el)return;state[id]=el.type==="checkbox"?el.checked:(el.type==="number"||el.type==="range"?Number(el.value):el.value)});saveState();renderAll()}
ids.forEach(id=>els[id]?.addEventListener("input",()=>{if(["roomW","roomD","roomH","doorW","windowW"].includes(id)&&state.roomPreset!=="custom"){state.roomPreset="custom";els.roomPreset.value="custom"}readUI()}));
els.roomPreset.addEventListener("change",()=>{const v=els.roomPreset.value,p=preset(v);state.roomPreset=v;if(p)Object.assign(state,p);syncUI();saveState();renderAll()});
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));const v=b.dataset.view;$("planCanvas").hidden=v!=="plan";$("isoCanvas").hidden=v!=="iso";renderAll()});
document.querySelectorAll("[data-apply-layout]").forEach(el=>el.addEventListener("click",()=>applyLayout(el.dataset.applyLayout)));
document.querySelectorAll("[data-scroll]").forEach(el=>el.addEventListener("click",()=>document.getElementById(el.dataset.scroll)?.scrollIntoView({behavior:"smooth"})));
$("resetBtn").onclick=()=>{state={...defaults};syncUI();saveState();renderAll()};
$("applyBtn").onclick=()=>applyLayout("dresser");
$("toggleControls").onclick=()=>{document.querySelector(".controls").classList.toggle("collapsed");$("toggleControls").textContent=document.querySelector(".controls").classList.contains("collapsed")?"펼치기":"접기"};
if(innerWidth<=560){document.querySelector(".controls").classList.add("collapsed");$("toggleControls").textContent="펼치기"}
function applyLayout(type){state.layoutPreset=type;if(type==="dresser"){state.hangerDepth=500;state.longLen=850;state.airOn=true;state.vanityOn=true;state.vanityW=state.roomW<=2100?800:900;state.vanityD=400}else if(type==="max"){state.hangerDepth=state.roomW<2300?500:550;state.airOn=true;state.vanityOn=false}else if(type==="single"){state.hangerDepth=500;state.airOn=true;state.vanityOn=true;state.vanityW=800;state.vanityD=400}else{state.hangerDepth=500;state.airOn=true;state.vanityOn=false}syncUI();saveState();renderAll();document.querySelector(".workspace")?.scrollIntoView({behavior:"smooth",block:"start"})}
function layoutData(){
 const s=state,hd=s.hangerDepth;
 if(s.layoutPreset==="dresser"){
   const backLen=Math.max(700,Math.min(1350,s.roomW-(s.airOn?s.airD+120:120)));
   const back={x:80,y:s.roomD-hd,w:backLen,d:hd,h:2100};
   const leftStart=Math.max(s.doorW+130,900),leftEnd=s.roomD-hd-70;
   const left={x:0,y:leftStart,w:hd,d:Math.max(0,leftEnd-leftStart),h:2100};
   const air=s.airOn?{x:s.roomW-s.airD,y:s.roomD-s.airW-60,w:s.airD,d:s.airW,h:s.airH}:null;
   const vanity=s.vanityOn?{x:s.roomW-s.vanityD,y:100,w:s.vanityD,d:s.vanityW,h:760}:null;
   return {mode:"dresser",left,back,right:null,air,vanity};
 }
 const airY=110,topGap=140,leftStart=Math.max(s.doorW+130,930),leftEnd=s.roomD-topGap;
 let rightStart=s.airOn?airY+s.airW+140:180,rightEnd=s.roomD-topGap,rightOn=true;
 if(s.layoutPreset==="balanced")rightStart=Math.max(rightStart,rightEnd-1350);
 if(s.layoutPreset==="single")rightOn=false;
 const leftLen=Math.max(0,leftEnd-leftStart),rightLen=rightOn?Math.max(0,rightEnd-rightStart):0;
 const air=s.airOn?{x:s.roomW-s.airD,y:airY,w:s.airD,d:s.airW,h:s.airH}:null;
 const vanity=s.vanityOn?{x:s.roomW-s.vanityD,y:Math.max(airY+(s.airOn?s.airW+160:100),250),w:s.vanityD,d:s.vanityW,h:760}:null;
 return {mode:s.layoutPreset,left:{x:0,y:leftStart,w:hd,d:leftLen,h:2100},back:null,right:rightOn?{x:s.roomW-hd,y:rightStart,w:hd,d:rightLen,h:2100}:null,air,vanity};
}
function boundsAt(y,L){let left=0,right=state.roomW;if(L.left&&y>=L.left.y&&y<=L.left.y+L.left.d)left=Math.max(left,L.left.w);[L.right,L.air,L.vanity].filter(Boolean).forEach(m=>{if(y>=m.y&&y<=m.y+m.d)right=Math.min(right,m.x)});return {left,right,aisle:right-left}}
function overlap(a,b){return a&&b&&a.x<a.x+a.w&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.d&&b.y<a.y+a.d}
function metrics(L){
 const s=state;let minA=s.roomW,minY=0;for(let y=0;y<=s.roomD;y+=10){const b=boundsAt(y,L);if(b.aisle<minA){minA=b.aisle;minY=y}}
 let rod=0,long=0;if(L.mode==="dresser"){long=Math.min(s.longLen,L.left.d);rod=long+Math.max(0,L.left.d-long)*2+(L.back?L.back.w:0)}else{long=Math.min(s.longLen,L.left.d);rod=long+Math.max(0,L.left.d-long)*2+(L.right?L.right.d*2:0)}
 const cap=Math.floor(rod/s.hangerPitch),practical=Math.floor(cap*.72),notes=[];
 if(minA<800)notes.push("통로 800mm 미만");if(L.left&&L.left.y<s.doorW+100)notes.push("방문 스윙 간섭");
 if(L.air){const y=L.air.y+L.air.d/2,b=boundsAt(y,L),openNeed=1023;if(s.roomW-b.left-openNeed<250)notes.push("에어드레서 문 열림 여유 확인")}
 if(L.vanity&&L.air&&L.vanity.y+L.vanity.d>L.air.y-40)notes.push("화장대-에어드레서 간격 부족");
 if(L.vanity&&L.vanity.d>s.roomD-200)notes.push("화장대 폭 과다");
 const fit=notes.length===0&&minA>=800;return {minA,minY,rod,cap,practical,notes,long,fit};
}
function rr(ctx,x,y,w,h,r=8){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawModule(ctx,m,sc,px,py,label,fill){if(!m)return;const x=px(m.x),y=py(m.y+m.d),w=m.w*sc,h=m.d*sc;ctx.fillStyle=fill;ctx.strokeStyle="#8b7764";ctx.lineWidth=1.4;rr(ctx,x,y,w,h,5);ctx.fill();ctx.stroke();ctx.save();ctx.translate(x+w/2,y+h/2);if(h>w*1.6)ctx.rotate(-Math.PI/2);ctx.fillStyle="#3b3028";ctx.font="bold 11px sans-serif";ctx.textAlign="center";ctx.fillText(label,0,-2);ctx.font="10px sans-serif";ctx.fillStyle="#7b6a5c";ctx.fillText(Math.round(m.d)+" × "+Math.round(m.w),0,13);ctx.restore()}
function drawPlan(){
 const c=$("planCanvas"),ctx=c.getContext("2d"),L=layoutData(),M=metrics(L),s=state;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#fcfaf7";ctx.fillRect(0,0,c.width,c.height);
 const pad=82,sc=Math.min((c.width-pad*2)/s.roomW,(c.height-pad*2)/s.roomD),ox=(c.width-s.roomW*sc)/2,oy=(c.height-s.roomD*sc)/2,px=x=>ox+x*sc,py=y=>oy+(s.roomD-y)*sc;
 ctx.fillStyle="#fff";ctx.fillRect(px(0),py(s.roomD),s.roomW*sc,s.roomD*sc);ctx.strokeStyle="#342b25";ctx.lineWidth=8;ctx.strokeRect(px(0),py(s.roomD),s.roomW*sc,s.roomD*sc);
 const doorX=120,doorEnd=Math.min(s.roomW-100,doorX+s.doorW),baseY=py(0);ctx.strokeStyle="#fff";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(px(doorX),baseY);ctx.lineTo(px(doorEnd),baseY);ctx.stroke();ctx.strokeStyle="#8a817a";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px(doorX),baseY);ctx.lineTo(px(doorX),py(s.doorW));ctx.stroke();ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(px(doorX),baseY,s.doorW*sc,-Math.PI/2,0);ctx.stroke();ctx.setLineDash([]);
 const winX=Math.max(0,(s.roomW-s.windowW)/2);ctx.strokeStyle="#8fb2c2";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(px(winX),py(s.roomD));ctx.lineTo(px(winX+s.windowW),py(s.roomD));ctx.stroke();
 drawModule(ctx,L.back,sc,px,py,"후면 행거","#efe3d4");drawModule(ctx,L.left,sc,px,py,L.mode==="dresser"?"측면 2단":"행거 · 롱+2단","#efe3d4");drawModule(ctx,L.right,sc,px,py,"2단 행거","#efe3d4");drawModule(ctx,L.air,sc,px,py,"에어드레서","#e1e8ee");drawModule(ctx,L.vanity,sc,px,py,"화장대","#f1ddd0");
 const b=boundsAt(M.minY,L);ctx.strokeStyle="#9b8b7e";ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(px(b.left),py(M.minY));ctx.lineTo(px(b.right),py(M.minY));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#3b3028";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillText("통로 "+Math.round(b.aisle)+" mm",px((b.left+b.right)/2),py(M.minY)-8);
 ctx.fillStyle="#6a5a4e";ctx.font="12px sans-serif";ctx.fillText(s.roomW+" mm",px(s.roomW/2),py(0)+34);ctx.save();ctx.translate(px(0)-36,py(s.roomD/2));ctx.rotate(-Math.PI/2);ctx.fillText(s.roomD+" mm",0,0);ctx.restore();ctx.textAlign="left";ctx.fillStyle="#87786b";ctx.fillText("문",px(doorX)+4,baseY-12);
}
function poly(ctx,pts,fill,stroke="#8c7968",lw=1){ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function drawIsoBox(ctx,p,m,fill,stroke,label){if(!m)return;const {x,y,w,d,h}=m,z=0,a=p(x,y,z),b=p(x+w,y,z),c=p(x+w,y+d,z),d0=p(x,y+d,z),A=p(x,y,h),B=p(x+w,y,h),C=p(x+w,y+d,h),D=p(x,y+d,h);poly(ctx,[a,b,B,A],fill,stroke);poly(ctx,[b,c,C,B],fill,stroke);poly(ctx,[A,B,C,D],"rgba(255,255,255,.72)",stroke);poly(ctx,[d0,a,A,D],"rgba(255,255,255,.15)",stroke);if(label){const q=p(x+w/2,y+d/2,h+55);ctx.fillStyle="#473a31";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(label,q[0],q[1])}}
function drawIso(){const c=$("isoCanvas"),ctx=c.getContext("2d"),s=state,L=layoutData(),M=metrics(L);ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#fcfaf7";ctx.fillRect(0,0,c.width,c.height);const dx=(s.roomW+s.roomD)*.55,dy=(s.roomW+s.roomD)*.25+s.roomH*.65,k=Math.min((c.width-180)/dx,(c.height-110)/dy),cx=c.width/2+30,cy=c.height-60,p=(x,y,z)=>[cx+(x-y)*.55*k,cy-(x+y)*.25*k-z*.65*k];poly(ctx,[p(0,0,0),p(s.roomW,0,0),p(s.roomW,s.roomD,0),p(0,s.roomD,0)],"#f1ebe4","#cab8aa",1.5);poly(ctx,[p(0,0,0),p(0,s.roomD,0),p(0,s.roomD,s.roomH),p(0,0,s.roomH)],"rgba(255,255,255,.5)","#d6c8ba");poly(ctx,[p(0,s.roomD,0),p(s.roomW,s.roomD,0),p(s.roomW,s.roomD,s.roomH),p(0,s.roomD,s.roomH)],"rgba(255,255,255,.32)","#d6c8ba");drawIsoBox(ctx,p,L.back,"rgba(239,227,212,.52)","#957f6c","후면 행거");drawIsoBox(ctx,p,L.left,"rgba(239,227,212,.45)","#957f6c","측면 행거");drawIsoBox(ctx,p,L.right,"rgba(239,227,212,.45)","#957f6c","행거");drawIsoBox(ctx,p,L.air,"#e1e8ee","#71808d","에어드레서");drawIsoBox(ctx,p,L.vanity,"#f0dcd0","#a88976","화장대");ctx.fillStyle="#4b3d33";ctx.font="bold 13px sans-serif";ctx.textAlign="left";ctx.fillText("3D 배치 미리보기",20,28);ctx.font="11px sans-serif";ctx.fillStyle="#86766a";ctx.fillText("최소 통로 "+Math.round(M.minA)+"mm · 실측 전 가안",20,47)}
function updateStats(){
 const L=layoutData(),M=metrics(L),aisle=$("aisleStat"),note=$("aisleNote");aisle.textContent=Math.round(M.minA)+" mm";note.className=M.minA>=900?"good":M.minA>=800?"":"bad";note.textContent=M.minA>=1000?"넉넉함":M.minA>=900?"편한 편":M.minA>=800?"사용 가능":"타이트";$("rodStat").textContent=(M.rod/1000).toFixed(1)+" m";$("capStat").textContent="약 "+M.practical+"~"+M.cap+"벌";$("capNote").textContent="셔츠~아우터 혼합";$("checkStat").textContent=M.notes.length?"주의 "+M.notes.length+"건":"간섭 없음";$("checkNote").textContent=M.notes.length?M.notes.join(" · "):"도면 가정 내";$("checkNote").className=M.notes.length?"bad":"good";
 $("heroAisle").textContent=Math.round(M.minA)+" mm";$("heroRod").textContent=(M.rod/1000).toFixed(1)+" m";$("heroCap").textContent=M.practical+"~"+M.cap+"벌";$("heroFit").textContent=M.fit?"적합":"실측 확인";$("heroFit").className=M.fit?"good":"bad";
 const lp=state.layoutPreset==="dresser"?"ㄱ자 행거 + 화장대 B안":state.layoutPreset==="max"?"행거 수납 극대화":state.layoutPreset==="balanced"?"균형형": "한쪽벽 여유형";
 $("summary").innerHTML="<b>"+lp+"</b><br>"+(L.back?"후면 행거 "+Math.round(L.back.w)+"mm, ":"")+"측면 행거 "+Math.round(L.left.d)+"mm 구성입니다.<br>"+(state.airOn?"에어드레서 포함. ":"")+(state.vanityOn?"화장대 "+state.vanityW+"×"+state.vanityD+"mm 포함. ":"")+"<br>최소 통로 <b>"+Math.round(M.minA)+"mm</b>입니다. 전신거울은 방문 후면 문걸이형이 가장 공간 효율이 좋습니다.";
 const moduleTip=state.layoutPreset==="dresser"?"후면은 800+600 모듈, 측면은 800+600 또는 800+800 조합으로 시작해 실측 후 마지막 폭을 맞추는 방식이 안전합니다.":"행거 깊이는 "+state.hangerDepth+"mm 기준으로 선택하세요.";
 const vanityTip=state.vanityOn?(M.minA>=900?"현재 폭이면 화장대 800~900mm가 무난합니다.":"화장대는 800mm 폭·400mm 깊이로 제한하는 편이 안전합니다."):"화장대를 넣고 싶다면 B안을 적용하세요.";
 const advice=$("productAdvice");advice.className="product-advice "+(M.fit?"good":"warn");advice.innerHTML="<b>현재 치수 기준 구매 제안</b><br>"+moduleTip+" "+vanityTip+" 에어드레서는 실제 설치 여유와 문 열림 동선을 구매 전 다시 확인하세요.";
}
function renderAll(){syncUI();drawPlan();drawIso();updateStats()}
syncUI();renderAll();