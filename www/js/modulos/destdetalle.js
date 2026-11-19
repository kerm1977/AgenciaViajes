/* destdetalle.js — modal detalle del viaje: portada, datos, itinerario
   por destino en acordeones y pasajeros asignados. */
'use strict';
Destinos.detalle = async function (id) {
  const d = await DB.get('destinos', id);
  if (!d) return;
  $('#detalle-destino-header').style.backgroundImage =
    'url(' + (d.imagen || Destinos.IMG_DEF) + ')';
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
  const mon = d.moneda === 'CRC' ? '₡' : '$';
  const il = $('#detalle-itinerario-list');
  il.innerHTML = (d.itinerario || []).length
    ? d.itinerario.map(it =>
        '<div class="it-acc">' +
        '<button type="button" class="it-acc-btn" ' +
          'onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<span class="dia">' + esc(it.dia || '') + '</span>' +
          '<span class="it-acc-t">' +
            esc((it.destino ? it.destino + ' · ' : '') + (it.tipo || 'Parada')) +
          '</span><i class="fa-solid fa-chevron-down"></i></button>' +
        '<div class="it-acc-body">' +
          '<p>' + esc(it.ruta && it.ruta !== it.tipo ? it.ruta : 'Sin detalle') +
            '</p>' +
          ((it.nombre || it.tel || it.telGuia || it.precio)
            ? '<p class="hint text-xs">' +
              (it.nombre ? '<i class="fa-solid fa-user"></i> ' + esc(it.nombre) + ' · ' : '') +
              (it.tel ? '<i class="fa-solid fa-phone"></i> ' + esc(it.tel) + ' · ' : '') +
              (it.telGuia ? '<i class="fa-solid fa-user-tie"></i> ' + esc(it.telGuia) + ' · ' : '') +
              (it.maps ? '<a href="' + esc(it.maps) + '" target="_blank">' +
                '<i class="fa-solid fa-map"></i> Mapa</a> · ' : '') +
              (it.precio ? mon + Number(it.precio).toFixed(2) + ' ' +
                esc(it.modo === 'grupo' ? 'por grupo' : 'por persona') : '') +
              '</p>' : '') +
          (it.desc ? '<p class="hint text-xs">' + esc(it.desc) + '</p>' : '') +
        '</div></div>').join('')
    : '<p class="hint">No hay rutas registradas para este viaje.</p>';
  const pax = (await DB.list('pasajeros')).filter(p => p.destinoId === d.id);
  $('#detalle-pasajeros-list').innerHTML = pax.length
    ? pax.map(p => '<span class="pax-badge"><i class="fa-solid fa-user"></i> ' +
        esc(p.nombre) + (p.asiento ? ' <span class="muted">(' + esc(p.asiento) +
        ')</span>' : '') + '</span>').join('')
    : '<p class="hint">No hay pasajeros asignados a este destino.</p>';
  openModal('modal-detalle-destino');
};
