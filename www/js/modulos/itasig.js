/* itasig.js — acordeón Itinerario: fila fija "Día + Asignar campo" arriba;
   cada asignación es una fila con día, selector de campo (re-elegible),
   hora desde/hasta y guía tomado de contactos tipo Guía. */
'use strict';
Object.assign(Itinerario, {
  /* opciones de día: con fechas del viaje muestra Día N · dd/mm y nunca
     se sale del rango; sin fechas quedan Día 1–30 */
  _dias() {
    const on = ($('#dest-tiene-fechas') || {}).checked,
          f0 = ($('#dest-fdesde') || {}).value,
          f1 = ($('#dest-fhasta') || {}).value;
    let n = 30, d0 = null;
    if (on && f0 && f1) {
      d0 = new Date(f0 + 'T00:00:00');
      n = Math.max(1, Math.min(60,
        Math.round((new Date(f1 + 'T00:00:00') - d0) / 864e5) + 1)); }
    let o = '';
    for (let i = 1; i <= n; i++) {
      let tag = '';
      if (d0) { const d = new Date(d0); d.setDate(d.getDate() + i - 1);
        tag = ' · ' + d.getDate() + '/' + (d.getMonth() + 1); }
      o += '<option value="Día ' + i + '">Día ' + i + tag + '</option>'; }
    return o;
  },
  /* re-render completo del acordeón Itinerario (solo gana la última llamada) */
  async syncItin() {
    const c = $('#itinerary-container'); if (!c) return;
    const n = (this._sN = (this._sN || 0) + 1);
    const guias = $$('#destinos-lista-container .dst-item')
      .map(x => ((x.value !== undefined ? x.value
        : (x.querySelector('input') || {}).value) || '').trim())
      .filter(Boolean);
    if (n !== this._sN) return;
    c.innerHTML = '';
    const cards = $$('#it-general .it-acc'),
          free = cards.filter((k, i) =>
            !k.dataset.dia && cards.indexOf(k) === i),
          opts = (sel, extra) => free.concat(extra || []).map(k =>
            '<option value="' + cards.indexOf(k) + '"' +
            (k === sel ? ' selected' : '') + '>' +
            esc(k.querySelector('.it-acc-t').textContent) + '</option>').join('');
    /* fila fija arriba: elegir día + campo libre */
    const top = document.createElement('div');
    top.className = 'it-card it-mirror';
    top.innerHTML =
      '<div class="flex gap1" style="align-items:center">' +
        '<select class="select it-dia" style="flex:0 0 6.5rem">' +
          this._dias() + '</select>' +
        '<select class="select it-pick" style="flex:1">' +
          '<option value="">— Asignar campo —</option>' + opts() +
          '</select></div>';
    const td = top.querySelector('.it-dia'), tp = top.querySelector('.it-pick');
    tp.addEventListener('change', () => {
      if (tp.value === '') return;
      cards[+tp.value].dataset.dia = td.value || 'Día 1'; this.syncItin(); });
    c.appendChild(top);
    /* filas asignadas: día + selector de campo + horas + guía + X */
    cards.filter(k => k.dataset.dia).forEach(card => {
      const row = document.createElement('div');
      row.className = 'it-card it-mirror';
      row.innerHTML =
        '<div class="flex gap1" style="align-items:center">' +
          '<select class="select it-dia" style="flex:0 0 6.5rem">' +
            this._dias() + '</select>' +
          '<select class="select it-pick" style="flex:1">' +
            opts(card, [card]) + '</select>' +
          '<button type="button" class="iconbtn danger" title="Quitar" ' +
            'onclick="Itinerario.unassign(\'' + card.id + '\')">' +
            '<i class="fa-solid fa-xmark"></i></button></div>' +
        '<div class="flex gap1" style="margin-top:.4rem">' +
          '<label class="it-vi"><input type="checkbox" class="it-rh"' +
            (card.dataset.hdesde ? ' checked' : '') + '> Requiere hora</label>' +
          '<input type="time" class="input it-hd" style="flex:0 0 5rem" title="Hora de salida"' +
            (card.dataset.hdesde ? '' : ' hidden') + '>' +
          '<label class="it-vi"><input type="checkbox" class="it-rf"' +
            (card.dataset.hhasta ? ' checked' : '') + '> Requiere fin</label>' +
          '<input type="time" class="input it-hh" style="flex:0 0 5rem" title="Hora de llegada"' +
            (card.dataset.hhasta ? '' : ' hidden') + '>' +
          '<select class="select it-guia" style="flex:1"></select></div>' /* lugares */ +
        this._wys(card.dataset.adesc);
      const d = row.querySelector('.it-dia'), p = row.querySelector('.it-pick'),
            g = row.querySelector('.it-guia'), gs = card.dataset.lugar || '';
      const ad = row.querySelector('.it-desc');
      if (ad) ad.addEventListener('input', () => {
        card.dataset.adesc = ad.innerHTML; });
      d.value = card.dataset.dia;
      d.onchange = () => { card.dataset.dia = d.value; };
      p.addEventListener('change', () => {
        const nc = cards[+p.value];
        if (!nc || nc === card) return;
        ['dia','hdesde','hhasta','guia','lugar','adesc'].forEach(k => delete card.dataset[k]);
        nc.dataset.dia = d.value; this.syncItin(); });
      [['hd','hdesde','rh'],['hh','hhasta','rf']].forEach(([cl, k, ck]) => {
        const i = row.querySelector('.it-' + cl),
              ckb = row.querySelector('.it-' + ck);
        i.value = card.dataset[k] || '';
        i.addEventListener('input', () => { card.dataset[k] = i.value; });
        ckb.addEventListener('change', () => {
          i.hidden = !ckb.checked;
          if (!ckb.checked) { i.value = ''; delete card.dataset[k]; }
          else i.focus(); }); });
      g.innerHTML = '<option value="">— Lugar —</option>' +
        guias.concat(gs && !guias.includes(gs) ? [gs] : [])
          .map(n => '<option>' + esc(n) + '</option>').join('');
      g.value = gs;
      g.addEventListener('change', () => { card.dataset.lugar = g.value; });
      c.appendChild(row);
    });
  },
  /* quita la asignación del card tras doble confirmación */
  async unassign(id) {
    if (!(await confirmar('¿Quitar este campo del itinerario?')) ||
        !(await confirmar('¿Seguro? se quitará su asignación de día')))
      return;
    const k = document.getElementById(id);
    if (k) delete k.dataset.dia; this.syncItin(); }
});
