/* pdfviaje.js — PDF de un viaje: documento simple tipo cotización */
'use strict';
const PdfViaje = {
  _txt(s) { const v = document.createElement('div');
    v.innerHTML = s || ''; return (v.textContent || '').trim(); },
  async generar(d) {
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J) { showToast('jsPDF no cargado', 'error'); return; }
    const doc = new J(), W = 210, M = 16, CW = W - M * 2, B = 297,
          f = d.fechas || {}, bo = d.boleto || {}, MC = !!d.mostrarCostos,
          txt = this._txt;
    let y = 20, pag = 1;
    const pie = () => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(.3);
      doc.line(M, B - 12, W - M, B - 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('La Tribu de los Libres Travels', M, B - 7);
      doc.text('Página ' + pag, W - M, B - 7, { align: 'right' }); },
    need = h => { if (y + h > B - 18) { pie(); doc.addPage(); pag++; y = 18; } },
    hr = () => { need(6); doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(.35); doc.line(M, y, W - M, y); y += 6; },
    seccion = t => { need(11); y += 3;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.setTextColor(15, 157, 143);
      doc.text(t.toUpperCase(), M, y); y += 2;
      doc.setDrawColor(15, 157, 143); doc.setLineWidth(.5);
      doc.line(M, y, W - M, y); y += 5; },
    kv = (l, v) => { if (!v) return; need(5.4);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); doc.text(l, M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.splitTextToSize(String(v), CW - 42).forEach((ln, i) => {
        if (i) { y += 4.4; need(4.4); }
        doc.text(ln, M + 42, y); });
      y += 4.6; },
    bullet = (t, g) => { if (!t) return;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.splitTextToSize('•  ' + t, CW - (g || 0)).forEach(l => {
        need(4.6); doc.text(l, M + (g || 0), y); y += 4.6; }); };
    /* ── encabezado tipo cotización ── */
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(15, 157, 143);
    doc.text('LA TRIBU DE LOS LIBRES TRAVELS', M, y);
    doc.setFontSize(15); doc.setTextColor(30, 41, 59);
    doc.text('COTIZACIÓN', W - M, y, { align: 'right' });
    y += 5.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Folio ' + String(d.id || '').slice(0, 8).toUpperCase(),
      W - M, y, { align: 'right' });
    y += 4;
    doc.text('Emitida: ' + new Date().toLocaleDateString('es-ES',
      { day: 'numeric', month: 'long', year: 'numeric' }),
      W - M, y, { align: 'right' });
    y += 6; hr();
    /* ── viaje ── */
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.splitTextToSize(String(d.nombre || 'Viaje'), CW)
      .forEach(l => { doc.text(l, M, y); y += 6.4; });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text([d.pais, 'Moneda: ' + (d.moneda || 'USD')]
      .filter(Boolean).join('   ·   '), M, y); y += 7;
    /* ── información ── */
    seccion('Información del viaje');
    if (f.on && f.desde) {
      kv('Fechas', f.desde + (f.hasta ? '  →  ' + f.hasta : ''));
      const n = Math.round((new Date(f.hasta || f.desde) -
        new Date(f.desde)) / 864e5) + 1;
      if (f.hasta && n > 0) kv('Duración', n + ' días'); }
    kv('Aerolínea', d.aerolinea);
    kv('Clase', bo.clase);
    if (bo.ai === '1') kv('Asiento', 'Incluido');
    if (bo.hdesde || bo.hhasta)
      kv('Horario', (bo.hdesde || '') + (bo.hhasta ? ' – ' + bo.hhasta : ''));
    if (bo.esc === '1') kv('Escala',
      [bo.escp, bo.escv, bo.esch, bo.esca].filter(Boolean).join(' · '));
    if (bo.os === '1') kv('Otros servicios',
      [bo.osv, bo.osd].filter(Boolean).join(' · ') || 'Sí');
    kv('Check-in', d.checkin || bo.ci);
    if (d.trans) kv('Transporte',
      (d.trans.tsel === 'TRANSAVI' ? 'TRANSAVI' : d.trans.tnombre || '') +
      (d.trans.ttel ? ' · ' + d.trans.ttel : ''));
    else kv('Transporte', d.transporte);
    (d.itinerario || []).forEach(it => { if (it.campo) return;
      kv(it.tipo || 'Campo',
        [it.nombre || it.ruta, it.tel ? 'Tel: ' + it.tel : '',
         it.telGuia ? 'Guía: ' + it.telGuia : '']
        .filter(Boolean).join('  ·  ') || 'Sí'); });
    const dsc = txt(d.notas);
    if (dsc) { seccion('Descripción del viaje'); bullet(dsc); }
    /* ── lugares a visitar ── */
    if ((d.destinos || []).length) {
      seccion('Lugares a visitar');
      d.destinos.forEach(x => bullet(x)); }
    /* ── incluye / no incluye ── */
    const inc = (d.itinerario || [])
      .map(it => it.nombre || it.ruta).filter(Boolean);
    if (inc.length) { seccion('Incluye'); inc.forEach(x => bullet(x)); }
    const noi = (d.noincluye || '').split(/[\n;]+/)
      .map(s => s.trim()).filter(Boolean);
    if (noi.length) { seccion('No incluye'); noi.forEach(x => bullet(x)); }
    /* ── día a día ── */
    const por = {};
    (d.itinerario || []).forEach(i => { if (i.dia)
      (por[i.dia] = por[i.dia] || []).push(i); });
    const dias = Object.keys(por).sort((a, b) =>
      parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
    if (dias.length) {
      seccion('Día a día');
      dias.forEach(dia => {
        need(8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(dia + (f.on && f.desde ?
          '  ·  ' + this._fDia(f.desde, dia) : ''), M, y);
        y += 5;
        por[dia].forEach(it => {
          const partes = [it.tipo + (it.destino ? ' · ' + it.destino : ''),
            it.nombre || it.ruta, txt(it.adesc || it.desc),
            it.lugar ? 'Lugar: ' + it.lugar : '',
            (it.hdesde || it.hhasta) ? 'Hora: ' + (it.hdesde || '') +
              (it.hhasta ? ' – ' + it.hhasta : '') : '',
            MC && it.verinfo && it.precio ?
              Itinerario.fmtT(d, it.precio) +
              (it.modo === 'grupo' ? ' · por grupo' : ' · por persona') : '']
            .filter(Boolean);
          bullet(partes.join('   —   '), 3); });
        y += 1.5; }); }
    /* ── precio por persona (solo si mostrarCostos) ── */
    const TG = Itinerario.totalViaje(d);
    if (MC && TG.i) {
      need(16); y += 4;
      doc.setFillColor(15, 157, 143);
      doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('PRECIO POR PERSONA', M + 6, y + 7.6);
      doc.text(Itinerario.fmtT(d, TG.i), W - M - 6, y + 7.6,
        { align: 'right' });
      y += 16; }
    pie();
    await Exportar._savePdf(doc,
      'cotizacion_' + (d.nombre || 'viaje').replace(/\W+/g, '_') + '.pdf');
    showToast('Cotización PDF generada');
  },
  _fDia(desde, dia) {
    const n = parseInt((dia || '').replace(/\D/g, '')) || 1,
          dd = new Date(desde + 'T00:00:00');
    dd.setDate(dd.getDate() + n - 1);
    return dd.toLocaleDateString('es-ES', { weekday: 'long',
      day: 'numeric', month: 'long', year: 'numeric' });
  },
  /* reservado: cover con ajustes para el futuro botón "imagen en la cotización" */
  cover(u, cw, ch) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        const sc = Math.max(cw / im.width, ch / im.height),
              w = im.width * sc, h = im.height * sc;
        cv.getContext('2d').drawImage(im,
          (cw - w) / 2, (ch - h) / 2, w, h);
        res(cv.toDataURL('image/jpeg', .85)); };
      im.onerror = () => res(null); im.src = u; });
  },
  _imgFx(d) {
    return Uploader.url(d.imagen, (d.imgfx || {}).b64, true).then(u =>
      /^data:image/.test(u || '') ? new Promise(res => {
        const f = Object.assign({ x: 0, y: 0, s: 100 }, d.imgfx || {}),
              im = new Image();
        im.onload = () => {
          const cw = this._imgW = 1000, ch = this._imgH = 560,
                cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          const sc = Math.max(cw / im.width, ch / im.height) * f.s / 100,
                w = im.width * sc, h = im.height * sc;
          cv.getContext('2d').drawImage(im,
            (cw - w) * (50 - f.x) / 100, (ch - h) * (50 - f.y) / 100, w, h);
          res(cv.toDataURL('image/jpeg', .85));
        };
        im.onerror = () => res(null); im.src = u;
      }) : null);
  }
};
