/* paxgrupo.js — modal "Asignar Grupo a Viaje" (pasajeros libres → viaje) */
'use strict';
Object.assign(Pasajeros, {
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
    if (window.Contactos) Contactos.render();
  }
});
