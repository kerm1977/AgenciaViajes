/* uploader.js — carpeta Uploader en el almacenamiento de la app: guarda las
   imágenes elegidas como archivo y las re-lee con ref 'uf:<nombre>'. En
   navegador (sin Filesystem nativo) cae a dataURL. */
'use strict';
const Uploader = {
  DIR: 'Uploader',
  _cache: {},
  _fs() {
    const C = window.Capacitor;
    return C && C.Plugins && C.Plugins.Filesystem &&
      C.Plugins.Filesystem.writeFile ? C.Plugins.Filesystem : null;
  },
  /* selector de archivo → guarda en Uploader → devuelve 'uf:<nombre>' */
  /* selector de archivo → guarda en Uploader → {ref, dataURL};
     fname: nombre existente a reusar (una tarjeta = un solo archivo) */
  pick(fname) {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return res(null);
        const r = new FileReader();
        r.onload = async () =>
          res(await this.saveDataURL(await this._fit(r.result), f.name, fname));
        r.readAsDataURL(f);
      };
      inp.click();
    });
  },
  /* elige imagen y la asigna al viaje: archivo en Uploader + respaldo
     comprimido dentro del registro (nunca se pierde al reiniciar) */
  async pickSave(id) {
    if (this._lp && Date.now() - this._lp < 900) return null;   // venía de pulsación larga
    const d = await DB.get('destinos', id);
    if (!d) { showToast('Viaje no encontrado', 'error'); return null; }
    /* un solo archivo por tarjeta, SIEMPRE el mismo nombre: nunca duplica */
    const pick = await this.pick('viaje-' + id + '.jpg');
    if (!pick) return null;
    d.imagen = pick.ref;
    d.imgfx = Object.assign({}, d.imgfx, { b64: pick.dataURL });
    await DB.save('destinos', d);
    this._cache[id] = pick.dataURL;
    const dv = document.querySelector(
      '.dest-img[onclick*="\'' + id + '\'"]');
    if (dv) {                                    // visible al instante
      const im = dv.querySelector('img');
      if (im) { im.onerror = null; im.src = pick.dataURL; }
      dv.style.backgroundImage = 'url("' + pick.dataURL + '")';
      dv.style.backgroundSize = 'cover';
      dv.style.backgroundPosition = 'center';
    }
    let n = '';
    try {                                        // verificación real: ¿hay archivos?
      const r = await this._fs().readdir({
        path: this.DIR, directory: 'DATA' });
      n = ' · ' + (r.files || []).length + ' archivo(s) en Uploader';
    } catch (e) { n = ' · sin acceso a Uploader'; }
    showToast('Imagen: ' + String(pick.ref).slice(3) + n);
    return pick.ref;
  },
  /* reduce cualquier imagen a JPEG ≤1100px en dataURL */
  _fit(dataURL) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const mx = Math.min(1, 1100 / Math.max(img.width, img.height)),
              cv = document.createElement('canvas');
        cv.width = Math.round(img.width * mx);
        cv.height = Math.round(img.height * mx);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', .82));
      };
      img.onerror = () => res(dataURL);
      img.src = dataURL;
    });
  },
  /* dataURL → archivo Uploader/<ts>-<nombre>; devuelve {ref, dataURL} */
  async saveDataURL(dataURL, name, fname) {
    const fs = this._fs();
    if (!fs) return { ref: dataURL, dataURL: dataURL };
    try {
      const fn = fname || (Date.now() + '-' +
        (name || 'img.jpg').replace(/[^\w.-]/g, '_'));
      await fs.writeFile({ path: this.DIR + '/' + fn,
        data: String(dataURL).split(',')[1] || dataURL,
        directory: 'DATA', recursive: true });
      return { ref: 'uf:' + fn, dataURL: dataURL };
    } catch (e) {
      console.warn('Uploader.save', e);
      return { ref: dataURL, dataURL: dataURL }; }
  },
  /* borra un archivo de Uploader y limpia la ref del viaje que lo usa */
  async del(nm) {
    const fs = this._fs(); if (!fs) return false;
    try {
      await fs.deleteFile({ path: this.DIR + '/' + nm, directory: 'DATA' });
      delete this._cache['uf:' + nm];
      const ds = await DB.list('destinos');
      for (const d of ds) if (d.imagen === 'uf:' + nm) {
        d.imagen = ''; if (d.imgfx) delete d.imgfx.b64;
        await DB.save('destinos', d);
      }
      showToast('Imagen eliminada: ' + nm); return true;
    } catch (e) { showToast('No se pudo eliminar', 'error'); return false; }
  },
  /* cablea la zona de imagen de una tarjeta: resuelve 'uf:', aplica los
     ajustes guardados y abre el editor con pulsación larga */
  bindImg(el, d) {
    if (!el) return;
    const im = el.querySelector('img');
    const b64 = d.imgfx && d.imgfx.b64 &&
      String(d.imgfx.b64).indexOf('data:image/') === 0 ? d.imgfx.b64 : null;
    /* fuerza bruta: la fuente se pinta como <img> Y como fondo del div —
       aunque una capa falle, la otra se ve */
    const put = s => {
      if (!s) return;
      if (im) { im.onerror = null; im.src = s; }
      el.style.backgroundImage = 'url("' + s + '")';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    };
    /* orden: cache → archivo Uploader → data: → b64 válido (SQLite puede
       truncar el respaldo; solo se usa si el archivo no resuelve) */
    const cached = this._cache[d.imagen] || this._cache[d.id];
    if (cached) put(cached);
    else if (/^data:/.test(d.imagen || '')) put(d.imagen);
    else if (/^uf:/.test(d.imagen || ''))
      this.url(d.imagen).then(u => put(u || b64));
    else put(b64);
    this.applyFx(im, d.imgfx);
    let pt = null, sx = 0, sy = 0;
    el.addEventListener('touchstart', e => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      pt = setTimeout(() => { pt = null; this.fxModal(d); }, 550); });
    el.addEventListener('touchmove', e => {      // tolera temblor de dedo
      if (!pt) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 10 ||
          Math.abs(t.clientY - sy) > 10) { clearTimeout(pt); pt = null; } });
    ['touchend', 'touchcancel'].forEach(ev =>
      el.addEventListener(ev, () => { clearTimeout(pt); pt = null; }));
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); this.fxModal(d); });
  },
  /* aplica posición/zoom/rotación/blur/opacidad a un <img> */
  applyFx(el, fx) {
    if (!el) return;
    const f = Object.assign({ x: 0, s: 100, r: 0, b: 0, o: 100 }, fx || {});
    el.style.transformOrigin = 'center';
    el.style.transform = 'translateX(' + f.x + '%) scale(' + f.s / 100 +
      ') rotate(' + f.r + 'deg)';
    el.style.filter = 'blur(' + f.b + 'px) opacity(' + f.o / 100 + ')';
  },
  /* barra inferior con sliders; Guardar persiste d.imgfx en la base */
  fxModal(d) {
    this._lp = Date.now();
    if (document.getElementById('upl-fx')) return;
    const fx = Object.assign({ x: 0, s: 100, r: 0, b: 0, o: 100 },
      d.imgfx || {});
    const bd = document.createElement('div');
    bd.id = 'upl-fx'; bd.className = 'upl-fx';
    bd.innerHTML = '<div class="upl-fx-card"><h4 style="margin:0 0 .5rem">' +
      'Ajustar imagen</h4>' +
      [['x', 'Izq / Der', -50, 50], ['s', 'Zoom', 50, 200],
       ['r', 'Rotar', -180, 180], ['b', 'Desenfoque', 0, 8],
       ['o', 'Opacidad', 20, 100]].map(a =>
        '<label class="upl-fx-r"><span>' + a[1] + '</span>' +
        '<input type="range" min="' + a[2] + '" max="' + a[3] +
        '" value="' + fx[a[0]] + '" data-k="' + a[0] + '"></label>'
      ).join('') +
      '<div class="flex gap1"><button type="button" class="btn btn-soft" ' +
        'id="upl-fx-x">Cancelar</button><button type="button" class="btn" ' +
        'id="upl-fx-ok" style="flex:1">Guardar</button></div></div>';
    document.body.appendChild(bd);
    bd.addEventListener('click', e => {                        // tocar fuera cierra
      if (e.target === bd) { this.applyFx(
        document.querySelector('.dest-img[onclick*="\'' + d.id + '\'"] img'),
        d.imgfx); cerrar(); } });
    const im = document.querySelector(
      '.dest-img[onclick*="\'' + d.id + '\'"] img');
    bd.querySelectorAll('input').forEach(i =>
      i.addEventListener('input', () => {
        fx[i.dataset.k] = +i.value; this.applyFx(im, fx); }));
    const cerrar = () => bd.remove();
    bd.querySelector('#upl-fx-x').onclick = () => {
      this.applyFx(im, d.imgfx); cerrar(); };
    bd.querySelector('#upl-fx-ok').onclick = async () => {
      d.imgfx = fx; await DB.save('destinos', d);
      showToast('Ajustes de imagen guardados'); cerrar();
      Destinos.render(); };
  },
  /* resuelve una ref ('uf:', 'data:' u http) a algo usable en <img>/PDF.
     Camino principal: getUri + convertFileSrc → URL http al archivo real
     (persiste en DATA/Uploader entre reinicios; wantData fuerza base64
      para el PDF). Respaldos: readFile → b64 */
  async url(ref, b64, wantData) {
    if (!ref || String(ref).indexOf('uf:') !== 0)
      return b64 || ref || '';
    const fs = this._fs(); if (!fs) return b64 || '';
    const path = this.DIR + '/' + String(ref).slice(3);
    if (!wantData) try {                         // URL directa al archivo
      const u = await fs.getUri({ path: path, directory: 'DATA' });
      const C = window.Capacitor;
      const src = C && C.convertFileSrc ? C.convertFileSrc(u.uri) : u.uri;
      if (src) return src;
    } catch (e) { /* sigue al respaldo base64 */ }
    try {
      const r = await fs.readFile({ path: path, directory: 'DATA' });
      const b = typeof r.data === 'string' ? r.data : '';
      if (b) return 'data:image/jpeg;base64,' + b;
    } catch (e) { /* último recurso: b64 del registro */ }
    return b64 || '';
  }
};
