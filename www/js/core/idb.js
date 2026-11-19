/* idb.js — persistencia web offline-first en IndexedDB (sin localStorage).
   Una objectStore por tabla; API espejo de sqlite.js para que db.js no
   distinga el motor. */
'use strict';
const IDB = {
  db: null,
  open(tablas) {
    return new Promise((res, rej) => {
      const req = indexedDB.open('latribu_db', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        tablas.forEach(t => {
          if (!d.objectStoreNames.contains(t)) {
            d.createObjectStore(t, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = () => { this.db = req.result; res(); };
      req.onerror = () => rej(req.error);
    });
  },
  _store(tabla, modo) {
    return this.db.transaction(tabla, modo).objectStore(tabla);
  },
  _p(req) {
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  },
  list(tabla) { return this._p(this._store(tabla, 'readonly').getAll()); },
  get(tabla, id) { return this._p(this._store(tabla, 'readonly').get(id)); },
  put(tabla, obj) {
    return this._p(this._store(tabla, 'readwrite').put(obj)).then(() => obj);
  },
  del(tabla, id) {
    return this._p(this._store(tabla, 'readwrite').delete(id));
  },
  clear(tabla) {
    return this._p(this._store(tabla, 'readwrite').clear());
  }
};
