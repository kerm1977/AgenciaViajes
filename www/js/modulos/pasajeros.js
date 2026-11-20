/* pasajeros.js — asignación de pasajeros a viajes + check-in */
'use strict';
const Pasajeros = {
  async render() {
    const q = (($('#search-pasajeros') || {}).value || '').toLowerCase();
    const tb = $('#pasajeros-table-body');
    if (!tb) return;
    const dest = await DB.list('destinos');
    const lista = (await DB.list('pasajeros')).filter(p => {
      const d = dest.find(x => x.id === p.destinoId);
      return p.nombre.toLowerCase().includes(q) ||
             (p.email || '').toLowerCase().includes(q) ||
             (d && d.nombre.toLowerCase().includes(q));
    });
    tb.innerHTML = '';
    if (!lista.length) {
      tb.innerHTML = '<tr><td colspan="5" class="empty-state">' +
        '<i class="fa-solid fa-users"></i><p>Sin pasajeros registrados.</p></td></tr>';
      return;
    }
    const eP = Session.can('pasajeros.editar'), dP = Session.can('pasajeros.eliminar');
    lista.forEach(p => {
      const d = dest.find(x => x.id === p.destinoId);
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="bold">' + esc(p.nombre) +
          (p.asiento ? '<span class="hint" style="display:block">Asiento: ' +
            esc(p.asiento) + '</span>' : '') + '</td>' +
        '<td data-label="Contacto" class="text-xs"><div>' + esc(p.codigo ? p.codigo + ' ' : '') +
          esc(p.telefono || 'Sin tel') + '</div><div class="muted">' +
          esc(p.email || '') + '</div></td>' +
        '<td data-label="Destino">' + (d ? esc(d.nombre) : '<span class="muted" style="font-style:italic">Sin asignar</span>') + '</td>' +
        '<td data-label="Check-in">' + (p.checkin === 'Realizado'
            ? '<span class="badge badge-brand"><i class="fa-solid fa-check"></i> Realizado</span>'
            : '<span class="badge badge-amber"><i class="fa-solid fa-clock"></i> Pendiente</span>') +
          (d && d.checkin ? '<a href="' + esc(d.checkin) + '" target="_blank" ' +
            'class="hint" style="display:block;color:var(--brand-600)"><i class="fa-solid fa-arrow-up-right-from-square"></i> Enlace</a>' : '') +
        '</td>' +
        '<td data-label="Acciones" style="text-align:right;white-space:nowrap">' +
          (eP ? '<button class="iconbtn" onclick="Pasajeros.editar(\'' + p.id +
                '\')"><i class="fa-solid fa-pen-to-square"></i></button>' : '') +
          (dP ? '<button class="iconbtn danger" onclick="Pasajeros.borrar(\'' + p.id +
                '\')"><i class="fa-solid fa-trash"></i></button>' : '') + '</td>';
      tb.appendChild(tr);
    });
  },
  async _fillDestinos() {
    const sel = $('#pax-destino');
    sel.innerHTML = '';
    const ds = await DB.list('destinos');
    if (!ds.length) { sel.innerHTML = '<option value="">No hay destinos</option>'; return; }
    ds.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id; o.textContent = d.nombre; sel.appendChild(o);
    });
  },
  async nuevo() {
    if (!Session.can('pasajeros.crear')) {
      showToast('Sin permiso para agregar pasajeros', 'error'); return;
    }
    $('#form-pasajero').reset(); $('#pasajero-id').value = '';
    llenarCodigos($('#pax-codigo'));
    await this._fillDestinos();
    $('#modal-pasajero-title').textContent = 'Asignar Pasajero a Viaje';
    openModal('modal-pasajero');
  },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-pasajero'))) return;
    const id = $('#pasajero-id').value;
    await DB.save('pasajeros', {
      id: id || undefined,
      nombre: V.titleCase($('#pax-nombre').value),
      codigo: $('#pax-codigo').value,
      telefono: V.telNorm($('#pax-telefono').value),
      email: V.emailNorm($('#pax-email').value),
      destinoId: $('#pax-destino').value,
      asiento: $('#pax-asiento').value.trim().toUpperCase(),
      checkin: $('#pax-checkin-estado').value
    });
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
    $('#pax-nombre').value = p.nombre;
    $('#pax-telefono').value = p.telefono || '';
    $('#pax-email').value = p.email || '';
    $('#pax-destino').value = p.destinoId;
    $('#pax-asiento').value = p.asiento || '';
    $('#pax-checkin-estado').value = p.checkin || 'Pendiente';
    $('#modal-pasajero-title').textContent = 'Editar Pasajero';
    openModal('modal-pasajero');
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
  /* elegir un pasajero de la agenda y vincularlo a este viaje */
  async elegir(destinoId) {
    const todos = (await DB.list('pasajeros'))
      .filter(p => p.destinoId !== destinoId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (!todos.length) {
      showToast('No hay más pasajeros en la agenda', 'error'); return;
    }
    const bd = document.createElement('div');
    bd.className = 'modal open'; bd.id = 'pax-pick';
    bd.innerHTML = '<div class="modal-box" style="max-width:24rem">' +
      '<div class="modal-head"><h3>Agregar pasajero al viaje</h3></div>' +
      '<div class="modal-body"><select id="pax-pick-sel" class="select">' +
      '<option value="">— Pasajero —</option>' + todos.map(p =>
        '<option value="' + p.id + '">' + esc(p.nombre) +
        (p.telefono ? ' · ' + esc(p.telefono) : '') + '</option>').join('') +
      '</select></div><div class="modal-foot">' +
      '<button class="btn btn-soft" id="pax-pick-x">Cancelar</button>' +
      '<button class="btn btn-primary" id="pax-pick-ok">Agregar</button></div></div>';
    document.body.appendChild(bd);
    const fin = () => bd.remove();
    bd.querySelector('#pax-pick-x').onclick = fin;
    bd.querySelector('#pax-pick-ok').onclick = async () => {
      const p = await DB.get('pasajeros',
        bd.querySelector('#pax-pick-sel').value);
      if (!p) { showToast('Elige un pasajero', 'error'); return; }
      p.destinoId = destinoId; await DB.save('pasajeros', p);
      fin(); showToast('Pasajero agregado');
      if (Destinos._detId === destinoId) Destinos.pagina(destinoId);
      this.render(); };
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
