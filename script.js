// BrewDiary – simple coffee brewing & tasting journal (data saved in LocalStorage)
const KEY = "brewdiary-data";
const pad = n => String(n).padStart(2,"0");
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const offset = days => { const d=new Date(); d.setDate(d.getDate()+days); return toISO(d); };
const fmtDate = s => new Date(s+"T00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
const ratio = (dose, water) => `1:${Math.round((water/dose)*10)/10}`;

function sampleData(){
  return { brews: [
    { id:1, bean:"Benguet Arabica", origin:"Sagada, PH", roast:"Medium", method:"Pour Over", dose:18, water:300, time:180, rating:5, notes:"Bright, floral, tastes like berries", date:offset(-6) },
    { id:2, bean:"Sumatra Mandheling", origin:"Sumatra, ID", roast:"Dark", method:"French Press", dose:20, water:320, time:240, rating:4, notes:"Earthy and bold", date:offset(-5) },
    { id:3, bean:"House Espresso Blend", origin:"Blend", roast:"Dark", method:"Espresso", dose:18, water:36, time:28, rating:4, notes:"Chocolatey, strong crema", date:offset(-3) },
    { id:4, bean:"Kalinga Natural", origin:"Kalinga, PH", roast:"Light", method:"Aeropress", dose:15, water:220, time:120, rating:5, notes:"Sweet, tropical fruit notes", date:offset(-2) },
    { id:5, bean:"Cold Brew House Blend", origin:"Blend", roast:"Medium", method:"Cold Brew", dose:100, water:1000, time:0, rating:3, notes:"Smooth but a bit flat", date:offset(-1) }
  ]};
}
function loadData(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.brews)) return s; }catch(e){}
  const fresh = sampleData(); localStorage.setItem(KEY, JSON.stringify(fresh)); return fresh;
}
let data = loadData();
const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const nextId = list => list.reduce((m,x)=>Math.max(m,x.id),0)+1;

const $ = id => document.getElementById(id);
const esc = t => { const d=document.createElement("div"); d.textContent=t??""; return d.innerHTML; };
let toastTimer;
function toast(msg){ $("toast").textContent=msg; $("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2200); }
const starsStr = n => "★".repeat(n) + "☆".repeat(5-n);

document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-btn,.view").forEach(el=>el.classList.remove("active"));
  btn.classList.add("active"); $(btn.dataset.view).classList.add("active");
}));

// ---------- Star picker ----------
function setStars(val){
  $("starPicker").dataset.value = val;
  $("starPicker").querySelectorAll("span").forEach(s=>s.classList.toggle("on", Number(s.dataset.star) <= val));
}
$("starPicker").addEventListener("click", e=>{
  if (e.target.dataset.star) setStars(Number(e.target.dataset.star));
});

// ---------- Form ----------
let editingId = null;
function openForm(brew){
  editingId = brew ? brew.id : null;
  $("formTitle").textContent = brew ? "Edit Brew" : "Log a Brew";
  $("f_bean").value = brew ? brew.bean : "";
  $("f_origin").value = brew ? brew.origin : "";
  $("f_roast").value = brew ? brew.roast : "Medium";
  $("f_method").value = brew ? brew.method : "Pour Over";
  $("f_dose").value = brew ? brew.dose : "";
  $("f_water").value = brew ? brew.water : "";
  $("f_time").value = brew ? brew.time : "";
  $("f_notes").value = brew ? brew.notes : "";
  setStars(brew ? brew.rating : 3);
  $("modal").hidden = false; $("f_bean").focus();
}
function closeForm(){ $("modal").hidden = true; editingId = null; }
$("addBrewBtn").addEventListener("click", ()=>openForm());
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click", closeForm));
$("modal").addEventListener("click", e=>{ if(e.target===$("modal")) closeForm(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeForm(); });

$("form").addEventListener("submit", e=>{
  e.preventDefault();
  const bean = $("f_bean").value.trim();
  const dose = parseFloat($("f_dose").value);
  const water = parseFloat($("f_water").value);
  if (!bean) return toast("Please enter a bean name");
  if (!(dose > 0)) return toast("Dose must be greater than 0");
  if (!(water > 0)) return toast("Water must be greater than 0");
  const values = {
    bean, origin: $("f_origin").value.trim(), roast: $("f_roast").value, method: $("f_method").value,
    dose, water, time: parseInt($("f_time").value) || 0,
    rating: Number($("starPicker").dataset.value), notes: $("f_notes").value.trim()
  };
  if (editingId){ Object.assign(data.brews.find(b=>b.id===editingId), values); toast("Brew updated"); }
  else { data.brews.push({ id: nextId(data.brews), date: toISO(new Date()), ...values }); toast("Brew logged"); }
  save(); closeForm(); renderAll();
});

// ---------- Dashboard ----------
function renderDashboard(){
  const total = data.brews.length;
  const avg = total ? (data.brews.reduce((s,b)=>s+b.rating,0)/total) : 0;
  const counts = {};
  data.brews.forEach(b=> counts[b.method] = (counts[b.method]||0)+1);
  const favMethod = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  const thisWeek = data.brews.filter(b=>{
    const d = new Date(b.date+"T00:00"); const n = new Date(offset(-7)+"T00:00");
    return d >= n;
  }).length;

  $("stats").innerHTML = [
    ["Total Brews", total], ["Avg Rating", total ? avg.toFixed(1)+" ★" : "—"],
    ["Favorite Method", favMethod ? favMethod[0] : "—"], ["This Week", thisWeek]
  ].map(([l,n])=>`<div class="card"><span>${l}</span><strong>${n}</strong></div>`).join("");

  const max = Math.max(1, ...Object.values(counts));
  const rows = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  $("methodBars").innerHTML = rows.length ? rows.map(([m,n])=>`
    <div class="methodrow"><span class="name">${esc(m)}</span>
      <span class="track"><div style="width:${Math.round(n/max*100)}%"></div></span>
      <span class="amt">${n}</span></div>`).join("") : `<p class="empty">No brews logged yet.</p>`;

  const latest = [...data.brews].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  $("latestList").innerHTML = latest.length ? latest.map(b=>`
    <li><div class="grow"><b>${esc(b.bean)}</b><span>${b.method} · ${fmtDate(b.date)}</span></div>
    <span class="stars-view">${starsStr(b.rating)}</span></li>`).join("") : `<li class="empty">No brews yet. Log your first one!</li>`;
}

// ---------- Brew log ----------
function renderBrews(){
  const q = $("searchBrew").value.trim().toLowerCase();
  const method = $("filterMethod").value;
  $("filterMethod").innerHTML = `<option value="">All methods</option>` +
    [...new Set(data.brews.map(b=>b.method))].map(m=>`<option ${m===method?"selected":""}>${esc(m)}</option>`).join("");

  const rows = data.brews.filter(b=>
    (b.bean+" "+b.origin+" "+b.notes).toLowerCase().includes(q) && (!method || b.method===method)
  ).sort((a,b)=>b.date.localeCompare(a.date));

  $("brewList").innerHTML = rows.length ? rows.map(b=>`
    <div class="brew">
      <div class="grow">
        <span class="b-name">${esc(b.bean)}${b.origin?` <span class="muted">· ${esc(b.origin)}</span>`:""}</span>
        <span class="b-meta">${b.method} · ${b.roast} roast · ${fmtDate(b.date)}${b.notes?" · "+esc(b.notes):""}</span>
      </div>
      <span class="ratio">${ratio(b.dose,b.water)}</span>
      <span class="stars-view">${starsStr(b.rating)}</span>
      <div>
        <button class="small" data-edit="${b.id}">Edit</button>
        <button class="small del" data-del="${b.id}">Delete</button>
      </div>
    </div>`).join("") : `<p class="empty">No brews found. Log one or change your filters.</p>`;
}
$("brewList").addEventListener("click", e=>{
  const t = e.target;
  if (t.dataset.edit) openForm(data.brews.find(b=>b.id==t.dataset.edit));
  if (t.dataset.del && confirm("Delete this brew entry?")){
    data.brews = data.brews.filter(b=>b.id!=t.dataset.del);
    save(); renderAll(); toast("Brew deleted");
  }
});
$("searchBrew").addEventListener("input", renderBrews);
$("filterMethod").addEventListener("change", renderBrews);

function renderAll(){ renderDashboard(); renderBrews(); }
renderAll();
