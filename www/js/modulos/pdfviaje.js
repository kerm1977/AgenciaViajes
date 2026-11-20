/* pdfviaje.js — PDF estilizado de un viaje: espejo visual de la página */
'use strict';
const PdfViaje = {
  COLS: [[15,157,143],[124,58,237],[2,132,199],[225,29,72],[217,119,6],[79,70,229]],
  _txt(s) { const v = document.createElement('div');
    v.innerHTML = s || ''; return (v.textContent || '').trim(); },
  _tint(c, p) { return c.map(v => Math.round(v * p + 255 * (1 - p))); },
  async generar(d) {
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J) { showToast('jsPDF no cargado', 'error'); return; }
    const doc = new J(), W = 210, M = 14, CW = W - M * 2, B = 297,
          f = d.fechas || {}, bo = d.boleto || {}, MC = !!d.mostrarCostos,
          txt = this._txt, tint = this._tint;
    let y = 0, pag = 1;
    const pie = () => { doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(.3); doc.line(M, B - 12, W - M, B - 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('La Tribu de los Libres Travels', M, B - 7);
      doc.text('Página ' + pag, W - M, B - 7, { align: 'right' }); },
    need = h => { if (y + h > B - 17) {
      pie(); doc.addPage(); pag++; y = 14; } },
    cab = (t, c) => { need(16); y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(t.toUpperCase(), M + CW / 2, y, { align: 'center' });
      y += 2.4; doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(.7);
      doc.line(M + CW / 2 - 9, y, M + CW / 2 + 9, y);
      doc.setLineWidth(.3); y += 5; },
    tarjeta = (titulo, c, fill, borde, items) => {
      if (!items.length) return;
      cab(titulo, c);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const h = items.map(t =>
            doc.splitTextToSize(t, CW - 8).length * 4.4)
          .reduce((a, b) => a + b, 0) + 5;
      need(h);
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.setDrawColor(borde[0], borde[1], borde[2]);
      doc.roundedRect(M, y, CW, h, 1.6, 1.6, 'FD');
      y += 4.6; doc.setTextColor(51, 65, 85);
      items.forEach(t => doc.splitTextToSize(t, CW - 8)
        .forEach(l => { doc.text(l, M + 4, y); y += 4.4; }));
      y += 2; };
    /* encabezado de marca */
    doc.setFillColor(15, 157, 143); doc.rect(0, 0, W, 27, 'F');
    doc.setFillColor(11, 110, 101); doc.rect(0, 27, W, 1.4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('LA TRIBU DE LOS LIBRES TRAVELS', M, 8);
    doc.setFontSize(15);
    doc.text(doc.splitTextToSize(String(d.nombre || 'Viaje'), CW)[0], M, 17);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text([d.pais, f.on && f.desde ? f.desde +
      (f.hasta ? ' → ' + f.hasta : '') : '', 'Moneda: ' + (d.moneda || 'USD')]
      .filter(Boolean).join('   ·   '), M, 23.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('COTIZACIÓN', W - M, 8, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text('Folio ' + String(d.id || '').slice(0, 8).toUpperCase(),
      W - M, 13.5, { align: 'right' });
    doc.text('Emitida: ' + new Date().toLocaleDateString('es-ES'),
      W - M, 18, { align: 'right' });
    y = 34;
    /* portada: imagen con proporción real (cover; marco = relación del canvas) */
    const img = await this._imgFx(d);
    if (img) { const hi = CW * this._imgH / this._imgW;
      doc.addImage(img, 'JPEG', M, y, CW, hi); y += hi + 6; }
    const TG = Itinerario.totalViaje(d);
    if (MC && TG.i) { doc.setFillColor(15, 157, 143);
      doc.roundedRect(M, y, CW, 11, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('PRECIO POR PERSONA:  ' + Itinerario.fmtT(d, TG.i),
        M + CW / 2, y + 7.3, { align: 'center' }); y += 15; }
    /* información del viaje */
    const info = [];
    if (d.pais) info.push('País: ' + d.pais);
    if (f.on && f.desde)
      info.push('Fechas: ' + f.desde + (f.hasta ? ' → ' + f.hasta : ''));
    if (d.transporte) info.push('Transporte: ' + d.transporte);
    if (d.aerolinea || d.vuelo)
      info.push('Aerolínea: ' + (d.aerolinea || '') +
        (d.vuelo ? ' · ' + d.vuelo : '') +
        (d.checkin ? ' · Check-in: ' + d.checkin : ''));
    if (bo.hdesde || bo.hhasta)
      info.push('Vuelo: ' + (bo.hdesde || '') +
        (bo.hhasta ? ' – ' + bo.hhasta : ''));
    if (bo.esc === '1')
      info.push('Escala: ' + [bo.escp, bo.escv, bo.esch, bo.esca]
        .filter(Boolean).join(' · '));
    if (txt(d.notas)) info.push(txt(d.notas));
    if (MC && TG.i)
      info.push('Total cotización por persona: ' + Itinerario.fmtT(d, TG.i));
    tarjeta('Información del viaje', [15,157,143], [248,250,252],
      [226,232,240], info);
    /* hoja dedicada: Incluye + No incluye + Destinos */
    const inc = [];
    if (d.guia) inc.push('Guía: ' + d.guia);
    (d.itinerario || []).forEach(it => {
      const lbl = it.nombre || it.ruta || it.tipo;
      if (lbl && lbl !== it.tipo) inc.push(it.tipo + ': ' + lbl); });
    const noi = (d.noincluye || '').split(/[\n;]+/).map(s => s.trim())
      .filter(Boolean).map(x => '• ' + x),
          des = (d.destinos || []).map(x => '• ' + x);
    if (inc.length || noi.length || des.length) {
      pie(); doc.addPage(); pag++; y = 14;
      tarjeta('Incluye', [15,157,143], [248,250,252], [226,232,240], inc);
      tarjeta('No incluye', [190,18,60], [253,242,242], [254,202,202], noi);
      tarjeta('Destinos del viaje', [2,132,199], [240,249,255],
        [186,230,253], des); }
    /* una página por cada día del itinerario */
    const por = {};
    (d.itinerario || []).forEach(i => { if (i.dia)
      (por[i.dia] = por[i.dia] || []).push(i); });
    const dias = Object.keys(por).sort((a, b) =>
      parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
    dias.forEach((dia, ix) => {
      const c = this.COLS[ix % this.COLS.length], segs = [];
      por[dia].forEach(it => {
        const sec = [];
        if (txt(it.adesc)) sec.push({ k: 'p', t: txt(it.adesc) });
        if (txt(it.desc)) sec.push({ k: 'p', t: txt(it.desc) });
        if (it.lugar) sec.push({ k: 'p', t: 'Lugar: ' + it.lugar });
        if (sec.length) segs.push.apply(segs, sec.concat({ k: 'hr' }));
        segs.push({ k: 't', t: it.tipo +
          (it.destino ? '  ·  ' + it.destino : '') });
        if (it.ruta && it.ruta !== it.tipo)
          segs.push({ k: 'p', t: it.ruta });
        if (MC && it.verinfo && it.precio)
          segs.push({ k: 'p', t: Itinerario.fmtT(d, it.precio) +
            (it.modo === 'grupo' ? ' · por grupo' : ' · por persona') });
        if (it.hdesde || it.hhasta)
          segs.push({ k: 'h', t: 'Hora: ' + (it.hdesde || '') +
            (it.hhasta ? ' – ' + it.hhasta : '') });
        segs.push({ k: 'gap' }); });
      doc.setFontSize(9);
      const h = segs.map(s => s.k === 'hr' ? 2.6 : s.k === 'gap' ? 2 :
          doc.splitTextToSize(s.t, CW - 10).length * 4.4)
        .reduce((a, b) => a + b, 0) + 11;
      pie(); doc.addPage(); pag++; y = 14;
      cab('Itinerario', c);
      const y0 = y, tc = tint(c, .07), hc = tint(c, .35);
      doc.setFillColor(tc[0], tc[1], tc[2]);
      doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(.6);
      doc.roundedRect(M, y0, CW, h, 2, 2, 'FD');
      doc.setFillColor(c[0], c[1], c[2]); doc.rect(M, y0, 2.2, h, 'F');
      y += 5.5;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(dia + (f.on && f.desde ?
        '  ·  ' + this._fDia(f.desde, dia) : ''), M + 5, y);
      y += 5.5;
      segs.forEach(s => {
        if (s.k === 'gap') { y += 2; return; }
        if (s.k === 'hr') {
          doc.setDrawColor(hc[0], hc[1], hc[2]); doc.setLineWidth(.25);
          doc.line(M + 5, y - 1.2, M + CW - 5, y - 1.2);
          y += 1.4; return; }
        doc.setFont('helvetica', s.k === 't' ? 'bold' : 'normal');
        doc.setFontSize(s.k === 't' ? 9.5 : 9);
        const col = s.k === 't' ? c : [71, 85, 105];
        doc.setTextColor(col[0], col[1], col[2]);
        doc.splitTextToSize(s.t, CW - 10)
          .forEach(l => { doc.text(l, M + 5, y); y += 4.4; }); });
      y = y0 + h + 4; });
    pie();
    await Exportar._savePdf(doc,
      'viaje_' + (d.nombre || 'viaje').replace(/\W+/g, '_') + '.pdf');
    showToast('PDF del viaje generado');
  },
  _fDia(desde, dia) {
    const n = parseInt((dia || '').replace(/\D/g, '')) || 1,
          dd = new Date(desde + 'T00:00:00');
    dd.setDate(dd.getDate() + n - 1);
    return dd.toLocaleDateString('es-ES', { weekday: 'long',
      day: 'numeric', month: 'long', year: 'numeric' });
  },
  /* cover: recorta centrado al marco WxH sin deformar la imagen */
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
  /* imagen del viaje con sus ajustes X/Y/zoom horneados (cover) */
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
