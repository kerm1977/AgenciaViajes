/* estadisticas.js — métricas + gráficos pie/barras del panel Resumen */
'use strict';
const Estadisticas = {
  async render() {
    const [destinos, contactos, pasajeros, usuarios] = await Promise.all([
      DB.list('destinos'), DB.list('contactos'),
      DB.list('pasajeros'), DB.list('usuarios')]);
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('#stat-destinos', destinos.length);
    set('#stat-contactos', contactos.length);
    set('#stat-pasajeros', pasajeros.length);
    set('#stat-usuarios', usuarios.length);
    /* archivos reales de Uploader (carpeta DATA/Uploader) */
    let nImg = 0;
    try {
      const fs = Uploader._fs();
      if (fs) {
        const r = await fs.readdir({ path: Uploader.DIR, directory: 'DATA' });
        nImg = (r.files || []).length;
      }
    } catch (e) { /* carpeta aún no existe */ }
    set('#stat-imagenes', nImg);
    /* pie: contactos por tipo */
    const porTipo = {};
    contactos.forEach(c => { porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1; });
    Charts.pie($('#chart-pie'),
      Object.keys(porTipo).map(k => ({ label: k, valor: porTipo[k] })));
    /* barras: pasajeros por destino */
    const porDest = destinos.map(d => ({
      label: d.nombre,
      valor: pasajeros.filter(p => p.destinoId === d.id).length
    }));
    Charts.barras($('#chart-barras'), porDest);
  }
};
Router.ON_TAB.estadisticas = () => Estadisticas.render();
