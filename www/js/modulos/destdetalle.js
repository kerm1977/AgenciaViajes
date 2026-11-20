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
  const imgUrl = await Uploader.url(d.imagen, (d.imgfx || {}).b64);
  let h = '<div class="pit-hero" style="background-image:url(' +
    (imgUrl || Destinos.IMG_DEF) + ')"><div class="pit-hero-t"><h2>' +
    esc(d.nombre) + '</h2><p>' + (d.pais ? esc(d.pais) : '') +
    '</p></div></div>';
  const TG = Itinerario.totalViaje(d);
  if (TG.i) h += '<p class="pit-precio">Precio por persona<br><b>' +
    Itinerario.fmtT(d, TG.i) + '</b></p>';
  h += '<div class="flex gap1" style="margin:.45rem 0">' +
    '<button class="btn" onclick="Exportar.pdfViaje(\'' + d.id +
    '\')"><i class="fa-solid fa-file-pdf"></i> Exportar itinerario PDF</button></div>';
  if (d.notas) h += '<div class="pit-nota"><i class="fa-solid fa-note-sticky"></i> ' +
    '<div class="pit-nota-t">' + d.notas + '</div></div>';
  const fila = (ic, l, v) =>
    '<div><p class="lbl">' + l + '</p><p class="kv bold">' +
    '<i class="fa-solid ' + ic + '"></i> ' + v + '</p></div>';
  const f = d.fechas || {},
        ICON = { 'Guía':'fa-user-tie','Descripción / notas':'fa-note-sticky',
          'Transporte Acuático':'fa-ship','Transporte Terrestre':'fa-bus',
          'Agencia de Viajes / Tour Operador':'fa-briefcase',
          'Entradas':'fa-ticket','Acarreo':'fa-truck',
          'Hotel / Hostal / Hospedaje':'fa-bed',
          'Uber / Didi / Taxi / Bus':'fa-taxi',
          'Centro Turístico / Centro Arqueológico':'fa-landmark',
          'Impuestos':'fa-file-invoice','Otros':'fa-circle-info' },
        bo = d.boleto || {};
  const filas =
    (f.on && (f.desde || f.hasta)
      ? fila('fa-calendar-days', 'Fechas', esc(f.desde || '') +
          (f.hasta ? ' → ' + esc(f.hasta) : ''))
      : '') +
    (d.guia ? fila('fa-user-tie', 'Guía', esc(d.guia)) : '') +
    (d.transporte ? fila('fa-bus', 'Transporte', esc(d.transporte)) : '') +
    (d.aerolinea || d.vuelo
      ? '<div><p class="lbl">Aerolínea</p><p class="kv bold">' +
        '<i class="fa-solid fa-plane"></i> ' + esc(d.aerolinea || '') +
        (d.vuelo ? ' · ' + esc(d.vuelo) : '') + '</p>' +
        (d.checkin || d.checkout
          ? '<p class="flex gap2" style="margin-top:.25rem">' +
            (d.checkin ? '<a class="btn btn-sm btn-primary" target="_blank" href="' +
              esc(d.checkin) + '"><i class="fa-solid fa-arrow-up-right-from-square"></i> Check-in</a>' : '') +
            (d.checkout ? '<a class="btn btn-sm btn-soft" target="_blank" href="' +
              esc(d.checkout) + '"><i class="fa-solid fa-arrow-up-right-from-square"></i> Check-out</a>' : '') +
            '</p>'
          : '') + '</div>'
      : '') +
    ((bo.hdesde || bo.hhasta) ? fila('fa-clock', 'Vuelo',
      esc((bo.hdesde || '') + (bo.hhasta ? ' – ' + bo.hhasta : ''))) : '') +
    (bo.esc === '1' ? fila('fa-plane-arrival', 'Escala',
      esc([bo.escp, bo.escv, bo.esch, bo.esca].filter(Boolean).join(' · '))) : '') +
    (d.itinerario || []).map(it => fila(ICON[it.tipo] || 'fa-circle-check',
      it.tipo, esc(it.nombre || it.ruta || it.tipo))).join('');
  if (filas) h += '<h3 class="pit-dia" style="text-align:center">' +
    '<i class="fa-solid fa-circle-check"></i> Incluye</h3>' +
    '<div class="grid-2 card card-pad">' + filas + '</div>';
  if (d.noincluye)
    h += '<h3 class="pit-dia" style="text-align:center">' +
      '<i class="fa-solid fa-ban"></i> No incluye</h3>' +
      '<div class="grid-2 card" style="background:#fdf2f2;' +
      'border:1px solid #f0d4d4"><ul class="pit-ol">' +
      (d.noincluye.split(/[\n;]+/).map(s => s.trim())
        .filter(Boolean).map(s => '<li>' + esc(s) + '</li>').join('')) +
      '</ul></div>';
  if ((d.destinos || []).length)
    h += '<h3 class="pit-dia"><i class="fa-solid fa-location-dot"></i> ' +
      'Destinos del viaje</h3><ul class="pit-ol">' +
      d.destinos.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  const porDia = {};
  (d.itinerario || []).forEach(it =>
    (porDia[it.dia || 'Día 1'] = porDia[it.dia || 'Día 1'] || []).push(it));
  const dias = Object.keys(porDia).sort((a, b) =>
    parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  const COLS = ['#0f9d8f', '#7c3aed', '#0284c7', '#e11d48', '#d97706', '#4f46e5'],
        ftag = dia => {
    if (!(f.on && f.desde)) return '';
    const n = parseInt((dia || '').replace(/\D/g, '')) || 1,
          dd = new Date(f.desde + 'T00:00:00');
    dd.setDate(dd.getDate() + n - 1);
    return dd.toLocaleDateString('es-ES', { weekday: 'long',
      day: 'numeric', month: 'long', year: 'numeric' }); };
  h += dias.length
    ? '<h3 class="pit-dia"><i class="fa-solid fa-route"></i> Itinerario</h3>'
    : '';
  dias.forEach((dia, ix) => {
    const fd = ftag(dia);
    h += '<div class="pit-ev" style="--dc:' + COLS[ix % COLS.length] +
      '"><p class="pit-ev-t">' +
      '<i class="fa-solid fa-calendar-day"></i> ' + esc(dia) + '</p>' +
      (fd ? '<p class="pit-dd">' + esc(fd) + '</p>' : '') +
      '<div class="pit-tk-dash"></div>' +
      porDia[dia].map(it => {
        const esUrl = /^https?:/.test(it.maps || '');
        return '<p class="pit-ev-t"><i class="fa-solid fa-ticket"></i> ' +
          esc(it.tipo) +
          (it.destino ? ' <span class="hint">· ' + esc(it.destino) + '</span>' : '') +
          '</p>' +
          (it.adesc ? '<div class="pit-desc">' + it.adesc + '</div>' : '') +
          (it.desc ? '<div class="pit-desc">' + it.desc + '</div>' : '') +
          ((it.hdesde || it.hhasta) ? '<p class="pit-tk-time">' +
            '<i class="fa-regular fa-clock"></i> ' + esc(it.hdesde || '') +
            (it.hhasta ? ' – ' + esc(it.hhasta) : '') + '</p>' : '') +
          (it.ruta && it.ruta !== it.tipo ? '<p>' + esc(it.ruta) + '</p>' : '') +
          (it.lugar ? '<p><i class="fa-solid fa-location-dot"></i> ' +
            esc(it.lugar) + '</p>' : '') +
          (it.verinfo && it.precio ? '<p><i class="fa-solid fa-coins"></i> ' +
            Itinerario.fmtT(d, it.precio) +
            (it.modo === 'grupo' ? ' · P/G' : ' · P/P') + '</p>' : '') +
          (esUrl ? '<div class="flex gap1" style="margin-top:.4rem">' +
            (/waze/i.test(it.maps)
              ? '<a class="btn btn-sm btn-soft" target="_blank" href="' +
                esc(it.maps) + '"><i class="fa-solid fa-diamond-turn-right"></i> Waze</a>'
              : '<a class="btn btn-sm btn-soft" target="_blank" href="' +
                esc(it.maps) + '"><i class="fa-solid fa-map"></i> Maps</a>') +
            '</div>' : '');
      }).join('<div class="pit-tk-dash"></div>') + '</div>';
  });
  const pax = (await DB.list('pasajeros')).filter(p => p.destinoId === d.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  h += '<h3 class="pit-dia pit-tog" onclick="Destinos.togPax(this)">' +
    '<i class="fa-solid fa-users"></i> Pasajeros <span class="hint">(' +
    pax.length + ')</span><i class="fa-solid fa-chevron-down pit-ch"></i></h3>' +
    '<div class="pit-pax">' +
    (pax.length ? '<div class="pit-pxl">' + pax.map(p =>
      '<div class="pit-px">' +
        '<span class="pit-px-i"><i class="fa-solid fa-user"></i></span>' +
        '<div class="pit-px-b"><b>' + esc(p.nombre) + '</b>' +
          '<p class="hint">' +
            (p.telefono ? '<i class="fa-solid fa-phone"></i> ' +
              esc((p.codigo ? p.codigo + ' ' : '') + p.telefono) : '') +
            (p.asiento ? ' <i class="fa-solid fa-chair"></i> ' + esc(p.asiento) : '') +
            ' <span class="pit-ck' + (p.checkin === 'Realizado' ? ' ok' : '') +
              '">' + esc(p.checkin || 'Pendiente') + '</span></p></div>' +
        (p.checkinUrl ? '<a class="pit-lnk" target="_blank" href="' +
          esc(p.checkinUrl) + '"><i class="fa-solid fa-arrow-up-right-from-square"></i> Enlace</a>' : '') +
        ' <button type="button" class="iconbtn danger pit-x" ' +
          'onclick="Pasajeros.quitar(\'' + p.id + '\',\'' + d.id + '\')">' +
          '<i class="fa-solid fa-xmark"></i></button></div>').join('') +
      '</div>' : '') + '</div>';
  $('#pag-itin-body').innerHTML = h;
  const hero = $('#pag-itin-body .pit-hero');
  if (hero) Uploader.bindImg(hero, d);   // mismos gestos que la tarjeta
  $('#pag-itin').classList.add('open');
};
Destinos.togPax = function (h3) {
  const b = h3.nextElementSibling; if (!b) return;
  b.classList.toggle('pit-off');
  const ch = h3.querySelector('.pit-ch');
  if (ch) ch.classList.toggle('pit-ch-off');
};
