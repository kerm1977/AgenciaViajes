/* destdetalle.js — página completa del viaje: portada, precio animado y una
   sola tarjeta informativa con todas las secciones separadas por HR.
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
  if (d.notas) h += '<div class="pit-nota"><i class="fa-solid fa-note-sticky"></i> ' +
    '<div class="pit-nota-t">' + d.notas + '</div></div>';
  const f = d.fechas || {},
        ICON = { 'Guía':'fa-user-tie','Descripción / notas':'fa-note-sticky',
          'Transporte Acuático':'fa-ship','Transporte Terrestre':'fa-bus',
          'Agencia de Viajes / Tour Operador':'fa-briefcase',
          'Entradas':'fa-ticket','Acarreo':'fa-truck',
          'Hotel / Hostal / Hospedaje':'fa-bed',
          'Uber / Didi / Taxi / Bus':'fa-taxi',
          'Centro Turístico / Centro Arqueológico':'fa-landmark',
          'Impuestos':'fa-file-invoice','Otros':'fa-circle-info' },
        bo = d.boleto || {}, MC = !!d.mostrarCostos;
  const PIL = ['#fde2e4', '#dbe7ff', '#ddf1e4', '#fff1d6', '#e8dff5',
               '#fce8f3', '#e6f0fb', '#e2ece9'];
  const fila = (ic, l, v) => v ? '<p class="kv"><i class="fa-solid ' + ic +
    '"></i> ' + (l ? '<span class="muted">' + l + ': </span>' : '') +
    '<strong>' + v + '</strong></p>' : '';
  const lnk = (u, t) => /^https?:/.test(u || '')
    ? '<a class="btn btn-sm btn-soft" target="_blank" href="' + esc(u) +
      '">' + t + '</a>' : '';
  const sH = (ic, t) => '<p class="lbl" style="margin:.1rem 0 .3rem">' +
    '<i class="fa-solid ' + ic + '"></i> ' + esc(t) + '</p>';
  const sec = [];                       /* secciones unidas por HR */
  if (f.on && (f.desde || f.hasta)) sec.push(sH('fa-calendar-days', 'Fechas') +
    fila('fa-calendar-days', '', esc(f.desde || '') +
      (f.hasta ? ' → ' + esc(f.hasta) : '')));
  if (d.aerolinea || bo.clase || bo.ai === '1' || bo.os === '1' || bo.esc === '1')
    sec.push(sH('fa-plane', 'Aerolínea') +
      fila('fa-plane', '', esc(d.aerolinea || '')) +
      fila('fa-chair', 'Clase', esc(bo.clase || '')) +
      (bo.ai === '1' ? fila('fa-check', 'Asiento', 'Incluido') : '') +
      ((bo.hdesde || bo.hhasta) ? fila('fa-clock', 'Horario',
        esc((bo.hdesde || '') + (bo.hhasta ? ' – ' + bo.hhasta : ''))) : '') +
      (bo.esc === '1' ? fila('fa-plane-arrival', 'Escala',
        esc([bo.escp, bo.escv, bo.esch, bo.esca].filter(Boolean).join(' · '))) : '') +
      (bo.os === '1' ? fila('fa-bell-concierge', 'Otros servicios',
        esc([bo.osv, bo.osd].filter(Boolean).join(' · ') || 'Sí')) : '') +
      (MC && bo.pb ? fila('fa-coins', 'Precio boleto',
        Itinerario.fmtT(d, parseFloat(bo.pb) || 0)) : '') +
      '<div class="flex gap1" style="margin-top:.3rem">' +
        lnk(d.checkin || bo.ci, 'Check-in') + '</div>');
  if (d.trans) sec.push(sH('fa-bus', 'Transporte') +
    fila('fa-bus', '', esc(d.trans.tsel === 'TRANSAVI' ? 'TRANSAVI'
      : (d.trans.tnombre || ''))) +
    fila('fa-phone', 'Teléfono', esc(d.trans.ttel || '')) +
    (d.trans.tdesc ? '<div class="pit-desc">' + d.trans.tdesc + '</div>' : ''));
  else if (d.transporte) sec.push(sH('fa-bus', 'Transporte') +
    fila('fa-bus', '', esc(d.transporte)));
  (d.itinerario || []).forEach(it => {
    if (it.campo) return;                /* aéreo/transporte ya salen arriba */
    sec.push(sH(ICON[it.tipo] || 'fa-circle-check', it.tipo || 'Campo') +
      fila(ICON[it.tipo] || 'fa-circle-check', '',
        esc(it.nombre || it.ruta || '')) +
      fila('fa-phone', 'Teléfono', esc(it.tel || '')) +
      fila('fa-phone', 'Tel. guía', esc(it.telGuia || '')) +
      (it.desc ? '<div class="pit-desc">' + it.desc + '</div>' : '') +
      '<div class="flex gap1" style="margin-top:.3rem">' +
        lnk(it.maps, 'Maps') + lnk(it.waze, 'Waze') + '</div>' +
      (MC && it.precio ? fila('fa-coins', 'Precio',
        Itinerario.fmtT(d, it.precio) +
        (it.modo === 'grupo' ? ' · P/G' : ' · P/P')) : ''));
  });
  if (d.noincluye) sec.push(sH('fa-ban', 'No incluye') + '<ul class="pit-ol">' +
    d.noincluye.split(/[\n;]+/).map(s => s.trim())
      .filter(Boolean).map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>');
  if ((d.destinos || []).length) sec.push(sH('fa-location-dot',
    'Destinos del viaje') + '<div class="flex" style="gap:.3rem;flex-wrap:wrap">' +
    d.destinos.map((x, i) => '<span style="font-size:11px;padding:.15rem .55rem;' +
      'border-radius:1rem;background:' + PIL[i % 8] + '">' + esc(x) +
      '</span>').join('') + '</div>');
  const porDia = {};
  (d.itinerario || []).forEach(it => { if (it.dia)
    (porDia[it.dia] = porDia[it.dia] || []).push(it); });
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
  if (dias.length) sec.push(sH('fa-route', 'Día a día') +
    dias.map((dia, ix) => {
      const fd = ftag(dia);
      return '<div class="pit-ev" style="--dc:' + COLS[ix % COLS.length] +
        '"><p class="pit-ev-t"><i class="fa-solid fa-calendar-day"></i> ' +
        esc(dia) + '</p>' + (fd ? '<p class="pit-dd">' + esc(fd) + '</p>' : '') +
        '<div class="pit-tk-dash"></div>' +
        porDia[dia].map(it => {
          const sec2 = [];
          if (it.adesc) sec2.push('<div class="pit-desc">' + it.adesc + '</div>');
          if (it.desc) sec2.push('<div class="pit-desc">' + it.desc + '</div>');
          if (it.lugar) sec2.push('<p><i class="fa-solid fa-location-dot"></i> ' +
            esc(it.lugar) + '</p>');
          return (sec2.length ? sec2.join('') + '<hr class="pit-sep">' : '') +
            '<p class="pit-ev-t"><i class="fa-solid fa-ticket"></i> ' +
            esc(it.tipo) +
            (it.destino ? ' <span class="hint">· ' + esc(it.destino) + '</span>' : '') +
            '</p>' +
            (it.ruta && it.ruta !== it.tipo ? '<p>' + esc(it.ruta) + '</p>' : '') +
            (MC && it.verinfo && it.precio ? '<p><i class="fa-solid fa-coins"></i> ' +
              Itinerario.fmtT(d, it.precio) +
              (it.modo === 'grupo' ? ' · P/G' : ' · P/P') + '</p>' : '') +
            ((it.hdesde || it.hhasta) ? '<p class="pit-tk-time">' +
              '<i class="fa-regular fa-clock"></i> ' + esc(it.hdesde || '') +
              (it.hhasta ? ' – ' + esc(it.hhasta) : '') + '</p>' : '') +
            (/^https?:/.test(it.maps || '') ? '<div class="flex gap1" style="margin-top:.4rem">' +
              (/waze/i.test(it.maps)
                ? '<a class="btn btn-sm btn-soft" target="_blank" href="' +
                  esc(it.maps) + '"><i class="fa-solid fa-diamond-turn-right"></i> Waze</a>'
                : '<a class="btn btn-sm btn-soft" target="_blank" href="' +
                  esc(it.maps) + '"><i class="fa-solid fa-map"></i> Maps</a>') +
              '</div>' : '');
        }).join('<div class="pit-tk-dash"></div>') + '</div>';
    }).join(''));
  const pax = (await DB.list('pasajeros')).filter(p => p.destinoId === d.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  sec.push('<p class="lbl pit-tog" style="margin:.1rem 0 .3rem;cursor:pointer" ' +
    'onclick="Destinos.togPax(this)"><i class="fa-solid fa-users"></i> Pasajeros ' +
    '<span class="hint">(' + pax.length + ')</span>' +
    '<i class="fa-solid fa-chevron-down pit-ch" style="margin-left:auto"></i></p>' +
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
      '</div>' : '') + '</div>');
  h += '<div class="card card-pad"><p class="lbl" style="margin:.1rem 0 .4rem">' +
    '<i class="fa-solid fa-circle-info"></i> Información del viaje</p>' +
    sec.join('<hr class="it-hr">') + '</div>';
  h += '<div class="flex gap1" style="margin:.6rem 0">' +
    '<button class="btn btn-primary" style="flex:1" onclick="Exportar.pdfViaje(\'' + d.id +
    '\')"><i class="fa-solid fa-file-pdf"></i> Exportar itinerario PDF</button></div>';
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
/* un toque en la imagen de la tarjeta abre el detalle con delay —
   los 5 toques y la pulsación larga de Uploader ganan si llegan */
Destinos.imgTap = function (id) {
  const u = Uploader;
  if (u._lp && Date.now() - u._lp < 1200) return;
  this._imgTaps = (this._imgTaps || 0) + 1; clearTimeout(this._imgTt);
  if (this._imgTaps >= 5) { this._imgTaps = 0; return; }
  this._imgTt = setTimeout(() => { this._imgTaps = 0; this.detalle(id); }, 950);
};
