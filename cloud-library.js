/* NESROOM 3.3: private admin cloud library. No guest ROM access yet. */
const NESROOMCloud=(()=>{
 const BUCKET='nesroom-roms';let admin=false;
 const client=()=>NESROOMProfiles.getClient();
 async function isAdmin(){const c=client();if(!c||!NESROOMProfiles.getActive())return false;const {data,error}=await c.rpc('is_nesroom_admin');if(error)throw error;return data===true}
 async function list(){const c=client();if(!c)return [];const {data,error}=await c.from('games').select('id,title,console,rom_path,cover_path,created_at').order('created_at',{ascending:false});if(error)throw error;return (data||[]).map(g=>({id:'cloud:'+g.id,cloudId:g.id,name:g.title,console:g.console,romPath:g.rom_path,coverPath:g.cover_path,created:new Date(g.created_at).getTime()||0,cloud:true}))}
 async function upload(file,cover,title,console){if(!await isAdmin())throw Error('Apenas o administrador pode enviar jogos.');const c=client();const id=crypto.randomUUID(),ext=file.name.split('.').pop().toLowerCase(),path=`${id}/game.${ext}`;const {error:e}=await c.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:'application/octet-stream'});if(e)throw e;let coverPath=null;try{if(cover){const ce=cover.name.split('.').pop().toLowerCase();coverPath=`${id}/cover.${ce}`;const {error:ceErr}=await c.storage.from(BUCKET).upload(coverPath,cover,{upsert:false,contentType:cover.type});if(ceErr)throw ceErr}const {error:dbErr}=await c.from('games').insert({id,title,console,rom_path:path,cover_path:coverPath});if(dbErr)throw dbErr;return id}catch(err){await c.storage.from(BUCKET).remove([path,...(coverPath?[coverPath]:[])]);throw err}}
 async function remove(g){if(!await isAdmin())throw Error('Sem permissão.');const c=client();const {error:e}=await c.from('games').delete().eq('id',g.cloudId);if(e)throw e;const {error:se}=await c.storage.from(BUCKET).remove([g.romPath,...(g.coverPath?[g.coverPath]:[])]);if(se)console.warn('Arquivo órfão no Storage:',se)}
 async function getBlob(path){const {data,error}=await client().storage.from(BUCKET).download(path);if(error)throw error;return data}
 async function refreshPermissions(){try{admin=await isAdmin()}catch(e){console.warn(e);admin=false}document.getElementById('addBtn').hidden=!admin;document.getElementById('emptyAdd').hidden=!admin;return admin}
 return {list,upload,remove,getBlob,refreshPermissions,isAdmin:()=>admin};
})();
