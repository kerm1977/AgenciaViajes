/* sqlite.js — SQLite nativo vía @capacitor-community/sqlite (solo APK).
   API espejo de idb.js: list/get/put/del/clear.
   Usa la API directa del plugin (métodos con {database,...}). */
'use strict';
const SqliteDB = {
  NOMBRE: 'latribu',
  S: null,
  _opt() { return { database: this.NOMBRE, readonly: false }; },
  async open(schemaSql) {
    const S = this.S = plugin('CapacitorSQLite');
    if (!S) throw new Error('CapacitorSQLite no disponible');
    let abierta = false;
    try {
      const r = await S.isDBOpen(this._opt());
      abierta = !!(r && r.result);
    } catch (e) { abierta = false; }
    if (!abierta) {
      try {
        await S.createConnection({
          database: this.NOMBRE, encrypted: false,
          mode: 'no-encryption', version: 1, readonly: false
        });
      } catch (e) { /* ya existe la conexion: seguimos */ }
      await S.open(this._opt());
    }
    for (const t in schemaSql) {
      await S.execute({ database: this.NOMBRE,
                        statements: schemaSql[t] + ';' });
    }
  },
  async list(tabla) {
    const r = await this.S.query({ database: this.NOMBRE, readonly: false,
      statement: 'SELECT * FROM ' + tabla, values: [] });
    return r.values || [];
  },
  async get(tabla, id) {
    const r = await this.S.query({ database: this.NOMBRE, readonly: false,
      statement: 'SELECT * FROM ' + tabla + ' WHERE id = ?', values: [id] });
    return (r.values || [])[0];
  },
  async put(tabla, obj) {
    const ks = Object.keys(obj);
    const sql = 'INSERT OR REPLACE INTO ' + tabla + ' (' + ks.join(',') +
      ') VALUES (' + ks.map(() => '?').join(',') + ')';
    await this.S.run({ database: this.NOMBRE, readonly: false,
      statement: sql,
      values: ks.map(k => obj[k] == null ? null : obj[k]) });
    return obj;
  },
  async del(tabla, id) {
    await this.S.run({ database: this.NOMBRE, readonly: false,
      statement: 'DELETE FROM ' + tabla + ' WHERE id = ?', values: [id] });
  },
  async clear(tabla) {
    await this.S.run({ database: this.NOMBRE, readonly: false,
      statement: 'DELETE FROM ' + tabla, values: [] });
  },
  /* exportar el archivo .sqlite crudo (Filesystem → compartir) */
  async rutaArchivo() {
    const FS = plugin('Filesystem');
    const r = await FS.getUri({ path: 'databases/' + this.NOMBRE + 'SQLite.db',
                                directory: 'DATA' }).catch(() => null);
    return r && r.uri;
  }
};
