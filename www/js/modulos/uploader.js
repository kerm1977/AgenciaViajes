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
        r.onload = async () => res(await this.saveDataURL(r.result, f.name));
        r.readAsDataURL(f);
      };
      inp.click();
    });
  },
  /* elige imagen y la asigna al viaje; devuelve la ref guardada */
  async pickSave(id) {
    const ref = await this.pick(); if (!ref) return null;
    const d = await DB.get('destinos', id);
    if (!d) { showToast('Viaje no encontrado', 'error'); return null; }
    d.imagen = ref; await DB.save('destinos', d);
    showToast('Imagen guardada en Uploader'); return ref;
  },
  /* dataURL → archivo Uploader/<ts>-<nombre>; sin FS nativo: dataURL */
  async saveDataURL(dataURL, name) {
    const fs = this._fs(); if (!fs) return dataURL;
    try {
      const fname = Date.now() + '-' +
        (name || 'img.jpg').replace(/[^\w.-]/g, '_');
      await fs.writeFile({ path: this.DIR + '/' + fname,
        data: String(dataURL).split(',')[1] || dataURL,
        directory: 'DATA', recursive: true });
      return 'uf:' + fname;
    } catch (e) { console.warn('Uploader.save', e); return dataURL; }
  },
  /* resuelve una ref ('uf:', 'data:' u http) a algo usable en <img>/PDF */
  async url(ref) {
    if (!ref || String(ref).indexOf('uf:') !== 0) return ref || '';
    const fs = this._fs(); if (!fs) return '';
    try {
      const r = await fs.readFile({ path: this.DIR + '/' +
        String(ref).slice(3), directory: 'DATA' });
      return 'data:image/jpeg;base64,' + String(r.data || '');
    } catch (e) { console.warn('Uploader.url', e); return ''; }
  }
};
