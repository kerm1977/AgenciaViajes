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
    const acc = '<span class="it-acc-t"><b>' + esc(c.nombre) +
      '</b> <span class="badge ' + (this.BADGE[c.tipo] || 'badge-slate') +
      '">' + esc(c.tipo) + '</span></span>';
    const head = '<div class="it-acc-head"><button type="button" class="it-acc-btn" ' +
      'onclick="this.closest(\'.it-acc\').classList.toggle(\'open\')">' + acc +
      '<span class="hint">' + esc((c.codigo || '') + (c.telefono || '')) +
      '</span><i class="fa-solid fa-chevron-down"></i></button></div>';
    const wa = c.telefono ? '<a class="btn btn-soft" target="_blank" ' +
      'style="color:#25D366" href="https://wa.me/' +
      String((c.codigo || '') + c.telefono).replace(/\D/g, '') +
      '"><i class="fa-brands fa-whatsapp"></i></a>' : '';
    if (c._k === 'p')
      return '<div class="it-acc">' + head + '<div class="it-acc-body">' +
        (c.telefono ? '<p><i class="fa-solid fa-phone"></i> <b>Tel:</b> ' +
          esc((c.codigo || '') + c.telefono) + '</p>' : '') +
        (c.pasaporte ? '<p><i class="fa-solid fa-id-card"></i> <b>Pasaporte:</b> ' +
          esc(c.pasaporte) + '</p>' : '') +
        (c.destinoId ? '<p><i class="fa-solid fa-map-location-dot"></i> ' +
          '<b>Viaje:</b> ' + esc(viaje(c.destinoId)) + '</p>' : '') +
        (c.checkin ? '<p><i class="fa-solid fa-square-check"></i> ' +
          '<b>Check-in:</b> ' + esc(c.checkin) + '</p>' : '') +
        '<div class="flex gap1" style="justify-content:flex-end">' + wa +
        (eP ? '<button class="btn btn-soft" onclick="Contactos.paxEdit(\'' +
          c.id + '\')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>' : '') +
        (dP ? '<button class="btn btn-soft" style="color:var(--rose-600)" ' +
          'onclick="Contactos.paxDel(\'' + c.id +
          '\')"><i class="fa-solid fa-trash"></i></button>' : '') +
        '</div></div></div>';
    return '<div class="it-acc">' + head + '<div class="it-acc-body">' +
      (c.telefono ? '<p><i class="fa-solid fa-phone"></i> <b>Tel:</b> ' +
        esc((c.codigo || '') + c.telefono) + '</p>' : '') +
      (c.email ? '<p><i class="fa-solid fa-envelope"></i> <b>Correo:</b> ' +
        esc(c.email) + '</p>' : '') +
      (c.notas ? '<p class="hint" style="background:var(--slate-50);padding:.5rem;' +
        'border-radius:var(--r-md);font-style:italic">' + esc(c.notas) + '</p>' : '') +
      '<div class="flex gap1" style="justify-content:flex-end">' + wa +
      (eP ? '<button class="btn btn-soft" onclick="Contactos.editar(\'' + c.id +
        '\')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>' : '') +
      (dP ? '<button class="btn btn-soft" style="color:var(--rose-600)" ' +
        'onclick="Contactos.borrar(\'' + c.id +
        '\')"><i class="fa-solid fa-trash"></i></button>' : '') +
      '</div></div></div>';
  },
  /* pasajeros dentro de la agenda (la ficha completa vive en la vista) */
  async paxEdit(id) {
    await Router.cargar('pasajeros', '#tab-pasajeros');
    Pasajeros.editar(id); },
  async paxNuevo() {
    await Router.cargar('pasajeros', '#tab-pasajeros');
    Pasajeros.nuevo(); },
  async paxDel(id) { await Pasajeros.borrar(id); this.render(); },
  nuevo() {
    if (!Session.can('contactos.crear')) {
      showToast('Sin permiso para agregar contactos', 'error'); return;
    }
    $('#form-contacto').reset(); $('#contacto-id').value = '';
    llenarCodigos($('#cont-codigo'));
    $('#modal-contacto-title').textContent = 'Registrar Contacto';
    openModal('modal-contacto');
  },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-contacto'))) return;
    const id = $('#contacto-id').value;
    await DB.save('contactos', {
      id: id || undefined,
      nombre: V.titleCase($('#cont-nombre').value),
      tipo: $('#cont-tipo').value,
      codigo: $('#cont-codigo').value,
      telefono: V.telNorm($('#cont-telefono').value),
      email: V.emailNorm($('#cont-email').value),
      notas: $('#cont-notas').value.trim()
    });
    closeModal('modal-contacto');
    showToast(id ? 'Contacto actualizado' : 'Contacto registrado');
    this.render();
    if ($('#modal-paxpick') && $('#modal-paxpick').classList.contains('open'))
      Destinos.paxPickRender();
  },
  async editar(id) {
    if (!Session.can('contactos.editar')) return;
    const c = await DB.get('contactos', id);
    if (!c) return;
    $('#contacto-id').value = c.id;
    $('#cont-nombre').value = c.nombre;
    $('#cont-tipo').value = c.tipo;
    llenarCodigos($('#cont-codigo'), c.codigo);
    $('#cont-telefono').value = c.telefono || '';
    $('#cont-email').value = c.email || '';
    $('#cont-notas').value = c.notas || '';
    $('#modal-contacto-title').textContent = 'Editar Contacto';
    openModal('modal-contacto');
  },
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
