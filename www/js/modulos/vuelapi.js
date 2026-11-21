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
    if (p.i && !p.v) {
      showToast('Elegí la fecha de vuelta', 'error'); return;
    }
    p.flex = !p.i;
    if (p.flex) {
      const hoy = new Date();
      p.i = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-01';
    }
    this._calMes = p.i.slice(0, 7);   /* antes de pedir, para que la API
                                         consulte el mes correcto */
    const k = await this._keys(), jobs = [];
    if (k['vu.tequila'] && !p.flex)
      jobs.push(this._tequila(p, k['vu.tequila']));
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
    this._mxCache = {};
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
    const sel = this.aerSel(), meta = this._rango ? this._rango() : 9999;
    return lista.filter(x => x.precio <= meta &&
      (!sel.length || sel.some(c =>
        String(x.aer).split('+').includes(c))));
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
  /* calendarios por aerolínea: vuelcal.js (extiende este objeto) */
  async _tequila(p, key) {
    const q = { fly_from: p.o, fly_to: p.d,
      date_from: this._f(p.i), date_to: this._f(p.i),
      return_from: this._f(p.v), return_to: this._f(p.v),
      adults: '1', selected_cabins: 'M',  /* M = economy */
      curr: 'USD', limit: '8', sort: 'price' };
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
