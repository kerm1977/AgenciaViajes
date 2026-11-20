/* borrador.js — persistencia del formulario "Crear Destino y Viaje":
   autoguardado ante cada cambio (localStorage), restauración al abrir,
   doble confirmación en Cancelar, limpieza solo al guardar o cancelar. */
'use strict';
const Borrador = {
  KEY: 'lt_draft_destino',
  _t: null,
  save() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      try {
        if (!$('#form-destino')) return;
        const d = {
          editId: ($('#destino-id') || {}).value || '',
          noincluye: ($('#dest-noincluye') || {}).value || '',
          desc: ($('#desc-editor') || {}).innerHTML || '',
          paxSel: (window.Destinos && Destinos._paxSel) || [],
          paxLibres: (window.Destinos && Destinos._paxLibres) || [],
          conguia: $('#dest-conguia').value,
          singuia: $('#dest-singuia').value,
          moneda: $('#dest-moneda').value,
          pais: $('#dest-pais').value,
          nombre: $('#dest-nombre').value,
          fechas: { on: $('#dest-tiene-fechas').checked,
            desde: $('#dest-fdesde').value,
            hasta: $('#dest-fhasta').value },
          destinos: $$('#destinos-lista-container .dst-item, #destinos-lista-container .dst-txt')
            .map(i => (i.value !== undefined ? i.value : i.textContent)).filter(s => s.trim()),
          itinerario: Itinerario.collect(),
          dias: (Itinerario.collectDias && Itinerario.collectDias()) || []
        };
        localStorage.setItem(this.KEY, JSON.stringify(d));
      } catch (e) {}
    }, 350);
  },
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); }
    catch (e) { return null; }
  },
  clear() { localStorage.removeItem(this.KEY); },
  restore(d) {
    $('#dest-conguia').value = d.conguia || '';
    $('#dest-singuia').value = d.singuia || '';
    $('#dest-moneda').value = d.moneda || 'USD';
    Destinos._fillPais(d.pais || '');
    $('#dest-nombre').value = d.nombre || '';
    const f = d.fechas || {};
    $('#dest-tiene-fechas').checked = !!f.on;
    $('#dest-fdesde').value = f.desde || '';
    $('#dest-fhasta').value = f.hasta || '';
    if (window.Destinos) Destinos.togFechas();
    const ni = $('#dest-noincluye'); if (ni) ni.value = d.noincluye || '';
    const ed2 = $('#desc-editor'); if (ed2) ed2.innerHTML = d.desc || '';
    if (window.Destinos) { Destinos._paxSel = d.paxSel || [];
      Destinos._paxLibres = d.paxLibres || [];
      if (Destinos.paxRender) Destinos.paxRender(); }
    const dc = $('#destinos-lista-container'); dc.innerHTML = '';
    (d.destinos && d.destinos.length ? d.destinos : [null])
      .forEach(n => Destinos.addDestino(n));
    if (window.Itinerario) Itinerario.syncItin();
    (d.itinerario || []).forEach(it => {
      if (it.campo) {
        const k = (Itinerario.CAMPOS[it.campo] || {}).k ||
          ({ 'Aerolínea': 'aerolinea', 'Transporte': 'transporte' })[it.campo];
        Destinos.addItRow(null, '', k === 'aerolinea' ? 'Transporte Aéreo' :
          it.campo, it.valor, /^(aerolinea|transporte)$/.test(k) ? it : null);
      }
      else Destinos.addItRow(it.destino, it.dia, it.tipo, it.ruta, it, 1);
    });
    if (Itinerario.setDias) Itinerario.setDias(d.dias);
    Itinerario.refresh();
  },
  async cancelar() {
    if (!await confirmar('¿Cancelar? Se perderá la información del ' +
        'formulario de destino y viaje.')) return;
    if (!await confirmar('¿Seguro? Esta acción NO se puede deshacer: ' +
        'los datos escritos se borran.')) return;
    this.clear();
    const pg = $('#pag-destino'); if (pg) pg.classList.remove('open');
  }
};
/* autoguardado: cualquier tecla, cambio u opción del selector-modal dentro
   del formulario persiste el borrador (debounce 350 ms) */
['input', 'change'].forEach(ev =>
  document.addEventListener(ev, e => {
    if (e.target && e.target.closest && e.target.closest('#form-destino'))
      Borrador.save();
  }, true));
document.addEventListener('click', e => {
  if (e.target && e.target.closest && e.target.closest('#form-destino'))
    setTimeout(() => Borrador.save(), 0);
}, true);
