/* paxviaje.js — acordeón Pasajeros del formulario de viaje: buscador
   sobre TODOS los contactos; al elegirlos se agregan como pasajeros
   del viaje (Pasajeros.syncViaje los graba al guardar). */
'use strict';
Object.assign(Destinos, {
  _paxSel: [], _paxLibres: [],
  paxReset() { this._paxSel = []; this._paxLibres = []; this.paxRender(); },
  async paxCargar(did) {
    const pxs = ((await DB.list('pasajeros')) || [])
      .filter(p => p.destinoId === did);
    this._paxSel = pxs.filter(p => p.contactoId).map(p => p.contactoId);
    this._paxLibres = pxs.filter(p => !p.contactoId).map(p => p.id);
    this.paxRender();
  },
  async paxIr(id) {
    const p = (await DB.list('pasajeros'))
      .find(x => x.id === id || x.contactoId === id);
    if (!p) return showToast('Guarda el viaje para crear su ficha', 'error');
    $('#pag-destino').classList.remove('open');
    await Router.switchTab('pasajeros'); Pasajeros.editar(p.id);
  },
  /* modal multi-selección: contactos + pasajeros libres.
     vid='' → modo formulario (quedan pendientes hasta Guardar);
     vid=<id> → asignación directa desde la tarjeta del viaje. */
  _paxPick: [], _paxVid: '',
  async paxNuevo(vid) {
    if (vid && !Session.can('pasajeros.editar'))
      return showToast('Sin permiso para asignar pasajeros', 'error');
    this._paxVid = vid || ''; this._paxPick = [];
    const t = $('#pxp-buscar'); if (t) t.value = '';
    await this.paxPickRender(); openModal('modal-paxpick');
  },
  async paxPickRender() {
    const q = ((($('#pxp-buscar') || {}).value) || '').toLowerCase(),
          vid = this._paxVid,
          cs = await DB.list('contactos'), ps = await DB.list('pasajeros'),
          hit = x => !q || (x.nombre || '').toLowerCase().includes(q) ||
            (x.telefono || '').includes(q);
    const items = cs.filter(c => hit(c) && !this._paxSel.includes(c.id) &&
        !(vid && ps.some(p => p.contactoId === c.id && p.destinoId === vid)))
      .map(c => ({ id: 'c:' + c.id, n: c.nombre, t: c.telefono }))
      .concat(ps.filter(p => hit(p) && !p.destinoId &&
          (!p.contactoId || !cs.some(c => c.id === p.contactoId)) &&
          (vid || !this._paxLibres.includes(p.id)))
        .map(p => ({ id: 'p:' + p.id, n: p.nombre, t: p.telefono })))
      .sort((a, b) => a.n.localeCompare(b.n));
    $('#pxp-lista').innerHTML = items.map(x =>
      '<label class="grp-hit"><input type="checkbox" ' +
      (this._paxPick.includes(x.id) ? 'checked ' : '') +
      'onchange="Destinos.paxPickTog(\'' + x.id + '\')"><span><b>' +
      esc(x.n) + '</b>' +
      (x.t ? ' <span class="hint">' + esc(x.t) + '</span>' : '') +
      '</span></label>').join('') ||
      '<p class="hint" style="text-align:center">Sin resultados</p>';
    this._paxCount();
  },
  _paxCount() { const c = $('#pxp-count');
    if (c) c.textContent = this._paxPick.length ? '(' + this._paxPick.length + ')' : ''; },
  paxPickTog(id) {
    const i = this._paxPick.indexOf(id);
    if (i < 0) this._paxPick.push(id); else this._paxPick.splice(i, 1);
    this._paxCount();
  },
  async paxPickGo() {
    if (!this._paxPick.length)
      return showToast('Seleccioná al menos un pasajero', 'warn');
    const cids = this._paxPick.filter(x => x[0] === 'c').map(x => x.slice(2)),
          pids = this._paxPick.filter(x => x[0] === 'p').map(x => x.slice(2)),
          vid = this._paxVid;
    if (vid) {
      for (const pid of pids) { const p = await DB.get('pasajeros', pid);
        if (p) { p.destinoId = vid; await DB.save('pasajeros', p); } }
      if (cids.length) {
        const inV = (await DB.list('pasajeros'))
          .filter(p => p.destinoId === vid && p.contactoId)
          .map(p => p.contactoId);
        await Pasajeros.syncViaje(vid, inV.concat(cids)); }
      showToast((cids.length + pids.length) + ' pasajeros asignados');
      if (Destinos._detId === vid) Destinos.pagina(vid);
    } else {
      this._paxSel = [...new Set(this._paxSel.concat(cids))];
      this._paxLibres = [...new Set(this._paxLibres.concat(pids))];
      this.paxRender();
    }
    this._paxPick = []; closeModal('modal-paxpick');
  },
  /* enlaza al viaje los pasajeros libres elegidos en el modal (al Guardar) */
  async paxSyncLibres(vid) {
    for (const pid of this._paxLibres || []) {
      const p = await DB.get('pasajeros', pid);
      if (p && p.destinoId !== vid) { p.destinoId = vid; await DB.save('pasajeros', p); } }
  },
  paxDel(cid) {
    this._paxSel = this._paxSel.filter(x => x !== cid); this.paxRender();
  },
  async paxDelP(pid) {
    const p = await DB.get('pasajeros', pid);
    if (p) { p.destinoId = ''; await DB.save('pasajeros', p); }
    this._paxLibres = this._paxLibres.filter(x => x !== pid);
    this.paxRender();
  },
  async paxRender() {
    const ol = $('#pax-lista'); if (!ol) return;
    const cs = await DB.list('contactos'),
          ps = await DB.list('pasajeros');
    const lista = this._paxSel.map(id => cs.find(c => c.id === id))
      .filter(Boolean).map(c => ({ n: c.nombre, t: c.telefono,
        pp: c.pasaporte || c.codigo || '', f: 'paxDel', i: c.id }))
      .concat(this._paxLibres.map(id => ps.find(p => p.id === id))
        .filter(Boolean).map(p => ({ n: p.nombre, t: p.telefono,
          pp: p.pasaporte || p.codigo || '', f: 'paxDelP', i: p.id })))
      .sort((a, b) => a.n.localeCompare(b.n));
    ol.innerHTML = lista.map(c => '<li><b class="pax-nm" ' +
      'onclick="Destinos.paxIr(\'' + c.i + '\')">' + esc(c.n) + '</b>' +
      (c.t ? ' <span class="hint">' + esc(c.t) + '</span>' : '') +
      (c.pp ? '<br><span class="hint"><i class="fa-solid fa-id-card"></i> ' +
        esc(c.pp) + '</span>' : '') +
      ' <button type="button" class="iconbtn danger pit-x" ' +
      'onclick="Destinos.' + c.f + '(\'' + c.i + '\')">' +
      '<i class="fa-solid fa-xmark"></i></button></li>').join('');
  }
});
