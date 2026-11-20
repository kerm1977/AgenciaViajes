/* paxviaje.js — acordeón Pasajeros del formulario de viaje: buscador
   sobre TODOS los contactos; al elegirlos se agregan como pasajeros
   del viaje (Pasajeros.syncViaje los graba al guardar). */
'use strict';
Object.assign(Destinos, {
  _paxSel: [],
  paxReset() { this._paxSel = []; this.paxRender(); },
  async paxCargar(did) {
    this._paxSel = ((await DB.list('pasajeros')) || [])
      .filter(p => p.destinoId === did && p.contactoId)
      .map(p => p.contactoId);
    this.paxRender();
  },
  async paxBuscar(q) {
    const dd = $('#pax-drop'); if (!dd) return;
    q = (q || '').toLowerCase().trim();
    if (!q) { dd.innerHTML = ''; return; }
    const cs = (await DB.list('contactos'))
      .filter(c => !this._paxSel.includes(c.id) &&
        ((c.nombre || '').toLowerCase().includes(q) ||
         (c.telefono || '').includes(q)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)).slice(0, 8);
    dd.innerHTML = cs.map(c =>
      '<button type="button" class="pax-hit" onclick="Destinos.paxAdd(\'' +
      c.id + '\')"><i class="fa-solid fa-user-plus"></i> <b>' +
      esc(c.nombre) + '</b>' +
      (c.telefono ? ' · ' + esc(c.telefono) : '') + '</button>').join('');
  },
  paxAdd(cid) {
    if (!this._paxSel.includes(cid)) this._paxSel.push(cid);
    $('#pax-buscar').value = ''; $('#pax-drop').innerHTML = '';
    this.paxRender();
  },
  paxDel(cid) {
    this._paxSel = this._paxSel.filter(x => x !== cid); this.paxRender();
  },
  async paxRender() {
    const ol = $('#pax-lista'); if (!ol) return;
    const cs = await DB.list('contactos');
    const lista = this._paxSel.map(id => cs.find(c => c.id === id))
      .filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre));
    ol.innerHTML = lista.map(c => '<li><b>' + esc(c.nombre) + '</b>' +
      (c.telefono ? ' <span class="hint">' + esc(c.telefono) + '</span>' : '') +
      ' <button type="button" class="iconbtn danger pit-x" ' +
      'onclick="Destinos.paxDel(\'' + c.id + '\')">' +
      '<i class="fa-solid fa-xmark"></i></button></li>').join('');
  }
});
