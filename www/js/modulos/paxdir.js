/* paxdir.js — herramientas del directorio de pasajeros:
   exportar TXT / VCard / JSON, importar JSON, respaldo WhatsApp, fusión */
'use strict';
const PaxDir = {
  async _lista() {
    const ds = await DB.list('destinos');
    return {
      ds,
      pxs: (await DB.list('pasajeros'))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    };
  },
  _viaje(ds, p) { const d = ds.find(x => x.id === p.destinoId);
    return d ? d.nombre : 'Sin asignar'; },
  _txt(p, ds) {
    const L = ['• ' + (p.nombre || '')];
    const add = (k, x) => { if (x) L.push('   ' + k + ': ' + x); };
    add('Pasaporte', p.pasaporte); add('Cédula', p.cedula);
    add('Nacimiento', p.nacimiento); add('Sangre', p.sangre);
    add('Grupo', p.grupo); add('País', p.pais); add('Lugar', p.lugar);
    add('Celular', (p.codigo || '') + (p.telefono || ''));
    add('Fijo', p.fijo); add('Tel 2', p.tel2); add('Tel 3', p.tel3);
    add('Correo', p.email); add('Emergencia',
      [p.emNombre, p.emTel].filter(Boolean).join(' · '));
    add('Viaje', this._viaje(ds, p)); add('Asiento', p.asiento);
    add('Check-in', p.checkin); add('Enlace check-in', p.checkinUrl);
    add('Contacto', [p.cnombre, p.ctel].filter(Boolean).join(' · '));
    add('Horario', p.horario);
    add('Mapa', p.urlmapa); add('Notas', p.notas);
    return L.join('\n');
  },
  async txt() {
    if (!Session.can('exportar')) return showToast('Sin permiso', 'error');
    const { ds, pxs } = await this._lista();
    descargar('pasajeros_' +
      new Date().toISOString().slice(0, 10) + '.txt',
      'PASAJEROS — LA TRIBU DE LOS LIBRES TRAVELS\n' + '='.repeat(50) +
      '\n\n' + pxs.map(p => this._txt(p, ds)).join('\n\n'), 'text/plain');
    showToast('Directorio exportado a TXT');
  },
  async json() {
    if (!Session.can('exportar')) return showToast('Sin permiso', 'error');
    const { pxs } = await this._lista();
    descargar('pasajeros_' +
      new Date().toISOString().slice(0, 10) + '.json',
      JSON.stringify(pxs, null, 2), 'application/json');
    showToast('Directorio exportado a JSON');
  },
  async vcard() {
    if (!Session.can('exportar')) return showToast('Sin permiso', 'error');
    const { ds, pxs } = await this._lista();
    const card = p => 'BEGIN:VCARD\nVERSION:3.0\nN:' +
      [p.ap1 || '', p.nombre || '', '', '', ''].join(';') + '\nFN:' +
      (p.nombre || '') + '\nTEL;TYPE=CELL:' +
      ((p.codigo || '') + (p.telefono || '')) +
      (p.fijo ? '\nTEL;TYPE=HOME:' + p.fijo : '') +
      (p.email ? '\nEMAIL:' + p.email : '') +
      '\nNOTE:' + (['Viaje: ' + this._viaje(ds, p),
        p.pasaporte ? 'Pasaporte: ' + p.pasaporte : '',
        p.sangre ? 'Sangre: ' + p.sangre : '',
        p.emNombre ? 'Emergencia: ' + p.emNombre +
          (p.emTel ? ' ' + p.emTel : '') : '',
        p.notas || ''].filter(Boolean).join(' | ')) + '\nEND:VCARD';
    descargar('pasajeros_' +
      new Date().toISOString().slice(0, 10) + '.vcf',
      pxs.map(card).join('\n'), 'text/vcard');
    showToast('Directorio exportado a VCard');
  },
  async wa() {
    const { ds, pxs } = await this._lista();
    if (!pxs.length) return showToast('No hay pasajeros', 'warn');
    const t = 'RESPALDO PASAJEROS — LA TRIBU TRAVELS\n' +
      pxs.map((p, i) => (i + 1) + '. ' + p.nombre +
        ' | ' + ((p.codigo || '') + (p.telefono || '')) +
        ' | ' + this._viaje(ds, p)).join('\n');
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
  },
  async importar(input) {
    if (!Session.can('importar')) return showToast('Sin permiso', 'error');
    leerArchivo(input, async t => {
      try {
        const arr = JSON.parse(t);
        if (!Array.isArray(arr)) throw 0;
        const pxs = await DB.list('pasajeros'); let n = 0;
        for (const x of arr) {
          if (!x || !x.nombre) continue;
          const hit = x.id ? pxs.find(p => p.id === x.id)
            : pxs.find(p => (x.pasaporte && p.pasaporte === x.pasaporte) ||
              (x.cedula && p.cedula === x.cedula) ||
              p.nombre === x.nombre);
          const o = Object.assign({}, x);
          if (hit) o.id = hit.id;
          await DB.save('pasajeros', o); n++;
        }
        showToast(n + ' pasajeros importados'); Pasajeros.render();
      } catch (err) { showToast('JSON inválido', 'error'); }
    });
    input.value = '';
  },
  async fusion() {
    const { pxs } = await this._lista();
    if (pxs.length < 2) return showToast('Necesitás al menos 2 pasajeros', 'warn');
    const ops = pxs.map(p => '<option value="' + p.id + '">' + esc(p.nombre) +
      '</option>').join('');
    $('#fus-a').innerHTML = ops; $('#fus-b').innerHTML = ops;
    $('#fus-b').selectedIndex = 1; openModal('modal-fusion');
  },
  async fusionOk() {
    const a = $('#fus-a').value, b = $('#fus-b').value;
    if (!a || !b || a === b)
      return showToast('Elegí dos pasajeros distintos', 'warn');
    const pa = await DB.get('pasajeros', a), pb = await DB.get('pasajeros', b);
    if (!pa || !pb) return;
    if (!(await confirmar('¿Fusionar «' + pb.nombre + '» en «' + pa.nombre +
        '»? El segundo se eliminará.'))) return;
    PAXF.concat(['codigo', 'telefono', 'destinoId', 'asiento', 'checkin',
      'checkinUrl', 'ap1', 'ap2', 'contactoId']).forEach(k => {
      if (!pa[k] && pb[k]) pa[k] = pb[k]; });
    await DB.save('pasajeros', pa); await DB.remove('pasajeros', b);
    closeModal('modal-fusion');
    showToast('Pasajeros fusionados'); Pasajeros.render();
  }
};
/* elegir un pasajero de la agenda y vincularlo a este viaje
   (movido aquí para crecer las herramientas del directorio) */
Pasajeros.elegir = async function (destinoId) {
  const todos = (await DB.list('pasajeros'))
    .filter(p => p.destinoId !== destinoId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (!todos.length)
    return showToast('No hay más pasajeros en la agenda', 'error');
  const bd = document.createElement('div');
  bd.className = 'modal open'; bd.id = 'pax-pick';
  bd.innerHTML = '<div class="modal-box" style="max-width:24rem">' +
    '<div class="modal-head"><h3>Agregar pasajero al viaje</h3></div>' +
    '<div class="modal-body"><select id="pax-pick-sel" class="select">' +
    '<option value="">— Pasajero —</option>' + todos.map(p =>
      '<option value="' + p.id + '">' + esc(p.nombre) +
      (p.telefono ? ' · ' + esc(p.telefono) : '') + '</option>').join('') +
    '</select></div><div class="modal-foot">' +
    '<button class="btn btn-soft" id="pax-pick-x">Cancelar</button>' +
    '<button class="btn btn-primary" id="pax-pick-ok">Agregar</button></div></div>';
  document.body.appendChild(bd);
  const fin = () => bd.remove();
  bd.querySelector('#pax-pick-x').onclick = fin;
  bd.querySelector('#pax-pick-ok').onclick = async () => {
    const p = await DB.get('pasajeros', bd.querySelector('#pax-pick-sel').value);
    if (!p) return showToast('Elige un pasajero', 'error');
    p.destinoId = destinoId; await DB.save('pasajeros', p);
    fin(); showToast('Pasajero agregado');
    if (Destinos._detId === destinoId) Destinos.pagina(destinoId);
    this.render(); };
};
