/* router.js — carga vistas parciales (views/*.html) y cambia de pestaña */
'use strict';
const Router = {
  /* trae un parcial HTML y lo inyecta en un contenedor */
  async cargar(nombre, destinoSel) {
    const host = $(destinoSel);
    if (!host) return;
    if (host.dataset.loaded === nombre) return;
    const r = await fetch('views/' + nombre + '.html');
    host.innerHTML = await r.text();
    host.dataset.loaded = nombre;
  },
  TITULOS: {
    destinos: ['Destinos y Viajes',
      'Gestiona tus paquetes turísticos, guías, vuelos e itinerarios diarios'],
    contactos: ['Contactos y Pasajeros',
      'Agenda: pasajeros, guías, transportistas, aerolíneas, hoteles y servicios'],
    pasajeros: ['Control de Pasajeros',
      'Asignación de pasajeros a viajes y control de vuelos / check-in'],
    usuarios: ['Usuarios y Roles',
      'Cuentas de acceso, administradores y privilegios'],
    estadisticas: ['Resumen y Estadísticas',
      'Métricas generales del CRM y respaldo de datos'],
    perfil: ['Mi Perfil',
      'Tu cuenta, ajustes de la aplicación y estadísticas']
  },
  ON_TAB: {},
  async switchTab(tab) {
    const u = Session.get();
    /* pestañas restringidas */
    if (tab === 'usuarios' && !(u && (u.rol === 'superusuario' ||
        Session.can('usuarios.gestionar')))) {
      showToast('Sin permiso para gestionar usuarios', 'error'); return;
    }
    if (tab === 'estadisticas' && !(u && (u.rol === 'superusuario' ||
        Session.can('estadisticas.ver')))) {
      showToast('Sin permiso para ver estadísticas', 'error'); return;
    }
    await this.cargar(tab, '#tab-' + tab);
    $$('.tab-content').forEach(el => el.classList.remove('active'));
    const t = $('#tab-' + tab);
    if (t) t.classList.add('active');
    $$('.nav-link').forEach(el =>
      el.classList.toggle('active', el.dataset.tab === tab));
    $$('.mobile-nav-link').forEach(el =>
      el.classList.toggle('active', el.dataset.tab === tab));
    const tt = this.TITULOS[tab];
    if (tt) {
      const h = $('#topbar-title'), s = $('#topbar-subtitle');
      if (h) h.textContent = tt[0];
      if (s) s.textContent = tt[1];
    }
    (this.ON_TAB[tab] || (() => {}))();
  }
};
