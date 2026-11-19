/* session.js — sesión en sessionStorage (nada en localStorage salvo OTA) */
'use strict';
const Session = {
  KEY: 'tm_session',
  user: null,
  set(u) {
    this.user = u ? { id: u.id, nombre: u.nombre, email: u.email,
                      rol: u.rol, permisos: u.permisos || [] } : null;
    try {
      if (u) sessionStorage.setItem(this.KEY, JSON.stringify(this.user));
      else sessionStorage.removeItem(this.KEY);
    } catch (e) {}
  },
  load() {
    try {
      const s = sessionStorage.getItem(this.KEY);
      this.user = s ? JSON.parse(s) : null;
    } catch (e) { this.user = null; }
    return this.user;
  },
  get() { return this.user; },
  esSuper() { return this.user && this.user.rol === 'superusuario'; },
  esAdmin() { return this.user && this.user.rol === 'admin'; },
  /* ¿puede hacer la acción? super = todo; admin = según privilegios */
  can(perm) {
    const u = this.user;
    if (!u) return false;
    if (u.rol === 'superusuario') return true;
    if (u.rol === 'admin') return (u.permisos || []).indexOf(perm) >= 0;
    return false;
  },
  logout() { this.set(null); location.reload(); }
};

/* catálogo de privilegios asignables a un administrador */
const PERMISOS = [
  { k: 'destinos.crear',    g: 'Destinos',   t: 'Crear destinos/viajes' },
  { k: 'destinos.editar',   g: 'Destinos',   t: 'Editar destinos/viajes' },
  { k: 'destinos.eliminar', g: 'Destinos',   t: 'Eliminar destinos' },
  { k: 'contactos.crear',    g: 'Contactos',  t: 'Agregar contactos' },
  { k: 'contactos.editar',   g: 'Contactos',  t: 'Editar contactos' },
  { k: 'contactos.eliminar', g: 'Contactos',  t: 'Eliminar contactos' },
  { k: 'pasajeros.crear',    g: 'Pasajeros',  t: 'Agregar pasajeros' },
  { k: 'pasajeros.editar',   g: 'Pasajeros',  t: 'Editar pasajeros' },
  { k: 'pasajeros.eliminar', g: 'Pasajeros',  t: 'Eliminar pasajeros' },
  { k: 'usuarios.gestionar', g: 'Usuarios',   t: 'Crear/editar usuarios' },
  { k: 'estadisticas.ver',   g: 'Reportes',   t: 'Ver estadísticas' },
  { k: 'exportar',           g: 'Reportes',   t: 'Exportar datos (PDF/TXT/JSON/WA)' },
  { k: 'importar',           g: 'Reportes',   t: 'Importar respaldos' }
];
