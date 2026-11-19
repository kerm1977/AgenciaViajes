/* destinos.js — CRUD de destinos/viajes: país (América+España), lista de
   destinos por viaje, precio con/sin guía, itinerario por día (1-30) con
   tipo de parada y sub-datos de servicio (contacto, tel, precio). */
'use strict';
const PAISES = ['Argentina','Aruba','Bahamas','Barbados','Belice','Bolivia',
  'Brasil','Canadá','Chile','Colombia','Costa Rica','Cuba','Curazao',
  'Dominica','Ecuador','El Salvador','España','Estados Unidos','Granada',
  'Guatemala','Guyana','Haití','Honduras','Jamaica','México','Nicaragua',
  'Panamá','Paraguay','Perú','Puerto Rico','República Dominicana',
  'San Cristóbal y Nieves','San Vicente y las Granadinas','Santa Lucía',
  'Surinam','Trinidad y Tobago','Uruguay','Venezuela'];
const Destinos = {
  IMG_DEF: 'img/destino-def.svg',
  async render() {
    const q = (($('#search-destinos') || {}).value || '').toLowerCase();
    const grid = $('#destinos-grid');
    if (!grid) return;
    const lista = (await DB.list('destinos')).filter(d =>
      d.nombre.toLowerCase().includes(q) ||
      (d.pais || '').toLowerCase().includes(q) ||
      (d.guia || '').toLowerCase().includes(q) ||
      (d.aerolinea || '').toLowerCase().includes(q) ||
      (d.destinos || []).join(' ').toLowerCase().includes(q));
    grid.innerHTML = '';
    if (!lista.length) {
      grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1">' +
        '<i class="fa-solid fa-map-location"></i><p>No hay destinos registrados.</p></div>';
      return;
    }
    const puedeEditar = Session.can('destinos.editar');
    const puedeBorrar = Session.can('destinos.eliminar');
    lista.forEach(d => {
      const lugares = (d.destinos && d.destinos.length)
        ? d.destinos.join(' · ') : 'Sin destinos';
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'overflow:hidden;display:flex;flex-direction:column;justify-content:space-between';
      const img = d.imagen || this.IMG_DEF;
      card.innerHTML =
        '<div><div class="dest-img"><img src="' + esc(img) + '" alt="" ' +
          'onerror="this.src=\'' + this.IMG_DEF + '\'">' +
          '<span class="float-badge">' + esc(d.pais || 'Viaje') + '</span></div>' +
        '<div class="card-pad"><h3 class="bold" style="font-size:15px;color:var(--slate-900)">' +
          esc(d.nombre) + '</h3><div class="grid gap1 mt1">' +
          '<p class="kv"><i class="fa-solid fa-flag"></i> País: <strong>' +
            esc(d.pais || '—') + '</strong></p>' +
          '<p class="kv"><i class="fa-solid fa-location-dot"></i> ' +
            esc(lugares) + '</p>' +
          '<p class="kv"><i class="fa-solid fa-user-tie"></i> Guía: <strong>' +
            esc(d.guia || 'Sin asignar') + '</strong></p>' +
          '<p class="kv"><i class="fa-solid fa-plane"></i> Vuelo: <strong>' +
            esc(d.vuelo || 'N/A') + '</strong></p></div></div></div>' +
        '<div class="card-pad flex gap1" style="padding-top:0;border-top:1px solid var(--slate-100);align-items:center">' +
          (d.checkin ? '<a href="' + esc(d.checkin) + '" target="_blank" ' +
            'class="btn btn-sm btn-soft" style="flex:1;background:var(--brand-50);color:var(--brand-700)">' +
            '<i class="fa-solid fa-square-check"></i> Check-in</a>' : '') +
          '<button class="btn btn-sm btn-soft" onclick="Destinos.detalle(\'' + d.id + '\')">' +
            '<i class="fa-solid fa-route"></i> Itinerario</button>' +
          (puedeEditar ? '<button class="iconbtn" onclick="Destinos.editar(\'' + d.id + '\')"><i class="fa-solid fa-pen-to-square"></i></button>' : '') +
          (puedeBorrar ? '<button class="iconbtn danger" onclick="Destinos.borrar(\'' + d.id + '\')"><i class="fa-solid fa-trash"></i></button>' : '') +
        '</div>';
      grid.appendChild(card);
    });
  },
  _fillPais(val) {
    const s = $('#dest-pais');
    s.innerHTML = '<option value="">— Selecciona el país —</option>' +
      PAISES.map(p => '<option' + (p === val ? ' selected' : '') + '>' +
        esc(p) + '</option>').join('');
  },
  addDestino(nombre) {
    const c = $('#destinos-lista-container');
    const rid = uid('dst');
    const div = document.createElement('div');
    div.className = 'flex gap1'; div.id = rid;
    div.innerHTML =
      '<input type="text" placeholder="Destino (Ej. Cancún, Chichén Itzá…)" ' +
        'value="' + esc(nombre || '') + '" class="input dst-item" style="flex:1">' +
      '<button type="button" class="iconbtn danger" onclick="document.getElementById(\'' +
        rid + '\').remove()"><i class="fa-solid fa-xmark"></i></button>';
    c.appendChild(div);
  },
  addItRow(dia, tipo, ruta, x) { Itinerario.addRow(dia, tipo, ruta, x); },
  cancelar() { return Borrador.cancelar(); },
  nuevo() {
    if (!Session.can('destinos.crear')) {
      showToast('Sin permiso para crear destinos', 'error'); return;
    }
    $('#form-destino').reset(); $('#destino-id').value = '';
    $('#dest-conguia').value = ''; $('#dest-singuia').value = '';
    this._fillPais('');
    $('#destinos-lista-container').innerHTML = '';
    $('#itinerary-container').innerHTML = '';
    Itinerario.initPickers();
    const draft = Borrador.get();
    if (draft) Borrador.restore(draft); else this.addDestino();
    $('#modal-destino-title').textContent = 'Crear Nuevo Destino y Viaje';
    openModal('modal-destino');
  },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-destino'))) return;
    const dests = $$('#destinos-lista-container .dst-item')
      .map(i => i.value.trim()).filter(Boolean);
    if (!dests.length) {
      showToast('Agrega al menos un destino', 'error');
      $('#destinos-lista-container').style.border = '1px solid var(--rose-600)';
      setTimeout(() =>
        $('#destinos-lista-container').style.border = 'none', 1800);
      return;
    }
    const id = $('#destino-id').value;
    const obj = {
      id: id || undefined,
      paxConGuia: parseInt($('#dest-conguia').value) || 0,
      paxSinGuia: parseInt($('#dest-singuia').value) || 0,
      pais: $('#dest-pais').value,
      nombre: $('#dest-nombre').value.trim(),
      destinos: dests,
      imagen: '', guia: '', transporte: '', aerolinea: '', vuelo: '',
      checkin: '', notas: '', itinerario: []
    };
    /* campos acordeón → propiedades del viaje; resto → itinerario */
    Itinerario.collect().forEach(i => {
      const c = Itinerario.CAMPOS[i.campo];
      if (c) obj[c.k] = i.valor;
      else obj.itinerario.push(i);
    });
    await DB.save('destinos', obj);
    Borrador.clear();
    closeModal('modal-destino');
    showToast(id ? 'Destino actualizado' : 'Destino creado');
    this.render();
  },
  async editar(id) {
    if (!Session.can('destinos.editar')) return;
    const d = await DB.get('destinos', id);
    if (!d) return;
    $('#destino-id').value = d.id;
    $('#dest-conguia').value = d.paxConGuia || '';
    $('#dest-singuia').value = d.paxSinGuia || '';
    this._fillPais(d.pais || '');
    $('#dest-nombre').value = d.nombre;
    const dc = $('#destinos-lista-container'); dc.innerHTML = '';
    (d.destinos || []).forEach(n => this.addDestino(n));
    if (!dc.children.length) this.addDestino();
    const c = $('#itinerary-container'); c.innerHTML = '';
    Itinerario.initPickers();
    Object.keys(Itinerario.CAMPOS).forEach(t => {
      const v = d[Itinerario.CAMPOS[t].k];
      if (v) this.addItRow('', t, v);
    });
    (d.itinerario || []).forEach(it =>
      this.addItRow(it.dia, it.tipo || 'Llegada y traslado', it.ruta, it));
    Itinerario.refresh();
    $('#modal-destino-title').textContent = 'Editar Destino y Viaje';
    openModal('modal-destino');
  },
  async borrar(id) {
    if (!Session.can('destinos.eliminar')) {
      showToast('Sin permiso para eliminar', 'error'); return;
    }
    if (await confirmar('¿Eliminar este destino? Los pasajeros quedarán sin viaje asignado.')) {
      await DB.remove('destinos', id);
      showToast('Destino eliminado', 'error');
      this.render();
    }
  },
  async detalle(id) {
    const d = await DB.get('destinos', id);
    if (!d) return;
    $('#detalle-destino-header').style.backgroundImage =
      'url(' + (d.imagen || this.IMG_DEF) + ')';
    $('#detalle-badge-aerolinea').textContent = d.aerolinea || 'Viaje';
    $('#detalle-title').textContent = d.nombre;
    $('#detalle-pais').innerHTML = '<i class="fa-solid fa-flag"></i> ' +
      esc(d.pais || '—') +
      (d.paxConGuia ? ' <span class="hint">· ' + d.paxConGuia +
        ' van / ' + (d.paxSinGuia || 0) + ' pagan</span>' : '');
    $('#detalle-lugares').textContent = (d.destinos || []).join(' · ');
    $('#detalle-guia').innerHTML = '<i class="fa-solid fa-user-tie"></i> ' +
      esc(d.guia || 'Sin asignar');
    $('#detalle-transporte').innerHTML = '<i class="fa-solid fa-bus"></i> ' +
      esc(d.transporte || 'No especificado');
    $('#detalle-vuelo').textContent = d.vuelo ? 'Vuelo: ' + d.vuelo : 'Sin vuelo';
    const ck = $('#detalle-checkin-link');
    if (d.checkin) { ck.href = d.checkin; ck.classList.remove('hidden'); }
    else ck.classList.add('hidden');
    const il = $('#detalle-itinerario-list');
    il.innerHTML = (d.itinerario || []).length
      ? d.itinerario.map(it =>
          '<div class="it-acc">' +
          '<button type="button" class="it-acc-btn" ' +
            'onclick="this.parentElement.classList.toggle(\'open\')">' +
            '<span class="dia">' + esc(it.dia) + '</span>' +
            '<span class="it-acc-t">' + esc(it.tipo || 'Parada') + '</span>' +
            '<i class="fa-solid fa-chevron-down"></i></button>' +
          '<div class="it-acc-body">' +
            '<p>' + esc(it.ruta && it.ruta !== it.tipo ? it.ruta : 'Sin detalle') + '</p>' +
            ((it.nombre || it.tel || it.precio)
              ? '<p class="hint text-xs">' +
                (it.nombre ? '<i class="fa-solid fa-user"></i> ' + esc(it.nombre) + ' · ' : '') +
                (it.tel ? '<i class="fa-solid fa-phone"></i> ' + esc(it.tel) + ' · ' : '') +
                (it.precio ? '$' + Number(it.precio).toFixed(2) + ' ' +
                  esc(it.modo === 'grupo' ? 'por grupo' : 'por persona') : '') +
                '</p>' : '') +
          '</div></div>').join('')
      : '<p class="hint">No hay rutas registradas para este viaje.</p>';
    const pax = (await DB.list('pasajeros')).filter(p => p.destinoId === d.id);
    $('#detalle-pasajeros-list').innerHTML = pax.length
      ? pax.map(p => '<span class="pax-badge"><i class="fa-solid fa-user"></i> ' +
          esc(p.nombre) + (p.asiento ? ' <span class="muted">(' + esc(p.asiento) +
          ')</span>' : '') + '</span>').join('')
      : '<p class="hint">No hay pasajeros asignados a este destino.</p>';
    openModal('modal-detalle-destino');
  }
};
Router.ON_TAB.destinos = () => Destinos.render();
/* precio con guía → sin guía (−2) + recálculo de paradas; país → prefijos */
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'dest-conguia') {
    const n = parseInt(e.target.value) || 0;
    const sg = $('#dest-singuia');
    if (sg) sg.value = Math.max(0, n - 2);
    if (window.Itinerario) Itinerario.refresh();
  }
});
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'dest-pais' && window.Itinerario)
    Itinerario.refresh();
});
