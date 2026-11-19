/* destinos.js — CRUD de destinos/viajes: país (América+España), multi-destino,
   capacidad C/G-S/G, moneda e itinerario por día con sub-datos de servicio. */
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
    const items = $$('#destinos-lista-container .dst-item');
    const last = items[items.length - 1];
    if (last && !last.value.trim() && nombre === undefined) {
      last.focus(); showToast('Completa el destino anterior primero', 'error'); return; }
    const rid = uid('dst');
    const div = document.createElement('div');
    div.className = 'flex gap1'; div.id = rid;
    div.innerHTML =
      '<input type="text" placeholder="Destino (Ej. Cancún, Chichén Itzá…)" ' +
        'value="' + esc(nombre || '') + '" class="input dst-item" style="flex:1">' +
      '<button type="button" class="iconbtn danger" onclick="Destinos.delDest(\'' +
        rid + '\')"><i class="fa-solid fa-xmark"></i></button>';
    $('#destinos-lista-container').appendChild(div);
    if (window.Itinerario) Itinerario.syncDestinos();
  },
  addItRow(dest, dia, tipo, ruta, x) {
    Itinerario.addRow(dest, dia, tipo, ruta, x); },
  cancelar() { return Borrador.cancelar(); },
  nuevo() {
    if (!Session.can('destinos.crear')) {
      showToast('Sin permiso para crear destinos', 'error'); return;
    }
    $('#form-destino').reset(); $('#destino-id').value = '';
    $('#dest-conguia').value = ''; $('#dest-singuia').value = '';
    $('#dest-moneda').value = 'USD';
    this._fillPais('');
    $('#destinos-lista-container').innerHTML = '';
    $('#itinerary-container').innerHTML = '';
    $('#it-general').innerHTML = '';
    Itinerario.initPickers();
    const draft = Borrador.get();
    if (draft) Borrador.restore(draft); else this.addDestino();
    $('#modal-destino-title').textContent = 'Crear Nuevo Destino y Viaje';
    this._capRes();
    openModal('modal-destino');
  },
  _capRes() {
    const r = $('#cap-acc-res'); if (!r) return;
    const c = $('#dest-conguia').value, s = $('#dest-singuia').value;
    r.textContent = ($('#dest-moneda').value === 'CRC' ? '₡' : '$') +
      (c ? ' · C/G ' + c : '') + (s ? ' · S/G ' + s : '');
  },
  acc(id, stay) {
    ['cap-acc', 'info-acc', 'itin-acc'].forEach(a => {
      const el = document.getElementById(a); if (el)
        el.classList.toggle('open', a === id && (stay || !el.classList.contains('open')));
    });
  },
  async delDest(rid) { if (await confirmar('¿Quitar este destino de la lista?')) {
    document.getElementById(rid).remove();
    if (window.Itinerario) Itinerario.syncDestinos(); } },
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
      moneda: $('#dest-moneda').value || 'USD',
      pais: $('#dest-pais').value,
      nombre: $('#dest-nombre').value.trim(),
      destinos: dests,
      imagen: '', guia: '', transporte: '', aerolinea: '', vuelo: '',
      checkin: '', checkout: '', notas: '', itinerario: []
    };
    /* campos acordeón → propiedades del viaje; resto → itinerario */
    Itinerario.collect().forEach(i => {
      const c = Itinerario.CAMPOS[i.campo];
      if (c) {
        obj[c.k] = i.valor;
        if (i.campo === 'Aerolínea') {
          if (i.checkin) obj.checkin = i.checkin;
          if (i.checkout) obj.checkout = i.checkout;
          obj.boleto = { clase: i.clase, pb: i.pb, pc: i.pc,
                         ai: i.ai, ps: i.ps };
        }
      } else obj.itinerario.push(i);
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
    $('#dest-moneda').value = d.moneda || 'USD';
    setTimeout(() => Destinos._capRes(), 0);
    this._fillPais(d.pais || '');
    $('#dest-nombre').value = d.nombre;
    const dc = $('#destinos-lista-container'); dc.innerHTML = '';
    (d.destinos || []).forEach(n => this.addDestino(n));
    if (!dc.children.length) this.addDestino();
    $('#itinerary-container').innerHTML = '';
    $('#it-general').innerHTML = '';
    Itinerario.initPickers();
    Object.keys(Itinerario.CAMPOS).forEach(t => {
      const v = d[Itinerario.CAMPOS[t].k];
      if (v) this.addItRow(null, '', t, v,
        t === 'Aerolínea' ? (d.boleto || {}) : null);
    });
    (d.itinerario || []).forEach(it =>
      this.addItRow(it.destino, it.dia, it.tipo || 'Llegada y traslado', it.ruta, it));
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
};
Router.ON_TAB.destinos = () => Destinos.render();
['input', 'change'].forEach(t => document.addEventListener(t, e => {
  const id = e.target && e.target.id || '';
  if (id === 'dest-conguia') {
    const sg = $('#dest-singuia');
    if (sg) sg.value = Math.max(0, (parseInt(e.target.value) || 0) - 2);
  }
  if (id !== 'dest-singuia' && /^dest-(conguia|pais|moneda)$/.test(id) &&
      window.Itinerario) Itinerario.refresh();
  if (/^dest-(conguia|singuia|moneda)$/.test(id)) Destinos._capRes();
  if (e.target && e.target.classList &&
      e.target.classList.contains('dst-item') && window.Itinerario)
    Itinerario.syncDestinos();
}));
