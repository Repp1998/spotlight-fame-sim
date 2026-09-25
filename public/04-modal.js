function renderModal(){
  if(!state.modal) return '';
  if(state.modal.type==='create') return `<div class="modal-backdrop" data-modal-back><div class="modal"><div class="modalhead"><span>Create post</span><button data-close-modal>×</button></div><div class="modalbody"><div class="composer-user">${avatar('ricky','md')}<div><b>Ricky P</b><div class="handle">@rickyp</div></div></div><textarea class="compose-text" id="createText" placeholder="What’s happening?"></textarea><div class="compose-row"><input id="createImage" placeholder="Optional image URL"><button class="primarybtn" data-submit-post>Post</button></div><div class="handle" style="margin-top:8px">Text-first is the default. Posting, editing, and reading reactions consume in-game time.</div></div></div></div>`;
  if(state.modal.type==='calendar') return `<div class="modal-backdrop" data-modal-back><div class="modal"><div class="modalhead"><span>Add calendar event</span><button data-close-modal>×</button></div><div class="modalbody"><input id="calTitle" placeholder="Event title" style="width:100%;background:#101318;border:1px solid #2b323d;border-radius:10px;color:white;padding:11px;margin-bottom:9px"><div class="compose-row"><input id="calTime" type="time" value="20:00"><input id="calLocation" placeholder="Location" value="Manhattan"></div><div class="compose-row"><button class="primarybtn" data-save-calendar>Add to calendar</button></div></div></div></div>`;
  if(state.modal.type==='edit-profile') return `<div class="modal-backdrop" data-modal-back><div class="modal"><div class="modalhead"><span>Edit your profile</span><button data-close-modal>×</button></div><div class="modalbody"><input id="profileAvatar" placeholder="Profile image URL (optional)" value="${escAttr(PEOPLE.ricky.avatar||'')}" style="width:100%;background:#101318;border:1px solid #2b323d;border-radius:10px;color:white;padding:11px;margin-bottom:9px"><textarea id="profileBio" class="compose-text" style="min-height:100px">${esc(PEOPLE.ricky.bio||'')}</textarea><div class="compose-row"><button class="primarybtn" data-save-profile>Save profile</button></div></div></div></div>`;
  return '';
}

function ensureFallbackComments(x){
  if(state.comments[x.id]?.length) return;
  const pool=x.author==='ricky'?['chris','theatre']:['ricky'];
  state.comments[x.id]=pool.map((a,i)=>comment(a,fallbackComment(a,x),{likes:Math.floor(rand(12,1200)),minute:Math.min(state.minute,x.createdMinute+2+i*3)}));
  state.comments[x.id].push(makeFanComment(x));save();
}
function fallbackComment(author,x){if(author==='chris')return 'i am begging the internet not to make this worse 😭';if(author==='theatre')return 'This clip is still climbing. People are definitely paying attention.';if(author==='ricky')return `okay I did not expect ${p(x.author).name} to post this today`;return 'the replies are already chaos'}
function makeFanComment(x){const key=createGeneratedPerson({display_name:'',handle:FAN_NAMES[Math.floor(Math.random()*FAN_NAMES.length)],kind:'fan',verified:false,followers:Math.floor(rand(120,12000))});return comment(key,x.author==='ricky'?'why am i watching a theatre guy become famous in real time 😭':'this app is getting way too entertaining',{likes:Math.floor(rand(4,700))})}
function createGeneratedPerson(profile={}){
  const raw=stripHandle(profile.handle||`user_${Math.floor(Math.random()*99999)}`);let key=Object.keys(PEOPLE).find(id=>stripHandle(PEOPLE[id].handle).toLowerCase()===raw.toLowerCase());if(key)return key;
  key=`gen_${raw.replace(/[^a-z0-9_]/gi,'_')}_${Math.floor(Math.random()*9999)}`;PEOPLE[key]={name:profile.display_name||raw,handle:'@'+raw,ig:null,initials:(profile.display_name||raw).slice(0,2).toUpperCase(),verified:!!profile.verified,followers:Number(profile.followers||500),kind:profile.kind||'fan',city:'Varies',bio:'',categories:[profile.kind||'fan'],style:{}};return key;
}
