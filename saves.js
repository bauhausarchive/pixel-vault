
'use strict';

/* NESROOM Saves v1
   Save States locais, separados por perfil e jogo.
   Nao altera saves internos do EmulatorJS.
*/

window.NESROOMSaves = (() => {
  const DB_NAME = 'nesroom-player-saves';
  const STORE = 'states';

  let currentKey = null;
  let busy = false;

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function accessDb(mode, action) {
    const db = await openDb();

    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = action(tx.objectStore(STORE));

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  function manager() {
    const gm = window.EJS_emulator?.gameManager;

    if (!gm || typeof gm.getState !== 'function' ||
        typeof gm.loadState !== 'function') {
      throw new Error(
        'O emulador ainda nao esta pronto. Aguarde o jogo iniciar.'
      );
    }

    return gm;
  }

  function status(message) {
    const element = document.getElementById('nesroomSaveStatus');

    if (element) {
      element.textContent = message;
    }
  }

  async function save() {
    if (busy || !currentKey) return;

    busy = true;
    status('Salvando progresso...');

    try {
      const data = await manager().getState();

      if (!(data instanceof Uint8Array) || !data.length) {
        throw new Error('O emulador nao retornou um estado valido.');
      }

      await accessDb('readwrite', store =>
        store.put({
          data: new Uint8Array(data),
          savedAt: Date.now()
        }, currentKey)
      );

      status('Progresso salvo neste navegador!');
    } catch (error) {
      console.error('NESROOM save:', error);
      status('Erro ao salvar: ' + error.message);
    } finally {
      busy = false;
    }
  }

  async function load() {
    if (busy || !currentKey) return;

    busy = true;
    status('Procurando progresso salvo...');

    try {
      const saved = await accessDb(
        'readonly',
        store => store.get(currentKey)
      );

      if (!saved?.data) {
        status('Nenhum progresso salvo para este jogo e jogador.');
        return;
      }

      if (!confirm(
        'Continuar do ultimo progresso salvo? ' +
        'O estado atual do jogo sera substituido.'
      )) {
        status('Carregamento cancelado.');
        return;
      }

      await manager().loadState(saved.data);
      status('Progresso restaurado!');
    } catch (error) {
      console.error('NESROOM load:', error);
      status('Erro ao carregar: ' + error.message);
    } finally {
      busy = false;
    }
  }

  function attach({ gameId, profileId }) {
    if (!gameId || !profileId) {
      console.warn('NESROOM Saves: jogo ou perfil ausente.');
      return;
    }

    currentKey = JSON.stringify([profileId, gameId]);

    document.getElementById('nesroomSaveControls')?.remove();

    const container = document.createElement('div');
    container.id = 'nesroomSaveControls';
    container.style.cssText =
      'display:flex;gap:10px;align-items:center;' +
      'flex-wrap:wrap;margin:12px 0;';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'secondary';
    saveButton.textContent = '💾 SALVAR PROGRESSO';
    saveButton.onclick = save;

    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'secondary';
    loadButton.textContent = '▶ CONTINUAR JOGO';
    loadButton.onclick = load;

    const message = document.createElement('span');
    message.id = 'nesroomSaveStatus';
    message.style.cssText =
      'font-size:12px;color:#ddd;';
    message.setAttribute('role', 'status');
    message.textContent = 'Salvamento local disponivel.';

    container.append(saveButton, loadButton, message);

    const frame = document.querySelector('.playerFrame');

    if (frame) {
      frame.before(container);
    }
  }

  return { attach, save, load };
})();
