/* exportar.js — PDF, TXT, WhatsApp, JSON backup y export/import de la BD */
'use strict';
const Exportar = {
  async _todo() { return DB.exportAll(); },
  _nombre(ext) {
    return 'latribu_' + new Date().toISOString().slice(0, 10) + '.' + ext;
  },
  _texto(d) {
    const L = [];
    L.push('LA TRIBU DE LOS LIBRES TRAVELS — RESPALDO ' + new Date().toLocaleString('es-ES'));
    L.push('='.repeat(60));
    L.push('\nDESTINOS (' + d.destinos.length + ')');
    d.destinos.forEach(x => {
      L.push('• ' + x.nombre + ' | Guía: ' + (x.guia || '—') +
             ' | Vuelo: ' + (x.vuelo || '—') + ' | ' + (x.aerolinea || '—'));
      (x.itinerario || []).forEach(i => L.push('   ' + i.dia + ': ' + i.ruta));
    });
    L.push('\nCONTACTOS (' + d.contactos.length + ')');
    d.contactos.forEach(c => L.push('• ' + c.nombre + ' [' + c.tipo + '] ' +
      (c.codigo || '') + (c.telefono || '—') + ' · ' + (c.email || '—')));
    L.push('\nPASAJEROS (' + d.pasajeros.length + ')');
    d.pasajeros.forEach(p => {
      const d2 = d.destinos.find(x => x.id === p.destinoId);
      L.push('• ' + p.nombre + ' → ' + (d2 ? d2.nombre : 'sin viaje') +
             ' | check-in: ' + (p.checkin || 'Pendiente'));
    });
    L.push('\nUSUARIOS (' + d.usuarios.length + ')');
    d.usuarios.forEach(u => L.push('• ' + u.nombre + ' <' + u.email +
                                   '> [' + u.rol + ']'));
    return L.join('\n');
  },
  async json() {
    if (!Session.can('exportar')) { showToast('Sin permiso', 'error'); return; }
    descargar(this._nombre('json'),
      JSON.stringify(await this._todo(), null, 2), 'application/json');
    showToast('Respaldo JSON exportado');
  },
  async importarJSON(e) {
    if (!Session.can('importar')) { showToast('Sin permiso', 'error'); return; }
    leerArchivo(e.target, async txt => {
      try {
        const d = JSON.parse(txt);
        if (!d.destinos || !d.contactos) throw 0;
        await DB.importAll(d);
        showToast('Datos importados');
        Destinos.render(); Estadisticas.render();
      } catch (x) { showToast('Archivo JSON inválido', 'error'); }
    });
    e.target.value = '';
  },
  async txt() {
    if (!Session.can('exportar')) { showToast('Sin permiso', 'error'); return; }
    descargar(this._nombre('txt'), this._texto(await this._todo()));
    showToast('TXT exportado');
  },
  async pdf() {
    if (!Session.can('exportar')) { showToast('Sin permiso', 'error'); return; }
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J) { showToast('jsPDF no cargado', 'error'); return; }
    const doc = new J();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('La Tribu de los Libres Travels — Reporte', 14, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const ds = (await this._todo()).destinos || [];
    let y = 28;
    for (const d of ds) {
      const u = await Uploader.url(d.imagen, (d.imgfx || {}).b64, true);
      if (/^data:image/.test(u)) {
        try {
          if (y > 245) { doc.addPage(); y = 15; }
          doc.addImage(u, /^data:image\/png/.test(u) ? 'PNG' : 'JPEG',
            14, y, 60, 34);
          doc.setFontSize(10); doc.text(d.nombre || 'Viaje', 78, y + 12);
          doc.setFontSize(9); y += 42;
        } catch (e) {}
      }
    }
    const lineas = doc.splitTextToSize(this._texto(await this._todo()), 180);
    lineas.forEach(l => {
      if (y > 285) { doc.addPage(); y = 15; }
      doc.text(l, 14, y); y += 4.4;
    });
    doc.save(this._nombre('pdf'));
    showToast('PDF generado');
  },
  /* PDF de UN viaje: imagen con los ajustes X/Y/zoom horneados vía canvas
     (blur/rotar/opacidad no aplican a PDF) + itinerario por día + pasajeros */
  async pdfViaje(id) {
    if (!Session.can('exportar')) { showToast('Sin permiso', 'error'); return; }
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J) { showToast('jsPDF no cargado', 'error'); return; }
    const d = await DB.get('destinos', id);
    if (!d) return;
    const doc = new J(); let y = 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(d.nombre || 'Viaje', 14, y); y += 8;
    const img = await this._imgFx(d);
    if (img) { try { doc.addImage(img, 'JPEG', 14, y, 182, 64); y += 70; }
      catch (e) {} }
    const line = t => doc.splitTextToSize(t, 180).forEach(l => {
      if (y > 285) { doc.addPage(); y = 15; }
      doc.text(l, 14, y); y += 4.6; });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const f = d.fechas || {};
    line('País: ' + (d.pais || '—') +
      ((d.destinos || []).length ? ' · ' + d.destinos.join(', ') : ''));
    if (f.on && (f.desde || f.hasta))
      line('Fechas: ' + (f.desde || '') + ' → ' + (f.hasta || ''));
    if (d.paxConGuia) line('Capacidad: ' + d.paxConGuia + ' van / ' +
      (d.paxSinGuia || 0) + ' pagan');
    doc.setFont('helvetica', 'bold'); line('ITINERARIO');
    doc.setFont('helvetica', 'normal');
    const por = {};
    (d.itinerario || []).forEach(i =>
      (por[i.dia || 'Día 1'] = por[i.dia || 'Día 1'] || []).push(i));
    Object.keys(por).sort((a, b) =>
      parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))
    ).forEach(dia => {
      line(dia + (f.on && f.desde ? this._fDia(f.desde, dia) : ''));
      por[dia].forEach(it => line('  ' +
        (it.hdesde || '') + (it.hhasta ? '–' + it.hhasta + ' ' : ' ') +
        it.tipo + (it.destino ? ' · ' + it.destino : '') +
        (it.guia ? ' · Guía: ' + it.guia : '')));
    });
    const pax = (await DB.list('pasajeros'))
      .filter(p => p.destinoId === id);
    if (pax.length) {
      doc.setFont('helvetica', 'bold'); line('PASAJEROS');
      doc.setFont('helvetica', 'normal');
      pax.forEach(p => line('  • ' + p.nombre +
        (p.asiento ? ' (' + p.asiento + ')' : '')));
    }
    doc.save('viaje_' + (d.nombre || 'viaje').replace(/\W+/g, '_') + '.pdf');
    showToast('PDF del viaje generado');
  },
  _fDia(desde, dia) {
    const n = parseInt((dia || '').replace(/\D/g, '')) || 1,
          dd = new Date(desde + 'T00:00:00');
    dd.setDate(dd.getDate() + n - 1);
    return ' · ' + dd.getDate() + '/' + (dd.getMonth() + 1) +
      '/' + dd.getFullYear();
  },
  /* imagen del viaje compuesta con sus ajustes (cover + posición + zoom) */
  _imgFx(d) {
    return Uploader.url(d.imagen, (d.imgfx || {}).b64, true).then(u =>
      /^data:image/.test(u || '') ? new Promise(res => {
        const f = Object.assign({ x: 0, y: 0, s: 100 }, d.imgfx || {}),
              im = new Image();
        im.onload = () => {
          const cw = 1000, ch = 560, cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          const sc = Math.max(cw / im.width, ch / im.height) * f.s / 100,
                w = im.width * sc, h = im.height * sc;
          cv.getContext('2d').drawImage(im,
            (cw - w) * (50 - f.x) / 100, (ch - h) * (50 - f.y) / 100, w, h);
          res(cv.toDataURL('image/jpeg', .85));
        };
        im.onerror = () => res(null); im.src = u;
      }) : null);
  },
  async whatsapp() {
    if (!Session.can('exportar')) { showToast('Sin permiso', 'error'); return; }
    const d = await this._todo();
    const res = 'La Tribu Travels: ' + d.destinos.length + ' destinos, ' +
      d.contactos.length + ' contactos, ' + d.pasajeros.length + ' pasajeros.';
    const Sh = plugin('Share');
    if (Sh && Sh.share) {
      await Sh.share({ title: 'La Tribu de los Libres', text: res + '\n\n' + this._texto(d) });
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(res), '_blank');
    }
  },
  async sqliteExport() {
    if (!Session.can('exportar')) { showToast('Sin permiso', 'error'); return; }
    const d = await this._todo();
    descargar(this._nombre('sqlite.json'),
      JSON.stringify({ formato: 'latribu-sqlite', datos: d }, null, 2),
      'application/json');
    showToast('BD exportada (JSON SQLite)');
  },
  async importarBD(e) {
    if (!Session.can('importar')) { showToast('Sin permiso', 'error'); return; }
    leerArchivo(e.target, async txt => {
      try {
        const d = JSON.parse(txt);
        const datos = d.datos || d;
        if (!datos.destinos && !datos.usuarios) throw 0;
        await DB.importAll(datos);
        showToast('Base de datos importada');
        Destinos.render(); Estadisticas.render();
      } catch (x) { showToast('Respaldo inválido', 'error'); }
    });
    e.target.value = '';
  }
};
