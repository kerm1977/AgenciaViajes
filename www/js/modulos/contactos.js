/* contactos.js — agenda unificada: pasajeros + directorio
   (guías, transportistas, aerolíneas, hoteles, servicios) */
'use strict';
const Contactos = {
  BADGE: { Pasajero: 'badge-brand', 'Guía': 'badge-purple',
           Transportista: 'badge-amber', 'Aerolínea': 'badge-amber',
           'Hotel': 'badge-purple', 'Servicios / Otros': 'badge-slate' },
  _page: 0, _q: '', _POR: 10,
  async render() {
    const q = (($('#search-contactos') || {}).value || '').toLowerCase(),
          tf = ($('#filter-contacto-tipo') || {}).value || '',
          grid = $('#contactos-grid');
    if (!grid) return;
    if (q !== this._q) { this._q = q; this._page = 0; }
    const [cs, ps, ds] = await Promise.all([
      DB.list('contactos'), DB.list('pasajeros'), DB.list('destinos')]);
    const viaje = id => { const d = ds.find(x => x.id === id);
      return d ? d.nombre : ''; };
    const lista = cs.map(c => Object.assign({ _k: 'c' }, c))
      .concat(ps.map(p => Object.assign({ _k: 'p', tipo: 'Pasajero' }, p)))
      .filter(c => (!tf || c.tipo === tf) &&
        (!q || ['nombre', 'tipo', 'telefono', 'codigo', 'email', 'notas',
          'pasaporte'].some(k =>
            String(c[k] || '').toLowerCase().includes(q)) ||
          (c._k === 'p' && viaje(c.destinoId).toLowerCase().includes(q))))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    if (this._page * this._POR >= lista.length) this._page = 0;
    const pags = Math.ceil(lista.length / this._POR),
          page = lista.slice(this._page * this._POR, (this._page + 1) * this._POR),
          eP = Session.can('contactos.editar') || Session.can('pasajeros.editar'),
          dP = Session.can('contactos.eliminar') || Session.can('pasajeros.eliminar');
    grid.innerHTML = (lista.length
      ? page.map(c => this._card(c, eP, dP, viaje)).join('')
      : '<div class="empty-state"><i class="fa-solid fa-address-book"></i>' +
        '<p>No hay contactos ni pasajeros.</p></div>') +
      (pags > 1 ? '<div class="flex gap1" style="justify-content:center;' +
        'align-items:center;padding:.4rem 0"><button class="iconbtn" ' +
        (this._page < 1 ? 'disabled ' : '') +
        'onclick="Contactos.pg(-1)"><i class="fa-solid fa-chevron-left">' +
        '</i></button><span class="hint">' + (this._page + 1) + ' / ' +
        pags + '</span><button class="iconbtn" ' +
        (this._page >= pags - 1 ? 'disabled ' : '') +
        'onclick="Contactos.pg(1)"><i class="fa-solid fa-chevron-right">' +
        '</i></button></div>' : '');
  },
  pg(d) { this._page = Math.max(0, this._page + d); this.render(); },
  _card(c, eP, dP, viaje) {
    const f = (ic, lb, v) => v ? '<p><i class="fa-solid ' + ic + '"></i> <b>' +
          lb + ':</b> ' + esc(v) + '</p>' : '',
      acc = '<span class="it-acc-t"><b>' + esc(c.nombre) +
        '</b> <span class="badge ' + (this.BADGE[c.tipo] || 'badge-slate') +
        '">' + esc(c.tipo) + '</span></span>',
      head = '<div class="it-acc-head"><button type="button" class="it-acc-btn" ' +
        'onclick="this.closest(\'.it-acc\').classList.toggle(\'open\')">' + acc +
        '<span class="hint">' + esc((c.codigo || '') + (c.telefono || '')) +
        '</span><i class="fa-solid fa-chevron-down"></i></button></div>',
      wa = c.telefono ? '<a class="btn btn-soft" target="_blank" ' +
        'style="color:#25D366" href="https://wa.me/' +
        String((c.codigo || '') + c.telefono).replace(/\D/g, '') +
        '"><i class="fa-brands fa-whatsapp"></i></a>' : '',
      esPax = c._k === 'p',
      acts = '<div class="flex gap1" style="justify-content:flex-end">' + wa +
        (eP ? '<button class="btn btn-soft" onclick="Contactos.' +
          (esPax ? 'paxEdit' : 'editar') + '(\'' + c.id +
          '\')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>' : '') +
        (dP ? '<button class="btn btn-soft" style="color:var(--rose-600)" ' +
          'onclick="Contactos.' + (esPax ? 'paxDel' : 'borrar') + '(\'' + c.id +
          '\')"><i class="fa-solid fa-trash"></i></button>' : '') + '</div>',
      filas = f('fa-id-card', 'Cédula', c.cedula) +
        f('fa-passport', 'Pasaporte', c.pasaporte) +
        f('fa-cake-candles', 'Nacimiento', c.nacimiento) +
        f('fa-droplet', 'Sangre', c.sangre) + f('fa-users', 'Grupo', c.grupo) +
        f('fa-flag', 'País', c.pais) + f('fa-location-dot', 'Lugar', c.lugar) +
        f('fa-phone', 'Fijo', c.fijo) + f('fa-phone', 'Tel 2', c.tel2) +
        f('fa-phone', 'Tel 3', c.tel3) + f('fa-envelope', 'Correo', c.email) +
        f('fa-triangle-exclamation', 'Emergencia',
          [c.emNombre, c.emTel].filter(Boolean).join(' · ')) +
        f('fa-user-clock', 'Contacto',
          [c.cnombre, c.ctel].filter(Boolean).join(' · ')) +
        f('fa-clock', 'Horario', c.horario) +
        f('fa-note-sticky', 'Notas', c.notas) +
        (c.urlmapa ? '<p><a href="' + esc(c.urlmapa) + '" target="_blank" ' +
          'style="color:var(--brand-600)"><i class="fa-solid fa-map"></i> ' +
          'Mapa</a></p>' : '');
    return '<div class="it-acc">' + head + '<div class="it-acc-body">' +
      filas +
      (esPax && c.destinoId ? f('fa-plane', 'Viaje', viaje(c.destinoId)) : '') +
      (esPax && c.asiento ? f('fa-chair', 'Asiento', c.asiento) : '') +
      (esPax && c.checkin ? '<p><span class="badge ' +
        (c.checkin === 'Realizado' ? 'badge-brand' : 'badge-amber') + '">' +
        esc(c.checkin) + '</span></p>' : '') +
      (esPax && c.checkinUrl ? '<p><a href="' + esc(c.checkinUrl) +
        '" target="_blank" style="color:var(--brand-600)">' +
        '<i class="fa-solid fa-arrow-up-right-from-square"></i> ' +
        'Enlace check-in</a></p>' : '') +
      acts + '</div></div>';
  },
  /* pasajeros dentro de la agenda (la ficha completa vive en la vista) */
  async paxEdit(id) {
    await Router.cargar('pasajeros', '#tab-pasajeros');
    Pasajeros.editar(id); },
  async paxNuevo() {
    await Router.cargar('pasajeros', '#tab-pasajeros');
    Pasajeros.nuevo(); },
  async paxDel(id) { await Pasajeros.borrar(id); this.render(); },
  /* alta/edición usa el formulario completo de pasajeros (pide el tipo) */
  async nuevo() {
    await Router.cargar('pasajeros', '#tab-pasajeros');
    Pasajeros.nuevo(); },
  async editar(id) {
    await Router.cargar('pasajeros', '#tab-pasajeros');
    Pasajeros.editar(id, 'contactos'); },
  async borrar(id) {
    if (!Session.can('contactos.eliminar')) {
      showToast('Sin permiso para eliminar contactos', 'error'); return;
    }
    if (await confirmar('¿Eliminar este contacto del directorio?')) {
      await DB.remove('contactos', id);
      showToast('Contacto eliminado', 'error');
      this.render();
    }
  }
};
Router.ON_TAB.contactos = () => {
  Contactos.render();
  Router.cargar('pasajeros', '#tab-pasajeros');
};
