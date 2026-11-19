const API=(window.APP_CONFIG?.API_BASE||"").replace(/\/$/,"");
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate=s=>s?new Date(s+"T12:00:00").toLocaleDateString("cs-CZ"):"neuvedeno";

// Theme switch: explicit user choice is saved on this device.
function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  const dark=theme==="dark";
  $("theme-icon").textContent=dark?"☀":"☾";
  $("theme-label").textContent=dark?"Светлая тема":"Тёмная тема";
  $("theme-toggle").setAttribute("aria-label",dark?"Переключить на светлую тему":"Переключить на тёмную тему");
  try{localStorage.setItem("cph-theme",theme)}catch(e){}
}
(function initTheme(){
  let saved=null;
  try{saved=localStorage.getItem("cph-theme")}catch(e){}
  const preferred=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  setTheme(saved||preferred);
})();
$("theme-toggle").addEventListener("click",()=>{
  setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
});

let offers=[];
async function api(path,opts={}){if(!API||API.includes("REPLACE-WITH"))throw new Error("Nejdříve nastav API_BASE v config.js");const r=await fetch(API+path,opts);const j=await r.json().catch(()=>({error:"Neplatná odpověď API"}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}
async function init(){
 try{const [health,stores]=await Promise.all([api("/api/health"),api("/api/stores")]);$("api-status").textContent="API připojeno";$("store").innerHTML='<option value="">Všechny obchody</option>'+stores.stores.map(s=>`<option>${esc(s)}</option>`).join("");}
 catch(e){$("api-status").textContent="API není připojeno";$("api-status").title=e.message}
 await search();
}
async function search(){
 $("results").innerHTML='<div class="empty">Hledám…</div>';
 const p=new URLSearchParams();if($("query").value.trim())p.set("q",$("query").value.trim());if($("store").value)p.set("store",$("store").value);if($("region").value)p.set("region",$("region").value);if($("active-only").checked)p.set("active","1");
 try{const data=await api("/api/search?"+p.toString());offers=data.offers||[];render()}
 catch(e){$("results").innerHTML=`<div class="empty">${esc(e.message)}<br><br>API zatím není dostupné. Zkontroluj nasazení Workeru a config.js.</div>`;$("result-count").textContent="Nelze načíst data"}
}
function render(){
 const mode=$("sort").value;const list=[...offers].sort((a,b)=>mode==="price"?a.price-b.price:mode==="expiry"?(a.valid_to||"9999").localeCompare(b.valid_to||"9999"):a.store.localeCompare(b.store));
 $("result-count").textContent=`Nalezeno nabídek: ${list.length}`;
 if(!list.length){$("results").innerHTML='<div class="empty">Žádné nabídky neodpovídají hledání. Zkus jiné slovo nebo filtr.</div>';return}
 $("results").innerHTML=list.map(o=>`<article class="offer"><div><h3>${esc(o.name)}</h3><div class="meta">${esc(o.store)} · ${esc(o.region||"ČR")}${o.brand?" · "+esc(o.brand):""}</div><div class="expiry">Platí: ${fmtDate(o.valid_from)} – ${fmtDate(o.valid_to)}</div>${o.loyalty_required?'<span class="tag">Věrnostní karta nutná</span>':""}${o.source_url?`<div class="expiry"><a href="${esc(o.source_url)}" target="_blank" rel="noopener">Zdroj / leták ↗</a></div>`:""}</div><div><div class="price">${Number(o.price).toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2})} Kč</div>${o.old_price?`<div class="old">${Number(o.old_price).toLocaleString("cs-CZ")} Kč</div>`:""}<div class="meta">${esc(o.unit||"")}</div></div></article>`).join("");
}
$("search-btn").addEventListener("click",search);$("query").addEventListener("keydown",e=>{if(e.key==="Enter")search()});
["store","region","active-only"].forEach(id=>$(id).addEventListener("change",search));$("sort").addEventListener("change",render);
$("import-btn").addEventListener("click",async()=>{
 $("import-status").textContent="Odesílám…";
 try{const payload=JSON.parse($("import-json").value);const result=await api("/api/import",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+$("admin-token").value},body:JSON.stringify(payload)});$("import-status").textContent=`Uloženo nabídek: ${result.inserted}`;$("import-json").value="";await search()}
 catch(e){$("import-status").textContent="Chyba: "+e.message}
});
init();
