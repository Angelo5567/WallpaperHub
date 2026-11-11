const SUPABASE_URL = "https://qslbfbzvxwtamdkqfjwx.supabase.co";
const SUPABASE_KEY = "sb_publishable_B18D_bbFndTnN-zKzS1-Tg_FV3rgtpZ";
const BUCKET = "wallpaper-uploads";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const state = {favorites:[], collections:[], uploads:[]};
let view = "all";
let activeCollection = null;
let previewItem = null;
let toastTimer;

const categories = ["nature","architecture","abstract","animals","space"];
const categoryNames = {nature:"Natura",architecture:"Architettura",abstract:"Astratto",animals:"Animali",space:"Spazio"};

const wallpapers = Array.from({length:500},(_,i)=>({
  id:"wall-"+(i+1),
  title:"Wallpaper "+String(i+1).padStart(3,"0"),
  category:categories[i%categories.length],
  url:"https://picsum.photos/seed/wall-"+(i+1)+"/1000/1250",
  full:"https://picsum.photos/seed/wall-"+(i+1)+"/1800/1400",
  source:"catalog"
}));

function notify(message){
  $("toast").textContent=message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2600);
}
function saveLocal(){
  localStorage.setItem("wallpaperhub-state",JSON.stringify(state));
}
function loadLocal(){
  try{
    const saved=JSON.parse(localStorage.getItem("wallpaperhub-state")||"{}");
    state.favorites=Array.isArray(saved.favorites)?saved.favorites:[];
    state.collections=Array.isArray(saved.collections)?saved.collections:[];
    state.uploads=Array.isArray(saved.uploads)?saved.uploads:[];
  }catch(e){console.warn("Dati locali non leggibili",e);}
}
async function cloudLoad(){
  const {data,error}=await supabaseClient.from("wallpaperhub_public_state").select("data").eq("id","shared").maybeSingle();
  if(error) throw error;
  if(data?.data){
    const cloud=data.data;
    state.favorites=Array.isArray(cloud.favorites)?cloud.favorites:state.favorites;
    state.collections=Array.isArray(cloud.collections)?cloud.collections:state.collections;
    state.uploads=Array.isArray(cloud.uploads)?cloud.uploads:state.uploads;
    saveLocal();
  }
}
let saveTimer;
function cloudSave(){
  saveLocal();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{
      const {error}=await supabaseClient.from("wallpaperhub_public_state").upsert({
        id:"shared",
        data:{favorites:state.favorites,collections:state.collections,uploads:state.uploads},
        updated_at:new Date().toISOString()
      },{onConflict:"id"});
      if(error) throw error;
      setStatus("Cloud sincronizzato","ok");
    }catch(error){
      console.error("Cloud save:",error);
      setStatus("Errore sincronizzazione","error");
      notify("Salvataggio cloud non riuscito. Controlla la configurazione SQL.");
    }
  },500);
}
function setStatus(message,kind=""){
  $("cloudStatus").textContent=message;
  $("cloudStatus").className="status "+kind;
}
function allItems(){return [...wallpapers,...state.uploads];}
function isFavorite(id){return state.favorites.includes(id);}
function render(){
  const search=$("searchInput").value.trim().toLowerCase();
  const category=$("categoryFilter").value;
  let items=allItems();

  if(view==="favorites") items=items.filter(x=>isFavorite(x.id));
  if(view==="uploads") items=items.filter(x=>x.source==="upload");
  if(view==="collection"&&activeCollection){
    const collection=state.collections.find(c=>c.id===activeCollection);
    items=items.filter(x=>collection?.items?.includes(x.id));
  }
  if(category!=="all") items=items.filter(x=>x.category===category);
  if(search) items=items.filter(x=>(x.title+" "+(categoryNames[x.category]||"")).toLowerCase().includes(search));
  if($("sortFilter").value==="newest") items.reverse();
  $("wallpaperCount").textContent=allItems().length;
  $("gallery").innerHTML="";
  $("emptyState").hidden=items.length!==0;

  for(const item of items){
    const card=document.createElement("article");
    card.className="wall-card";
    const img=document.createElement("img");
    img.loading="lazy"; img.src=item.url; img.alt=item.title;
    const overlay=document.createElement("div"); overlay.className="card-overlay";
    const info=document.createElement("div");
    const title=document.createElement("div"); title.className="card-title"; title.textContent=item.title;
    const cat=document.createElement("div"); cat.className="card-category"; cat.textContent=categoryNames[item.category]||"Caricato";
    info.append(title,cat);
    const heart=document.createElement("button"); heart.className="heart"+(isFavorite(item.id)?" active":""); heart.textContent="♥";
    heart.title="Aggiungi o rimuovi dai preferiti";
    heart.addEventListener("click",e=>{e.stopPropagation();toggleFavorite(item.id);});
    overlay.append(info,heart); card.append(img,overlay);
    card.addEventListener("click",()=>openPreview(item));
    $("gallery").append(card);
  }
  renderCollections();
}
function toggleFavorite(id){
  state.favorites=isFavorite(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];
  cloudSave();render();
}
function renderCollections(){
  $("collectionList").innerHTML="";
  for(const collection of state.collections){
    const el=document.createElement("div");el.className="collection-item";
    const name=document.createElement("strong");name.textContent=collection.name;
    const count=document.createElement("small");count.textContent=(collection.items||[]).length+" sfondi";
    el.append(name,count);
    el.addEventListener("click",()=>openCollection(collection.id));
    $("collectionList").append(el);
  }
}
function setView(next){
  view=next;activeCollection=null;
  $("collectionPanel").hidden=next!=="collections";
  $("activeCollection").hidden=true;
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===next));
  render();
}
function openCollection(id){
  activeCollection=id;view="collection";
  const collection=state.collections.find(c=>c.id===id);
  $("collectionPanel").hidden=true;$("activeCollection").hidden=false;
  $("activeCollectionName").textContent=collection?.name||"Raccolta";
  document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
  render();
}
function openPreview(item){
  previewItem=item;
  $("previewImage").src=item.full||item.url;
  $("previewTitle").textContent=item.title;
  $("previewDescription").textContent=categoryNames[item.category]||"Immagine caricata";
  $("previewFavorite").textContent=isFavorite(item.id)?"♥ Salvato":"♥ Preferito";
  $("preview").hidden=false;
}
function closePreview(){$("preview").hidden=true;previewItem=null;}
function downloadItem(item){
  const link=document.createElement("a");
  link.href=item.full||item.url;link.download=(item.title||"wallpaper").replace(/[^\w-]+/g,"-")+".jpg";
  link.target="_blank";link.rel="noopener";document.body.append(link);link.click();link.remove();
}
async function uploadFiles(files){
  const selected=[...files].filter(f=>f.type.startsWith("image/"));
  if(!selected.length){notify("Seleziona immagini valide.");return;}
  setStatus("Caricamento immagini...");
  for(const file of selected){
    try{
      const safe=file.name.replace(/[^\w.-]/g,"_");
      const path=Date.now()+"_"+Math.random().toString(36).slice(2)+"_"+safe;
      const {error}=await supabaseClient.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
      if(error) throw error;
      const {data}=supabaseClient.storage.from(BUCKET).getPublicUrl(path);
      state.uploads.unshift({
        id:"upload-"+path,title:file.name.replace(/\.[^.]+$/,""),
        category:"abstract",url:data.publicUrl,full:data.publicUrl,source:"upload",path
      });
    }catch(error){
      console.error("Upload:",error);
      notify("Errore caricamento: "+file.name);
    }
  }
  cloudSave();render();setStatus("Immagini caricate","ok");
  notify("Caricamento completato.");
}
async function init(){
  loadLocal();
  render();
  try{
    await cloudLoad();
    setStatus("Cloud collegato","ok");
    render();
  }catch(error){
    console.error("Supabase:",error);
    setStatus("Cloud da configurare","error");
  }
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(console.warn);
  }
}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
$("searchInput").addEventListener("input",render);
$("categoryFilter").addEventListener("change",render);
$("sortFilter").addEventListener("change",render);
$("uploadButton").addEventListener("click",()=>$("fileInput").click());
$("fileInput").addEventListener("change",e=>uploadFiles(e.target.files));
$("newCollection").addEventListener("click",()=>{
  const name=prompt("Nome della nuova raccolta:");
  if(!name?.trim())return;
  state.collections.push({id:"collection-"+Date.now(),name:name.trim(),items:[]});
  cloudSave();render();notify("Raccolta creata.");
});
$("backCollections").addEventListener("click",()=>setView("collections"));
$("previewFavorite").addEventListener("click",()=>{
  if(!previewItem)return;
  toggleFavorite(previewItem.id);
  $("previewFavorite").textContent=isFavorite(previewItem.id)?"♥ Salvato":"♥ Preferito";
});
$("previewDownload").addEventListener("click",()=>previewItem&&downloadItem(previewItem));
document.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",closePreview));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePreview();});
init();
