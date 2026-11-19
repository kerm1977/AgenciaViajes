/* db.js — capa única de datos: SQLite nativo en APK, IndexedDB en web.
   Offline-first; todos los módulos hablan solo con DB.* */
'use strict';
const DB = {
  TABLAS: ['usuarios', 'contactos', 'destinos', 'pasajeros'],
  JSON_FIELDS: { usuarios: ['permisos'],
                 destinos: ['itinerario', 'destinos', 'boleto', 'trans'] },
  SCHEMA: {
    usuarios: 'CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY,' +
      ' nombre TEXT, email TEXT UNIQUE, pass TEXT, rol TEXT,' +
      ' permisos TEXT, activo INTEGER, creado TEXT)',
    contactos: 'CREATE TABLE IF NOT EXISTS contactos (id TEXT PRIMARY KEY,' +
      ' nombre TEXT, tipo TEXT, codigo TEXT, telefono TEXT,' +
      ' email TEXT, notas TEXT)',
    destinos: 'CREATE TABLE IF NOT EXISTS destinos (id TEXT PRIMARY KEY,' +
      ' nombre TEXT, pais TEXT, destinos TEXT,' +
      ' paxConGuia INTEGER, paxSinGuia INTEGER, moneda TEXT, imagen TEXT, guia TEXT,' +
      ' transporte TEXT, aerolinea TEXT, vuelo TEXT, checkin TEXT,' +
      ' checkout TEXT, boleto TEXT, trans TEXT,' +
      ' notas TEXT, itinerario TEXT)',
    pasajeros: 'CREATE TABLE IF NOT EXISTS pasajeros (id TEXT PRIMARY KEY,' +
      ' nombre TEXT, codigo TEXT, telefono TEXT, email TEXT,' +
      ' destinoId TEXT, asiento TEXT, checkin TEXT)'
  },
  /* columnas añadidas después del esquema inicial — migración ALTER */
  MIGRACIONES: {
    destinos: ['pais TEXT', 'destinos TEXT',
               'paxConGuia INTEGER', 'paxSinGuia INTEGER', 'moneda TEXT',
               'checkout TEXT', 'boleto TEXT', 'trans TEXT']
  },
  mot: null,
  async init() {
    this.mot = esNativo() ? SqliteDB : IDB;
    await this.mot.open(esNativo() ? this.SCHEMA : this.TABLAS);
    if (esNativo()) await this._migrar();
    await this.semilla();
  },
  /* ALTER TABLE idempotente: agrega columnas faltantes en DBs ya creadas */
  async _migrar() {
    for (const t in this.MIGRACIONES) {
      try {
        const r = await SqliteDB.S.query({ database: SqliteDB.NOMBRE,
          readonly: false, statement: 'PRAGMA table_info(' + t + ')',
          values: [] });
        const cols = (r.values || []).map(c => c.name);
        for (const col of this.MIGRACIONES[t]) {
          const nombre = col.split(' ')[0];
          if (cols.includes(nombre)) continue;
          await SqliteDB.S.execute({ database: SqliteDB.NOMBRE,
            statements: 'ALTER TABLE ' + t + ' ADD COLUMN ' + col + ';' });
        }
      } catch (e) { console.warn('migración ' + t, e); }
    }
  },
  _pack(tabla, o) {
    const out = Object.assign({}, o);
    (this.JSON_FIELDS[tabla] || []).forEach(f => {
      if (Array.isArray(out[f])) out[f] = JSON.stringify(out[f]);
    });
    return out;
  },
  _unpack(tabla, r) {
    if (!r) return r;
    (this.JSON_FIELDS[tabla] || []).forEach(f => {
      if (typeof r[f] === 'string') {
        try { r[f] = JSON.parse(r[f] || '[]'); } catch (e) { r[f] = []; }
      }
    });
    return r;
  },
  async list(t) {
    return (await this.mot.list(t)).map(r => this._unpack(t, r));
  },
  async get(t, id) {
    return this._unpack(t, await this.mot.get(t, id));
  },
  async save(t, obj) {
    if (!obj.id) obj.id = uid(t.slice(0, 4));
    return this.mot.put(t, this._pack(t, obj)).then(() => obj);
  },
  async remove(t, id) { return this.mot.del(t, id); },
  async exportAll() {
    const out = {};
    for (const t of this.TABLAS) out[t] = await this.list(t);
    return out;
  },
  async importAll(json) {
    for (const t of this.TABLAS) {
      if (!Array.isArray(json[t])) continue;
      await this.mot.clear(t);
      for (const row of json[t]) await this.mot.put(t, this._pack(t, row));
    }
  },
  async usuarioPorEmail(email) {
    const us = await this.list('usuarios');
    return us.find(u => u.email === String(email).toLowerCase());
  },
  /* superusuarios fijos: se crean si faltan, nunca se tocan si existen */
  async semilla() {
    const SUP = [
      ['kenth1977@gmail.com', 'CR129x7848n', 'Kenneth'],
      ['lthikingcr@gmail.com', 'LaTribu1977', 'La Tribu Hiking CR']
    ];
    for (const [email, pass, nombre] of SUP) {
      if (await this.usuarioPorEmail(email)) continue;
      await this.mot.put('usuarios', {
        id: uid('usr'), nombre, email,
        pass: await sha256('tm|' + email + '|' + pass),
        rol: 'superusuario', permisos: '[]', activo: 1,
        creado: new Date().toISOString()
      });
    }
  },
  async validarLogin(email, pass) {
    const u = await this.usuarioPorEmail(email);
    if (!u || u.activo === 0) return null;
    const h = await sha256('tm|' + u.email + '|' + pass);
    return h === u.pass ? u : null;
  },
  async hashPass(email, pass) {
    return sha256('tm|' + String(email).toLowerCase() + '|' + pass);
  }
};
