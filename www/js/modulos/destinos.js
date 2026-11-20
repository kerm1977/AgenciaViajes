/* destinos.js — CRUD destinos/viajes: país, multi-destino, capacidad, itinerario. */
'use strict';
const Destinos = {
  IMG_DEF: 'img/destino-def.svg',
  async render() {
    const q = (($('#search-destinos') || {}).value || '').toLowerCase();
    const grid = $('#destinos-grid');
    if (!grid) return;
    const lista = (await DB.list('destinos')).filter(d =>
      d.nombre.toLowerCase().includes(q) || (d.pais || '').toLowerCase().includes(q) ||
      (d.guia || '').toLowerCase().includes(q) || (d.aerolinea || '').toLowerCase().includes(q) ||
      (d.destinos || []).join(' ').toLowerCase().includes(q));
    grid.innerHTML = '';
    if (!lista.length) { grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1">' +
      '<i class="fa-solid fa-map-location"></i><p>No hay destinos registrados.</p></div>'; return; }
    const puedeEditar = Session.can('destinos.editar'), puedeBorrar = Session.can('destinos.eliminar'), puedePax = Session.can('pasajeros.editar');
    lista.forEach(d => {
      const lugares = (d.destinos || []).join(' · '),
            tv = Itinerario.totalViaje(d);
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer';
      card.addEventListener('click', e => { if (!e.target.closest('button,a,.dest-img')) this.detalle(d.id); });
      const img = /^uf:/.test(d.imagen || '') ? this.IMG_DEF : (d.imagen || this.IMG_DEF);
      card.innerHTML =
        '<div><div class="dest-img" title="5 toques: cambiar imagen · mantener: ajustes" ' +
          'onclick="Uploader.tap5(\'' + d.id + '\');Destinos.imgTap(\'' + d.id + '\')" style="cursor:pointer">' +
          '<img src="' + esc(img) + '" alt="" ' +
          'onerror="this.src=\'' + this.IMG_DEF + '\'">' +
          '<span class="float-badge">' + esc(d.pais || 'Viaje') + '</span></div>' +
        '<div class="card-pad"><h3 class="bold" style="font-size:15px;color:var(--slate-900)">' +
          esc(d.nombre) + '</h3><div class="grid gap1 mt1">' +
          (d.pais ? '<p class="kv"><i class="fa-solid fa-flag"></i> País: <strong>' +
            esc(d.pais) + '</strong></p>' : '') +
          (lugares ? '<div class="flex" style="gap:.3rem;flex-wrap:wrap">' + (d.destinos || []).map((l, i) => '<span style="font-size:11px;padding:.15rem .55rem;border-radius:1rem;background:' + ['#fde2e4', '#dbe7ff', '#ddf1e4', '#fff1d6', '#e8dff5', '#fce8f3', '#e6f0fb', '#e2ece9'][i % 8] + '">' + esc(l) + '</span>').join('') + '</div>' : '') +
          (d.guia ? '<p class="kv"><i class="fa-solid fa-user-tie"></i> Guía: <strong>' +
            esc(d.guia) + '</strong></p>' : '') +
          (d.aerolinea ? '<p class="kv"><i class="fa-solid fa-plane"></i> ' +
            'Aerolínea: <strong>' + esc(d.aerolinea) + '</strong>' +
            (d.vuelo ? ' <span class="hint">· ' + esc(d.vuelo) + '</span>' : '') +
            '</p>' : '') + '</div></div></div>' +
        (tv.t ? '<div class="card-pad" style="padding-top:.2rem"><hr class="it-hr">' +
          '<p class="it-gtotal">Total individual: <b>' +
          Itinerario.fmtT(d, tv.i) + '</b><br>Total por grupo: <b>' +
          Itinerario.fmtT(d, tv.t) + '</b></p></div>' : '') +
        '<div class="card-pad flex gap1" style="padding-top:0;border-top:1px solid var(--slate-100);align-items:center">' +
          (d.checkin ? '<a href="' + esc(d.checkin) + '" target="_blank" ' +
            'class="btn btn-sm btn-soft" style="flex:1;background:var(--brand-50);color:var(--brand-700)">' +
            '<i class="fa-solid fa-square-check"></i> Check-in</a>' : '') +
          '<button class="btn btn-sm btn-soft" onclick="Destinos.detalle(\'' + d.id + '\')">' +
            '<i class="fa-solid fa-route"></i> Información</button>' +
          (puedePax && d.fechas && d.fechas.on ? '<button class="iconbtn" title="Agregar pasajeros" onclick="Destinos.paxNuevo(\'' + d.id + '\')"><i class="fa-solid fa-user-plus"></i></button>' : '') +
          (puedeEditar ? '<button class="iconbtn" onclick="Destinos.editar(\'' + d.id + '\')"><i class="fa-solid fa-pen-to-square"></i></button>' : '') + (puedeBorrar ? '<button class="iconbtn danger" onclick="Destinos.borrar(\'' + d.id + '\')"><i class="fa-solid fa-trash"></i></button>' : '') +
        '</div>';
      grid.appendChild(card);
      Uploader.bindImg(card.querySelector('.dest-img'), d);
    });
  },
  addDestino(nombre) {
    const last = $$('#destinos-lista-container .dst-item').pop();
    if (nombre == null && last) {
      const v = last.value.trim();
      if (!v) { last.focus();
        showToast('Completa el destino anterior primero', 'error'); return; }
      this._lockDest(last.closest('div'), v);  /* sella: texto + lapicito + X */
    }
    const rid = uid('dst'), div = document.createElement('div');
    div.className = 'flex gap1 dst-row'; div.id = rid;
    div.innerHTML = nombre == null
      ? this._destInp(rid, '')
      : this._destTxt(rid, nombre);   /* cargado: ya sellado */
    $('#destinos-lista-container').appendChild(div);
    if (window.Itinerario) Itinerario.syncItin();
  },
  _destInp(rid, v) {
    return '<input type="text" placeholder="Destino (Ej. Cancún, Chichén Itzá…)" ' +
      'value="' + esc(v) + '" class="input dst-item" style="flex:1">' +
      '<button type="button" class="iconbtn danger" ' +
      'onclick="Destinos.delDest(\'' + rid + '\')"><i class="fa-solid fa-xmark"></i></button>'; },
  _destTxt(rid, v) {
    return '<span class="dst-txt" style="flex:1;align-self:center">' + esc(v) + '</span>' +
      '<button type="button" class="iconbtn" title="Editar" ' +
        'onclick="Destinos.editDest(\'' + rid + '\')"><i class="fa-solid fa-pen"></i></button>' +
      '<button type="button" class="iconbtn danger" ' +
        'onclick="Destinos.delDest(\'' + rid + '\')"><i class="fa-solid fa-xmark"></i></button>'; },
  _lockDest(row, v) { row.innerHTML = this._destTxt(row.id, v); row.dataset.saved = '1'; },
  editDest(rid) {
    const row = document.getElementById(rid); if (!row) return;
    const v = (row.querySelector('.dst-txt') || {}).textContent || '';
    row.innerHTML = this._destInp(rid, v); delete row.dataset.saved;
    const inp = row.querySelector('input');
    if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); } },
  addItRow(dest, dia, tipo, ruta, x, ev) {
    Itinerario.addRow(dest, dia, tipo, ruta, x, ev); },
  cancelar() { return Borrador.cancelar(); },
  nuevo() {
    if (!Session.can('destinos.crear')) { showToast('Sin permiso para crear destinos', 'error'); return; }
    $('#form-destino').reset(); $('#destino-id').value = ''; $('#dest-moneda').value = 'USD';
    $('#dest-conguia').value = ''; $('#dest-singuia').value = '';
    $('#dest-tiene-fechas').checked = false; this.togFechas(); this._fillPais(''); const mc = $('#dest-mostrar-costos'); if (mc) mc.checked = false;
    $('#destinos-lista-container').innerHTML = '';
    $('#itinerary-container').innerHTML = ''; $('#it-general').innerHTML = '';
    Itinerario.initPickers();
    this.paxReset && this.paxReset();  const edn = $('#desc-editor'); if (edn) edn.innerHTML = '';
    this.addDestino();
    $('#modal-destino-title').textContent = 'Crear Nuevo Destino y Viaje';
    $('#pag-destino').classList.add('open'); this.togFechas();
    const dr = Borrador.get(); if (dr && !dr.editId) Borrador.restore(dr);
    this.paso(1);
  },
  togFechas() {
    const on = $('#dest-tiene-fechas').checked;
    $$('#dest-fechas-wrap').forEach(w => w.style.display = on ? 'grid' : 'none');
    const fn = $('#f-nombre'); if (fn) fn.style.marginTop = on ? '0' : '2.4rem';
    this._fechasTxt(); const st = $('#dest-save-top'); if (st) st.style.display = this._paso === 8 ? '' : 'none'; },
  _fechasTxt() {
    const t = id => { const v = ($(id) || {}).value; if (!v) return ''; const d = new Date(v + 'T00:00:00');
      return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); };
    const a = $('#dest-fdesde-txt'), b = $('#dest-fhasta-txt');
    if (a) a.textContent = t('#dest-fdesde'); if (b) b.textContent = t('#dest-fhasta'); },
  _paso: 0,
  paso(n) {
    const ss = $$('#form-destino .wstep'); if (!ss.length) return;
    if (this._paso === 2 && n > 2 && $('#dest-tiene-fechas').checked &&
        (!$('#dest-fdesde').value || !$('#dest-fhasta').value)) {
      aviso('No podés dejar los campos de fechas vacíos, tenés que llenarlos.', 'Fechas del viaje');
      return; }
    if (!$('#dest-tiene-fechas').checked && (n === 6 || n === 7)) n = n === 7 ? 5 : 8;
    n = Math.max(1, Math.min(ss.length, n)); this._paso = n;
    ss.forEach((s, i) => s.classList.toggle('open', i === n - 1)); this.togFechas();
    if (n === 5 && window.Itinerario && Itinerario.initPickers)
      Itinerario.initPickers();
    const ts = $('#pag-ota-ts'); if (ts) ts.textContent = window.TM_OTA ? 'OTA ' + TM_OTA.ts : '';
    const b = $('.pag-itin-body'); if (b) b.scrollTop = 0;
  },
  async delDest(rid) { if (!(await confirmar('¿Quitar este destino de la lista?'))) return;
    document.getElementById(rid).remove(); if (window.Itinerario) Itinerario.syncItin(); },
  async guardar(e) {
    e.preventDefault();
    if (!V.check($('#form-destino'))) return;
    const dests = $$('#destinos-lista-container .dst-item, #destinos-lista-container .dst-txt')
      .map(e => (e.value !== undefined ? e.value : e.textContent).trim()).filter(Boolean);
    if (!dests.length) {
      showToast('Agrega al menos un destino', 'error');
      $('#destinos-lista-container').style.border = '1px solid var(--rose-600)';
      setTimeout(() => $('#destinos-lista-container').style.border = 'none', 1800);
      return; }
    const id = $('#destino-id').value, prev = id ? await DB.get('destinos', id) : null;
    const obj = {
      id: id || undefined,
      paxConGuia: parseInt($('#dest-conguia').value) || 0, paxSinGuia: parseInt($('#dest-singuia').value) || 0,
      moneda: $('#dest-moneda').value || 'USD', pais: $('#dest-pais').value,
      nombre: $('#dest-nombre').value.trim(), destinos: dests,
      fechas: { on: $('#dest-tiene-fechas').checked, desde: $('#dest-fdesde').value,
        hasta: $('#dest-fhasta').value },
      imagen: (prev && prev.imagen) || '', imgfx: prev ? prev.imgfx : null,
      guia: (prev && prev.guia) || '', transporte: (prev && prev.transporte) || '', aerolinea: '', vuelo: '', checkin: '', checkout: '', notas: (prev && prev.notas) || '', itinerario: [], mostrarCostos: ($('#dest-mostrar-costos') || {}).checked ? 1 : 0
    };
    if (Itinerario.collectDias) obj.dias = Itinerario.collectDias();
    /* campos acordeón → propiedades del viaje; resto → itinerario */
    Itinerario.collect().forEach(i => {
      const c = Itinerario.CAMPOS[i.campo];
      if (c) {
        obj[c.k] = i.valor;
        if (i.dia || i.lugar || i.adesc)
          obj.itinerario.push({ ...i, tipo: i.campo,
            ruta: i.valor || i.campo, nombre: i.nombre || '' });
        if (c.k === 'aerolinea') {
          if (i.checkin) obj.checkin = i.checkin;
          if (i.checkout) obj.checkout = i.checkout;
          obj.boleto = { clase: i.clase, pb: i.pb, ai: i.ai, ps: i.ps,
            ci: i.ci, co: i.co, os: i.os, osv: i.osv, osd: i.osd,
            dia: i.dia, hdesde: i.hdesde, hhasta: i.hhasta, guia: i.guia,
            esc: i.esc, escp: i.escp, escv: i.escv, esch: i.esch,
            esca: i.esca, lugar: i.lugar, adesc: i.adesc };
        }
        if (c.k === 'transporte')
          obj.trans = { tsel: i.tsel, tnombre: i.tnombre, ttel: i.ttel,
            tdesc: i.tdesc, dia: i.dia, hdesde: i.hdesde,
            hhasta: i.hhasta, guia: i.guia, lugar: i.lugar, adesc: i.adesc };
      } else obj.itinerario.push(i);
    });
    const evg = obj.itinerario.find(e => e.tipo === 'Guía' && e.nombre); if (evg) obj.guia = evg.nombre;
    if (prev && prev.trans && !obj.trans) obj.trans = prev.trans; if (prev && prev.boleto && !obj.boleto) obj.boleto = prev.boleto;
    const ed = $('#desc-editor'); if (ed && ed.innerHTML.trim()) obj.notas = ed.innerHTML;
    const ni = $('#dest-noincluye'); obj.noincluye = ni ? ni.value.trim() : '';
    await DB.save('destinos', obj); if (window.Pasajeros && Pasajeros.syncViaje)
      await Pasajeros.syncViaje(obj.id, this._paxSel || []); await this.paxSyncLibres(obj.id);
    Borrador.clear();
    $('#pag-destino').classList.remove('open');
    showToast(id ? 'Destino actualizado' : 'Destino creado');
    this.render();
  },
  async editar(id) {
    if (!Session.can('destinos.editar')) return;
    const d = await DB.get('destinos', id);
    if (!d) return;
    $('#destino-id').value = d.id;
    $('#dest-conguia').value = d.paxConGuia || ''; $('#dest-singuia').value = d.paxSinGuia || '';
    $('#dest-moneda').value = d.moneda || 'USD'; const mc = $('#dest-mostrar-costos'); if (mc) mc.checked = !!d.mostrarCostos;
    this._fillPais(d.pais || '');
    $('#dest-nombre').value = d.nombre;
    const edc = $('#desc-editor'); if (edc) edc.innerHTML = d.notas || '';
    $('#dest-noincluye').value = d.noincluye || '';
    const f = d.fechas || {}; $('#dest-tiene-fechas').checked = !!f.on;
    $('#dest-fdesde').value = f.desde || ''; $('#dest-fhasta').value = f.hasta || '';
    this.togFechas();
    const dc = $('#destinos-lista-container'); dc.innerHTML = '';
    (d.destinos || []).forEach(n => this.addDestino(n));
    this.addDestino();   /* input vacío para seguir agregando */
    $('#itinerary-container').innerHTML = ''; $('#it-general').innerHTML = '';
    Itinerario.initPickers();
    Object.keys(Itinerario.CAMPOS).forEach(t => {
      const v = d[Itinerario.CAMPOS[t].k];
      if (v && !/^(data:|uf:)/.test(String(v))) this.addItRow(null, '', t, v,
        Itinerario.CAMPOS[t].k === 'aerolinea' ? (d.boleto || {}) :
        Itinerario.CAMPOS[t].k === 'transporte' ? (d.trans || {}) : null);
    });
    (d.itinerario || []).forEach(it => { if (Itinerario.CAMPOS[it.tipo]) return; /* ya se recrean desde el campo */
      this.addItRow(it.destino, it.dia, it.tipo || 'Llegada y traslado', it.ruta, it, 1); });
    if (Itinerario.setDias) Itinerario.setDias(d.dias);
    Itinerario.refresh();
    $('#modal-destino-title').textContent = 'Editar Destino y Viaje';
    $('#pag-destino').classList.add('open');
    if (this.paxCargar) await this.paxCargar(id);
    const dr = Borrador.get(); if (dr && dr.editId === id) Borrador.restore(dr);
    this.paso(1);
  },
  async borrar(id) {
    if (!Session.can('destinos.eliminar')) { showToast('Sin permiso para eliminar', 'error'); return; }
    if (await confirmar('¿Eliminar este destino? Los pasajeros quedarán sin viaje asignado.')) {
      await DB.remove('destinos', id); showToast('Destino eliminado', 'error'); this.render(); }
  },
};
Router.ON_TAB.destinos = () => Destinos.render();
['input', 'change'].forEach(t => document.addEventListener(t, e => {
  const id = e.target && e.target.id || '';
  if (id === 'dest-conguia') { const sg = $('#dest-singuia');
    if (sg) sg.value = Math.max(0, (parseInt(e.target.value) || 0) - 2); }
  if (id !== 'dest-singuia' && /^dest-(conguia|pais|moneda|fdesde|fhasta|tiene-fechas)$/.test(id) &&
      window.Itinerario) Itinerario.refresh();
  if (/^dest-f(desde|hasta)$/.test(id)) Destinos._fechasTxt();
  if (e.target && e.target.classList && e.target.classList.contains('dst-item') &&
      window.Itinerario) Itinerario.syncItin();
}));
document.addEventListener('focusin', e => {   /* subir el campo sobre el teclado */
  if (e.target && e.target.classList && e.target.classList.contains('dst-item'))
    setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350);
}); window.Destinos = Destinos;   /* guards window.Destinos en otros módulos */
