/* Local player profiles. No authentication or cloud storage in this release. */
const NESROOMProfiles=(()=>{
 const KEY='nesroom-profiles-v3', ACTIVE='nesroom-active-player-v3', AVATARS=['👾','👻','🤖','🍄','⭐','🕹️'];
 let profiles=[],active=null,selected=AVATARS[0],onChange=()=>{};
 const $=id=>document.getElementById(id);
 function persist(){localStorage.setItem(KEY,JSON.stringify(profiles))}
 function load(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');profiles=Array.isArray(a)?a.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'):[]}catch{profiles=[]}}
 function draw(){const list=$('profileList');list.replaceChildren();for(const p of profiles){const b=document.createElement('button');b.type='button';b.className='profile-card';b.textContent=`${p.avatar||'👾'}  ${p.name}`;b.onclick=()=>choose(p.id);list.append(b)}}
 function choose(id){const p=profiles.find(p=>p.id===id);if(!p)return;active=p;localStorage.setItem(ACTIVE,id);$('profileGate').hidden=true;$('playerLabel').textContent=`PRESS START · ${p.avatar||'👾'} ${p.name.toUpperCase()}`;onChange()}
 function init(cb){onChange=cb;load();$('avatarOptions').replaceChildren();for(const a of AVATARS){const b=document.createElement('button');b.type='button';b.textContent=a;b.className='avatar-choice'+(a===selected?' picked':'');b.onclick=()=>{selected=a;document.querySelectorAll('.avatar-choice').forEach(x=>x.classList.toggle('picked',x===b))};$('avatarOptions').append(b)}
 $('profileForm').onsubmit=e=>{e.preventDefault();const name=$('profileName').value.trim();if(!name)return;const p={id:crypto.randomUUID(),name,avatar:selected,favorites:[]};profiles.push(p);persist();$('profileName').value='';draw();choose(p.id)};
 $('switchPlayer').onclick=()=>{draw();$('profileGate').hidden=false};draw();const saved=localStorage.getItem(ACTIVE);if(saved&&profiles.some(p=>p.id===saved))choose(saved);else $('profileGate').hidden=false;
 }
 function isFavorite(id){return !!active?.favorites?.includes(id)}
 function toggleFavorite(id){if(!active)return;active.favorites=active.favorites||[];active.favorites=isFavorite(id)?active.favorites.filter(x=>x!==id):[...active.favorites,id];persist()}
 return {init,isFavorite,toggleFavorite};
})();
