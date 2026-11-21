/* vuelvig.js — vigilante de precios: rutas vigiladas con su precio
   objetivo. Se revisa al abrir la página de Vuelos; si una ruta baja
   del objetivo avisa en pantalla, arma mensaje de WhatsApp (wa.me)
   y lo manda por Telegram si el bot está configurado. */
'use strict';
Object.assign(Vuelos, {
  VIGKEY: 'vu.vig',
  async _vig() {
    try {
      const k = await this._keys();
      return JSON.parse(k[this.VIGKEY] || '[]');
    } catch (e) { return []; }
  },
  async _vigSave(l) {
    await DB.save('config', { id: this.VIGKEY, valor: JSON.stringify(l) });
  },
  async vigAdd() {
    const p = this._params(), l = await this._vig();
    if (l.some(x => x.o === p.o && x.d === p.d && x.meta === p.meta)) {
      showToast('Esa ruta ya está vigilada', 'error'); return;
    }
    l.push({ o: p.o, d: p.d, meta: p.meta });
    await this._vigSave(l);
    this.vigList();
    showToast('Ruta vigilada — se revisa al abrir Vuelos');
  },
  async vigDel(i) {
    const l = await this._vig();
    l.splice(i, 1);
    await this._vigSave(l);
    this.vigList();
  },
  setTel(v) {
    DB.save('config', { id: 'vu.tel', valor: v }).catch(() => {});
  },
  async vigList() {
    const box = $('#vu-vig'); if (!box) return;
    const l = await this._vig(),
          tel = ((await this._keys())['vu.tel'] || '')
            .replace(/[^\d]/g, '');
    box.innerHTML = l.map((x, i) => {
      const ok = x.min != null && x.min <= x.meta,
            wa = ok && tel ?
              'https://wa.me/' + tel + '?text=' + encodeURIComponent(
                'Vuelo ' + x.o + '-' + x.d + ' bajó a $' +
                Math.round(x.min) + ' (objetivo $' + x.meta + ')') : '';
      return '<div class="it-acc" style="margin-top:.3rem' +
        (ok ? ';border:2px solid #16a34a' : '') + '">' +
        '<div class="it-acc-btn">' +
        '<span class="it-acc-t">' + esc(x.o + ' → ' + x.d) + '</span>' +
        '<span class="hint">objetivo $' + x.meta +
        (x.min != null ? ' · último $' + Math.round(x.min)
                       : ' · sin revisar') + '</span>' +
        (ok ? '<b style="color:#16a34a">¡BAJÓ!</b>' : '') +
        '<button type="button" class="iconbtn" onclick="Vuelos.vigDel(' +
        i + ')"><i class="fa-solid fa-trash"></i></button>' +
        '</div>' +
        (wa ? '<a class="btn btn-soft" style="font-size:.72rem;' +
          'padding:.2rem .5rem;margin-top:.3rem;display:inline-block"' +
          ' href="' + wa + '" target="_blank">' +
          '<i class="fa-brands fa-whatsapp"></i> Avisarme por ' +
          'WhatsApp</a>' : '') +
        '</div>';
    }).join('') || '<p class="hint text-xs">Sin rutas vigiladas — ' +
      'elegí origen, destino y precio objetivo, y tocá ' +
      '"Vigilar esta ruta".</p>';
  },
  /* mejor tarifa ida y vuelta encontrada por la API (cualquier mes) */
  async _vigMin(o, d, key) {
    const r = await this._http('get',
      'https://api.travelpayouts.com/v1/prices/cheap', { params: {
        origin: o, destination: d, trip_class: '0',
        currency: 'usd', token: key } });
    let min = 0;
    const mes = (r.data || {})[d] || {};
    for (const k2 in mes) {
      const e = mes[k2];
      if (e.return_at && e.price && (!min || +e.price < min))
        min = +e.price;
    }
    return min;
  },
  async vigCheck() {
    const l = await this._vig(); if (!l.length) return;
    const k = await this._keys(), t = k['vu.tg'], cid = k['vu.tgc'];
    let avisos = 0;
    for (const x of l) {
      try { x.min = await this._vigMin(x.o, x.d, k['vu.tp']); }
      catch (e) { continue; }
      if (x.min && x.min <= x.meta && x.min !== x.avisado) {
        x.avisado = x.min; avisos++;
        const msg = 'Vuelo ' + x.o + '-' + x.d + ' bajó a $' +
          Math.round(x.min) + ' (objetivo $' + x.meta + ')';
        showToast('¡' + msg + '!');
        if (t && cid)
          this._http('post',
            'https://api.telegram.org/bot' + t + '/sendMessage', {
              headers: { 'Content-Type': 'application/json' },
              data: JSON.stringify({ chat_id: cid, text: msg }) })
            .catch(() => {});
      }
      if (x.min && x.min > x.meta) delete x.avisado;
    }
    await this._vigSave(l);
    this.vigList();
    if (!avisos) showToast('Revisión lista — nada bajo tu objetivo');
  },
});
