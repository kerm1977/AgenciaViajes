/* perfil.js — página personal del usuario: cuenta, ajustes de la app
   (archivos de Uploader) y estadísticas embebidas. */
'use strict';
const Perfil = {
  async render() {
    const u = Session.get(); if (!u) return;
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('#pf-avatar', iniciales(u.nombre));
    set('#pf-nombre', u.nombre);
    set('#pf-email', u.email);
    set('#pf-estado', 'Activo');
    const rc = $('#pf-rol');
    if (rc) {
      rc.textContent = u.rol;
      rc.className = 'rol-chip ' + (u.rol === 'superusuario' ? 'rol-super'
        : u.rol === 'admin' ? 'rol-admin' : 'rol-user');
    }
    const pv = $('#pf-priv');
    if (pv) pv.innerHTML = u.rol === 'superusuario'
      ? '<span class="rol-chip rol-super">Todos los privilegios</span>'
      : (u.permisos || []).map(k => {
          const p = PERMISOS.find(x => x.k === k);
          return '<span class="rol-chip rol-user">' +
            esc(p ? p.t : k) + '</span>';
        }).join(' ') ||
        '<span class="muted">Sin privilegios asignados</span>';
  },
  /* Ajustes de la aplicación — revisa los archivos reales de Uploader */
  async ajustes() {
    const box = $('#pf-ajustes'); if (!box) return;
    box.classList.toggle('hidden');
    if (box.classList.contains('hidden')) return;
    box.innerHTML = '<p class="muted">Leyendo Uploader…</p>';
    await this._listar(box);
  },
  async _listar(box) {
    const fs = Uploader._fs();
    if (!fs) { box.innerHTML = '<p class="muted">Sin almacenamiento nativo.</p>';
      return; }
    let files = [];
    try {
      const r = await fs.readdir({ path: Uploader.DIR, directory: 'DATA' });
      files = r.files || [];
    } catch (e) { /* carpeta aún no existe */ }
    if (!files.length) {
      box.innerHTML = '<p class="muted">Uploader vacío — sin imágenes.</p>';
      return;
    }
    const rows = await Promise.all(files.map(async f => {
      const nm = typeof f === 'string' ? f : f.name;
      const kb = f && f.size ? Math.round(f.size / 1024) : '';
      const src = await Uploader.url('uf:' + nm);
      return '<div class="flex gap1" style="align-items:center;' +
        'padding:.4rem 0;border-bottom:1px solid var(--slate-100)">' +
        (src ? '<img src="' + src + '" style="width:44px;height:44px;' +
          'object-fit:cover;border-radius:8px">' : '') +
        '<span style="flex:1" class="truncate">' + esc(nm) + '</span>' +
        '<small class="muted">' + (kb !== '' ? kb + ' KB' : '') +
        '</small>' +
        '<button class="iconbtn danger" title="Eliminar" ' +
          'onclick="Perfil.delImg(\'' + esc(nm) + '\')">' +
          '<i class="fa-solid fa-trash"></i></button></div>';
    }));
    box.innerHTML = '<h4 class="lbl" style="margin-bottom:.5rem">Uploader · ' +
      files.length + ' archivo(s)</h4>' + rows.join('');
  },
  /* borra una imagen de Uploader y repinta la lista */
  async delImg(nm) {
    if (!(await confirmar('¿Eliminar ' + nm + ' de Uploader?')) ||
        !(await confirmar('¿Seguro? Esta acción no se puede deshacer')))
      return;
    await Uploader.del(nm);
    const box = $('#pf-ajustes');
    if (box) { box.innerHTML = '<p class="muted">Leyendo Uploader…</p>';
      await this._listar(box); }
  },
  /* Cuentas y números SINPE / bancarios de la agencia */
  _ct() { try { return JSON.parse(localStorage.getItem('latribu_cuentas') || '{}'); } catch (e) { return {}; } },
  cuentas() { openModal('modal-cuentas'); this.ctRender(); },
  ctRender() {
    const c = this._ct(),
          li = k => (c[k] || []).map((x, i) => '<li class="flex" ' +
            'style="align-items:center;justify-content:space-between">' +
            '<span>' + esc(x) + '</span><button type="button" ' +
            'class="iconbtn danger" onclick="Perfil.ctDel(\'' + k + '\',' + i +
            ')"><i class="fa-solid fa-xmark"></i></button></li>').join('') ||
            '<li class="hint">Sin registros</li>';
    $('#ct-sinpe').innerHTML = li('sinpe');
    $('#ct-ctas').innerHTML = li('cuentas');
  },
  ctAdd(k) {
    const inp = $(k === 'sinpe' ? '#ct-ns' : '#ct-nc'),
          v = (inp.value || '').trim();
    if (!v) return;
    const c = this._ct(); (c[k] = c[k] || []).push(v);
    localStorage.setItem('latribu_cuentas', JSON.stringify(c));
    inp.value = ''; this.ctRender();
  },
  ctDel(k, i) { const c = this._ct(); (c[k] || []).splice(i, 1);
    localStorage.setItem('latribu_cuentas', JSON.stringify(c)); this.ctRender(); },
  /* OTA_Server.zip: paquete portátil para levantar el servidor en otra PC */
  async servidor() {
    try {
      const r = await fetch('descargas/OTA_Server.zip'),
            b = await r.blob(),
            FS = plugin('Filesystem'), Sh = plugin('Share');
      if (FS && Sh && window.Capacitor &&
          Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
        const data = await new Promise(res => {
          const rd = new FileReader();
          rd.onload = () => res(String(rd.result).split(',')[1]);
          rd.readAsDataURL(b); });
        const w = await FS.writeFile({ path: 'OTA_Server.zip', data,
          directory: 'CACHE' }).catch(() => null);
        if (w && w.uri) {
          await Sh.share({ title: 'OTA_Server.zip', url: w.uri });
          return; } }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'OTA_Server.zip';
      document.body.appendChild(a); a.click(); a.remove();
      showToast('OTA_Server.zip descargado');
    } catch (e) { showToast('No se pudo descargar el servidor', 'error'); }
  },
  /* Estadísticas embebidas: inyecta el markup del panel Resumen */
  async stats() {
    const box = $('#pf-stats'); if (!box) return;
    box.classList.toggle('hidden');
    if (box.classList.contains('hidden')) return;
    if (!box.dataset.loaded) {
      const r = await fetch('views/estadisticas.html');
      box.innerHTML = await r.text();
      box.dataset.loaded = '1';
    }
    await Estadisticas.render();
  }
};
Router.ON_TAB.perfil = () => Perfil.render();
