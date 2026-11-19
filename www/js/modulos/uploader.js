/* uploader.js — carpeta Uploader en el almacenamiento de la app: guarda las
   imágenes elegidas como archivo y las re-lee con ref 'uf:<nombre>'. En
   navegador (sin Filesystem nativo) cae a dataURL. */
'use strict';
const Uploader = {
  DIR: 'Uploader',
  _fs() {
    const C = window.Capacitor;
    return C && C.Plugins && C.Plugins.Filesystem &&
      C.Plugins.Filesystem.writeFile ? C.Plugins.Filesystem : null;
  },
  /* selector de archivo → guarda en Uploader → devuelve 'uf:<nombre>' */
  pick() {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return res(null);
        const r = new FileReader();
        r.onload = async () =>
          res(await this.saveDataURL(await this._fit(r.result), f.name));
        r.readAsDataURL(f);
      };
      inp.click();
    });
  },
  /* elige imagen y la asigna al viaje: archivo en Uploader + respaldo
     comprimido dentro del registro (nunca se pierde al reiniciar) */
  async pickSave(id) {
    if (this._lp && Date.now() - this._lp < 900) return null;   // venía de pulsación larga
    const pick = await this.pick(); if (!pick) return null;
    const d = await DB.get('destinos', id);
    if (!d) { showToast('Viaje no encontrado', 'error'); return null; }
    d.imagen = pick.ref;
    d.imgfx = Object.assign({}, d.imgfx, { b64: pick.dataURL });
    await DB.save('destinos', d);
    showToast('Imagen guardada en Uploader'); return pick.ref;
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
  async saveDataURL(dataURL, name) {
    const fs = this._fs();
    if (!fs) return { ref: dataURL, dataURL: dataURL };
    try {
      const fname = Date.now() + '-' +
        (name || 'img.jpg').replace(/[^\w.-]/g, '_');
      await fs.writeFile({ path: this.DIR + '/' + fname,
        data: String(dataURL).split(',')[1] || dataURL,
        directory: 'DATA', recursive: true });
      return { ref: 'uf:' + fname, dataURL: dataURL };
    } catch (e) {
      console.warn('Uploader.save', e);
      return { ref: dataURL, dataURL: dataURL }; }
  },
  /* cablea la zona de imagen de una tarjeta: resuelve 'uf:', aplica los
     ajustes guardados y abre el editor con pulsación larga */
  bindImg(el, d) {
    if (!el) return;
    const im = el.querySelector('img');
    if (/^uf:/.test(d.imagen || ''))
      this.url(d.imagen).then(u => {
        if (u && im) im.src = u;
        else if (im && d.imgfx && d.imgfx.b64) im.src = d.imgfx.b64; });
    else if (im && /^data:/.test(d.imagen || '')) im.src = d.imagen;
    this.applyFx(im, d.imgfx);
    let pt = null;
    el.addEventListener('touchstart', () => {
      pt = setTimeout(() => this.fxModal(d), 550); });
    ['touchend', 'touchmove', 'touchcancel'].forEach(ev =>
      el.addEventListener(ev, () => clearTimeout(pt)));
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
  /* resuelve una ref ('uf:', 'data:' u http) a algo usable en <img>/PDF;
     b64 = respaldo guardado en el registro por si el archivo falta */
  async url(ref, b64) {
    if (!ref || String(ref).indexOf('uf:') !== 0) return ref || '';
    const fs = this._fs(); if (!fs) return b64 || '';
    try {
      const r = await fs.readFile({ path: this.DIR + '/' +
        String(ref).slice(3), directory: 'DATA' });
      return 'data:image/jpeg;base64,' + String(r.data || '');
    } catch (e) { return b64 || ''; }
  }
};
