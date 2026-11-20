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
      /* el input va al DOM invisible: fuera del DOM Android no entrega
         el onchange y el picker parece muerto */
      inp.style.cssText = 'position:fixed;left:-9999px;top:0;' +
        'width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.appendChild(inp);
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        DC && DC.ev('img:pick', f ? f.name + ' ' + f.size + 'B' : 'cancelado');
        inp.remove();
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
    /* el selector se abre ANTES de cualquier await: un await mata el
       gesto del toque y Android ignora el file input */
    const p = this.pick('viaje-' + id + '.jpg');
    DC && DC.ev('img:pickSave', id);
    const d = await DB.get('destinos', id);
    const pick = await p;
    if (!pick) return null;
    if (!d) { showToast('Viaje no encontrado', 'error'); return null; }
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
      this._cache['uf:' + fn] = dataURL;         // por ref: todo visor la ve
      DC && DC.ev('img:save', fn + ' ' + dataURL.length + 'B');
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
    DC && DC.ev('img:bind', d.id + ' → ' + String(d.imagen || '∅').slice(0, 40));
    const b64 = d.imgfx && d.imgfx.b64 &&
      String(d.imgfx.b64).indexOf('data:image/') === 0 ? d.imgfx.b64 : null;
    /* fuerza bruta: la fuente se pinta como <img> Y como fondo del div —
       aunque una capa falle, la otra se ve */
    const put = s => {
      if (!s) { DC && DC.ev('img:put', '∅ VACÍO'); return; }
      DC && DC.ev('img:put', String(s).slice(0, 46) + '…' + s.length + 'B');
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
      pt = setTimeout(() => { pt = null;
        DC && DC.ev('img:editor', 'pulsación larga → fxModal');
        this.fxModal(d); }, 550); });
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
  /* aplica posición X/Y/zoom/rotación/blur/opacidad a un <img> y sincroniza
     el fondo del div para que nunca se vea cortada */
  applyFx(el, fx) {
    if (!el) return;
    const f = Object.assign({ x: 0, y: 0, s: 100, r: 0, b: 0, o: 100 },
      fx || {});
    el.style.transformOrigin = 'center';
    el.style.transform = 'translate(' + f.x + '%,' + f.y + '%) scale(' +
      f.s / 100 + ') rotate(' + f.r + 'deg)';
    el.style.filter = 'blur(' + f.b + 'px) opacity(' + f.o / 100 + ')';
    const dv = el.parentElement;
    if (dv && dv.style.backgroundImage) {
      dv.style.backgroundPosition = (50 - f.x) + '% ' + (50 - f.y) + '%';
      dv.style.backgroundSize = f.s + '% auto';
    }
  },
  /* barra inferior con sliders; Guardar persiste d.imgfx en la base */
  fxModal(d) {
    this._lp = Date.now();
    DC && DC.ev('img:fxModal', 'abriendo para ' + d.id);
    if (document.getElementById('upl-fx')) return;
    const fx = Object.assign({ x: 0, y: 0, s: 100, r: 0, b: 0, o: 100 },
      d.imgfx || {});
    const bd = document.createElement('div');
    bd.id = 'upl-fx'; bd.className = 'upl-fx';
    bd.innerHTML = '<div class="upl-fx-card"><h4 style="margin:0 0 .5rem">' +
      'Ajustar imagen</h4>' +
      [['x', 'Izq / Der', -50, 50], ['y', 'Arr / Abj', -50, 50],
       ['s', 'Zoom', 50, 200],
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
      DC && DC.ev('img:url', src ? src.slice(0, 50) : '∅');
      if (src) return src;
    } catch (e) { DC && DC.ev('img:url', 'getUri falló: ' + e); }
    try {
      const r = await fs.readFile({ path: path, directory: 'DATA' });
      const b = typeof r.data === 'string' ? r.data : '';
      if (b) return 'data:image/jpeg;base64,' + b;
    } catch (e) { /* último recurso: b64 del registro */ }
    return b64 || '';
  }
};
