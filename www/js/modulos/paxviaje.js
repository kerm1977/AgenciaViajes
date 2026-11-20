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
    closeModal('modal-destino');
    await Router.switchTab('pasajeros'); Pasajeros.editar(p.id);
  },
  async paxNuevo() {
    closeModal('modal-destino');
    await Router.switchTab('pasajeros'); Pasajeros.nuevo();
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
