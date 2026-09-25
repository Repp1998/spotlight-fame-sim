async function reactToPost(x){
  await agentCall('react_to_post',{post_id:String(x.id),author_key:'ricky',text:x.body,media:!!x.media,reason:'The player just published this post. Decide who plausibly notices and how the first wave reacts.'},['chris','maya']);
}
async function reactToPublicReply(postObj,userComment,targetAuthor){
  await agentCall('react_to_reply',{post_id:String(postObj.id),post_author_key:postObj.author,post_text:postObj.body,user_comment_id:String(userComment.id),replying_to_key:targetAuthor||postObj.author,user_text:userComment.body,reason:'The player just replied publicly. Continue the conversation only if plausible; other accounts can notice too.'},[postObj.author,targetAuthor]);
}
async function dmAgent(personKey,text){
  await agentCall('dm',{person_key:personKey,user_text:text,channel:'instagram_dm',reason:'The player sent this DM. Decide whether it is seen and whether a response happens based on fame, prior contact, relationship and personality.'},[personKey]);
}
async function worldTick(){
  state.ai.lastWorldTickDay=state.day;state.ai.lastWorldTickMinute=state.minute;await agentCall('world_tick',{reason:'The player refreshed the social world after some in-game time passed. Generate a small amount of independent activity. Do not center everything on the player.'});
}

function submitPost(){
  const text=document.getElementById('createText')?.value.trim();if(!text)return;
  const img=safeImage(document.getElementById('createImage')?.value.trim()||'');const media=img?{type:'image',url:img,alt:'Photo shared by Ricky'}:null;
  const virality=rand(.7,1.55)*(state.relevance/80);const e=engagementFor('ricky',virality);const x=post('ricky',text,{...e,media,virality,day:state.day,minute:state.minute});
  state.posts.unshift(x);state.modal=null;state.view='home';const min=Math.max(3,Math.min(12,Math.ceil(text.length/35)+(media?3:0)));advance(min,'Created a social post',false);render();reactToPost(x);
}

function sendPublicReply(postId){
  const input=document.getElementById('publicReply');const text=input?.value.trim();if(!text)return;const x=state.posts.find(z=>String(z.id)===String(postId));if(!x)return;
  const target=state.replying?.author||x.author;const parent=state.replying?.id||null;const c=comment('ricky',text,{likes:Math.floor(rand(0,25)),parent,day:state.day,minute:state.minute});
  (state.comments[x.id]||(state.comments[x.id]=[])).push(c);x.comments=Math.max(x.comments,(state.comments[x.id]||[]).length);state.replying=null;advance(Math.max(1,Math.min(5,Math.ceil(text.length/50))),'Replied in a public thread',false);render();reactToPublicReply(x,c,target);
}
function sendChat(kind,id){
  const input=document.getElementById('chatInput');const text=input?.value.trim();if(!text)return;if(!state[kind][id])state[kind][id]=[];state[kind][id].push(message('ricky',text,state.day,state.minute));
  advance(Math.max(1,Math.min(6,Math.ceil(text.length/45))),`Messaged ${p(id).name}`,false);render();if(kind==='dms')dmAgent(id,text);else localSMSReply(id,text);
}
function localSMSReply(id,text){
  const rel=state.relationships[id]||{};let response='';if(id==='maya')response=rel.resentment>20?'Okay. We need to actually talk later.':'okay, just keep me posted.';else if(id==='chris')response='lmao yeah call me when you stop being internet famous for five seconds';else if(id==='mom')response='Okay ❤️ please eat something and call when you can.';if(response){state.sms[id].push(message(id,response,state.day,state.minute));save();render();}
}

function saveCalendar(){const title=document.getElementById('calTitle')?.value.trim();if(!title)return;const [h,m]=(document.getElementById('calTime')?.value||'20:00').split(':').map(Number);state.calendar.push({id:uid('cal'),title,day:state.day,time:h*60+m,duration:90,location:document.getElementById('calLocation')?.value||state.location,status:'confirmed',manual:true});state.modal=null;save();render();}
function saveProfile(){const url=safeImage(document.getElementById('profileAvatar')?.value.trim()||'');PEOPLE.ricky.avatar=url||null;PEOPLE.ricky.bio=document.getElementById('profileBio')?.value.trim()||PEOPLE.ricky.bio;state.modal=null;save();render();}

function randomMediaFor(text=''){const t=text.toLowerCase();if(/food|dinner|restaurant|burrito|pizza/.test(t))return FALLBACK_MEDIA[4];if(/new york|nyc|city|broadway/.test(t))return FALLBACK_MEDIA[1];if(/concert|stage|show|performance|theatre/.test(t))return FALLBACK_MEDIA[Math.random()>.5?0:2];return FALLBACK_MEDIA[Math.floor(Math.random()*FALLBACK_MEDIA.length)]}

function maybeWorldTick(){const elapsed=totalMinutes()-totalMinutes(state.ai.lastWorldTickDay||1,state.ai.lastWorldTickMinute||0);if(elapsed>=18&&!state.ai.busy)worldTick();}

function wire(){
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;state.threadPostId=null;state.replying=null;save();render();if(state.view==='home')maybeWorldTick();});
  document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();state.profileKey=b.dataset.profile;state.profileTab='posts';state.view='profile';save();render();});
  document.querySelectorAll('[data-open-thread]').forEach(b=>b.onclick=()=>{state.threadPostId=b.dataset.openThread;state.view='thread';state.replying=null;advance(1,'Opened a post thread',false);render();});
  document.querySelectorAll('[data-like-post]').forEach(b=>b.onclick=()=>{const x=state.posts.find(z=>String(z.id)===String(b.dataset.likePost));if(!x)return;x.liked=!x.liked;advance(1,'Interacted with the feed',false);render();});
  document.querySelectorAll('[data-repost]').forEach(b=>b.onclick=()=>{const x=state.posts.find(z=>String(z.id)===String(b.dataset.repost));if(!x)return;x.reposted=!x.reposted;advance(2,'Reposted something',false);render();});
  document.querySelectorAll('[data-save-post]').forEach(b=>b.onclick=()=>{const x=state.posts.find(z=>String(z.id)===String(b.dataset.savePost));if(!x)return;x.saved=!x.saved;save();render();});
  document.querySelectorAll('[data-like-comment]').forEach(b=>b.onclick=()=>{const [pid,cid]=b.dataset.likeComment.split(':');const c=(state.comments[pid]||[]).find(z=>String(z.id)===String(cid));if(c){c.liked=!c.liked;advance(1,'Liked a reply',false);render();}});
  document.querySelectorAll('[data-reply-comment]').forEach(b=>b.onclick=()=>{const [pid,cid,author]=b.dataset.replyComment.split(':');state.replying={id:cid,author};document.getElementById('publicReply')?.focus();save();render();setTimeout(()=>document.getElementById('publicReply')?.focus(),0);});
  document.querySelector('[data-cancel-reply]')?.addEventListener('click',()=>{state.replying=null;save();render()});
  document.querySelectorAll('[data-send-public]').forEach(b=>b.onclick=()=>sendPublicReply(b.dataset.sendPublic));
  document.querySelectorAll('[data-follow]').forEach(b=>b.onclick=()=>{const id=b.dataset.follow;state.following[id]=!state.following[id];state.notifications.unshift(`${state.following[id]?'You followed':'You unfollowed'} ${p(id).name}.`);advance(1,'Changed a follow',false);render();});
  document.querySelectorAll('[data-message-person]').forEach(b=>b.onclick=()=>{const id=b.dataset.messagePerson;if(!state.dms[id])state.dms[id]=[message('system',`You can message ${p(id).name}. Whether they notice depends on your fame, relationship, context and their own behavior.`,state.day,state.minute)];state.activeDM=id;state.view='messages';advance(1,`Opened a DM with ${p(id).name}`,false);render();});
  document.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.thread.split(':');if(kind==='dms')state.activeDM=id;else state.activeSMS=id;save();render();});
  document.querySelectorAll('[data-send-chat]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.sendChat.split(':');sendChat(kind,id)});
  document.querySelectorAll('[data-profile-tab]').forEach(b=>b.onclick=()=>{state.profileTab=b.dataset.profileTab;save();render();});
  document.querySelectorAll('[data-create]').forEach(b=>b.onclick=()=>{state.modal={type:'create'};render();setTimeout(()=>document.getElementById('createText')?.focus(),0)});
  document.querySelector('[data-submit-post]')?.addEventListener('click',submitPost);
  document.querySelector('[data-refresh]')?.addEventListener('click',()=>{advance(5,'Browsed and refreshed the feed',false);render();worldTick();});
  document.getElementById('searchInput')?.addEventListener('input',e=>{state.search=e.target.value;save();const pos=e.target.selectionStart;render();const i=document.getElementById('searchInput');if(i){i.focus();i.setSelectionRange(pos,pos)}});
  document.querySelector('[data-add-calendar]')?.addEventListener('click',()=>{state.modal={type:'calendar'};render()});
  document.querySelector('[data-save-calendar]')?.addEventListener('click',saveCalendar);
  document.querySelector('[data-edit-profile]')?.addEventListener('click',()=>{state.modal={type:'edit-profile'};render()});
  document.querySelector('[data-save-profile]')?.addEventListener('click',saveProfile);
  document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>{state.modal=null;render()});
  document.querySelectorAll('[data-modal-back]').forEach(b=>b.onclick=e=>{if(e.target===b){state.modal=null;render()}});
  document.querySelector('[data-sync-now]')?.addEventListener('click',remoteSave);
  document.querySelector('[data-reset]')?.addEventListener('click',()=>{if(confirm('Reset this local Spotlight save?')){state=defaults();localStorage.setItem(STORAGE,JSON.stringify(state));render();remoteSave();}});
  document.getElementById('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.querySelector('[data-send-chat]')?.click()}});
  document.getElementById('publicReply')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.querySelector('[data-send-public]')?.click()}});
}

window.addEventListener('scroll',()=>{
  const y=window.scrollY;scrollDistance+=Math.abs(y-scrollLastY);scrollLastY=y;
  if(scrollDistance>=1800){scrollDistance=0;advance(1,'Spent time scrolling social media',false);}
},{passive:true});

render();
remoteLoad();
loadUniverse();
setTimeout(()=>maybeWorldTick(),1800);
