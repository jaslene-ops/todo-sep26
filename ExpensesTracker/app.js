const CATEGORIES=["Food & Dining","Groceries","Transport","Shopping","Utilities & Bills","Entertainment","Travel","Health & Medical","Office & Business","Other"];
const PAYMENTS=["Cash","Credit Card","Debit Card","PayNow / PayLah","GrabPay","Apple Pay / Google Pay","NETS","Bank Transfer","Other"];
const CURRENCIES=["SGD","MYR","USD","EUR","GBP","AUD","JPY","IDR","THB","CNY","HKD","INR","NOK","CAD"];
const catColor=c=>`var(--c${(CATEGORIES.indexOf(c)+1)||10})`;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const fmt=(n,cur)=>{try{return new Intl.NumberFormat("en-SG",{style:"currency",currency:cur||"SGD",currencyDisplay:"code"}).format(n||0).replace(/ /g," ")}catch{return (cur||"")+" "+Number(n||0).toFixed(2)}};
const monthKey=d=>(d||"").slice(0,7);
const n2=n=>Number(n||0).toLocaleString("en-SG",{minimumFractionDigits:2,maximumFractionDigits:2});
const PRESETS=[["last7","Last 7 days"],["last30","Last 30 days"],["last90","Last 3 months"],["ytd","This year"],["all","All time"],["custom","Custom range…"]];
const addDays=(iso,n)=>{const d=new Date(iso+"T00:00");d.setDate(d.getDate()+n);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
function getRange(v){
  const t=today();const short=d=>new Date(d+"T00:00").toLocaleDateString("en-SG",{day:"numeric",month:"short",year:"numeric"});
  if(v==="all")return{all:true,label:"All time"};
  if(v==="last7")return{from:addDays(t,-6),to:t,label:"Last 7 days"};
  if(v==="last30")return{from:addDays(t,-29),to:t,label:"Last 30 days"};
  if(v==="last90")return{from:addDays(t,-89),to:t,label:"Last 3 months"};
  if(v==="ytd")return{from:t.slice(0,4)+"-01-01",to:t,label:"This year"};
  if(v==="custom"){let a=$("fFrom").value||t.slice(0,8)+"01",b=$("fTo").value||t;if(a>b)[a,b]=[b,a];return{from:a,to:b,label:short(a)+" – "+short(b)}}
  const [y,m]=v.split("-").map(Number);const last=new Date(y,m,0).getDate();
  return{from:`${v}-01`,to:`${v}-${String(last).padStart(2,"0")}`,label:monthName(v)};
}
// Share of monthly budgets covered by a date range: each day counts 1/(days in its month)
function budgetFactor(from,to){let f=0,d=from,n=0;while(d<=to&&n<4000){const [y,m]=d.split("-").map(Number);f+=1/new Date(y,m,0).getDate();d=addDays(d,1);n++}return f}
const monthName=k=>{if(!k)return"";const[y,m]=k.split("-");return new Date(+y,+m-1,1).toLocaleDateString("en-SG",{month:"long",year:"numeric"})};

function fill(sel,opts){sel.innerHTML=opts.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join("")}
fill($("iCategory"),CATEGORIES);fill($("iPayment"),PAYMENTS);fill($("iCurrency"),CURRENCIES);

// Example rows, shown only until the first real expense exists
const ex=(o)=>({...o,example:true});
const d0=new Date();const ym=d0.toISOString().slice(0,7);const pm=new Date(d0.getFullYear(),d0.getMonth()-1,15).toISOString().slice(0,7);
const EXAMPLES=[
  ex({id:"e1",merchant:"Ya Kun Kaya Toast",amount:6.8,currency:"SGD",date:ym+"-03",category:"Food & Dining",payment:"PayNow / PayLah"}),
  ex({id:"e2",merchant:"FairPrice Finest",amount:84.35,currency:"SGD",date:ym+"-05",category:"Groceries",payment:"Credit Card"}),
  ex({id:"e3",merchant:"Grab ride",amount:17.4,currency:"SGD",date:ym+"-08",category:"Transport",payment:"GrabPay"}),
  ex({id:"e4",merchant:"Challenger",amount:129,currency:"SGD",date:ym+"-10",category:"Office & Business",payment:"Debit Card"}),
  ex({id:"e5",merchant:"Guardian Pharmacy",amount:22.9,currency:"SGD",date:pm+"-21",category:"Health & Medical",payment:"NETS"}),
];

// ---- Storage (localStorage) ----
const STORE_EXPENSES="expenses-items", STORE_BUDGETS="expenses-budgets";
const MAX_EXPENSES=2000, MAX_TEXT=200, MAX_OCR=20000, MAX_AMOUNT=1e9;
const genId=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
const isIsoDate=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d);
function isValidExpense(e){
  return e&&typeof e==="object"&&typeof e.id==="string"&&e.id.length<=64&&
    typeof e.amount==="number"&&isFinite(e.amount)&&e.amount>=0&&e.amount<=MAX_AMOUNT&&
    isIsoDate(e.date)&&typeof e.currency==="string"&&/^[A-Z]{3}$/.test(e.currency)&&
    CATEGORIES.includes(e.category)&&PAYMENTS.includes(e.payment)&&
    (e.thumb==null||e.thumb===""||(typeof e.thumb==="string"&&e.thumb.startsWith("data:image/jpeg;base64,")));
}
function clean(e){return{id:e.id,merchant:String(e.merchant||"").slice(0,MAX_TEXT),amount:e.amount,currency:e.currency,date:e.date,
  category:e.category,payment:e.payment,note:String(e.note||"").slice(0,MAX_TEXT),thumb:e.thumb||"",ocrText:String(e.ocrText||"").slice(0,MAX_OCR),
  createdAt:+e.createdAt||0,updatedAt:+e.updatedAt||0}}
function loadExpenses(){try{const a=JSON.parse(localStorage.getItem(STORE_EXPENSES)||"[]");return Array.isArray(a)?a.filter(isValidExpense).map(clean).slice(0,MAX_EXPENSES):[]}catch{return[]}}
function loadBudgets(){try{const b=JSON.parse(localStorage.getItem(STORE_BUDGETS)||"null");
  if(b&&typeof b.byCategory==="object"&&b.byCategory){const by={};CATEGORIES.forEach(c=>{const n=+b.byCategory[c];by[c]=isFinite(n)&&n>0?n:0});return{currency:"SGD",byCategory:by}}}catch{}
  return{currency:"SGD",byCategory:{...SUGGESTED}}}
function saveExpenses(){try{localStorage.setItem(STORE_EXPENSES,JSON.stringify(items));return true}catch(e){toast(errMsg(e));return false}}
function saveBudgets(){try{localStorage.setItem(STORE_BUDGETS,JSON.stringify(budgets));return true}catch(e){toast(errMsg(e));return false}}
const MAX_PDF_PAGES=3;
let items=[]; let usingExamples=true;
let budgets={currency:"SGD",byCategory:{}}; let currentOcr=""; let editing=null; let currentFile=null; let currentThumb=null;

// ---- Render ----
function render(){
  const data=usingExamples?EXAMPLES:items;
  $("exampleBanner").hidden=!usingExamples;
  $("exportCsv").hidden=usingExamples;
  // month filter options
  const months=[...new Set([today().slice(0,7),...data.map(e=>monthKey(e.date)).filter(Boolean)])].sort().reverse();
  const fm=$("fMonth"),fc=$("fCat");const curM=fm.value,curC=fc.value;
  fm.innerHTML=`<optgroup label="Quick ranges">`+PRESETS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")+`</optgroup><optgroup label="Month">`+months.map(m=>`<option value="${m}">${esc(monthName(m))}</option>`).join("")+`</optgroup>`;
  fm.value=(curM&&(PRESETS.some(p=>p[0]===curM)||months.includes(curM)))?curM:today().slice(0,7);
  fc.innerHTML=`<option value="all">All categories</option>`+CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join("");
  fc.value=curC||"all";
  const C=fc.value;
  const R=getRange(fm.value);
  $("rangeBox").hidden=fm.value!=="custom";
  const inMonth=data.filter(e=>R.all||(e.date&&e.date>=R.from&&e.date<=R.to));
  const shown=inMonth.filter(e=>C==="all"||e.category===C).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||0)-(a.createdAt||0));

  // main currency = most frequent
  const cc={};inMonth.forEach(e=>cc[e.currency||"SGD"]=(cc[e.currency||"SGD"]||0)+1);
  const main=Object.keys(cc).sort((a,b)=>cc[b]-cc[a])[0]||"SGD";
  const mainRows=inMonth.filter(e=>(e.currency||"SGD")===main);
  const total=mainRows.reduce((s,e)=>s+(+e.amount||0),0);
  const others=Object.keys(cc).filter(c=>c!==main);
  const byCat={};mainRows.forEach(e=>byCat[e.category||"Other"]=(byCat[e.category||"Other"]||0)+(+e.amount||0));
  const topCat=Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a])[0];
  const period=R.label;
  // budgets (monthly, compared against spend in the budget currency)
  const bc=budgets.currency||"SGD";
  const bRows=inMonth.filter(e=>(e.currency||"SGD")===bc);
  const spentBy={};bRows.forEach(e=>spentBy[e.category||"Other"]=(spentBy[e.category||"Other"]||0)+(+e.amount||0));
  const B0=budgets.byCategory||{};const f=R.all?1:budgetFactor(R.from,R.to);const monthly=!R.all;
  const B={};CATEGORIES.forEach(c=>B[c]=(+B0[c]||0)*f);
  const bTotal=CATEGORIES.reduce((s,c)=>s+B[c],0);
  const bSpent=bRows.reduce((s,e)=>s+(+e.amount||0),0);
  const left=bTotal-bSpent;
  const overCats=CATEGORIES.filter(c=>+B[c]>0&&(spentBy[c]||0)>+B[c]);
  const budgetStat=!bTotal?`<div class="stat"><span class="label">Monthly budget</span><span class="big">–</span><span class="sub"><button class="linkbtn" type="button" data-editbudget>Set budgets</button></span></div>`
    :monthly?`<div class="stat"><span class="label">Budget left · ${esc(period)}</span><span class="big" style="color:${left<0?"var(--danger)":"inherit"}">${left<0?"−":""}${fmt(Math.abs(left),bc)}</span><span class="sub">${left<0?"Over":"Of"} ${fmt(bTotal,bc)} budget${Math.abs(f-1)>.001?` (prorated)`:""}${overCats.length?` · ${overCats.length} categor${overCats.length===1?"y":"ies"} over`:""}</span></div>`
    :`<div class="stat"><span class="label">Monthly budget</span><span class="big">${fmt(bTotal,bc)}</span><span class="sub">Pick a month or date range to compare spend with budget</span></div>`;
  $("summary").innerHTML=`
    <div class="stat"><span class="label">Spent · ${esc(period)}</span><span class="big">${fmt(total,main)}</span><span class="sub">${inMonth.length} receipt${inMonth.length===1?"":"s"}${others.length?` · plus ${others.map(c=>esc(fmt(inMonth.filter(e=>e.currency===c).reduce((s,e)=>s+(+e.amount||0),0),c))).join(", ")}`:""}</span></div>
    <div class="stat"><span class="label">Top category</span><span class="big" style="font-family:var(--display);font-size:21px">${esc(topCat||"–")}</span><span class="sub">${topCat?fmt(byCat[topCat],main)+" · "+Math.round(byCat[topCat]/total*100)+"% of spend":"No expenses yet"}</span></div>
    ${budgetStat}`;

  // category budget bars
  $("catPeriod").textContent=period+" · "+bc+(monthly&&Math.abs(f-1)>.001?" · budgets prorated":"");
  const rowsC=CATEGORIES.filter(c=>+B[c]>0||spentBy[c]).sort((a,b)=>{const ra=+B[a]?(spentBy[a]||0)/B[a]:(spentBy[a]?9:0),rb=+B[b]?(spentBy[b]||0)/B[b]:(spentBy[b]?9:0);return rb-ra});
  const maxSpend=Math.max(...rowsC.map(c=>spentBy[c]||0),1);
  $("cats").innerHTML=rowsC.length?rowsC.map(c=>{
    const sp=spentBy[c]||0,bu=+B[c]||0;
    if(!monthly||!bu){return `<div class="cat"><div class="top"><b>${esc(c)}</b><span class="num">${n2(sp)}${bu?"":` <span class="note">· no budget</span>`}</span></div><div class="bar"><i style="width:${(sp/maxSpend*100).toFixed(1)}%;background:${catColor(c)}"></i></div></div>`}
    const pct=sp/bu,state=pct>=1?"over":pct>=.8?"near":"ok";
    const col=state==="over"?"var(--danger)":state==="near"?"var(--warn)":catColor(c);
    const tail=state==="over"?`<span class="pill over">${n2(sp-bu)} over</span>`:state==="near"?`<span class="pill near">${Math.round(pct*100)}% used · ${n2(bu-sp)} left</span>`:`<span class="note">${n2(bu-sp)} left</span>`;
    return `<div class="cat"><div class="top"><b>${esc(c)}</b><span class="num">${n2(sp)} <span class="note">/ ${n2(bu)}</span></span></div><div class="bar"><i style="width:${Math.min(100,pct*100).toFixed(1)}%;background:${col}"></i></div><div class="catfoot">${tail}</div></div>`;
  }).join(""):`<div class="empty">Nothing to show for this period.</div>`;

  renderPie(inMonth,period,C);

  // list
  const receiptIcon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6"/></svg>`;
  $("list").innerHTML=shown.length?shown.map(e=>`
    <div class="row">
      ${e.thumb?`<img class="thumb" src="${esc(e.thumb)}" alt="">`:`<div class="thumb">${receiptIcon}</div>`}
      <div class="main">
        <div class="merchant">${esc(e.merchant||"Unknown merchant")}</div>
        <div class="meta">
          <span class="num">${esc(fmtDate(e.date))}</span>
          <span class="chip"><span class="dot" style="background:${catColor(e.category)}"></span>${esc(e.category||"Other")}</span>
          <span class="chip">${esc(e.payment||"Other")}</span>
          ${e.note?`<span>${esc(e.note)}</span>`:""}
        </div>
      </div>
      <div class="right">
        <span class="amt">${fmt(e.amount,e.currency)}</span>
        ${e.example?"":`<button class="btn small ghost" data-edit="${esc(e.id)}" type="button">Edit</button>`}
      </div>
    </div>`).join(""):`<div class="empty">No expenses match these filters.</div>`;
}
function fmtDate(d){if(!d)return"No date";const t=new Date(d+"T00:00");return isNaN(t)?d:t.toLocaleDateString("en-SG",{day:"numeric",month:"short",year:"numeric"})}
$("fMonth").onchange=()=>{if($("fMonth").value==="custom"&&!$("fFrom").value){const t=today();$("fFrom").value=t.slice(0,8)+"01";$("fTo").value=t}render()};
$("fFrom").onchange=render;$("fTo").onchange=render;$("fCat").onchange=render;
$("list").addEventListener("click",e=>{const b=e.target.closest("[data-edit]");if(b){const it=items.find(x=>x.id===b.dataset.edit);if(it)openModal({entry:it})}});

// ---- Modal ----
function setForm(v){
  $("iMerchant").value=v.merchant||"";$("iAmount").value=v.amount!=null&&v.amount!==""?v.amount:"";
  $("iCurrency").value=CURRENCIES.includes(v.currency)?v.currency:"SGD";
  $("iDate").value=v.date||"";$("iCategory").value=CATEGORIES.includes(v.category)?v.category:"Other";
  $("iPayment").value=PAYMENTS.includes(v.payment)?v.payment:"Other";$("iNote").value=v.note||"";
}
function flag(ids){["iMerchant","iAmount","iDate","iCategory","iPayment"].forEach(id=>$(id).closest(".field").classList.toggle("flag",ids.includes(id)))}
function openModal({entry=null,file=null}={}){
  editing=entry;currentFile=file;currentThumb=entry?.thumb||null;
  $("confirmBox").innerHTML="";flag([]);$("itemsBox").innerHTML="";showOcrText(entry?.ocrText||"","saved");
  $("mTitle").textContent=entry?"Edit expense":file?"Review scanned receipt":"Add expense";
  $("delBtn").hidden=!entry;
  setForm(entry||{date:today(),currency:"SGD",category:"Food & Dining",payment:"Credit Card"});
  if(file){const url=URL.createObjectURL(file);$("imgBox").innerHTML=`<div class="scanline" id="scanWrap"><img src="${url}" alt="Uploaded receipt"></div>`}
  else if(currentThumb){$("imgBox").innerHTML=`<img src="${esc(currentThumb)}" alt="Receipt">`}
  else $("imgBox").innerHTML=`<div class="noimg">No receipt image</div>`;
  $("scanState").className="scan-state";$("scanState").innerHTML="";
  $("scrim").hidden=false;
  if(!file)setTimeout(()=>$("iMerchant").focus(),30);
}
function closeModal(){ocrProgress=null;$("scrim").hidden=true;editing=null;currentFile=null;currentThumb=null}
$("cancelBtn").onclick=closeModal;
$("scrim").addEventListener("click",e=>{if(e.target===$("scrim"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("scrim").hidden)closeModal()});
$("addManual").onclick=()=>openModal();

$("delBtn").onclick=()=>{
  $("confirmBox").innerHTML=`<div class="confirm"><span>Delete this expense? This can't be undone.</span><span class="actions"><button type="button" class="btn small" id="cNo">Keep</button><button type="button" class="btn small primary" id="cYes" style="background:var(--danger);border-color:var(--danger)">Delete</button></span></div>`;
  $("cNo").onclick=()=>$("confirmBox").innerHTML="";
  $("cYes").onclick=()=>{const prev=items;items=items.filter(x=>x.id!==editing.id);if(!saveExpenses()){items=prev;return}usingExamples=items.length===0;toast("Expense deleted");closeModal();render()};
};

$("form").addEventListener("submit",async e=>{
  e.preventDefault();
  const amount=parseFloat($("iAmount").value);
  if(!(amount>=0)){flag(["iAmount"]);$("iAmount").focus();toast("Enter the amount before saving");return}
  const rec={merchant:$("iMerchant").value.trim(),amount:Math.round(amount*100)/100,currency:$("iCurrency").value,date:$("iDate").value||today(),
    category:$("iCategory").value,payment:$("iPayment").value,note:$("iNote").value.trim()};
  if(!editing&&items.length>=MAX_EXPENSES){toast("You've reached the limit of "+MAX_EXPENSES+" expenses. Delete old ones to add more.");return}
  rec.merchant=rec.merchant.slice(0,MAX_TEXT);rec.note=rec.note.slice(0,MAX_TEXT);
  if(!(rec.amount<=MAX_AMOUNT)){flag(["iAmount"]);toast("That amount is too large");return}
  $("saveBtn").disabled=true;
  try{
    const prev=items;
    if(editing){const note=budgetNote(rec,editing.id);items=items.map(x=>x.id===editing.id?{...x,...rec,updatedAt:Date.now()}:x);if(!saveExpenses()){items=prev;return}toast(note||"Expense updated")}
    else{if(currentFile&&!currentThumb)currentThumb=await makeThumb(currentFile).catch(()=>null);
      const note=budgetNote(rec);items=[...items,{...rec,id:genId(),thumb:currentThumb||"",ocrText:(currentOcr||"").slice(0,MAX_OCR),createdAt:Date.now(),updatedAt:0}];
      if(!saveExpenses()){items=prev;return}toast(note||"Expense saved")}
    usingExamples=items.length===0;render();
    closeModal();
  }catch(err){toast(errMsg(err))}finally{$("saveBtn").disabled=false}
});

// ---- Upload & scan ----
const drop=$("drop");
["dragenter","dragover"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>{const f=e.dataTransfer?.files?.[0];if(f)handleFile(f)});
$("fileInput").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(f)handleFile(f)});

const isPdf=f=>f.type==="application/pdf"||/\.pdf$/i.test(f.name||"");
let pdfLibPromise=null;
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(!pdfLibPromise)pdfLibPromise=new Promise((res,rej)=>{
    const base="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
    const sc=document.createElement("script");sc.src=base+"pdf.min.js";
    sc.onload=()=>{if(!window.pdfjsLib)return rej(new Error("pdf.js missing"));pdfjsLib.GlobalWorkerOptions.workerSrc=base+"pdf.worker.min.js";res(pdfjsLib)};
    sc.onerror=()=>{pdfLibPromise=null;rej(new Error("pdf.js failed to load"))};
    document.head.appendChild(sc);
  });
  return pdfLibPromise;
}
// Render the first pages of a PDF to JPEG images the scanner can read
async function pdfToImages(file,maxPages){
  const lib=await loadPdfJs();
  const pdf=await lib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
  const n=Math.min(pdf.numPages,maxPages),out=[],texts=[];
  for(let i=1;i<=n;i++){
    const page=await pdf.getPage(i);const v1=page.getViewport({scale:1});
    const scale=Math.min(3,1600/Math.max(v1.width,v1.height)*1.4);
    const vp=page.getViewport({scale});const c=document.createElement("canvas");
    c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);
    const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
    await page.render({canvasContext:ctx,viewport:vp}).promise;
    try{const tc=await page.getTextContent();let line="",lastY=null,txt=[];
      for(const it of tc.items){const y=Math.round(it.transform[5]);if(lastY!==null&&Math.abs(y-lastY)>2){txt.push(line.trim());line=""}line+=it.str+(it.hasEOL?"\n":" ");lastY=y}
      txt.push(line.trim());texts.push(txt.join("\n"))}catch{}
    const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.9));
    out.push(new File([blob],(file.name||"receipt").replace(/\.pdf$/i,"")+`-p${i}.jpg`,{type:"image/jpeg"}));
  }
  return {images:out,total:pdf.numPages,text:texts.join("\n\n").trim()};
}

// ---- OCR (Tesseract.js from the jsDelivr CDN, runs in the browser) ----
const TESS_VER="5.1.1";const TESS_BASE=`https://cdn.jsdelivr.net/npm/tesseract.js@${TESS_VER}/dist/`;
let ocrWorkerPromise=null, ocrProgress=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("load "+src));document.head.appendChild(s)})}
function getOcrWorker(){
  if(!ocrWorkerPromise)ocrWorkerPromise=(async()=>{
    if(!window.Tesseract)await loadScript(TESS_BASE+"tesseract.min.js");
    const w=await Tesseract.createWorker("eng",1,{workerPath:TESS_BASE+"worker.min.js",logger:m=>{if(ocrProgress)ocrProgress(m)}});
    await w.setParameters({preserve_interword_spaces:"1",tessedit_pageseg_mode:"4"});
    return w;
  })().catch(e=>{ocrWorkerPromise=null;throw e});
  return ocrWorkerPromise;
}
// Grayscale + contrast stretch + sensible size helps OCR on phone photos
function prepForOcr(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{
  const long=Math.max(img.width,img.height),s=long>2400?2400/long:long<1200?1200/long:1;
  const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
  const x=c.getContext("2d");x.drawImage(img,0,0,c.width,c.height);
  const d=x.getImageData(0,0,c.width,c.height),p=d.data;let lo=255,hi=0;const g=new Uint8ClampedArray(p.length/4);
  for(let i=0,j=0;i<p.length;i+=4,j++){const v=.299*p[i]+.587*p[i+1]+.114*p[i+2];g[j]=v;if(v<lo)lo=v;if(v>hi)hi=v}
  const r=Math.max(1,hi-lo);for(let i=0,j=0;i<p.length;i+=4,j++){const v=(g[j]-lo)*255/r;p[i]=p[i+1]=p[i+2]=v}
  x.putImageData(d,0,0);URL.revokeObjectURL(img.src);res(c)};img.onerror=rej;img.src=URL.createObjectURL(file)})}
async function runOcr(images,onPct){
  const w=await getOcrWorker();let out=[];
  for(let i=0;i<images.length;i++){
    ocrProgress=m=>{if(m.status==="recognizing text")onPct(Math.round(((i+m.progress)/images.length)*100))};
    const {data}=await w.recognize(await prepForOcr(images[i]));
    out.push((data.text||"").trim());
  }
  ocrProgress=null;return out.join("\n\n").replace(/[ \t]+\n/g,"\n").trim();
}

// ---- Read fields out of OCR text (used when Claude isn't available) ----
const CAT_WORDS=[
 ["Transport",/\b(grab|gojek|tada|comfort ?del ?gro|taxi|cab|mrt|ez-?link|simplygo|parking|petrol|shell|esso|caltex|spc|sinopec|toll|erp)\b/i],
 ["Groceries",/\b(fairprice|ntuc|cold ?storage|giant|sheng ?siong|don ?don ?donki|market ?place|grocer|supermarket|mustafa)\b/i],
 ["Food & Dining",/\b(restaurant|cafe|caf[eé]|coffee|kopi|toast|bakery|food|kitchen|bistro|bar|grill|mcdonald|kfc|starbucks|subway|burger|pizza|noodle|rice|chicken|dine|table ?no|pax|service charge)\b/i],
 ["Health & Medical",/\b(guardian|watsons|unity|pharmacy|clinic|medical|dental|hospital|polyclinic|doctor)\b/i],
 ["Travel",/\b(hotel|airline|airways|flight|scoot|jetstar|changi|booking\.com|agoda|airbnb|resort)\b/i],
 ["Utilities & Bills",/\b(sp ?group|sp services|singtel|starhub|m1|circles|electric|water|utilities|bill|broadband|mobile plan)\b/i],
 ["Office & Business",/\b(popular|stationery|office|printing|courier|challenger|courts|harvey ?norman|best ?denki|software)\b/i],
 ["Entertainment",/\b(cinema|golden ?village|shaw|cathay|netflix|spotify|theatre|concert|ticket|karaoke)\b/i],
 ["Shopping",/\b(uniqlo|h&m|zara|ikea|daiso|miniso|mall|store|boutique|retail)\b/i],
];
const PAY_WORDS=[
 ["PayNow / PayLah",/\b(pay ?now|paylah|sgqr)\b/i],["GrabPay",/\bgrab ?pay\b/i],["NETS",/\bnets\b/i],
 ["Apple Pay / Google Pay",/\b(apple ?pay|google ?pay|gpay|samsung ?pay)\b/i],
 ["Debit Card",/\bdebit\b/i],["Credit Card",/\b(visa|master ?card|mastercard|amex|american express|credit|unionpay|jcb|diners|card no|\*{4} ?\d{4}|x{4} ?\d{4})\b/i],
 ["Cash",/\b(cash|change due|change)\b/i],["Bank Transfer",/\b(bank transfer|giro|fast transfer)\b/i],
];
const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
function iso(y,m,d){y=+y;if(y<100)y+=2000;m=+m;d=+d;if(!(m>=1&&m<=12&&d>=1&&d<=31&&y>=2000&&y<=2100))return"";return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function parseReceipt(text){
  const t=text.replace(/[|]/g," ");const lines=t.split(/\n/).map(l=>l.trim()).filter(Boolean);
  const money=/(?:S?\$|RM|USD|SGD)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s?[.,]\s?(\d{2})(?!\d)/g;
  const vals=l=>[...l.matchAll(money)].map(m=>parseFloat(m[1].replace(/,/g,"")+"."+m[2]));
  let amount=NaN;
  const totRe=/(grand\s*total|total\s*(amount|due|payable|sgd|incl)?|amount\s*(due|payable|paid)|nett?\s*(total|amount)|balance\s*due|to\s*pay)/i;
  const skip=/(sub\s*-?\s*total|total\s*(qty|quantity|items?|savings?|disc)|before\s*gst|excl)/i;
  for(let i=lines.length-1;i>=0&&isNaN(amount);i--){
    if(totRe.test(lines[i])&&!skip.test(lines[i])){let v=vals(lines[i]);if(!v.length&&lines[i+1])v=vals(lines[i+1]);if(v.length)amount=v[v.length-1]}
  }
  const all=lines.flatMap(vals).filter(v=>v<100000);
  const amountGuess=isNaN(amount);if(amountGuess&&all.length)amount=Math.max(...all);
  let date="";
  for(const l of lines){let m;
    if((m=l.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/))&&(date=iso(m[1],m[2],m[3])))break;
    if((m=l.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/))&&(date=iso(m[3],m[2],m[1])))break;
    if((m=l.match(/\b(\d{1,2})\s*[- ]?\s*(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s*[- ,]?\s*(\d{2,4})\b/i))&&(date=iso(m[3],MONTHS[m[2].toLowerCase()],m[1])))break;
    if((m=l.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i))&&(date=iso(m[3],MONTHS[m[1].toLowerCase()],m[2])))break;
  }
  let currency="SGD";
  if(/\b(RM|MYR)\b/.test(t))currency="MYR";else if(/\bUS\$|\bUSD\b/.test(t))currency="USD";else if(/€|\bEUR\b/.test(t))currency="EUR";
  else if(/£|\bGBP\b/.test(t))currency="GBP";else if(/\bA\$|\bAUD\b/.test(t))currency="AUD";else if(/¥|\bJPY\b/.test(t))currency="JPY";
  const payment=(PAY_WORDS.find(([,re])=>re.test(t))||["Other"])[0];
  const category=(CAT_WORDS.find(([,re])=>re.test(t))||["Other"])[0];
  const junk=/(receipt|tax invoice|invoice|gst|reg|tel|fax|www|http|@|date|time|cashier|order|table|\d{5,})/i;
  const merchant=(lines.slice(0,6).find(l=>/[A-Za-z]{3,}/.test(l)&&!junk.test(l))||"").replace(/[^\w&'.\- ]/g,"").replace(/\s{2,}/g," ").trim().slice(0,60);
  const uncertain=[];if(!merchant)uncertain.push("merchant");if(isNaN(amount)||amountGuess)uncertain.push("amount");if(!date)uncertain.push("date");
  if(category==="Other")uncertain.push("category");if(payment==="Other")uncertain.push("payment");
  return {merchant,amount:isNaN(amount)?null:amount,currency,date,category,payment,items:[],uncertain};
}

async function handleFile(file){
  let images=null,pdfNote="",pdfText="";
  if(isPdf(file)){
    if(file.size>25*1024*1024){toast("That PDF is larger than 25 MB. Try a smaller file.");return}
    toast("Opening PDF…");
    try{const r=await pdfToImages(file,MAX_PDF_PAGES);images=r.images;pdfText=r.text;
      if(r.total>images.length)pdfNote=` Read the first ${images.length} of ${r.total} pages.`;}
    catch(err){toast(/password/i.test(err?.name+err?.message)?"This PDF is password-protected. Remove the password and try again.":"Couldn't open this PDF. Try another file or a screenshot.");return}
    if(!images.length){toast("This PDF has no pages to read");return}
    $("toast").hidden=true;
    file=images[0];
  }else if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type)){toast("Use a PDF or a JPG, PNG or WebP image of the receipt");return}
  openModal({file});
  makeThumb(file).then(t=>{if(currentFile===file)currentThumb=t}).catch(()=>{});
  await scan(file,images||[file],pdfNote,pdfText);
}

const tick=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`;
function busy(msg,pct){const st=$("scanState");st.className="scan-state busy";
  st.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;gap:6px"><span style="display:flex;gap:10px;align-items:center"><span class="spinner"></span><span>${esc(msg)}</span></span>${pct!=null?`<div class="bar"><i style="width:${pct}%;background:var(--accent)"></i></div>`:""}</div>`}
function showOcrText(text,src){
  currentOcr=text;
  $("ocrBox").innerHTML=text?`<details class="ocr"><summary>Text found on receipt <span class="note">(${esc(src)})</span></summary><pre>${esc(text)}</pre></details>`:"";
}

async function scan(file,imgs,pdfNote="",pdfText=""){
  const st=$("scanState");
  // Step 1: OCR (or the PDF's own text layer)
  let text="",src="";
  if(pdfText&&pdfText.replace(/\s/g,"").length>30){text=pdfText;src="PDF text"}
  else{
    busy("Reading text (OCR)…",0);
    try{text=await runOcr(imgs,p=>{if(currentFile===file)busy("Reading text (OCR)… "+p+"%",p)});src="OCR"}
    catch(e){console.warn("OCR failed",e);text=""}
  }
  if(currentFile!==file)return;
  showOcrText(text,src);
  // Step 2: pick the details out of the text
  let r=null,how="";
  if(text){r=parseReceipt(text);how=src==="PDF text"?"pdf":"ocr"}
  $("scanWrap")?.classList.remove("scanline");
  if(!r){st.className="scan-state err";st.textContent="Couldn't read any text on this receipt. Fill in the details below or try a clearer, flatter photo.";return}
  const v={merchant:r.merchant||"",amount:typeof r.amount==="number"?r.amount:parseFloat(r.amount),currency:(r.currency||"SGD").toUpperCase(),
    date:/^\d{4}-\d{2}-\d{2}$/.test(r.date||"")?r.date:"",category:r.category,payment:r.payment,note:""};
  if(v.currency&&!CURRENCIES.includes(v.currency)){CURRENCIES.push(v.currency);fill($("iCurrency"),CURRENCIES)}
  setForm({...v,date:v.date||today(),amount:isNaN(v.amount)?"":v.amount});
  const map={merchant:"iMerchant",amount:"iAmount",date:"iDate",category:"iCategory",payment:"iPayment"};
  const unc=(Array.isArray(r.uncertain)?r.uncertain:[]).map(k=>map[k]).filter(Boolean);
  if(!v.date)unc.push("iDate");if(isNaN(v.amount))unc.push("iAmount");
  flag(unc);
  st.className="scan-state ok";
  st.innerHTML=`${tick}<span>${how==="pdf"?"Read from the PDF text.":"Scanned with OCR."} ${unc.length?"Check the highlighted fields.":"Check the details and save."}${pdfNote}</span>`;
  if(Array.isArray(r.items)&&r.items.length){
    $("itemsBox").innerHTML=`<div class="label" style="margin-bottom:6px">Line items</div><div class="items">${r.items.slice(0,12).map(i=>`<div><span>${esc(i.name)}</span><span class="num">${typeof i.price==="number"?i.price.toFixed(2):esc(i.price??"")}</span></div>`).join("")}</div>`;
  }
}

function makeThumb(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const s=Math.min(1,320/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);res(c.toDataURL("image/jpeg",.72))};img.onerror=rej;img.src=URL.createObjectURL(file)})}

// ---- CSV ----
$("exportCsv").onclick=()=>{
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const rows=[["Date","Merchant","Amount","Currency","Category","Payment method","Note"],...[...items].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(e=>[e.date,e.merchant,(+e.amount).toFixed(2),e.currency,e.category,e.payment,e.note])];
  const csv="﻿"+rows.map(r=>r.map(q).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=`expenses-${today()}.csv`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

// ---- Misc ----
let tt;function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2600)}
function errMsg(e){return e?.name==="QuotaExceededError"||e?.code===22?"Browser storage is full. Delete old expenses (or ones with receipt thumbnails) to add more.":"Couldn't save to browser storage. Private windows or blocked site data can prevent saving."}

// ---- Pie chart: share of spend by category for the selected period ----
let pieHot=null;
function arcPath(a0,a1,r0,r1){
  const cx=100,cy=100,p=(a,r)=>[cx+r*Math.sin(a),cy-r*Math.cos(a)];
  if(a1-a0>=Math.PI*2-1e-6){a1=a0+Math.PI*2-1e-4}
  const large=a1-a0>Math.PI?1:0,[x0,y0]=p(a0,r1),[x1,y1]=p(a1,r1),[x2,y2]=p(a1,r0),[x3,y3]=p(a0,r0);
  return`M${x0.toFixed(2)} ${y0.toFixed(2)}A${r1} ${r1} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r0} ${r0} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}
function renderPie(rows,period,selCat){
  const cc={};rows.forEach(e=>cc[e.currency||"SGD"]=(cc[e.currency||"SGD"]||0)+1);
  const cur=Object.keys(cc).sort((a,b)=>cc[b]-cc[a])[0]||"SGD";
  const by={};rows.filter(e=>(e.currency||"SGD")===cur).forEach(e=>{const c=CATEGORIES.includes(e.category)?e.category:"Other";by[c]=(by[c]||0)+(+e.amount||0)});
  let segs=Object.keys(by).filter(c=>by[c]>0).map(c=>({key:c,label:c,value:by[c],color:catColor(c),cats:[c]})).sort((a,b)=>b.value-a.value);
  // At most 6 slices: the top 5 plus one "Everything else"
  if(segs.length>6){const rest=segs.slice(5);segs=segs.slice(0,5);segs.push({key:"__rest",label:`Everything else (${rest.length})`,value:rest.reduce((s,x)=>s+x.value,0),color:"var(--c10)",cats:rest.map(x=>x.key)})}
  const total=segs.reduce((s,x)=>s+x.value,0);
  $("piePeriod").textContent=period+" · "+cur;
  const svg=$("pieSvg"),center=$("pieCenter"),leg=$("pieLegend");
  if(!total){svg.innerHTML=`<circle cx="100" cy="100" r="74" fill="none" stroke="var(--line)" stroke-width="32"/>`;center.innerHTML=`<span class="k">No spending in this period</span>`;leg.innerHTML=`<div class="empty" style="padding:12px 0">Nothing to show for this period.</div>`;return}
  let a=0;
  svg.innerHTML=`<title>Spending by category, ${esc(period)}</title>`+segs.map((g,i)=>{const a0=a;a+=g.value/total*Math.PI*2;
    return`<path d="${arcPath(a0,a,58,90)}" fill="${g.color}" data-i="${i}"><title>${esc(g.label)}: ${esc(fmt(g.value,cur))} (${(g.value/total*100).toFixed(1)}%)</title></path>`}).join("");
  leg.innerHTML=segs.map((g,i)=>`<button type="button" class="lg${g.cats.length===1&&g.key===selCat?" sel":""}" data-i="${i}"><span class="sw" style="background:${g.color}"></span><span class="nm">${esc(g.label)}</span><span class="am">${n2(g.value)}</span><span class="pc">${Math.round(g.value/total*100)}%</span></button>`).join("");
  const showCenter=i=>{if(i==null){center.innerHTML=`<span class="k">Total spent</span><span class="v">${esc(fmt(total,cur))}</span>`;return}
    const g=segs[i];center.innerHTML=`<span class="k">${esc(g.label)}</span><span class="v">${esc(fmt(g.value,cur))}</span><span class="k">${(g.value/total*100).toFixed(1)}% of spend</span>`};
  const hot=i=>{pieHot=i;svg.querySelectorAll("path").forEach(p=>{const on=+p.dataset.i===i;p.classList.toggle("hot",on);p.classList.toggle("dim",i!=null&&!on)});
    leg.querySelectorAll(".lg").forEach(b=>b.classList.toggle("hot",+b.dataset.i===i));showCenter(i)};
  const pick=i=>{const g=segs[i];if(!g||g.cats.length!==1)return;const fc=$("fCat");fc.value=fc.value===g.key?"all":g.key;render()};
  [svg,leg].forEach(el=>{
    el.onpointerover=e=>{const t=e.target.closest("[data-i]");if(t)hot(+t.dataset.i)};
    el.onpointerleave=()=>hot(null);
    el.onclick=e=>{const t=e.target.closest("[data-i]");if(t)pick(+t.dataset.i)};
  });
  leg.onfocusin=e=>{const t=e.target.closest("[data-i]");if(t)hot(+t.dataset.i)};leg.onfocusout=()=>hot(null);
  hot(null);
}

// ---- Budgets ----
const SUGGESTED={"Food & Dining":550,"Groceries":250,"Transport":200,"Utilities & Bills":180,"Shopping":200,"Entertainment":120,"Travel":200,"Health & Medical":100,"Office & Business":50,"Other":150};
function budgetNote(rec,editId){
  const bu=+(budgets.byCategory||{})[rec.category];if(!bu||rec.currency!==(budgets.currency||"SGD"))return"";
  const m=monthKey(rec.date);
  const sp=items.filter(e=>e.id!==editId&&e.category===rec.category&&monthKey(e.date)===m&&(e.currency||"SGD")===rec.currency).reduce((s,e)=>s+(+e.amount||0),0)+rec.amount;
  const pct=sp/bu;
  if(pct>=1)return`Saved. ${rec.category} is ${fmt(sp-bu,rec.currency)} over budget for ${monthName(m)}`;
  if(pct>=.8)return`Saved. ${rec.category} has used ${Math.round(pct*100)}% of its budget`;
  return"";
}
function bSum(){$("bTotal").textContent=fmt(CATEGORIES.reduce((s,c,i)=>s+(parseFloat($("b"+i).value)||0),0),"SGD")}
function openBudgets(vals){
  const v=vals||budgets.byCategory||{};
  $("bGrid").innerHTML=CATEGORIES.map((c,i)=>`<label for="b${i}"><span class="dot" style="background:${catColor(c)}"></span>${esc(c)}</label><input type="number" id="b${i}" min="0" step="10" inputmode="decimal" value="${+v[c]||0}">`).join("");
  $("bGrid").oninput=bSum;bSum();$("bScrim").hidden=false;setTimeout(()=>$("b0").focus(),30);
}
document.addEventListener("click",e=>{if(e.target.closest("[data-editbudget]"))openBudgets()});
$("bSuggest").onclick=()=>{CATEGORIES.forEach((c,i)=>$("b"+i).value=SUGGESTED[c]||0);bSum()};
$("bCancel").onclick=()=>$("bScrim").hidden=true;
$("bScrim").addEventListener("click",e=>{if(e.target===$("bScrim"))$("bScrim").hidden=true});
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("bScrim").hidden=true});
$("bForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const byCategory={};CATEGORIES.forEach((c,i)=>{const n=parseFloat($("b"+i).value);byCategory[c]=n>0?Math.round(n*100)/100:0});
  const prev=budgets;budgets={currency:"SGD",byCategory};
  if(!saveBudgets()){budgets=prev;return}
  $("bScrim").hidden=true;render();toast("Budgets saved");
});

// ---- Start ----
items=loadExpenses();budgets=loadBudgets();usingExamples=items.length===0;
$("storeNote").textContent="Expenses are saved in this browser (localStorage). Use Export CSV to keep a backup.";
window.addEventListener("storage",e=>{if(e.key===STORE_EXPENSES||e.key===STORE_BUDGETS){items=loadExpenses();budgets=loadBudgets();usingExamples=items.length===0;render()}});
render();
