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
  async nuevo() {
    if (!Session.can('pasajeros.crear')) {
      showToast('Sin permiso para agregar pasajeros', 'error'); return;
    }
    $('#form-pasajero').reset(); $('#pasajero-id').value = '';
    const w = $('#pax-wa'); if (w) w.style.display = 'none';
    llenarCodigos($('#pax-codigo'));
    await this._fillDestinos();
    $('#modal-pasajero-title').textContent = 'Asignar Pasajero a Viaje';
    openModal('modal-pasajero');
  },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-pasajero'))) return;
    const id = $('#pasajero-id').value;
    const o = {
      id: id || undefined,
      nombre: V.titleCase(($('#pax-nombre').value + ' ' +
        $('#pax-ap1').value + ' ' + $('#pax-ap2').value).trim()),
      ap1: V.titleCase($('#pax-ap1').value),
      ap2: V.titleCase($('#pax-ap2').value),
      codigo: $('#pax-codigo').value,
      telefono: V.telNorm($('#pax-telefono').value),
      destinoId: $('#pax-destino').value,
      checkin: $('#pax-checkin-estado').value,
      checkinUrl: $('#pax-checkin-url').value.trim()
    };
    PAXF.forEach(k => { const el = $('#pax-' + k);
      if (el) o[k] = el.value.trim(); });
    o.pasaporte = (o.pasaporte || '').toUpperCase();
    o.asiento = ($('#pax-asiento').value || '').trim().toUpperCase();
    o.email = V.emailNorm(o.email || '');
    await DB.save('pasajeros', o);
    closeModal('modal-pasajero');
    showToast(id ? 'Pasajero actualizado' : 'Pasajero asignado');
    this.render();
  },
  async editar(id) {
    if (!Session.can('pasajeros.editar')) return;
    const p = await DB.get('pasajeros', id);
    if (!p) return;
    await this._fillDestinos();
    llenarCodigos($('#pax-codigo'), p.codigo);
    $('#pasajero-id').value = p.id;
    $('#pax-nombre').value = p.ap1 ? p.nombre.split(' ')[0] || '' : p.nombre;
    $('#pax-ap1').value = p.ap1 || '';
    $('#pax-ap2').value = p.ap2 || '';
    $('#pax-telefono').value = p.telefono || '';
    $('#pax-destino').value = p.destinoId;
    $('#pax-asiento').value = p.asiento || '';
    $('#pax-checkin-estado').value = p.checkin || 'Pendiente';
    $('#pax-checkin-url').value = p.checkinUrl || '';
    PAXF.forEach(k => { const el = $('#pax-' + k);
      if (el) el.value = p[k] || ''; });
    const w = $('#pax-wa'); if (w) w.style.display = p.checkinUrl ? '' : 'none';
    $('#modal-pasajero-title').textContent = 'Editar Pasajero';
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
  /* --- Asignar grupo a viaje --- */
  _grpSel: [],
  async grupo() {
    if (!Session.can('pasajeros.editar')) {
      showToast('Sin permiso para asignar pasajeros', 'error'); return; }
    this._grpSel = [];
    const sel = $('#grp-viaje');
    sel.innerHTML = '<option value="">Asignar viaje…</option>';
    (await DB.list('destinos')).forEach(d => {
      const o = document.createElement('option');
      o.value = d.id; o.textContent = d.nombre; sel.appendChild(o); });
    sel.value = ''; $('#grp-buscar').value = '';
    await this.grpRender();
    openModal('modal-grupo');
  },
  async grpRender() {
    const q = ((($('#grp-buscar') || {}).value) || '').toLowerCase(),
          vid = (($('#grp-viaje') || {}).value) || '',
          pxs = (await DB.list('pasajeros'))
            .filter(p => p.destinoId !== vid)
            .filter(p => !q || (p.nombre || '').toLowerCase().includes(q) ||
              (p.telefono || '').includes(q)).sort((a, b) => a.nombre.localeCompare(b.nombre));
    $('#grp-lista').innerHTML = pxs.map(p =>
      '<label class="grp-hit"><input type="checkbox" value="' + p.id + '"' +
      (this._grpSel.includes(p.id) ? ' checked' : '') +
      ' onchange="Pasajeros.grpTog(\'' + p.id + '\')"><span><b>' +
      esc(p.nombre) + '</b>' +
      (p.telefono ? ' <span class="hint">' + esc(p.telefono) + '</span>' : '') +
      '</span></label>').join('') ||
      '<p class="hint" style="text-align:center">Sin resultados</p>';
    this._grpCount();
  },
  _grpCount() { const c = $('#grp-count');
    if (c) c.textContent = this._grpSel.length ? '(' + this._grpSel.length + ')' : ''; },
  grpTog(id) {
    const i = this._grpSel.indexOf(id);
    if (i < 0) this._grpSel.push(id); else this._grpSel.splice(i, 1); this._grpCount();
  },
  async guardarGrupo() {
    const vid = $('#grp-viaje').value;
    if (!vid) return showToast('Elegí el viaje', 'warn');
    if (!this._grpSel.length)
      return showToast('Seleccioná al menos un pasajero', 'warn');
    for (const pid of this._grpSel) {
      const p = await DB.get('pasajeros', pid);
      if (p) { p.destinoId = vid; await DB.save('pasajeros', p); } }
    showToast(this._grpSel.length + ' pasajeros asignados');
    this._grpSel = []; closeModal('modal-grupo');
    if (Destinos._detId === vid) Destinos.pagina(vid);
    this.render();
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
Router.ON_TAB.pasajeros = () => Pasajeros.render();
