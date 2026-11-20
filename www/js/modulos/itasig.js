/* itasig.js — paso 6 por días: cada día muestra su fecha real (fechas del
   paso 2), editor propio y dos acordeones — "Asignar campos" (campos libres
   de Costos y pagos) y "Lugares" (destinos del paso 4). Los ítems elegidos
   se ven debajo del editor del día. El estado por día vive en _ds y
   sobrevive re-renders; cada campo sigue guardando su día en
   card.dataset.dia y sus horas en dataset.hdesde/hhasta. */
'use strict';
Object.assign(Itinerario, {
  /* cantidad de días y fecha inicial del viaje (rango del paso 2) */
  _dayInfo() {
    const on = ($('#dest-tiene-fechas') || {}).checked,
          f0 = ($('#dest-fdesde') || {}).value,
          f1 = ($('#dest-fhasta') || {}).value;
    let n = 30, d0 = null;
    if (on && f0 && f1) {
      d0 = new Date(f0 + 'T00:00:00');
      n = Math.max(1, Math.min(60,
        Math.round((new Date(f1 + 'T00:00:00') - d0) / 864e5) + 1)); }
    return { n, d0 };
  },
  _dayState(dia, mk) {
    const st = this._ds || (this._ds = {});
    if (!st[dia] && mk) st[dia] = { desc: '', lugares: [] };
    return st[dia] || { desc: '', lugares: [] };
  },
  /* vuelca el DOM actual a _ds antes de cualquier re-render */
  _captureDias() {
    $$('#itinerary-container .it-day').forEach(b => {
      const st = this._dayState(b.dataset.dia, 1),
            ed = b.querySelector('.it-desc');
      st.desc = ed ? ed.innerHTML : '';
      st.lugares = $$('.it-lc', b).filter(i => i.checked).map(i => i.value); });
  },
  /* restaura descripciones y lugares por día (edición / borrador) */
  setDias(list) {
    this._ds = {};
    (list || []).forEach(d => { this._ds[d.dia] =
      { desc: d.desc || '', lugares: d.lugares || [] }; });
  },
  /* recolecta el estado por día; copia los lugares del día a cada campo
     asignado (dataset.lugar) para que detalle/PDF sigan mostrándolos */
  collectDias() {
    this._captureDias();
    const di = this._dayInfo();
    return Object.keys(this._ds || {}).map(k =>
      ({ dia: k, desc: this._ds[k].desc || '', lugares: this._ds[k].lugares || [] }))
      .filter(d => parseInt(d.dia.split(' ')[1], 10) <= di.n)
      .map(d => { $$('#it-general .it-acc').forEach(c => {
        if (c.dataset.dia === d.dia) c.dataset.lugar = d.lugares.join(', '); });
        return d; });
  },
  /* re-render completo del paso 6 (solo gana la última llamada) */
  async syncItin() {
    const c = $('#itinerary-container'); if (!c) return;
    const n = (this._sN = (this._sN || 0) + 1);
    this._captureDias();
    const dests = $$('#destinos-lista-container .dst-item, ' +
        '#destinos-lista-container .dst-txt')
      .map(x => ((x.value !== undefined ? x.value : x.textContent) || '')
        .trim()).filter(Boolean);
    if (n !== this._sN) return;
    c.innerHTML = '';
    const cards = $$('#it-general .it-acc'),
          free = cards.filter((k, i) =>
            !k.dataset.dia && cards.indexOf(k) === i),
          di = this._dayInfo(),
          titulo = k => esc(k.querySelector('.it-acc-t').textContent),
          multi = (lab, items) =>
            '<div class="multi"><button type="button" class="multi-btn" ' +
            'onclick="this.parentElement.classList.toggle(\'open\')">' +
            '<span>' + lab + '</span>' +
            '<i class="fa-solid fa-chevron-down muted"></i></button>' +
            '<div class="multi-panel">' + items + '</div></div>';
    for (let i = 1; i <= di.n; i++) {
      const dia = 'Día ' + i, ds = this._dayState(dia, 1);
      let fecha = '';
      if (di.d0) { const d = new Date(di.d0); d.setDate(d.getDate() + i - 1);
        fecha = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
      const mine = cards.filter(k => k.dataset.dia === dia);
      if (!ds.desc) { const a = mine.map(k => k.dataset.adesc).find(Boolean);
        if (a) ds.desc = a; }
      const day = document.createElement('div');
      day.className = 'it-card it-day'; day.dataset.dia = dia;
      day.innerHTML =
        '<div class="it-day-h"><b>' + dia + '</b>' +
          (fecha ? '<span class="it-day-f">' + fecha + '</span>' : '') + '</div>' +
        this._wys(ds.desc) +
        multi('— Asignar campos —', free.length ? free.map(k =>
          '<label class="multi-item"><input type="checkbox" class="it-cc" ' +
          'value="' + cards.indexOf(k) + '"> ' + titulo(k) + '</label>').join('')
          : '<div class="multi-item"><span class="grupo">Sin campos libres' +
            '</span></div>') +
        multi('— Lugares —', dests.length ? dests.map(t =>
          '<label class="multi-item"><input type="checkbox" class="it-lc" ' +
          'value="' + esc(t) + '"' +
          (ds.lugares.includes(t) ? ' checked' : '') + '> ' + esc(t) +
          '</label>').join('')
          : '<div class="multi-item"><span class="grupo">Sin destinos aún' +
            '</span></div>') +
        '<div class="it-lugs">' + ds.lugares.map(t =>
          '<span class="it-lug">' + esc(t) + '</span>').join('') + '</div>' +
        '<div class="it-items"></div>';
      c.appendChild(day);
      const ed = day.querySelector('.it-desc');
      if (ed) ed.addEventListener('input', () => { ds.desc = ed.innerHTML; });
      day.querySelectorAll('.it-cc').forEach(cb =>
        cb.addEventListener('change', () => { if (!cb.checked) return;
          this._reopen = dia + '|0';
          cards[+cb.value].dataset.dia = dia; this.syncItin(); }));
      day.querySelectorAll('.it-lc').forEach(cb =>
        cb.addEventListener('change', () => {
          ds.lugares = $$('.it-lc', day).filter(x => x.checked)
            .map(x => x.value);
          this._reopen = dia + '|1'; this.syncItin(); }));
      const items = day.querySelector('.it-items');
      mine.forEach(card => {
        const row = document.createElement('div');
        row.className = 'it-asr';
        row.innerHTML =
          '<div class="flex gap1" style="align-items:center">' +
            '<span class="it-asr-t">' + titulo(card) + '</span>' +
            '<button type="button" class="iconbtn danger" title="Quitar" ' +
              'onclick="Itinerario.unassign(\'' + card.id + '\')">' +
              '<i class="fa-solid fa-xmark"></i></button></div>' +
          '<div class="flex gap1" style="margin-top:.3rem;flex-wrap:wrap">' +
            '<label class="it-vi"><input type="checkbox" class="it-rh"' +
              (card.dataset.hdesde ? ' checked' : '') + '> Requiere hora</label>' +
            '<input type="time" class="input it-hd" style="flex:0 0 5rem" ' +
              'title="Hora de salida"' +
              (card.dataset.hdesde ? '' : ' hidden') + '>' +
            '<label class="it-vi"><input type="checkbox" class="it-rf"' +
              (card.dataset.hhasta ? ' checked' : '') + '> Requiere fin</label>' +
            '<input type="time" class="input it-hh" style="flex:0 0 5rem" ' +
              'title="Hora de llegada"' +
              (card.dataset.hhasta ? '' : ' hidden') + '></div>';
        items.appendChild(row);
        [['hd','hdesde','rh'],['hh','hhasta','rf']].forEach(([cl, k, ck]) => {
          const inp = row.querySelector('.it-' + cl),
                ckb = row.querySelector('.it-' + ck);
          inp.value = card.dataset[k] || '';
          inp.addEventListener('input', () => { card.dataset[k] = inp.value; });
          ckb.addEventListener('change', () => {
            inp.hidden = !ckb.checked;
            if (!ckb.checked) { inp.value = ''; delete card.dataset[k]; }
            else inp.focus(); }); });
      });
    }
    /* reabre el acordeón que se estaba usando antes del re-render */
    if (this._reopen) {
      const [dia, mi] = this._reopen.split('|'); this._reopen = null;
      const b = $$('#itinerary-container .it-day')
          .find(x => x.dataset.dia === dia),
        m = b && b.querySelectorAll('.multi')[+mi];
      if (m) m.classList.add('open'); }
  },
  /* quita la asignación del card tras doble confirmación */
  async unassign(id) {
    if (!(await confirmar('¿Quitar este campo del itinerario?')) ||
        !(await confirmar('¿Seguro? se quitará su asignación de día')))
      return;
    const k = document.getElementById(id);
    if (k) delete k.dataset.dia; this.syncItin(); }
});
