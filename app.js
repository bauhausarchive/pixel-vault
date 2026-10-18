'use strict';
const SYSTEMS={nes:'Nintendo NES',snes:'Super Nintendo',gb:'Game Boy',gbc:'Game Boy Color',gba:'Game Boy Advance'};
const EXT={nes:'nes',sfc:'snes',smc:'snes',gb:'gb',gbc:'gbc',gba:'gba'};
const CORE={nes:'nes',snes:'snes',gb:'gb',gbc:'gbc',gba:'gba'};
const $=id=>document.getElementById(id);
let db,filter='all',items=[],activeUrl=null;
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('pixelvault-games',1);r.onupgradeneeded=()=>r.result.createObjectStore('games',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function allGames(){return request(db.transaction('games').objectStore('games').getAll())}
async function putGame(item){return request(db.transaction('games','readwrite').objectStore('games').put(item))}
async function removeGame(id){return request(db.transaction('games','readwrite').objectStore('games').delete(id))}
function showAdd(){ $('formError').textContent='';$('addDialog').showModal() }
$('addBtn').onclick=showAdd;$('emptyAdd').onclick=showAdd;
$('rom').addEventListener('change',()=>{const f=$('rom').files[0];if(!f)return;const ext=f.name.split('.').pop().toLowerCase();if(EXT[ext])$('platform').value=EXT[ext];$('gameTitle').value=f.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ') });
$('saveGame').onclick=async()=>{const f=$('rom').files[0];if(!f){$('formError').textContent='Escolha um arquivo.';return}const ext=f.name.split('.').pop().toLowerCase();if(!EXT[ext]){$('formError').textContent='Formato de ROM não suportado.';return}if(f.size>80*1024*1024){$('formError').textContent='Arquivo acima do limite de 80 MB desta versão.';return}if(EXT[ext]!==$('platform').value){$('formError').textContent='O console escolhido não corresponde à extensão do arquivo.';return}try{const coverFile=$('coverFile').files[0];if(coverFile&&coverFile.size>3*1024*1024){$('formError').textContent='Capa acima de 3 MB.';return}await putGame({cover:coverFile||null,id:crypto.randomUUID(),name:$('gameTitle').value.trim()||f.name,console:$('platform').value,rom:f,favorite:false,created:Date.now()});$('addDialog').close();$('addForm').reset();await refresh()}catch(e){$('formError').textContent='Não foi possível salvar. Verifique o espaço disponível no navegador.';console.error(e)}};
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
async function refresh(){items=await allGames();render()}
let coverUrls=[];
function render(){
 coverUrls.forEach(u=>URL.revokeObjectURL(u));coverUrls=[];
 const shown=items.filter(g=>(filter==='all'||(filter==='favorites'?g.favorite:g.console===filter))&&g.name.toLowerCase().includes($('search').value.toLowerCase())).sort((a,b)=>b.created-a.created);
 $('counter').textContent=`${shown.length} ${shown.length===1?'jogo':'jogos'}`;$('library').replaceChildren();$('empty').hidden=shown.length>0;
 $('selectedTitle').textContent=shown.length?shown[0].name:'SELECIONE UM JOGO';
 if(!shown.length){$('empty').querySelector('h2').textContent=items.length?'Nenhum jogo encontrado.':'Sua próxima aventura começa aqui.';$('empty').querySelector('p').textContent=items.length?'Tente outra busca ou escolha outro console.':'Adicione uma ROM sua para começar a jogar. Formatos: .nes, .sfc, .smc, .gb, .gbc e .gba.'}
 for(const g of shown){
  const card=el('article','gamecard'),cover=el('div','cover');cover.dataset.console=g.console;cover.tabIndex=0;cover.setAttribute('role','button');cover.setAttribute('aria-label',`Jogar ${g.name}`);
  const art=el('div','boxart');
  if(g.cover){const u=URL.createObjectURL(g.cover);coverUrls.push(u);const img=el('img','cover-image');img.src=u;img.alt=`Capa de ${g.name}`;art.append(img)}
  else art.append(el('div','boxart-system',SYSTEMS[g.console]),el('div','boxart-name',g.name),el('div','boxart-symbol','★'),el('div','boxart-bottom','NESROOM · 8-BIT COLLECTION'));
  cover.append(art,el('span','play','▶ START'));
  const select=()=>{$('selectedTitle').textContent=g.name;document.querySelectorAll('.gamecard').forEach(c=>c.classList.remove('selected'));card.classList.add('selected')};
  cover.onclick=()=>launch(g);cover.onfocus=select;cover.onmouseenter=select;cover.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();launch(g)}};
  const fav=el('button','fav'+(g.favorite?' on':''),g.favorite?'♥':'♡');fav.title='Alternar favorito';fav.onclick=async()=>{g.favorite=!g.favorite;await putGame(g);render()};
  const bottom=el('div','cardbottom'),details=el('div');details.append(el('h3','',g.name),el('p','',SYSTEMS[g.console]));
  const del=el('button','delete','×');del.title='Remover jogo';del.onclick=async()=>{if(confirm(`Remover “${g.name}” da biblioteca deste navegador?`)){await removeGame(g.id);await refresh()}};
  bottom.append(details,del);card.append(cover,fav,bottom);$('library').append(card);
 }
 $('library').querySelector('.gamecard')?.classList.add('selected');
}
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(n=>n.classList.toggle('active',n===b));render()};$('search').oninput=render;
async function launch(g){try{if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl=URL.createObjectURL(g.rom);$('playingTitle').textContent=g.name;$('playingSystem').textContent=SYSTEMS[g.console];$('playerScreen').hidden=false;document.body.style.overflow='hidden';$('game').replaceChildren();window.EJS_player='#game';window.EJS_core=CORE[g.console];window.EJS_gameUrl=activeUrl;window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';window.EJS_startOnLoaded=true;window.EJS_color='#b5ff60';const s=document.createElement('script');s.src='https://cdn.emulatorjs.org/stable/data/loader.js';s.onerror=()=>alert('Não foi possível carregar o emulador. Verifique sua conexão com a internet.');$('game').append(s)}catch(e){alert('Não foi possível iniciar este jogo.');console.error(e)}}
$('exitPlayer').onclick=()=>{ // Reload releases EmulatorJS resources and avoids conflicting global instances.
 location.reload()
};
(async()=>{try{db=await openDb();await refresh()}catch(e){console.error(e);$('empty').querySelector('h2').textContent='Armazenamento indisponível';$('empty').querySelector('p').textContent='Habilite o armazenamento local do navegador para usar a biblioteca.';$('addBtn').disabled=true;$('emptyAdd').disabled=true}})();
