/* vuelapi.js — búsqueda en vivo de precios de vuelo: Amadeus, Kiwi
   Tequila y SerpAPI (Google Flights). Extiende el objeto Vuelos. */
'use strict';
Object.assign(Vuelos, {
  /* ---------- HTTP: nativo (sin CORS) o fetch ---------- */
  async _http(method, url, o) {
    o = o || {};
    const H = plugin('CapacitorHttp');
    if (H && esNativo()) {
      const r = await H.request({ method, url,
        headers: o.headers || {}, params: o.params || {},
        data: o.data });
      if (r.status >= 400) throw new Error('HTTP ' + r.status);
      return r.data;
    }
    const u = new URL(url);
    Object.keys(o.params || {}).forEach(k =>
      u.searchParams.set(k, o.params[k]));
    const r = await fetch(u.toString(), { method,
      headers: o.headers || {},
      body: o.data === undefined ? undefined : o.data });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  },
  /* ---------- búsqueda en vivo ---------- */
  async buscar() {
    const p = this._params(), res = $('#vu-res');
    if (!p.i) { showToast('Elegí la fecha de ida', 'error'); return; }
    const k = await this._keys(), jobs = [];
    if (k['vu.tequila']) jobs.push(this._tequila(p, k['vu.tequila']));
    if (k['vu.tp']) jobs.push(this._tp(p, k['vu.tp']));
    if (!jobs.length) {
      res.innerHTML = '<div class="card card-pad"><p class="hint text-sm">' +
        'Sin APIs configuradas — tocá la llave arriba para agregar ' +
        'Tequila o Aviasales, o usá los comparadores de abajo.' +
        '</p></div>';
      return;
    }
    res.innerHTML = '<div class="card card-pad"><p class="hint text-sm">' +
      '<i class="fa-solid fa-spinner fa-spin"></i> Buscando precios ' +
      'en vivo…</p></div>';
    const out = await Promise.allSettled(jobs),
          lista = [], errs = [];
    out.forEach(r => {
      if (r.status === 'fulfilled') lista.push.apply(lista, r.value);
      else errs.push((r.reason && r.reason.message) || 'sin respuesta');
    });
    this._last = { lista, errs, p };
    this._res(lista, errs, p.meta);
    this._calBuild(p, k);
  },
  /* re-aplica el filtro de aerolíneas sin nuevas llamadas a la API */
  _refil() {
    if (!this._last) return;
    const L = this._last;
    this._res(L.lista, L.errs, L.p.meta);
    this._calPaint(L.p);
  },
  _filtra(lista) {
    const sel = this.aerSel();
    if (!sel.length) return lista;
    return lista.filter(x => sel.some(c =>
      String(x.aer).split('+').includes(c)));
  },
  _res(lista, errs, meta) {
    lista = this._filtra(lista.slice().sort((a, b) => a.precio - b.precio));
    let h = '';
    const min = lista.length ? lista[0].precio : 0;
    if (min && meta && min <= meta)
      h += '<div class="card card-pad" style="border:1px solid #16a34a">' +
        '<p class="bold" style="color:#16a34a">' +
        '<i class="fa-solid fa-bell"></i> Bajó de tu objetivo: $' +
        Math.round(min) + ' ≤ $' + meta + '</p></div>';
    if (lista.length)
      h += '<div class="card card-pad"><h4 class="lbl">Mejores precios ' +
        'en vivo (' + lista.length + ')</h4>' + lista.map(x =>
        '<div class="it-acc" style="margin-top:.3rem"><div class="it-acc-btn">' +
        '<span class="it-acc-t">' + esc(x.aer) + '</span>' +
        '<span class="hint">' + esc(x.src) + ' · ' + x.seg +
        ' escala(s)</span>' +
        '<b style="color:var(--brand-600)">$' +
        Math.round(x.precio) + '</b></div></div>').join('') + '</div>';
    if (errs.length)
      h += '<div class="card card-pad"><p class="hint text-xs">' +
        errs.map(esc).join(' · ') + '</p></div>';
    if (!lista.length && !errs.length)
      h = '<div class="card card-pad"><p class="hint text-sm">' +
        'Sin resultados para esa ruta, fecha y aerolíneas.</p></div>';
    $('#vu-res').innerHTML = h;
  },
  _f(s) { const a = s.split('-'); return a[2] + '/' + a[1] + '/' + a[0]; },
  /* ---------- calendario de precios (Aviasales) ---------- */
  async _calBuild(p, k) {
    const box = $('#vu-cal'); if (!box) return;
    if (!k['vu.tp']) { box.innerHTML = ''; return; }
    const [mx, ch] = await Promise.allSettled([
      this._matrix(p, k['vu.tp']), this._cheapMes(p, k['vu.tp'])]);
    this._mx = mx.status === 'fulfilled' ? mx.value : {};
    this._cheap = ch.status === 'fulfilled' ? ch.value : [];
    this._calPaint(p);
  },
  async _matrix(p, key) {
    const r = await this._http('get',
      'https://api.travelpayouts.com/v2/prices/month-matrix', {
        params: { origin: p.o, destination: p.d,
          month: p.i.slice(0, 7), currency: 'usd', token: key } });
    const out = {};
    (r.data || []).forEach(o => {
      const d = +o.depart_date.slice(8, 10);
      if (!out[d] || o.value < out[d]) out[d] = o.value;
    });
    return out;
  },
  async _cheapMes(p, key) {
    const r = await this._http('get',
      'https://api.travelpayouts.com/v1/prices/cheap', { params: {
        origin: p.o, destination: p.d,
        depart_date: p.i.slice(0, 7), currency: 'usd', token: key } });
    const out = [], mes = (r.data || {})[p.d] || {};
    for (const k2 in mes) {
      const o = mes[k2];
      if (p.v && !o.return_at) continue;
      out.push({ aer: o.airline || '?', dia: +o.departure_at.slice(8, 10),
        precio: +o.price, ret: o.return_at || '' });
    }
    return out;
  },
  _colorAer(c) {
    const a = this.AEROF.find(x => x[0] === c);
    return a ? a[2] : '#64748b';
  },
  _calPaint(p) {
    const box = $('#vu-cal'); if (!box) return;
    const mx = this._mx || {}, ch = this._cheap || [],
          sel = this.aerSel(),
          y = +p.i.slice(0, 4), m = +p.i.slice(5, 7),
          ini = new Date(y, m - 1, 1).getDay(),
          nd = new Date(y, m, 0).getDate(),
          porDia = {};
    ch.forEach(e => {
      if (sel.length && !sel.includes(e.aer)) return;
      if (!porDia[e.dia] || e.precio < porDia[e.dia].precio)
        porDia[e.dia] = e;
    });
    let h = '<div class="card card-pad"><h4 class="lbl">' +
      'Calendario de precios · ' + p.i.slice(0, 7) + '</h4>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);' +
      'gap:.25rem;text-align:center;font-size:.72rem">' +
      ['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(w =>
        '<b class="muted">' + w + '</b>').join('');
    for (let i = 0; i < ini; i++) h += '<div></div>';
    for (let d = 1; d <= nd; d++) {
      const e = porDia[d], pr = e ? e.precio : mx[d],
            fecha = p.i.slice(0, 8) + (d < 10 ? '0' + d : d),
            col = e ? this._colorAer(e.aer) : '';
      h += '<div role="button" style="padding:.25rem 0;border-radius:.4rem;' +
        'cursor:pointer;border:1px solid ' +
        (col || 'var(--slate-200)') + (col ? ';background:' + col : '') +
        '" onclick="Vuelos.diaSel(\'' + fecha + '\')"' +
        (e ? ' title="' + esc(e.aer) + ' $' + Math.round(e.precio) + '"' : '') +
        '><div' + (col ? ' style="color:#fff"' : '') + '>' + d + '</div>' +
        '<div style="font-size:.6rem;' + (col ? 'color:#fff' :
        'color:var(--brand-600)') + '">' + (pr ? '$' + Math.round(pr) : '') +
        '</div></div>';
    }
    h += '</div><p class="hint text-xs" style="margin:.4rem 0 0">' +
      'Colores = aerolínea del mejor precio encontrado; gris = mínimo ' +
      'general del día. Tocá un día para abrir la compra.</p></div>';
    box.innerHTML = h;
  },
  diaSel(fecha) {
    const p = this._params();
    window.open('https://www.kayak.com/flights/' + p.o + '-' + p.d + '/' +
      fecha + (p.v ? '/' + p.v : '') + '?sort=price_a', '_blank');
  },
  async _tequila(p, key) {
    const q = { fly_from: p.o, fly_to: p.d,
      date_from: this._f(p.i), date_to: this._f(p.i),
      adults: '1', curr: 'USD', limit: '8', sort: 'price' };
    if (p.v) { q.return_from = this._f(p.v); q.return_to = this._f(p.v); }
    const r = await this._http('get',
      'https://api.tequila.kiwi.com/v2/search',
      { params: q, headers: { apikey: key } });
    return (r.data || []).map(o => ({ src: 'Tequila',
      aer: (o.airlines || ['?']).join('+'), precio: +o.price,
      seg: Math.max(0, (o.route || []).length - 1) }));
  },
  /* Travelpayouts / Aviasales: token gratis inmediato; devuelve la
     caché de precios más baratos encontrados en el mes de la fecha. */
  async _tp(p, key) {
    const mes = await this._cheapMes(p, key);
    return mes.map(o => ({ src: 'Aviasales', aer: o.aer,
      precio: o.precio, seg: '—' })).slice(0, 8);
  }
});
