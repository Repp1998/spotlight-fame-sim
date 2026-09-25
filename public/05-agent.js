function worldSnapshot(){
  const recentPosts=[...state.posts].sort((a,b)=>totalMinutes(b.createdDay,b.createdMinute)-totalMinutes(a.createdDay,a.createdMinute)).slice(0,10).map(x=>({id:String(x.id),author_key:x.author,text:x.body,likes:x.likes,comments:x.comments,reposts:x.reposts,views:x.views,day:x.createdDay,minute:x.createdMinute,top_comments:(state.comments[x.id]||[]).slice(-4).map(c=>({id:String(c.id),author_key:c.author,text:c.body,parent:c.parent||null}))}));
  const recentMessages=[];for(const [id,list] of Object.entries(state.dms)){const last=list?.at(-1);if(last)recentMessages.push({person_key:id,sender:last.sender,text:last.body,day:last.day,minute:last.minute})}
  return {day:state.day,minute:state.minute,location:state.location,followers:state.followers,recognition:state.recognition,relevance:state.relevance,reputation:state.reputation,energy:state.energy,money:state.money,following:state.following,relationships:state.relationships,recent_world:state.world.slice(0,10),recent_posts:recentPosts,recent_messages:recentMessages.slice(0,8),calendar:state.calendar.slice(0,8)};
}
function characterContext(extra=[]){
  const base=['ricky','ariana','timothee','sydney','sabrina','selena','tom','lin','darren','theatre','popscene',...extra];
  const ids=[...new Set(base.filter(Boolean))].filter(id=>PEOPLE[id]).slice(0,24);
  return ids.map(id=>{const x=p(id);return {key:id,name:x.name,handle:x.handle,kind:x.kind,verified:x.verified,followers:profileFollowerCount(id),city:x.city,bio:x.bio,categories:x.categories||[],style:x.style||{},relationship:state.relationships[id]||{},recent_memory:[]}});
}

async function agentCall(mode,event={},extraKeys=[]){
  state.ai.busy=true;state.ai.lastError='';render();
  try{
    const res=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,world:worldSnapshot(),event,characters:characterContext(extraKeys)})});
    const payload=await res.json().catch(()=>({ok:false,error:`HTTP ${res.status}`}));
    if(!res.ok||!payload.ok) throw new Error(payload.error||`AI ${res.status}`);
    state.ai.online=true;state.ai.busy=false;state.ai.lastSummary=payload.data?.summary||'';applyAgentData(payload.data||{},event);save();render();return payload.data;
  }catch(err){
    console.warn('Agent unavailable',err);state.ai.online=false;state.ai.busy=false;state.ai.lastError=String(err?.message||err);save();render();toast('AI agent unavailable — local simulation still works');return null;
  }
}

function applyAgentData(data,context={}){
  const targetPost=context.post_id?state.posts.find(x=>String(x.id)===String(context.post_id)):null;
  if(targetPost&&data.engagement){
    targetPost.views=Math.max(targetPost.views||0,Number(data.engagement.views||targetPost.views||0));
    targetPost.likes=Math.max(targetPost.likes||0,Number(data.engagement.likes||targetPost.likes||0));
    targetPost.comments=Math.max(targetPost.comments||0,Number(data.engagement.comments||targetPost.comments||0));
    targetPost.reposts=Math.max(targetPost.reposts||0,Number(data.engagement.reposts||targetPost.reposts||0));
    const fd=Math.round(Number(data.engagement.follower_delta||0));if(fd){state.followers=Math.max(0,state.followers+fd);state.notifications.unshift(`Your post brought in ${fmt(Math.abs(fd))} ${fd>=0?'new followers':'fewer followers'}.`)}
  }
  if(Array.isArray(data.comments)){
    const refMap={};
    for(const rc of data.comments.slice(0,16)){
      const commentPost=(rc.target_post_id?state.posts.find(x=>String(x.id)===String(rc.target_post_id)):targetPost);
      if(!commentPost) continue;
      const list=state.comments[commentPost.id]||(state.comments[commentPost.id]=[]);
      const author=rc.author_key&&PEOPLE[rc.author_key]?rc.author_key:createGeneratedPerson(rc.generated_author||{});
      let parent=rc.reply_to_comment_id?String(rc.reply_to_comment_id):null;
      if(!parent&&rc.reply_to_ref&&refMap[rc.reply_to_ref]) parent=refMap[rc.reply_to_ref];
      if(!parent&&context.user_comment_id&&modeWasReply(context)&&commentPost===targetPost) parent=String(context.user_comment_id);
      const made=comment(author,String(rc.text||'').slice(0,500),{likes:Math.max(0,Math.round(Number(rc.likes||0))),parent,day:state.day,minute:state.minute});
      list.push(made);if(rc.ref)refMap[String(rc.ref)]=String(made.id);
      if(author!=='ricky'&&(parent===String(context.user_comment_id)||p(author).kind==='celeb')) state.notifications.unshift(`${p(author).name} replied in a thread you’re in.`);
      commentPost.comments=Math.max(commentPost.comments,list.length);
    }
  }
  if(Array.isArray(data.posts)){
    for(const rp of data.posts.slice(0,8)){
      const author=rp.author_key&&PEOPLE[rp.author_key]?rp.author_key:createGeneratedPerson(rp.generated_author||{});
      const useMedia=rp.media&&Math.random()<.55;
      const media=useMedia?{type:'image',url:FALLBACK_MEDIA[Math.floor(Math.random()*FALLBACK_MEDIA.length)],alt:rp.media?.alt||'Photo post'}:null;
      state.posts.unshift(post(author,String(rp.text||'').slice(0,900),{likes:Number(rp.likes||0),comments:Number(rp.comments||0),reposts:Number(rp.reposts||0),views:Number(rp.views||0),media,day:state.day,minute:state.minute}));
    }
  }
  if(Array.isArray(data.dms))for(const d of data.dms.slice(0,8)){
    if(d.recipient_key&&d.recipient_key!=='ricky') continue;const sender=d.sender_key;if(!sender||!PEOPLE[sender])continue;
    if(!state.dms[sender])state.dms[sender]=[];state.dms[sender].push(message(sender,String(d.text||'').slice(0,1200),state.day,state.minute,{seen:d.seen!==false}));state.notifications.unshift(`${p(sender).name} sent you a message.`);
  }
  if(Array.isArray(data.follows))for(const f of data.follows){if(f.target_key==='ricky'&&f.actor_key&&PEOPLE[f.actor_key]){state.notifications.unshift(`${p(f.actor_key).name} followed you.`);state.relationships[f.actor_key]=state.relationships[f.actor_key]||{affinity:0,trust:0,interest:0,resentment:0};}}
  if(Array.isArray(data.notifications))for(const n of data.notifications.slice(0,8))if(n)state.notifications.unshift(String(n).slice(0,500));
  if(Array.isArray(data.relationship_updates))for(const u of data.relationship_updates){if(!u.person_key||!PEOPLE[u.person_key])continue;const r=state.relationships[u.person_key]||(state.relationships[u.person_key]={affinity:0,trust:0,interest:0,resentment:0});for(const k of ['affinity','trust','interest','resentment'])r[k]=clamp((r[k]||0)+Number(u[k]||0),-100,100);}
  if(Array.isArray(data.world_events))for(const w of data.world_events.slice(0,6))if(w.summary)state.world.unshift(`${w.visibility||'public'}: ${String(w.summary).slice(0,600)}`);
}
function modeWasReply(context){return !!context.user_comment_id}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
