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
    if (k['vu.amadeus_key'] && k['vu.amadeus_sec'])
      jobs.push(this._amadeus(p, k));
    if (k['vu.tequila']) jobs.push(this._tequila(p, k['vu.tequila']));
    if (k['vu.serp']) jobs.push(this._serp(p, k['vu.serp']));
    if (!jobs.length) {
      res.innerHTML = '<div class="card card-pad"><p class="hint text-sm">' +
        'Sin APIs configuradas — tocá la llave arriba para agregar ' +
        'Amadeus, Tequila o SerpAPI, o usá los comparadores de abajo.' +
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
    this._res(lista, errs, p.meta);
  },
  _res(lista, errs, meta) {
    lista.sort((a, b) => a.precio - b.precio);
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
        'Sin resultados para esa ruta y fecha.</p></div>';
    $('#vu-res').innerHTML = h;
  },
  _f(s) { const a = s.split('-'); return a[2] + '/' + a[1] + '/' + a[0]; },
  async _amadeus(p, k) {
    const t = await this._http('post',
      'https://test.api.amadeus.com/v1/security/oauth2/token', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: 'grant_type=client_credentials&client_id=' +
          encodeURIComponent(k['vu.amadeus_key']) + '&client_secret=' +
          encodeURIComponent(k['vu.amadeus_sec']) });
    const q = { originLocationCode: p.o, destinationLocationCode: p.d,
      departureDate: p.i, adults: '1', currencyCode: 'USD', max: '8' };
    if (p.v) q.returnDate = p.v;
    const r = await this._http('get',
      'https://test.api.amadeus.com/v2/shopping/flight-offers', {
        params: q, headers: { Authorization: 'Bearer ' + t.access_token } });
    return (r.data || []).map(o => ({ src: 'Amadeus',
      aer: (o.validatingAirlineCodes || ['?']).join('+'),
      precio: +o.price.total,
      seg: Math.max(0, (o.itineraries[0].segments || []).length - 1) }));
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
  async _serp(p, key) {
    const q = { engine: 'google_flights', departure_id: p.o,
      arrival_id: p.d, outbound_date: p.i, currency: 'USD',
      hl: 'es', api_key: key, type: p.v ? '1' : '2' };
    if (p.v) q.return_date = p.v;
    const r = await this._http('get', 'https://serpapi.com/search.json',
      { params: q });
    const arr = (r.best_flights || []).concat(r.other_flights || []);
    return arr.map(o => ({ src: 'Google Flights',
      aer: ((o.flights || [])[0] || {}).airline || '?',
      precio: +o.price,
      seg: Math.max(0, (o.flights || []).length - 1) }));
  }
});
