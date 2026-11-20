/* contactos.js — CRUD del directorio (clientes, guías, transportistas, proveedores) */
'use strict';
const Contactos = {
  BADGE: { 'Guía': 'badge-brand', Transportista: 'badge-amber',
           'Aerolínea': 'badge-purple', 'Hotel': 'badge-purple',
           'Servicios / Otros': 'badge-slate' },
  _page: 0, _q: '', _POR: 10,
  async render() {
    const q = (($('#search-contactos') || {}).value || '').toLowerCase(),
          tf = ($('#filter-contacto-tipo') || {}).value || '',
          grid = $('#contactos-grid');
    if (!grid) return;
    if (q !== this._q) { this._q = q; this._page = 0; }
    const lista = (await DB.list('contactos')).filter(c =>
      (!tf || c.tipo === tf) &&
      (!q || ['nombre', 'tipo', 'telefono', 'codigo', 'email', 'notas'].some(k =>
        String(c[k] || '').toLowerCase().includes(q))))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    if (this._page * this._POR >= lista.length) this._page = 0;
    const pags = Math.ceil(lista.length / this._POR),
          page = lista.slice(this._page * this._POR, (this._page + 1) * this._POR),
          eP = Session.can('contactos.editar'),
          dP = Session.can('contactos.eliminar');
    grid.innerHTML = (lista.length
      ? page.map(c => this._card(c, eP, dP)).join('')
      : '<div class="empty-state"><i class="fa-solid fa-address-book"></i>' +
        '<p>No hay contactos.</p></div>') +
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
  _card(c, eP, dP) {
    return '<div class="it-acc"><div class="it-acc-head">' +
      '<button type="button" class="it-acc-btn" ' +
      'onclick="this.closest(\'.it-acc\').classList.toggle(\'open\')">' +
      '<span class="it-acc-t"><b>' + esc(c.nombre) + '</b> <span class="badge ' +
      (this.BADGE[c.tipo] || 'badge-slate') + '">' + esc(c.tipo) + '</span></span>' +
      '<span class="hint">' + esc((c.codigo || '') + (c.telefono || '')) +
      '</span><i class="fa-solid fa-chevron-down"></i></button></div>' +
      '<div class="it-acc-body">' +
      (c.telefono ? '<p><i class="fa-solid fa-phone"></i> <b>Tel:</b> ' +
        esc((c.codigo || '') + c.telefono) + '</p>' : '') +
      (c.email ? '<p><i class="fa-solid fa-envelope"></i> <b>Correo:</b> ' +
        esc(c.email) + '</p>' : '') +
      (c.notas ? '<p class="hint" style="background:var(--slate-50);padding:.5rem;' +
        'border-radius:var(--r-md);font-style:italic">' + esc(c.notas) + '</p>' : '') +
      '<div class="flex gap1" style="justify-content:flex-end">' +
      (c.telefono ? '<a class="btn btn-soft" target="_blank" style="color:#25D366" ' +
        'href="https://wa.me/' + String((c.codigo || '') + c.telefono).replace(/\D/g, '') +
        '"><i class="fa-brands fa-whatsapp"></i></a>' : '') +
      (eP ? '<button class="btn btn-soft" onclick="Contactos.editar(\'' + c.id +
        '\')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>' : '') +
      (dP ? '<button class="btn btn-soft" style="color:var(--rose-600)" ' +
        'onclick="Contactos.borrar(\'' + c.id +
        '\')"><i class="fa-solid fa-trash"></i></button>' : '') +
      '</div></div></div>';
  },
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
Router.ON_TAB.contactos = () => Contactos.render();
