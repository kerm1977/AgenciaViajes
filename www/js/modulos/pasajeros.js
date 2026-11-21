/* pasajeros.js — asignación de pasajeros a viajes + check-in */
'use strict';
const PAXF = ['grupo', 'pais', 'lugar', 'cedula', 'pasaporte', 'nacimiento', 'sangre',
  'fijo', 'tel2', 'tel3', 'email', 'emNombre', 'emTel', 'cnombre', 'ctel', 'urlmapa', 'horario', 'notas'];
const Pasajeros = {
  _page: 0, _q: '', _POR: 10,
  async render() {
    const q = (($('#search-pasajeros') || {}).value || '').toLowerCase(),
          box = $('#pax-acc-list');
    if (!box) return;
    if (q !== this._q) { this._q = q; this._page = 0; }
    const dest = await DB.list('destinos'),
          ALL = PAXF.concat(['nombre', 'ap1', 'ap2', 'telefono', 'codigo',
            'destinoId', 'asiento', 'checkin', 'checkinUrl', 'contactoId']),
          lista = (await DB.list('pasajeros')).filter(p => {
            const d = dest.find(x => x.id === p.destinoId);
            return !q || ALL.some(k => k === 'destinoId'
              ? (d && d.nombre.toLowerCase().includes(q))
              : String(p[k] || '').toLowerCase().includes(q));
          }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    if (this._page * this._POR >= lista.length) this._page = 0;
    const pags = Math.ceil(lista.length / this._POR),
          page = lista.slice(this._page * this._POR,
            (this._page + 1) * this._POR),
          eP = Session.can('pasajeros.editar'),
          dP = Session.can('pasajeros.eliminar');
    box.innerHTML = (lista.length
      ? page.map(p => this._card(p, dest, eP, dP)).join('')
      : '<div class="empty-state"><i class="fa-solid fa-users"></i>' +
        '<p>Sin pasajeros registrados.</p></div>') +
      (pags > 1 ? '<div class="flex gap1" style="justify-content:center;' +
        'align-items:center;padding:.4rem 0"><button class="iconbtn" ' +
        (this._page < 1 ? 'disabled ' : '') +
        'onclick="Pasajeros.pg(-1)"><i class="fa-solid fa-chevron-left">' +
        '</i></button><span class="hint">' + (this._page + 1) + ' / ' +
        pags + '</span><button class="iconbtn" ' +
        (this._page >= pags - 1 ? 'disabled ' : '') +
        'onclick="Pasajeros.pg(1)"><i class="fa-solid fa-chevron-right">' +
        '</i></button></div>' : '');
  },
  pg(d) { this._page = Math.max(0, this._page + d); this.render(); },
  _card(p, dest, eP, dP) {
    const d = dest.find(x => x.id === p.destinoId),
          f = (ic, lb, v) => v ? '<p><i class="fa-solid ' + ic + '"></i> <b>' +
            lb + ':</b> ' + esc(v) + '</p>' : '';
    return '<div class="it-acc"><div class="it-acc-head">' +
      '<button type="button" class="it-acc-btn" ' +
      'onclick="this.closest(\'.it-acc\').classList.toggle(\'open\')">' +
      '<span class="it-acc-t"><b>' + esc(p.nombre || '') + '</b></span>' +
      '<span class="hint">' + esc((p.codigo || '') + (p.telefono || '')) +
      '</span><i class="fa-solid fa-chevron-down"></i></button></div>' +
      '<div class="it-acc-body">' +
      f('fa-id-card', 'Cédula', p.cedula) + f('fa-passport', 'Pasaporte', p.pasaporte) +
      f('fa-cake-candles', 'Nacimiento', p.nacimiento) + f('fa-droplet', 'Sangre', p.sangre) +
      f('fa-users', 'Grupo', p.grupo) + f('fa-flag', 'País', p.pais) + f('fa-location-dot', 'Lugar', p.lugar) +
      f('fa-phone', 'Fijo', p.fijo) + f('fa-phone', 'Tel 2', p.tel2) +
      f('fa-phone', 'Tel 3', p.tel3) + f('fa-envelope', 'Correo', p.email) +
      f('fa-triangle-exclamation', 'Emergencia', [p.emNombre, p.emTel].filter(Boolean).join(' · ')) +
      f('fa-plane', 'Viaje', d ? d.nombre : '') + f('fa-chair', 'Asiento', p.asiento) +
      f('fa-user-clock', 'Contacto', [p.cnombre, p.ctel].filter(Boolean).join(' · ')) +
      f('fa-clock', 'Horario', p.horario) + f('fa-note-sticky', 'Notas', p.notas) +
      (p.checkin ? '<p><span class="badge ' + (p.checkin === 'Realizado' ? 'badge-brand' : 'badge-amber') + '">' + p.checkin + '</span></p>' : '') +
      (p.checkinUrl ? '<p><a href="' + esc(p.checkinUrl) + '" target="_blank" style="color:var(--brand-600)"><i class="fa-solid fa-arrow-up-right-from-square"></i> Enlace check-in</a></p>' : '') +
      (p.urlmapa ? '<p><a href="' + esc(p.urlmapa) + '" target="_blank" style="color:var(--brand-600)"><i class="fa-solid fa-map"></i> Mapa</a></p>' : '') +
      '<div class="flex gap1" style="justify-content:flex-end">' +
      (p.telefono ? '<a class="btn btn-soft" target="_blank" style="color:#25D366" ' +
        'href="https://wa.me/' + String((p.codigo || '') + p.telefono).replace(/\D/g, '') +
        '"><i class="fa-brands fa-whatsapp"></i></a>' : '') +
      (eP ? '<button class="btn btn-soft" onclick="Pasajeros.editar(\'' + p.id +
        '\')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>' : '') +
      (dP ? '<button class="btn btn-soft" style="color:var(--rose-600)" ' +
        'onclick="Pasajeros.borrar(\'' + p.id +
        '\')"><i class="fa-solid fa-trash"></i></button>' : '') +
      '</div></div></div>';
  },
  async _fillDestinos() {
    const sel = $('#pax-destino');
    sel.innerHTML = '<option value="">Asignar viaje…</option>';
    const ds = await DB.list('destinos');
    ds.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id; o.textContent = d.nombre; sel.appendChild(o);
    });
    sel.value = '';
  },
  _edTabla: '',
  async nuevo(tipo) {
    if (!Session.can('pasajeros.crear') && !Session.can('contactos.crear')) {
      showToast('Sin permiso para agregar', 'error'); return;
    }
    this._edTabla = '';
    $('#form-pasajero').reset(); $('#pasajero-id').value = '';
    const w = $('#pax-wa'); if (w) w.style.display = 'none';
    llenarCodigos($('#pax-codigo'));
    await this._fillDestinos();
    $('#pax-tipo').value = tipo || 'Pasajero';
    this.tTipo();
    openModal('modal-pasajero');
  },
  /* alterna campos propios de pasajero (viaje/asiento/check-in) según tipo */
  tTipo() {
    const esP = $('#pax-tipo').value === 'Pasajero',
          solo = $('#pax-solo'), sd = $('#pax-destino');
    if (solo) solo.style.display = esP ? '' : 'none';
    if (sd) { if (esP) sd.dataset.reglas = 'requerido';
      else delete sd.dataset.reglas; }
    $('#modal-pasajero-title').textContent =
      (($('#pasajero-id').value ? 'Editar ' : 'Nuevo ') +
       (esP ? 'Pasajero' : 'Contacto — ' + $('#pax-tipo').value));
  },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-pasajero'))) return;
    const id = $('#pasajero-id').value,
          tipo = $('#pax-tipo').value,
          tabla = tipo === 'Pasajero' ? 'pasajeros' : 'contactos',
          o = {
      id: id || undefined,
      nombre: V.titleCase(($('#pax-nombre').value + ' ' +
        $('#pax-ap1').value + ' ' + $('#pax-ap2').value).trim()),
      ap1: V.titleCase($('#pax-ap1').value),
      ap2: V.titleCase($('#pax-ap2').value),
      codigo: $('#pax-codigo').value,
      telefono: V.telNorm($('#pax-telefono').value) };
    PAXF.forEach(k => { const el = $('#pax-' + k);
      if (el) o[k] = el.value.trim(); });
    o.pasaporte = (o.pasaporte || '').toUpperCase();
    o.email = V.emailNorm(o.email || '');
    if (tipo === 'Pasajero') {
      o.destinoId = $('#pax-destino').value;
      o.checkin = $('#pax-checkin-estado').value;
      o.checkinUrl = $('#pax-checkin-url').value.trim();
      o.asiento = ($('#pax-asiento').value || '').trim().toUpperCase();
    } else o.tipo = tipo;
    await DB.save(tabla, o);
    const ot = this._edTabla || 'pasajeros';
    if (id && ot !== tabla) await DB.remove(ot, id);
    this._edTabla = '';
    closeModal('modal-pasajero');
    showToast(id ? 'Registro actualizado' : 'Registro agregado');
    this.render();
    if (window.Contactos) Contactos.render();
    const mp = $('#modal-paxpick');
    if (mp && mp.classList.contains('open')) Destinos.paxPickRender();
  },
  async editar(id, tabla) {
    tabla = tabla || 'pasajeros';
    if (!Session.can(tabla === 'pasajeros'
        ? 'pasajeros.editar' : 'contactos.editar')) return;
    const p = await DB.get(tabla, id);
    if (!p) return;
    this._edTabla = tabla;
    $('#form-pasajero').reset();
    await this._fillDestinos();
    llenarCodigos($('#pax-codigo'), p.codigo);
    $('#pasajero-id').value = p.id;
    $('#pax-tipo').value = tabla === 'pasajeros'
      ? 'Pasajero' : (p.tipo || 'Guía');
    $('#pax-nombre').value = p.ap1 ? p.nombre.split(' ')[0] || '' : p.nombre;
    $('#pax-ap1').value = p.ap1 || '';
    $('#pax-ap2').value = p.ap2 || '';
    $('#pax-telefono').value = p.telefono || '';
    $('#pax-destino').value = p.destinoId || '';
    $('#pax-asiento').value = p.asiento || '';
    $('#pax-checkin-estado').value = p.checkin || 'Pendiente';
    $('#pax-checkin-url').value = p.checkinUrl || '';
    PAXF.forEach(k => { const el = $('#pax-' + k);
      if (el) el.value = p[k] || ''; });
    const w = $('#pax-wa'); if (w) w.style.display = p.checkinUrl ? '' : 'none';
    this.tTipo();
    openModal('modal-pasajero');
  },
  /* abre WhatsApp al celular del pasajero con el enlace de check-in */
  enviarCheckin() {
    const u = ($('#pax-checkin-url') || {}).value || '',
          tel = ((($('#pax-codigo') || {}).value || '') +
                 (($('#pax-telefono') || {}).value || '')).replace(/\D/g, ''),
          nom = V.titleCase((($('#pax-nombre') || {}).value || '') + ' ' +
                 (($('#pax-ap1') || {}).value || '')).trim();
    if (!u.trim()) return showToast('Pegá el enlace de check-in', 'warn');
    if (!tel) return showToast('El pasajero no tiene teléfono celular', 'warn');
    const msg = 'Hola ' + (nom || 'viajero') +
      ', aquí tienes el enlace para hacer tu check-in: ' + u.trim();
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(msg), '_blank');
  },
  async borrar(id) {
    if (!Session.can('pasajeros.eliminar')) {
      showToast('Sin permiso para eliminar pasajeros', 'error'); return;
    }
    if (await confirmar('¿Eliminar este pasajero del registro?')) {
      await DB.remove('pasajeros', id);
      showToast('Pasajero eliminado', 'error');
      this.render();
    }
  },

  /* quitar un pasajero de este viaje (queda en la agenda, sin viaje) */
  async quitar(pid, destinoId) {
    if (!(await confirmar('¿Quitar este pasajero del viaje?'))) return;
    const p = await DB.get('pasajeros', pid); if (!p) return;
    p.destinoId = ''; await DB.save('pasajeros', p);
    if (destinoId) Destinos.pagina(destinoId);
    this.render();
  },
  /* sincroniza los pasajeros del viaje con los contactos elegidos
     en el acordeón Pasajeros del formulario */
  async syncViaje(destinoId, ids) {
    ids = ids || [];
    const todos = await DB.list('pasajeros'),
          pxs = todos.filter(p => p.destinoId === destinoId),
          css = await DB.list('contactos');
    for (const cid of ids) {
      const c = css.find(x => x.id === cid); if (!c) continue;
      const hit = pxs.find(p => p.contactoId === cid) ||
        todos.find(p => p.contactoId === cid && !p.destinoId);
      if (hit) { hit.destinoId = destinoId; await DB.save('pasajeros', hit); }
      else await DB.save('pasajeros', {
        nombre: V.titleCase(c.nombre || ''), telefono: c.telefono || '',
        email: c.email || '', codigo: c.codigo || '', destinoId,
        contactoId: cid, checkin: 'Pendiente' });
    }
    for (const p of pxs)
      if (p.contactoId && !ids.includes(p.contactoId)) {
        p.destinoId = ''; await DB.save('pasajeros', p); }
  }
};
Router.ON_TAB.pasajeros = () => Pasajeros.render(); window.Pasajeros = Pasajeros;
