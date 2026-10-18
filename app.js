'use strict';
const SYSTEMS={nes:'Nintendo NES',snes:'Super Nintendo',gb:'Game Boy',gbc:'Game Boy Color',gba:'Game Boy Advance'};
const EXT={nes:'nes',sfc:'snes',smc:'snes',gb:'gb',gbc:'gambatte',gba:'gba'};
const CORE={nes:'nes',snes:'snes',gb:'gb',gbc:'gambatte',gba:'gba'};
const $=id=>document.getElementById(id);
let db,filter='all',items=[],activeUrl=null,localItems=[];
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('pixelvault-games',1);r.onupgradeneeded=()=>r.result.createObjectStore('games',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function allGames(){return request(db.transaction('games').objectStore('games').getAll())}
async function putGame(item){return request(db.transaction('games','readwrite').objectStore('games').put(item))}
async function removeGame(id){return request(db.transaction('games','readwrite').objectStore('games').delete(id))}
function showAdd(){ $('formError').textContent='';$('addDialog').showModal() }
$('addBtn').onclick=showAdd;$('emptyAdd').onclick=showAdd;
$('rom').addEventListener('change',()=>{const f=$('rom').files[0];if(!f)return;const ext=f.name.split('.').pop().toLowerCase();if(EXT[ext])$('platform').value=EXT[ext];$('gameTitle').value=f.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ') });
$('saveGame').onclick=async()=>{
 const button=$('saveGame'),f=$('rom').files[0],cover=$('coverFile').files[0];
 if(!f){$('formError').textContent='Escolha uma ROM.';return}
 const ext=f.name.split('.').pop().toLowerCase();if(!EXT[ext] || (EXT[ext] !== $('platform').value && !(ext === 'gbc' && $('platform').value === 'gbc'))){
  $('formError').textContent = `Formato incompatível: .${ext} / ${$('platform').value}`;
  return;
 if(f.size>50*1024*1024){$('formError').textContent='Limite de 50 MB por ROM nesta versão.';return}
 if(cover&&(cover.size>3*1024*1024||!['image/png','image/jpeg','image/webp'].includes(cover.type))){$('formError').textContent='Capa deve ser PNG/JPG/WebP com até 3 MB.';return}
 button.disabled=true;$('formError').textContent='Enviando para a nuvem...';
 try{await NESROOMCloud.upload(f,cover,$('gameTitle').value.trim()||f.name,$('platform').value);$('addDialog').close();$('addForm').reset();await refresh()}
 catch(e){$('formError').textContent='Falha no upload: '+e.message;console.error(e)}finally{button.disabled=false}
};
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
async function refresh(){
 localItems=await allGames();items=[...localItems];
 const status=$('cloudLibraryStatus');
 if(NESROOMProfiles.getActive()){
  try{await NESROOMCloud.refreshPermissions();const cloud=await NESROOMCloud.list();items=[...cloud,...localItems];status.textContent=`☁ ${cloud.length} jogos no catálogo da nuvem · ${localItems.length} locais`;}
  catch(e){console.warn(e);status.textContent='Não foi possível consultar o catálogo na nuvem. Jogos locais preservados.'}
 }render();
}
let coverUrls=[];
function render(){
 coverUrls.forEach(u=>URL.revokeObjectURL(u));coverUrls=[];
 const shown=items.filter(g=>(filter==='all'||(filter==='favorites'?NESROOMProfiles.isFavorite(g.id):g.console===filter))&&g.name.toLowerCase().includes($('search').value.toLowerCase())).sort((a,b)=>b.created-a.created);
 $('counter').textContent=`${shown.length} ${shown.length===1?'jogo':'jogos'}`;$('library').replaceChildren();$('empty').hidden=shown.length>0;
 $('selectedTitle').textContent=shown.length?shown[0].name:'SELECIONE UM JOGO';
 if(!shown.length){$('empty').querySelector('h2').textContent=items.length?'Nenhum jogo encontrado.':'Sua próxima aventura começa aqui.';$('empty').querySelector('p').textContent=items.length?'Tente outra busca ou escolha outro console.':'Adicione uma ROM sua para começar a jogar. Formatos: .nes, .sfc, .smc, .gb, .gbc e .gba.'}
 for(const g of shown){
  const card=el('article','gamecard'),cover=el('div','cover');cover.dataset.console=g.console;cover.tabIndex=0;cover.setAttribute('role','button');cover.setAttribute('aria-label',`Jogar ${g.name}`);
  const art=el('div','boxart');
  const fallback=()=>art.append(el('div','boxart-system',SYSTEMS[g.console]),el('div','boxart-name',g.name),el('div','boxart-symbol','★'),el('div','boxart-bottom','NESROOM · 8-BIT COLLECTION'));
  if(g.cover){const u=URL.createObjectURL(g.cover);coverUrls.push(u);const img=el('img','cover-image');img.src=u;img.alt=`Capa de ${g.name}`;art.append(img)}
  else if(g.cloud&&g.coverPath){
   fallback();
   NESROOMCloud.getBlob(g.coverPath).then(blob=>{
    if(!art.isConnected)return;
    const u=URL.createObjectURL(blob);coverUrls.push(u);
    const img=el('img','cover-image');img.alt=`Capa de ${g.name}`;
    img.onload=()=>{if(art.isConnected)art.replaceChildren(img)};
    img.onerror=()=>{URL.revokeObjectURL(u);console.warn('Imagem de capa inválida:',g.name)};
    img.src=u;
   }).catch(err=>console.warn('Não foi possível carregar a capa de',g.name,err));
  }
  else fallback();
  cover.append(art,el('span','play','▶ START'));
  const select=()=>{$('selectedTitle').textContent=g.name;document.querySelectorAll('.gamecard').forEach(c=>c.classList.remove('selected'));card.classList.add('selected')};
  cover.onclick=()=>launch(g);cover.onfocus=select;cover.onmouseenter=select;cover.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();launch(g)}};
  const fav=el('button','fav'+(NESROOMProfiles.isFavorite(g.id)?' on':''),NESROOMProfiles.isFavorite(g.id)?'♥':'♡');fav.title='Alternar favorito';fav.onclick=()=>{NESROOMProfiles.toggleFavorite(g.id);render()};
  const bottom=el('div','cardbottom'),details=el('div');details.append(el('h3','',g.name),el('p','',SYSTEMS[g.console]));
  const del=el('button','delete','×');del.title='Remover jogo';del.hidden=g.cloud&&!NESROOMCloud.isAdmin();del.onclick=async()=>{if(confirm(`Remover “${g.name}”?`)){try{if(g.cloud)await NESROOMCloud.remove(g);else await removeGame(g.id);await refresh()}catch(e){alert('Não foi possível remover: '+e.message)}}};
  bottom.append(details,del);card.append(cover,fav,bottom);$('library').append(card);
 }
 $('library').querySelector('.gamecard')?.classList.add('selected');
}
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(n=>n.classList.toggle('active',n===b));render()};$('search').oninput=render;
async function launch(g){try{if(activeUrl)URL.revokeObjectURL(activeUrl);const rom=g.cloud?await NESROOMCloud.getBlob(g.romPath):g.rom;activeUrl=URL.createObjectURL(rom);$('playingTitle').textContent=g.name;$('playingSystem').textContent=SYSTEMS[g.console];$('playerScreen').hidden=false;document.body.style.overflow='hidden';$('game').replaceChildren();window.EJS_player='#game';window.EJS_core=CORE[g.console];window.EJS_gameUrl=activeUrl;window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';window.EJS_startOnLoaded=true;window.EJS_color='#b5ff60';const s=document.createElement('script');s.src='https://cdn.emulatorjs.org/stable/data/loader.js';s.onerror=()=>alert('Não foi possível carregar o emulador. Verifique sua conexão com a internet.');$('game').append(s)}catch(e){alert('Não foi possível iniciar este jogo. Se for da nuvem, o acesso ao arquivo ainda é exclusivo do administrador. '+e.message);console.error(e)}}
$('exitPlayer').onclick=()=>{ // Reload releases EmulatorJS resources and avoids conflicting global instances.
 location.reload()
};
(async()=>{try{await NESROOMProfiles.init(()=>{if(db)refresh()});db=await openDb();await refresh()}catch(e){console.error(e);$('empty').querySelector('h2').textContent='Armazenamento indisponível';$('empty').querySelector('p').textContent='Habilite o armazenamento local do navegador para usar a biblioteca.';$('addBtn').disabled=true;$('emptyAdd').disabled=true}})();
