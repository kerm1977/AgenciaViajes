/* itasig.js — acordeón Itinerario: fila fija "Día + Asignar campo" arriba;
   cada asignación es una fila con día, selector de campo (re-elegible),
   hora desde/hasta y guía tomado de contactos tipo Guía. */
'use strict';
Object.assign(Itinerario, {
  /* re-render completo del acordeón Itinerario */
  async syncItin() {
    const c = $('#itinerary-container'); if (!c) return;
    c.innerHTML = ''; const guias = ((await DB.list('contactos')) || [])
      .filter(x => x.tipo === 'Guía').map(x => x.nombre);
    const cards = $$('#it-general .it-acc'),
          free = cards.filter(k => !k.dataset.dia),
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
          '<input type="time" class="input it-hd" style="flex:0 0 5rem" title="Desde">' +
          '<input type="time" class="input it-hh" style="flex:0 0 5rem" title="Hasta">' +
          '<select class="select it-guia" style="flex:1"></select></div>';
      const d = row.querySelector('.it-dia'), p = row.querySelector('.it-pick'),
            g = row.querySelector('.it-guia'), gs = card.dataset.guia || '';
      d.value = card.dataset.dia;
      d.onchange = () => { card.dataset.dia = d.value; };
      p.addEventListener('change', () => {
        const nc = cards[+p.value];
        if (!nc || nc === card) return;
        ['dia','hdesde','hhasta','guia'].forEach(k => delete card.dataset[k]);
        nc.dataset.dia = d.value; this.syncItin(); });
      [['hd','hdesde'],['hh','hhasta']].forEach(([cl, k]) => {
        const i = row.querySelector('.it-' + cl);
        i.value = card.dataset[k] || '';
        i.addEventListener('change', () => { card.dataset[k] = i.value; }); });
      g.innerHTML = '<option value="">— Guía —</option>' +
        guias.concat(gs && !guias.includes(gs) ? [gs] : [])
          .map(n => '<option>' + esc(n) + '</option>').join('');
      g.value = gs;
      g.addEventListener('change', () => { card.dataset.guia = g.value; });
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
