/* buscar.js — búsqueda global (destinos, contactos, pasajeros) */
'use strict';
const Buscar = {
  async run(q) {
    const box = $('#gsearch-results');
    q = (q || '').trim().toLowerCase();
    if (!q) {
      box.innerHTML = '<p class="center muted text-sm" style="padding:1rem">Escribe para buscar…</p>';
      return;
    }
    const [ds, cs, ps] = await Promise.all([
      DB.list('destinos'), DB.list('contactos'), DB.list('pasajeros')]);
    const mD = ds.filter(d => d.nombre.toLowerCase().includes(q) ||
      (d.guia || '').toLowerCase().includes(q));
    const mC = cs.filter(c => c.nombre.toLowerCase().includes(q) ||
      (c.telefono || '').includes(q) || (c.email || '').includes(q));
    const mP = ps.filter(p => p.nombre.toLowerCase().includes(q));
    let html = '';
    if (mD.length) {
      html += '<p class="lbl">Destinos</p>' + mD.map(d =>
        '<div class="multi-item" onclick="closeModal(\'modal-buscar\');' +
        'Router.switchTab(\'destinos\').then(function(){Destinos.detalle(\'' + d.id + '\')})">' +
        '<i class="fa-solid fa-map-location-dot" style="color:var(--brand-600)"></i> ' +
        esc(d.nombre) + '</div>').join('');
    }
    if (mC.length) {
      html += '<p class="lbl mt1">Contactos</p>' + mC.map(c =>
        '<div class="multi-item" onclick="closeModal(\'modal-buscar\');' +
        'Router.switchTab(\'contactos\')">' +
        '<i class="fa-solid fa-address-book" style="color:var(--sky-600)"></i> ' +
        esc(c.nombre) + ' <span class="muted">(' + esc(c.tipo) + ')</span></div>').join('');
    }
    if (mP.length) {
      html += '<p class="lbl mt1">Pasajeros</p>' + mP.map(p =>
        '<div class="multi-item" onclick="closeModal(\'modal-buscar\');' +
        'Router.switchTab(\'contactos\')">' +
        '<i class="fa-solid fa-user" style="color:var(--purple-600)"></i> ' +
        esc(p.nombre) + '</div>').join('');
    }
    box.innerHTML = html ||
      '<p class="center muted text-sm" style="padding:1rem">Sin coincidencias.</p>';
  }
};
