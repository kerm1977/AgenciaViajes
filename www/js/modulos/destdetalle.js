/* destdetalle.js — página completa del viaje: portada, datos del viaje,
   vuelos con check-in/out, itinerario por día con Mapa/Waze y pasajeros.
   La tarjeta del viaje abre esta página directamente (sin modal). */
'use strict';
Destinos.detalle = function (id) { Destinos.pagina(id); };
Destinos.cerrarPagina = function () {
  $('#pag-itin').classList.remove('open'); };
Destinos.pagina = async function (id) {
  const d = await DB.get('destinos', id);
  if (!d) return;
  Destinos._detId = id;
  const imgUrl = await Uploader.url(d.imagen);
  let h = '<div class="pit-hero" style="background-image:url(' +
    (imgUrl || Destinos.IMG_DEF) + ')"><div class="pit-hero-t"><h2>' +
    esc(d.nombre) + '</h2><p>' + esc(d.pais || '—') +
    (d.paxConGuia ? ' · ' + d.paxConGuia + ' van / ' +
      (d.paxSinGuia || 0) + ' pagan' : '') +
    ((d.destinos || []).length ? '<br>' + esc(d.destinos.join(' · ')) : '') +
    '</p></div></div>';
  if (d.notas) h += '<div class="pit-nota"><i class="fa-solid fa-note-sticky"></i> ' +
    esc(d.notas) + '</div>';
  const fila = (ic, l, v) =>
    '<div><p class="lbl">' + l + '</p><p class="kv bold">' +
    '<i class="fa-solid ' + ic + '"></i> ' + v + '</p></div>';
  const f = d.fechas || {};
  h += '<div class="grid-2 card card-pad">' +
    (f.on && (f.desde || f.hasta)
      ? fila('fa-calendar-days', 'Fechas', esc(f.desde || '') +
          (f.hasta ? ' → ' + esc(f.hasta) : ''))
      : '') +
    fila('fa-user-tie', 'Guía asignado', esc(d.guia || 'Sin asignar')) +
    fila('fa-bus', 'Transporte', esc(d.transporte || 'No especificado')) +
    fila('fa-plane', 'Vuelo',
      esc(d.vuelo ? ((d.aerolinea ? d.aerolinea + ' ' : '') + d.vuelo) : 'Sin vuelo')) +
    '<div><p class="lbl">Check-in / Check-out</p><p class="flex gap2">' +
      (d.checkin ? '<a class="btn btn-sm btn-primary" target="_blank" href="' +
        esc(d.checkin) + '"><i class="fa-solid fa-arrow-up-right-from-square"></i> Check-in</a>' : '') +
      (d.checkout ? '<a class="btn btn-sm btn-soft" target="_blank" href="' +
        esc(d.checkout) + '"><i class="fa-solid fa-arrow-up-right-from-square"></i> Check-out</a>' : '') +
      ((d.checkin || d.checkout) ? '' : '<span class="hint">Sin enlaces</span>') +
    '</p></div></div>';
  const porDia = {};
  (d.itinerario || []).forEach(it =>
    (porDia[it.dia || 'Día 1'] = porDia[it.dia || 'Día 1'] || []).push(it));
  const dias = Object.keys(porDia).sort((a, b) =>
    parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const ftag = dia => {
    if (!(f.on && f.desde)) return '';
    const n = parseInt((dia || '').replace(/\D/g, '')) || 1,
          dd = new Date(f.desde + 'T00:00:00');
    dd.setDate(dd.getDate() + n - 1);
    return ' · ' + dd.getDate() + '/' + (dd.getMonth() + 1) +
      '/' + dd.getFullYear(); };
  h += '<h3 class="pit-dia"><i class="fa-solid fa-route"></i> Itinerario</h3>';
  dias.forEach(dia => {
    h += '<h3 class="pit-dia"><i class="fa-solid fa-calendar-day"></i> ' +
      esc(dia) + esc(ftag(dia)) + '</h3>';
    porDia[dia].forEach(it => {
      const q = encodeURIComponent(
        [it.destino, d.pais].filter(Boolean).join(', '));
      const waze = it.maps
        ? 'https://waze.com/ul?q=' + encodeURIComponent(it.maps)
        : 'https://waze.com/ul?q=' + q;
      const gmaps = it.maps ||
        ('https://www.google.com/maps/search/?api=1&query=' + q);
      h += '<div class="pit-ev card card-pad">' +
        '<p class="pit-ev-t"><i class="fa-solid fa-location-dot"></i> ' +
          esc(it.tipo) +
          (it.destino ? ' <span class="hint">· ' + esc(it.destino) + '</span>' : '') +
          '</p>' +
        (it.ruta && it.ruta !== it.tipo ? '<p>' + esc(it.ruta) + '</p>' : '') +
        (it.nombre ? '<p><i class="fa-solid fa-user"></i> ' + esc(it.nombre) + '</p>' : '') +
        (it.tel ? '<p><i class="fa-solid fa-phone"></i> ' + esc(it.tel) + '</p>' : '') +
        (it.telGuia ? '<p><i class="fa-solid fa-user-tie"></i> ' + esc(it.telGuia) + '</p>' : '') +
        ((it.hdesde || it.hhasta) ? '<p><i class="fa-regular fa-clock"></i> ' +
          esc(it.hdesde || '') + (it.hhasta ? ' – ' + esc(it.hhasta) : '') +
          '</p>' : '') +
        (it.guia ? '<p><i class="fa-solid fa-user-check"></i> Guía: ' +
          esc(it.guia) + '</p>' : '') +
        (it.desc ? '<p class="hint">' + esc(it.desc) + '</p>' : '') +
        '<div class="flex gap1" style="margin-top:.4rem">' +
          '<a class="btn btn-sm btn-soft" target="_blank" href="' + esc(gmaps) +
            '"><i class="fa-solid fa-map"></i> Maps</a>' +
          '<a class="btn btn-sm btn-soft" target="_blank" href="' + esc(waze) +
            '"><i class="fa-solid fa-diamond-turn-right"></i> Waze</a>' +
        '</div></div>';
    });
  });
  if (!dias.length) h += '<p class="hint">Sin itinerario todavía.</p>';
  const pax = (await DB.list('pasajeros')).filter(p => p.destinoId === d.id);
  h += '<h3 class="pit-dia"><i class="fa-solid fa-users"></i> Pasajeros</h3>' +
    (pax.length
      ? '<div class="flex gap1" style="flex-wrap:wrap">' +
        pax.map(p => '<span class="pax-badge"><i class="fa-solid fa-user"></i> ' +
          esc(p.nombre) + (p.asiento ? ' <span class="muted">(' +
          esc(p.asiento) + ')</span>' : '') + '</span>').join('') + '</div>'
      : '<p class="hint">No hay pasajeros asignados a este viaje.</p>');
  $('#pag-itin-body').innerHTML = h;
  $('#pag-itin').classList.add('open');
};
