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
          const cv = await PdfViaje.cover(u, 600, 340);
          if (cv && y > 245) { doc.addPage(); y = 15; }
          if (cv) { doc.addImage(cv, 'JPEG', 14, y, 60, 34);
            doc.setFontSize(10); doc.text(d.nombre || 'Viaje', 78, y + 12);
            doc.setFontSize(9); y += 42; }
        } catch (e) {}
      }
    }
    const lineas = doc.splitTextToSize(this._texto(await this._todo()), 180);
    lineas.forEach(l => {
      if (y > 285) { doc.addPage(); y = 15; }
      doc.text(l, 14, y); y += 4.4;
    });
    await this._savePdf(doc, this._nombre('pdf'));
    showToast('PDF generado');
  },
  /* PDF de UN viaje: delegado a PdfViaje (diseño espejo de la página) */
  async pdfViaje(id) {
    if (!Session.can('exportar')) { showToast('Sin permiso', 'error'); return; }
    try {
      const d = await DB.get('destinos', id);
      if (d) await PdfViaje.generar(d);
    } catch (e) { console.error('pdfViaje', e);
      showToast('Error al generar el PDF: ' + (e && e.message), 'error'); } },
  /* guardar PDF: nativo = Filesystem(CACHE) + Share; web = descarga */
  async _savePdf(doc, nombre) {
    const FS = plugin('Filesystem'), Sh = plugin('Share');
    if (FS && Sh && window.Capacitor &&
        Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      const data = doc.output('datauristring').split(',')[1],
            w = await FS.writeFile({ path: nombre, data,
              directory: 'CACHE' }).catch(() => null);
      if (w && w.uri) {
        await Sh.share({ title: nombre, url: w.uri }).catch(() => {});
        return; }}
    doc.save(nombre);
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
