function migrate(old){
  const d=defaults();
  if(!old || typeof old!=='object') return d;
  const out={...d,...old,version:VERSION,ai:{...d.ai,...(old.ai||{})},relationships:{...d.relationships,...(old.relationships||{})}};
  if(Array.isArray(old.posts)) out.posts=old.posts.map(x=>({
    id:String(x.id||uid('p')),author:x.author||'ricky',body:x.body||'',feed:x.feed!==false,createdDay:x.createdDay||old.day||1,createdMinute:x.createdMinute ?? Math.max(0,(old.minute||600)-(x.mins||1)),
    likes:Number(x.likes||0),comments:Number(x.comments||0),reposts:Number(x.reposts||0),views:Number(x.views||Math.max(100,(x.likes||0)*8)),media:x.media||null,liked:!!x.liked,reposted:!!x.reposted,saved:!!x.saved,virality:x.virality||1
  }));
  if(old.comments){
    const c={};
    for(const [pid,list] of Object.entries(old.comments)) c[String(pid)]=(Array.isArray(list)?list:[]).map(x=>({...x,id:String(x.id||uid('c')),parent:x.parent?String(x.parent):null}));
    out.comments=c;
  }
  return out;
}

function loadState(){
  try{
    const now=JSON.parse(localStorage.getItem(STORAGE));
    if(now) return migrate(now);
    const old=JSON.parse(localStorage.getItem(OLD_STORAGE));
    if(old){const m=migrate(old);localStorage.setItem(STORAGE,JSON.stringify(m));return m;}
  }catch{}
  return defaults();
}

function save(){
  localStorage.setItem(STORAGE,JSON.stringify(state));
  clearTimeout(remoteTimer);
  remoteTimer=setTimeout(remoteSave,1000);
}

function gameToken(){
  let t=localStorage.getItem(TOKEN_KEY);
  if(t&&t.length>40) return t;
  const a=new Uint8Array(32);crypto.getRandomValues(a);t=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(TOKEN_KEY,t);return t;
}
const GAME_TOKEN=gameToken();

async function rpc(name,payload){
  const r=await fetch(`${SUPA}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error(`Supabase ${r.status}`);
  const t=await r.text();return t?JSON.parse(t):null;
}
async function remoteSave(){
  state.cloud='syncing';paintCloud();
  try{await rpc('spotlight_save_state',{p_access_token:GAME_TOKEN,p_state:state});state.cloud='synced';}
  catch{state.cloud='offline';}
  paintCloud();
}
async function remoteLoad(){
  try{
    const r=await rpc('spotlight_load_state',{p_access_token:GAME_TOKEN});
    if(r){state=migrate(r);localStorage.setItem(STORAGE,JSON.stringify(state));render();}
    else remoteSave();
  }catch{state.cloud='offline';paintCloud();}
}

async function loadUniverse(){
  try{
    const url=`${SUPA}/rest/v1/spotlight_accounts?select=handle,display_name,verified,is_public_figure,follower_count,account_type,home_city,categories,bio,public_profile,style_profile,instagram_url,profile_image_url,ai_depth&active=eq.true&order=priority_score.desc&limit=800`;
    const r=await fetch(url,{headers:{apikey:KEY}});if(!r.ok)throw new Error(r.status);const rows=await r.json();
    for(const a of rows){
      if(!a.handle) continue;
      const raw=a.handle.replace(/^@/,'');
      let existing=Object.entries(PEOPLE).find(([,x])=>x.handle?.replace(/^@/,'').toLowerCase()===raw.toLowerCase());
      const id=existing?.[0]||`u_${raw.replace(/[^a-z0-9_]/gi,'_')}`;
      const current=PEOPLE[id]||{};
      PEOPLE[id]={...current,name:a.display_name||current.name||raw,handle:'@'+raw,ig:raw,verified:!!a.verified,followers:Number(a.follower_count||current.followers||0),kind:a.account_type==='page'?'page':(a.is_public_figure===false?'creator':'celeb'),city:a.home_city||current.city||'Varies',categories:a.categories||current.categories||[],bio:a.bio||current.bio||'',style:{...(current.style||{}),...(a.style_profile||{})},publicProfile:a.public_profile||{},instagramUrl:a.instagram_url||'',avatar:a.profile_image_url||current.avatar||null,aiDepth:Number(a.ai_depth||current.aiDepth||1)};
    }
    universeLoaded=true;
    if(state.view==='search'||state.view==='profile') render();
  }catch(e){console.warn('Universe unavailable',e)}
}

function p(id){return PEOPLE[id]||{name:id,handle:'@'+id,initials:(id||'?').slice(0,2).toUpperCase(),verified:false,followers:500,kind:'fan',city:'Varies',bio:'',categories:[],style:{}}}
function stripHandle(h=''){return String(h).replace(/^@/,'')}
function initials(person){return person.initials || person.name?.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || '??'}
function avatarUrl(id){
  const x=p(id);
  const fallback=`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(stripHandle(x.handle)||x.name)}`;
  if(x.avatar){
    if(String(x.avatar).startsWith('https://unavatar.io/')&&!String(x.avatar).includes('fallback=')) return `${x.avatar}?fallback=${encodeURIComponent(fallback)}`;
    return x.avatar;
  }
  if(x.ig && ['celeb','page','creator'].includes(x.kind)) return `https://unavatar.io/instagram/${encodeURIComponent(x.ig)}?fallback=${encodeURIComponent(fallback)}`;
  return fallback;
}
function avatar(id,size='md'){const x=p(id);return `<img class="avatar ${size}" src="${escAttr(avatarUrl(id))}" alt="${escAttr(x.name)}" loading="lazy" data-profile="${escAttr(id)}">`}
function verified(id){return p(id).verified?'<span class="verified" title="Verified">◆</span>':''}
function fmt(n){n=Number(n||0);if(n>=1e9)return (n/1e9).toFixed(n>=1e10?1:2).replace(/\.0+$/,'')+'B';if(n>=1e6)return (n/1e6).toFixed(n>=1e7?1:2).replace(/\.0+$/,'')+'M';if(n>=1e3)return (n/1e3).toFixed(n>=1e4?1:2).replace(/\.0+$/,'')+'K';return Math.round(n).toLocaleString()}
function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n||0))}
function clock(min=state.minute){let h=Math.floor((min%1440)/60),m=Math.floor(min%60),ap=h>=12?'PM':'AM';return `${((h+11)%12)+1}:${String(m).padStart(2,'0')} ${ap}`}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function escAttr(s=''){return esc(s).replace(/`/g,'&#096;')}
function linkify(text=''){return esc(text).replace(/(^|\s)(@[A-Za-z0-9_.]+)/g,(_,sp,h)=>`${sp}<span class="mention">${h}</span>`)}
function safeImage(url=''){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}

function relativeTime(day,minute){const diff=Math.max(0,(state.day-day)*1440+(state.minute-minute));if(diff<2)return 'now';if(diff<60)return `${diff}m`;if(diff<1440)return `${Math.floor(diff/60)}h`;return `${Math.floor(diff/1440)}d`}
function profileFollowerCount(id){return id==='ricky'?state.followers:Number(p(id).followers||0)}

function paintCloud(){const el=document.querySelector('[data-cloud]');if(el)el.textContent=state.cloud==='synced'?'☁ synced':state.cloud==='syncing'?'☁ syncing…':state.cloud==='offline'?'☁ offline':'☁ local'}
function toast(text){clearTimeout(toastTimer);document.querySelector('.toast')?.remove();const e=document.createElement('div');e.className='toast';e.textContent=text;document.getElementById('toast-root').appendChild(e);toastTimer=setTimeout(()=>e.remove(),2600)}

function totalMinutes(day=state.day,minute=state.minute){return (day-1)*1440+minute}
function advance(minutes,why='',rerender=true){
  minutes=Math.max(0,Math.round(minutes));state.minute+=minutes;
  while(state.minute>=1440){state.minute-=1440;state.day++;state.relevance=Math.max(0,state.relevance-2.2)}
  state.energy=Math.max(0,state.energy-minutes/220);
  if(why) state.world.unshift(`Day ${state.day} ${clock()}: ${why}`);
  checkCalendar();save();
  if(rerender) render(); else updateLifeMini();
}
function checkCalendar(){for(const e of state.calendar){if(e.status==='confirmed'&&e.day===state.day&&state.minute>e.time+e.duration){e.status='missed';state.notifications.unshift(`You missed ${e.title}.`);state.reputation=Math.max(0,state.reputation-2);if(e.personKey&&state.relationships[e.personKey]) state.relationships[e.personKey].resentment=(state.relationships[e.personKey].resentment||0)+5;}}}
function updateLifeMini(){document.querySelector('[data-time]')?.replaceChildren(document.createTextNode(`Day ${state.day} · ${clock()}`));const e=document.querySelector('[data-energy]');if(e)e.style.width=`${state.energy}%`;}

function nav(id,ico,label){return `<button class="navbtn ${state.view===id?'active':''}" data-view="${id}"><span class="ico">${ico}</span><span>${label}</span></button>`}
function shell(content){
  return `<div class="app-shell">
    <aside class="leftbar">
      <div class="brand">Spot<em>light</em></div>
      <div class="nav">
        ${nav('home','⌂','Home')}${nav('search','⌕','Search')}${nav('messages','◌','Messages')}${nav('notifications','♢','Notifications')}
        <button class="navbtn" data-create><span class="ico">＋</span><span>Create</span></button>${nav('profile','◎','Profile')}
        <div class="nav-sep"></div><div class="nav-label">Life</div>
        ${nav('sms','▣','SMS')}${nav('calendar','□','Calendar')}${nav('finances','$','Finances')}
      </div>
      <div class="more">${nav('about','☰','More')}</div>
      <div class="life-mini">
        <div class="row"><b data-time>Day ${state.day} · ${clock()}</b><span class="ai-live ${state.ai.busy?'busy':state.ai.online?'on':''}" data-ai><i></i>${state.ai.busy?'AI thinking':state.ai.online?'AI live':'AI status'}</span></div>
        <small>${esc(state.location)} · ${fmt(state.followers)} followers</small>
        <div class="energy"><i data-energy style="width:${state.energy}%"></i></div>
        <div class="cloud" data-cloud>${state.cloud==='synced'?'☁ synced':state.cloud==='offline'?'☁ offline':'☁ local'}</div>
      </div>
      <div class="credits">Fictional simulation. Public-figure dialogue is AI-generated and not real.<br><a href="https://unavatar.io" target="_blank">Avatars provided by Unavatar</a></div>
    </aside>
    <main class="center">${content}</main>
    <aside class="rightbar">${renderRightbar()}</aside>
    ${state.view!=='calendar'&&state.view!=='finances'&&state.view!=='sms'?'<button class="compose-fab" data-create title="Create post">＋</button>':''}
  </div>${renderModal()}`;
}

function renderRightbar(){
  const suggests=['sabrina','sydney','selena','lin'].filter(id=>!state.following[id]);
  return `<div class="right-card">
    <div class="me-card">${avatar('ricky','md')}<div><div class="name-row"><b>Ricky P</b></div><div class="handle">@rickyp</div></div><button class="switch" data-profile="ricky">View</button></div>
    <div class="suggest-head"><span>Suggested for you</span><button data-view="search">See all</button></div>
    <div class="suggests">${suggests.slice(0,4).map(id=>{const x=p(id);return `<div class="suggest">${avatar(id,'sm')}<div class="grow"><div class="name-row"><b data-profile="${id}">${esc(x.name)}</b>${verified(id)}</div><div class="sub">Suggested · ${fmt(profileFollowerCount(id))} followers</div></div><button class="follow" data-follow="${id}">Follow</button></div>`}).join('')}</div>
    <div class="right-foot">Spotlight is a fictional social/life simulation. Generated posts, replies, messages, relationships, and events are not statements about real people.</div>
  </div>`;
}

function render(){
  let content='';
  if(state.view==='home') content=renderHome();
  else if(state.view==='search') content=renderSearch();
  else if(state.view==='messages') content=renderMessages('dms');
  else if(state.view==='sms') content=renderMessages('sms');
  else if(state.view==='notifications') content=renderNotifications();
  else if(state.view==='profile') content=renderProfile(state.profileKey||'ricky');
  else if(state.view==='thread') content=renderThread(state.threadPostId);
  else if(state.view==='calendar') content=renderCalendar();
  else if(state.view==='finances') content=renderFinances();
  else if(state.view==='about') content=renderAbout();
  document.getElementById('app').innerHTML=shell(content);
  wire();paintCloud();
}
