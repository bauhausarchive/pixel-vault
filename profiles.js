/* NESROOM cloud profiles v3.1: one anonymous Supabase identity per local profile.
   Sessions are stored per profile on this device; there is NO cross-device recovery yet. */
const NESROOMProfiles=(()=>{
 const KEY='nesroom-profiles-v3', ACTIVE='nesroom-active-player-v3', AVATARS=['👾','👻','🤖','🍄','⭐','🕹️'];
 const SESSION_KEY='nesroom-cloud-session-';
 let profiles=[],active=null,selected=AVATARS[0],onChange=()=>{},client=null,busy=false;
 const $=id=>document.getElementById(id);
 function persist(){localStorage.setItem(KEY,JSON.stringify(profiles))}
 function load(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');profiles=Array.isArray(a)?a.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'):[]}catch{profiles=[]}}
 function errorMessage(message){let e=$('cloudStatus');if(!e){e=document.createElement('p');e.id='cloudStatus';e.style.cssText='color:#ff9d9d;font-size:12px;line-height:1.5';$('profileForm').after(e)}e.textContent=message||''}
 function draw(){const list=$('profileList');list.replaceChildren();for(const p of profiles){const b=document.createElement('button');b.type='button';b.className='profile-card';b.textContent=`${p.avatar||'👾'}  ${p.name}${localStorage.getItem(SESSION_KEY+p.id)?' ☁':''}`;b.disabled=busy;b.onclick=()=>choose(p.id);list.append(b)}}
 async function cloudSession(p){
   const saved=JSON.parse(localStorage.getItem(SESSION_KEY+p.id)||'null');
   let data,err;
   if(saved){({data,error:err}=await client.auth.setSession({access_token:saved.access_token,refresh_token:saved.refresh_token}));if(err)throw Error('Não foi possível recuperar a sessão deste jogador. Não crie outro perfil com o mesmo nome: isso não recupera o progresso. '+err.message)}
   else {({data,error:err}=await client.auth.signInAnonymously());if(err)throw err}
   if(!data.session)throw Error('O Supabase não retornou uma sessão.');
   localStorage.setItem(SESSION_KEY+p.id,JSON.stringify({access_token:data.session.access_token,refresh_token:data.session.refresh_token}));
   const uid=data.user?.id||data.session.user.id;
   const {data:existing,error:readError}=await client.from('profiles').select('id,name,avatar').eq('id',uid).maybeSingle();
   if(readError)throw readError;
   if(!existing){const {error:insertError}=await client.from('profiles').insert({id:uid,name:p.name,avatar:p.avatar||'👾'});if(insertError)throw insertError}
   return uid;
 }
 async function choose(id){if(busy)return;const p=profiles.find(x=>x.id===id);if(!p)return;busy=true;draw();errorMessage('Conectando perfil à nuvem...');
  try{await cloudSession(p);active=p;localStorage.setItem(ACTIVE,id);$('profileGate').hidden=true;$('playerLabel').textContent=`PRESS START · ${p.avatar||'👾'} ${p.name.toUpperCase()}`;errorMessage('');onChange()}
  catch(e){console.error(e);errorMessage('Erro na nuvem: '+e.message+' Verifique sua conexão e a configuração do Supabase.')}finally{busy=false;draw()}
 }
 async function init(cb){onChange=cb;load();if(!window.supabase||!window.NESROOM_CLOUD_CONFIG){errorMessage('Biblioteca Supabase não carregou. Confira a internet.');return}
  client=window.supabase.createClient(window.NESROOM_CLOUD_CONFIG.url,window.NESROOM_CLOUD_CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  $('avatarOptions').replaceChildren();for(const a of AVATARS){const b=document.createElement('button');b.type='button';b.textContent=a;b.className='avatar-choice'+(a===selected?' picked':'');b.onclick=()=>{selected=a;document.querySelectorAll('.avatar-choice').forEach(x=>x.classList.toggle('picked',x===b))};$('avatarOptions').append(b)}
  $('profileForm').onsubmit=async e=>{e.preventDefault();if(busy)return;const name=$('profileName').value.trim().slice(0,30);if(!name)return;const p={id:crypto.randomUUID(),name,avatar:selected,favorites:[]};profiles.push(p);persist();$('profileName').value='';draw();await choose(p.id)};
  $('switchPlayer').onclick=()=>{active=null;draw();$('profileGate').hidden=false};draw();const saved=localStorage.getItem(ACTIVE);if(saved&&profiles.some(p=>p.id===saved))await choose(saved);else $('profileGate').hidden=false;
 }
 function isFavorite(id){return !!active?.favorites?.includes(id)}
 function toggleFavorite(id){if(!active)return;active.favorites=active.favorites||[];active.favorites=isFavorite(id)?active.favorites.filter(x=>x!==id):[...active.favorites,id];persist()}
 return {init,isFavorite,toggleFavorite};
})();
