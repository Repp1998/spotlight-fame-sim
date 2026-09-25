const VERSION = '0.4.0';
const STORAGE = 'spotlight-v04';
const OLD_STORAGE = 'spotlight-v03';
const TOKEN_KEY = 'spotlight-fame-sim-token-v02';
const SUPA = 'https://axkezugocggfvyrjdwns.supabase.co';
const KEY = 'sb_publishable_Fc0FjOcgle1zkScPblqJPQ_5GrFC58q';

const FALLBACK_MEDIA = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=82',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=82'
];

const PEOPLE = {
  ricky: {
    name:'Ricky P', handle:'@rickyp', ig:null, initials:'RP', verified:false, followers:23840, kind:'player', city:'New York',
    bio:'Accidentally went viral. Theatre person. Still figuring out why everyone is here.',
    categories:['theatre','creator'], style:{voice:'casual, funny, grounded; still adjusting to sudden attention'}
  },
  ariana: {
    name:'Ariana Grande', handle:'@arianagrande', ig:'arianagrande', initials:'AG', verified:true, followers:363000000, kind:'celeb', city:'New York',
    bio:'Artist · performer', categories:['music','film','theatre'],
    style:{voice:'warm, concise, playful, polished public tone; often understated rather than constantly performative', posting:'selective and project/event driven'}
  },
  timothee: {
    name:'Timothée Chalamet', handle:'@tchalamet', ig:'tchalamet', initials:'TC', verified:true, followers:21300000, kind:'celeb', city:'New York',
    bio:'Actor', categories:['film','fashion'], style:{voice:'casual, dry, playful, sparse; can be energetic without sounding like a generic hype account'}
  },
  sydney: {
    name:'Sydney Sweeney', handle:'@sydney_sweeney', ig:'sydney_sweeney', initials:'SS', verified:true, followers:26000000, kind:'celeb', city:'Los Angeles',
    bio:'Actor · producer', categories:['film','television'], style:{voice:'upbeat, direct, playful, image-forward; public replies stay concise'}
  },
  sabrina: {
    name:'Sabrina Carpenter', handle:'@sabrinacarpenter', ig:'sabrinacarpenter', initials:'SC', verified:true, followers:51300000, kind:'celeb', city:'Los Angeles',
    bio:'Artist · songwriter', categories:['music'], style:{voice:'witty, playful, dry, concise, wordplay-friendly; avoids generic inspirational language'}
  },
  selena: {
    name:'Selena Gomez', handle:'@selenagomez', ig:'selenagomez', initials:'SG', verified:true, followers:403000000, kind:'celeb', city:'Los Angeles',
    bio:'Artist · actor · producer', categories:['music','television','beauty'], style:{voice:'warm, reflective, restrained; public tone is generally measured'}
  },
  tom: {
    name:'Tom Holland', handle:'@tomholland2013', ig:'tomholland2013', initials:'TH', verified:true, followers:66000000, kind:'celeb', city:'London',
    bio:'Actor', categories:['film'], style:{voice:'playful, self-deprecating, energetic but natural; not permanently all-caps'}
  },
  lin: {
    name:'Lin-Manuel Miranda', handle:'@lin_manuel', ig:'lin_manuel', initials:'LM', verified:true, followers:6100000, kind:'celeb', city:'New York',
    bio:'Writer · composer · performer', categories:['theatre','film','music'], style:{voice:'wordplay-friendly, warm, theatre-aware; not every line needs to be lyrical'}
  },
  darren: {
    name:'Darren Criss', handle:'@darrencriss', ig:'darrencriss', initials:'DC', verified:true, followers:3500000, kind:'celeb', city:'Los Angeles',
    bio:'Actor · musician', categories:['theatre','television','music'], style:{voice:'quick, affable, theatrical, conversational'}
  },
  theatre: {
    name:'TheatrePulse', handle:'@theatrepulse', ig:null, initials:'TP', verified:true, followers:1300000, kind:'page', city:'New York',
    bio:'Broadway, Off-Broadway, theatre news and clips.', categories:['theatre','news'], style:{voice:'fast entertainment-news copy; factual framing with light excitement'}
  },
  popscene: {
    name:'PopScene', handle:'@popscene', ig:null, initials:'PS', verified:true, followers:4200000, kind:'page', city:'New York',
    bio:'Entertainment and internet culture.', categories:['entertainment','news'], style:{voice:'pop-culture news account; concise and reactive'}
  },
  maya: {
    name:'Maya', handle:'Pre-fame girlfriend', ig:null, initials:'MY', verified:false, followers:820, kind:'private', city:'New York',
    bio:'Part of your life before any of this happened.', categories:['private'], style:{voice:'familiar, direct, not impressed by follower counts'}
  },
  chris: {
    name:'Chris', handle:'Childhood friend', ig:null, initials:'CH', verified:false, followers:1200, kind:'private', city:'New York',
    bio:'Childhood friend.', categories:['private'], style:{voice:'casual, teasing, long-history shorthand'}
  },
  mom: {
    name:'Mom', handle:'Mobile', ig:null, initials:'M', verified:false, followers:0, kind:'private', city:'New York',
    bio:'Mom.', categories:['private'], style:{voice:'warm, concerned, practical'}
  }
};

const FAN_NAMES = ['arianatorjade','bwayobsessed','popculturetea','sweeneystann','glitterwatch','nyctheaterkid','celebscentral','stanning_the_glitch','paps_hunter_99','stageleftgirl','filmupdatesdaily','citygirlie26','theatretrashh','internetwatcher'];
let remoteTimer = null;
let toastTimer = null;
let universeLoaded = false;
let state;
state = loadState();
let scrollLastY = window.scrollY;
let scrollDistance = 0;

function uid(prefix='id') {
  if (crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function post(author, body, opts={}) {
  const e = engagementFor(author, opts.virality ?? 1);
  return {
    id: uid('p'), author, body, feed: opts.feed !== false, createdDay: opts.day ?? 1, createdMinute: opts.minute ?? 600,
    likes: opts.likes ?? e.likes, comments: opts.comments ?? e.comments, reposts: opts.reposts ?? e.reposts, views: opts.views ?? e.views,
    media: opts.media || null, liked:false, reposted:false, saved:false, virality: opts.virality ?? 1
  };
}

function message(sender, body, day=1, minute=600, meta={}) {
  return { id: uid('m'), sender, body, day, minute, ...meta };
}

function comment(author, body, opts={}) {
  return { id: uid('c'), author, body, likes: opts.likes ?? Math.floor(Math.random()*900), parent: opts.parent || null, day: opts.day ?? state?.day ?? 1, minute: opts.minute ?? state?.minute ?? 600, liked:false };
}

function engagementFor(authorKey, virality=1) {
  const person = PEOPLE[authorKey] || {followers:1000,kind:'fan'};
  const followers = authorKey === 'ricky' ? (state?.followers || 23840) : (person.followers || 1000);
  const reachFactor = person.kind === 'celeb' ? rand(.18,.75) : person.kind === 'page' ? rand(.28,.95) : authorKey === 'ricky' ? rand(.25,1.4) : rand(.12,.65);
  const views = Math.max(60, Math.round(followers * reachFactor * virality));
  const likeRate = person.kind === 'celeb' ? rand(.025,.07) : rand(.035,.11);
  const likes = Math.max(2, Math.round(Math.min(followers*0.42, views*likeRate)));
  const comments = Math.max(0, Math.round(likes * rand(.004,.025)));
  const reposts = Math.max(0, Math.round(likes * rand(.006,.04)));
  return {views,likes,comments,reposts};
}
function rand(min,max){return min+Math.random()*(max-min)}

function defaults(){
  const initialPosts = [
    post('theatre','The audience reaction to Ricky stepping in during last night’s show is taking over the internet. The clip just crossed 11M views.',{virality:4.5,likes:742000,comments:17300,reposts:5300,views:11800000,media:{type:'image',url:FALLBACK_MEDIA[2],alt:'A live theatre crowd under stage lights'},minute:565}),
    post('ricky','I still cannot believe last night happened. Whoever posted that clip: you changed my week 😭',{virality:2.1,likes:4100,comments:209,reposts:88,views:78200,minute:588}),
    post('sabrina','buying one tiny unnecessary thing is sometimes an important act of creative direction',{likes:1380000,comments:12200,reposts:28800,views:16800000,minute:520}),
    post('selena','quiet mornings are underrated. trying to protect a little more space for them lately.',{likes:4200000,comments:41000,reposts:84000,views:39200000,minute:494}),
    post('popscene','Who is Ricky P? The accidental theatre viral star picked up more than 20,000 followers overnight — and a few surprising famous follows.',{likes:32800,comments:1320,reposts:402,views:490000,minute:603}),
    post('timothee','the internet found a new main character apparently',{likes:184000,comments:4100,reposts:9200,views:2400000,minute:609}),
    post('lin','There are few things more dangerous than a theatre kid realizing the internet is watching.',{likes:91000,comments:1900,reposts:5300,views:980000,minute:548}),
    post('tom','I have been informed that the correct response to going viral is apparently “act normal.” Terrible advice.',{likes:810000,comments:8400,reposts:12000,views:7600000,minute:505}),
    post('ariana','studio day 🤍',{likes:6800000,comments:52000,reposts:76000,views:48400000,minute:430,media:{type:'image',url:FALLBACK_MEDIA[3],alt:'Soft stage lights in a performance venue'}})
  ];
  initialPosts.push(
    post('ariana','a little quiet before everything gets loud again.',{feed:false,likes:5100000,comments:36000,reposts:41000,views:38900000,day:1,minute:240}),
    post('ariana','thank you for all the love on this one. truly.',{feed:false,likes:7200000,comments:59000,reposts:68000,views:52600000,day:1,minute:190,media:{type:'image',url:FALLBACK_MEDIA[0],alt:'Concert lights over a crowd'}}),
    post('timothee','press day. many chairs. many questions.',{feed:false,likes:740000,comments:7600,reposts:10100,views:6200000,day:1,minute:310}),
    post('timothee','nyc',{feed:false,likes:1100000,comments:9400,reposts:14000,views:8100000,day:1,minute:180,media:{type:'image',url:FALLBACK_MEDIA[1],alt:'New York City street view'}}),
    post('sydney','back on set and very happy about it 🤍',{feed:false,likes:1800000,comments:15000,reposts:16000,views:13900000,day:1,minute:330,media:{type:'image',url:FALLBACK_MEDIA[2],alt:'Production lights and a crowd'}}),
    post('sydney','some days are just coffee and chaos',{feed:false,likes:950000,comments:6200,reposts:5700,views:7600000,day:1,minute:260}),
    post('sabrina','tiny dress. extremely normal amount of glitter.',{feed:false,likes:2100000,comments:22000,reposts:49000,views:17200000,day:1,minute:300,media:{type:'image',url:FALLBACK_MEDIA[0],alt:'Concert stage and lights'}}),
    post('sabrina','i support making a problem funnier instead of solving it',{feed:false,likes:1900000,comments:18000,reposts:87000,views:15900000,day:1,minute:210}),
    post('selena','grateful for the people who make ordinary days feel special.',{feed:false,likes:5400000,comments:42000,reposts:61000,views:42600000,day:1,minute:280}),
    post('selena','work day 🤍',{feed:false,likes:3900000,comments:31000,reposts:35000,views:31800000,day:1,minute:170,media:{type:'image',url:FALLBACK_MEDIA[3],alt:'Soft lights at a venue'}}),
    post('tom','Golf was going well until I remembered I am not actually good at golf.',{feed:false,likes:920000,comments:8500,reposts:9800,views:7300000,day:1,minute:295}),
    post('tom','home for a minute.',{feed:false,likes:760000,comments:7100,reposts:6800,views:6100000,day:1,minute:160,media:{type:'image',url:FALLBACK_MEDIA[1],alt:'City skyline'}}),
    post('lin','Writing is mostly moving the same four words around until they suddenly decide to behave.',{feed:false,likes:52000,comments:840,reposts:6200,views:560000,day:1,minute:320}),
    post('lin','Theatre people: hydrate. This is not metaphorical.',{feed:false,likes:69000,comments:970,reposts:8800,views:690000,day:1,minute:205}),
    post('darren','soundcheck done. pretending that means I will now sit quietly for an hour.',{feed:false,likes:88000,comments:920,reposts:2100,views:640000,day:1,minute:275,media:{type:'image',url:FALLBACK_MEDIA[3],alt:'Stage lights before a performance'}}),
    post('darren','a very serious meeting about an extremely unserious idea',{feed:false,likes:74000,comments:660,reposts:1700,views:520000,day:1,minute:155})
  );
  return {
    version:VERSION, view:'home', profileKey:'ricky', profileTab:'posts', threadPostId:null,
    day:1, minute:612, location:'Manhattan', energy:86, money:4820, followers:23840, recognition:12, relevance:91, reputation:72,
    following:{timothee:true}, relationships:{timothee:{affinity:8,trust:2,interest:12,resentment:0},maya:{affinity:72,trust:76,interest:68,resentment:0},chris:{affinity:82,trust:88,interest:0,resentment:0}},
    posts:initialPosts,
    comments:{},
    dms:{
      timothee:[message('system','Timothée followed you after your theatre clip went viral.'),message('timothee','that clip is insane lol. you good over there?',1,604)],
      ariana:[message('system','Message requests are filtered heavily at this fame level.')],
      sydney:[message('system','You have never spoken. A cold DM may go unnoticed.')],
      chris:[message('chris','bro this is actually insane',1,590),message('chris','you had like 800 followers yesterday 😭',1,591)]
    },
    sms:{
      maya:[message('maya','Are you still coming over tonight?',1,581),message('maya','You said 8ish.',1,582)],
      chris:[message('chris','call me later lmao this is ridiculous',1,596)],
      mom:[message('mom','Call me when you get a chance ❤️',1,603)]
    },
    activeDM:'timothee', activeSMS:'maya',
    calendar:[{id:uid('cal'),title:'Dinner / hang with Maya',day:1,time:1200,duration:150,location:'Brooklyn',status:'confirmed',manual:true}],
    txns:[{id:uid('txn'),desc:'Starting balance',amount:4820,cat:'Balance',day:1,time:540},{id:uid('txn'),desc:'Coffee',amount:-6.75,cat:'Food',day:1,time:558}],
    notifications:['Your theatre clip crossed 10M views.','Timothée Chalamet followed you.','Three entertainment accounts mentioned you.'],
    world:['A theatre clip from last night went massively viral.'],
    ai:{online:null,busy:false,lastError:'',lastSummary:'',lastWorldTickDay:1,lastWorldTickMinute:600},
    replying:null,
    cloud:'local'
  };
}
