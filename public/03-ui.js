function renderHome(){
  const stories=['ricky','sabrina','ariana','timothee','sydney','selena','tom'];
  const feedPosts=state.posts.filter(x=>x.feed!==false).sort((a,b)=>totalMinutes(b.createdDay,b.createdMinute)-totalMinutes(a.createdDay,a.createdMinute));
  return `${state.ai.busy?'<div class="typing-pill">••• Something is brewing…</div>':''}
    <div class="pagehead"><h1>Home</h1><div><button class="ghostbtn" data-refresh>Refresh feed · 5m</button></div></div>
    <div class="stories">${stories.map(id=>`<div class="story" data-profile="${id}"><div class="story-ring ${id==='ricky'?'seen':''}">${avatar(id,'story-avatar')}</div><div class="story-name">${id==='ricky'?'Your story':esc(p(id).name.split(' ')[0])}</div></div>`).join('')}</div>
    <section class="feed">${feedPosts.map(renderPost).join('')}</section>`;
}

function renderPost(x,opts={}){
  const person=p(x.author);const comments=state.comments[x.id]||[];const preview=comments.filter(c=>!c.parent).slice(-2);
  const media=x.media?.url?`<div class="postmedia" data-open-thread="${x.id}"><img src="${escAttr(safeImage(x.media.url))}" alt="${escAttr(x.media.alt||'Post image')}" loading="lazy"></div>`:'';
  return `<article class="post ${opts.thread?'thread-main':''}" data-post="${x.id}">
    <div class="posthead">${avatar(x.author,opts.thread?'md':'md')}<div class="postmeta"><div class="name-row"><b data-profile="${x.author}">${esc(person.name)}</b>${verified(x.author)}<span class="handle">${esc(person.handle)}</span><span class="handle">· ${relativeTime(x.createdDay,x.createdMinute)}</span></div></div><button class="postmenu">•••</button></div>
    <div class="postbody" data-open-thread="${x.id}">${linkify(x.body)}</div>${media}
    <div class="postactions"><button class="act ${x.liked?'liked':''}" data-like-post="${x.id}">♡ <span>${fmt(x.likes+(x.liked?1:0))}</span></button><button class="act" data-open-thread="${x.id}">◌ <span>${fmt(Math.max(x.comments,comments.length))}</span></button><button class="act ${x.reposted?'reposted':''}" data-repost="${x.id}">↻ <span>${fmt(x.reposts+(x.reposted?1:0))}</span></button><button class="act save" data-save-post="${x.id}">${x.saved?'★':'☆'}</button></div>
    <div class="meta-line">${fmt(x.views||0)} views · ${clock(x.createdMinute)} · Day ${x.createdDay}</div>
    ${!opts.thread&&preview.length?`<div class="preview-comments">${preview.map(c=>`<div class="preview-comment"><b data-profile="${c.author}">${esc(p(c.author).name)}</b>${linkify(c.body)}</div>`).join('')}<button class="view-thread" data-open-thread="${x.id}">View conversation</button></div>`:''}
  </article>`;
}

function renderThread(postId){
  const x=state.posts.find(p=>String(p.id)===String(postId));if(!x){state.view='home';return renderHome();}
  ensureFallbackComments(x);
  const comments=state.comments[x.id]||[];
  const ordered=flattenComments(comments);
  const reply=state.replying;
  return `<div class="pagehead"><button class="ghostbtn" data-view="home">← Back</button><h1>Post</h1><span></span></div>
    ${state.ai.busy?'<div class="typing-pill">••• People are typing…</div>':''}
    <div class="thread-view">${renderPost(x,{thread:true})}<div class="comments">${ordered.map(({c,depth})=>renderComment(x,c,depth)).join('')}</div>
      <div class="panel panel-pad" style="margin-top:14px">${reply?`<div class="reply-banner">Replying to ${esc(p(reply.author).name)} <button class="iconbtn" data-cancel-reply>×</button></div>`:''}<div class="chatcompose"><input id="publicReply" placeholder="Reply${reply?' to @'+stripHandle(p(reply.author).handle):' to this post'}"><button class="sendbtn" data-send-public="${x.id}">Post</button></div></div>
    </div>`;
}

function flattenComments(list){
  const byParent=new Map();const roots=[];
  for(const c of list){if(c.parent){if(!byParent.has(String(c.parent)))byParent.set(String(c.parent),[]);byParent.get(String(c.parent)).push(c)}else roots.push(c)}
  const out=[];function walk(c,d){out.push({c,depth:Math.min(2,d)});for(const child of byParent.get(String(c.id))||[])walk(child,d+1)}
  roots.forEach(c=>walk(c,0));return out;
}
function renderComment(postObj,c,depth){return `<div class="comment depth-${depth}"><div class="comment-head">${avatar(c.author,'sm')}<div style="flex:1"><div class="name-row"><b data-profile="${c.author}">${esc(p(c.author).name)}</b>${verified(c.author)}<span class="handle">${esc(p(c.author).handle)} · ${relativeTime(c.day,c.minute)}</span></div><div class="comment-body">${linkify(c.body)}</div><div class="comment-actions"><button data-like-comment="${postObj.id}:${c.id}">♡ ${fmt(c.likes+(c.liked?1:0))}</button><button data-reply-comment="${postObj.id}:${c.id}:${c.author}">Reply</button></div></div></div></div>`}

function renderSearch(){
  const q=(state.search||'').trim().toLowerCase();
  let ids=Object.keys(PEOPLE).filter(id=>!['maya','chris','mom'].includes(id));
  if(q)ids=ids.filter(id=>`${p(id).name} ${p(id).handle} ${(p(id).categories||[]).join(' ')}`.toLowerCase().includes(q));
  ids.sort((a,b)=>profileFollowerCount(b)-profileFollowerCount(a));
  return `<div class="pagehead"><h1>Search</h1><span class="muted">${universeLoaded?`${ids.length} profiles`:'Loading public directory…'}</span></div><div class="searchbox"><input id="searchInput" value="${escAttr(state.search||'')}" placeholder="Search people, creators, pages, theatre, music…"></div><div class="panel panel-pad">${ids.slice(0,80).map(renderPersonRow).join('')}</div>`;
}
function renderPersonRow(id){const x=p(id);return `<div class="person-row">${avatar(id,'md')}<div class="grow"><div class="name-row"><b data-profile="${id}">${esc(x.name)}</b>${verified(id)}</div><div class="handle">${esc(x.handle)}</div><div class="sub">${fmt(profileFollowerCount(id))} followers${x.city?' · '+esc(x.city):''}</div></div><div class="person-actions">${id!=='ricky'?`<button class="secondarybtn" data-message-person="${id}">Message</button><button class="${state.following[id]?'secondarybtn':'primarybtn'}" data-follow="${id}">${state.following[id]?'Following':'Follow'}</button>`:''}</div></div>`}

function renderProfile(id){
  const x=p(id);const posts=state.posts.filter(z=>z.author===id).sort((a,b)=>totalMinutes(b.createdDay,b.createdMinute)-totalMinutes(a.createdDay,a.createdMinute));
  const replies=[];for(const [pid,list] of Object.entries(state.comments)){for(const c of list||[])if(c.author===id)replies.push({pid,c})}
  const mediaPosts=posts.filter(z=>z.media?.url);
  let body='';
  if(state.profileTab==='posts') body=posts.length?posts.map(z=>renderPost(z)).join(''):'<div class="empty">No posts yet.</div>';
  else if(state.profileTab==='replies') body=replies.length?replies.slice().reverse().map(({pid,c})=>`<div class="comment"><div class="comment-head">${avatar(id,'sm')}<div><div class="name-row"><b>${esc(x.name)}</b>${verified(id)}<span class="handle">${esc(x.handle)}</span></div><div class="comment-body">${linkify(c.body)}</div><button class="view-thread" data-open-thread="${pid}">View conversation</button></div></div></div>`).join(''):'<div class="empty">No replies yet.</div>';
  else body=mediaPosts.length?`<div class="media-grid">${mediaPosts.map(z=>`<div class="media-tile" data-open-thread="${z.id}"><img src="${escAttr(safeImage(z.media.url))}" alt="${escAttr(z.media.alt||'Post image')}" loading="lazy"></div>`).join('')}</div>`:'<div class="empty">No media posts yet.</div>';
  return `<div class="pagehead"><h1>${id==='ricky'?'Your profile':'Profile'}</h1><span></span></div><section class="profile-header"><div class="profile-top">${avatar(id,'lg')}<div><div class="profile-row1"><h2>${esc(x.name)}</h2>${verified(id)}<span class="handle">${esc(x.handle)}</span><div class="profile-actions">${id!=='ricky'?`<button class="${state.following[id]?'secondarybtn':'primarybtn'}" data-follow="${id}">${state.following[id]?'Following':'Follow'}</button><button class="secondarybtn" data-message-person="${id}">Message</button>`:'<button class="secondarybtn" data-edit-profile>Edit profile</button>'}</div></div><div class="profile-stats"><span><b>${fmt(posts.length)}</b> posts</span><span><b>${fmt(profileFollowerCount(id))}</b> followers</span><span><b>${fmt(Math.max(0,Math.round(profileFollowerCount(id)*.12)))}</b> following</span></div><div class="profile-bio">${esc(x.bio||'')}</div>${x.city?`<div class="handle" style="margin-top:5px">${esc(x.city)}</div>`:''}</div></div></section><div class="profile-tabs"><button class="profile-tab ${state.profileTab==='posts'?'active':''}" data-profile-tab="posts">Posts</button><button class="profile-tab ${state.profileTab==='replies'?'active':''}" data-profile-tab="replies">Replies</button><button class="profile-tab ${state.profileTab==='media'?'active':''}" data-profile-tab="media">Media</button></div><div class="profile-feed">${body}</div>`;
}

function threadKeys(kind){const obj=state[kind]||{};return Object.keys(obj).sort((a,b)=>{const aa=obj[a]?.at(-1),bb=obj[b]?.at(-1);return totalMinutes(bb?.day||1,bb?.minute||0)-totalMinutes(aa?.day||1,aa?.minute||0)})}
function renderMessages(kind){
  const active=kind==='dms'?state.activeDM:state.activeSMS;const label=kind==='dms'?'Messages':'SMS';const keys=threadKeys(kind);
  const activeMsgs=active?(state[kind][active]||[]):[];
  return `<div class="pagehead"><h1>${label}</h1><span class="ai-live ${state.ai.busy?'busy':state.ai.online?'on':''}"><i></i>${state.ai.busy?'AI thinking':state.ai.online?'AI live':'AI status'}</span></div><div class="panel two-col"><div class="listcol">${keys.map(id=>{const last=state[kind][id]?.at(-1);return `<div class="thread-item ${id===active?'active':''}" data-thread="${kind}:${id}">${avatar(id,'md')}<div class="grow"><div class="name-row"><b>${esc(p(id).name)}</b>${verified(id)}</div><div class="last">${esc(last?.body||'')}</div></div></div>`}).join('')}</div><div class="chatcol">${active?`<div class="chathead">${avatar(active,'sm')}<div><div class="name-row"><b data-profile="${active}">${esc(p(active).name)}</b>${verified(active)}</div><div class="handle">${kind==='dms'?esc(p(active).handle):'Private phone'}</div></div></div><div class="chatmsgs">${activeMsgs.map(m=>`<div class="bubble ${m.sender==='ricky'?'me':m.sender==='system'?'system':'them'}">${linkify(m.body)}</div>`).join('')}${state.ai.busy&&kind==='dms'?'<div class="bubble system">••• typing</div>':''}</div><div class="chatcompose"><input id="chatInput" placeholder="Message ${esc(p(active).name)}"><button class="sendbtn" data-send-chat="${kind}:${active}">Send</button></div>`:'<div class="empty">Choose a conversation.</div>'}</div></div>`;
}

function renderNotifications(){return `<div class="pagehead"><h1>Notifications</h1><span></span></div><div class="panel panel-pad">${state.notifications.length?state.notifications.map(n=>`<div class="person-row"><div class="avatar sm avatar-fallback">•</div><div class="grow"><div style="font-size:12px;line-height:1.45">${esc(n)}</div></div></div>`).join(''):'<div class="empty">Nothing new.</div>'}</div>`}

function renderCalendar(){
  const sorted=[...state.calendar].sort((a,b)=>a.day-b.day||a.time-b.time);
  return `<div class="pagehead"><h1>Calendar</h1><button class="primarybtn" data-add-calendar>Add event</button></div><div class="notice">Plans only appear here if you add them yourself — unless you later hire staff with calendar access. Agreeing to something in a DM is not the same as remembering it.</div><div class="calendar-list">${sorted.map(e=>`<div class="cal-item"><div><div class="cal-time">Day ${e.day}</div><div class="cal-sub">${clock(e.time)}</div></div><div><b>${esc(e.title)}</b><div class="cal-sub">${esc(e.location||'')} · ${Math.round(e.duration/60*10)/10}h</div></div><span class="status-pill">${esc(e.status)}</span></div>`).join('')}</div>`;
}
function renderFinances(){
  const income=state.txns.filter(x=>x.amount>0&&x.cat!=='Balance').reduce((a,b)=>a+b.amount,0),spend=-state.txns.filter(x=>x.amount<0).reduce((a,b)=>a+b.amount,0);
  return `<div class="pagehead"><h1>Finances</h1><span></span></div><div class="kpis"><div class="kpi"><div class="num">${money(state.money)}</div><div class="label">Available cash</div></div><div class="kpi"><div class="num">${money(income)}</div><div class="label">Career income</div></div><div class="kpi"><div class="num">${money(spend)}</div><div class="label">Spent</div></div></div><div class="panel panel-pad"><div class="txn-list">${[...state.txns].reverse().map(t=>`<div class="txn"><div><b>${esc(t.desc)}</b><div class="handle">${esc(t.cat)} · Day ${t.day||1} ${clock(t.time||0)}</div></div><div class="amount ${t.amount>=0?'in':'out'}">${t.amount>=0?'+':''}${money(t.amount)}</div></div>`).join('')}</div></div>`;
}
function renderAbout(){return `<div class="pagehead"><h1>Spotlight</h1><span></span></div><div class="panel panel-pad"><h3 style="margin-top:0">A living fame simulator</h3><p class="muted" style="font-size:12px;line-height:1.6">The social network is the main game surface. Fame, time, access, relationships, messages, calendar, money, location and later representation all sit underneath it. Public-figure dialogue is fictional AI simulation content informed by public-facing style, not real messages or private facts.</p><p class="muted" style="font-size:12px;line-height:1.6">Current AI model: GPT-5.6 Luna for social simulation through Netlify AI Gateway. Interactive activity scenes are wired to use GPT-5.6 Sol when that system is added.</p><div class="notice"><b>Cloud save token</b><br><span style="word-break:break-all">${esc(GAME_TOKEN)}</span></div><button class="secondarybtn" data-sync-now>Sync now</button> <button class="secondarybtn" data-reset>Reset local save</button></div>`}
