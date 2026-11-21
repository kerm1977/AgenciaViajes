/* vuelapi.js — búsqueda en vivo de precios de vuelo (Aviasales/
   Travelpayouts). Extiende el objeto Vuelos. */
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
    if (k['vu.tp']) jobs.push(this._tp(p, k['vu.tp']));
    if (!jobs.length) {
      res.innerHTML = '<div class="card card-pad"><p class="hint text-sm">' +
        'Sin APIs configuradas — tocá la llave arriba para agregar ' +
        'tu token de Aviasales, o usá los comparadores de abajo.' +
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
    const sel = this.aerSel();
    if (!sel.length) return lista;
    return lista.filter(x => sel.some(c =>
      String(x.aer).split('+').includes(c)));
  },
  _res(lista, errs, meta) {
    lista = this._filtra(lista.slice().sort((a, b) => a.precio - b.precio));
    this._resLista = lista;
    let h = '';
    const min = lista.length ? lista[0].precio : 0;
    if (min && meta && min <= meta)
      h += '<div class="card card-pad" style="border:1px solid #16a34a">' +
        '<p class="bold" style="color:#16a34a">' +
        '<i class="fa-solid fa-bell"></i> Bajó de tu objetivo: $' +
        Math.round(min) + ' ≤ $' + meta + '</p></div>';
    if (lista.length)
      h += '<div class="card card-pad"><h4 class="lbl">Mejores precios ' +
        'en vivo (' + lista.length + ')</h4>' + lista.map((x, ix) =>
        '<div class="it-acc" style="margin-top:.3rem;cursor:pointer"' +
        ' onclick="Vuelos.comprar(' + ix + ')"><div class="it-acc-btn">' +
        '<span class="it-acc-t">' + esc(x.aer) + '</span>' +
        '<span class="hint">' + esc(x.src) + ' · ' + x.seg +
        ' escala(s)</span>' +
        '<b style="color:var(--brand-600)">$' +
        Math.round(x.precio) + '</b>' +
        '<i class="fa-solid fa-arrow-up-right-from-square muted"></i>' +
        '</div></div>').join('') + '</div>';
    if (errs.length)
      h += '<div class="card card-pad"><p class="hint text-xs">' +
        errs.map(esc).join(' · ') + '</p></div>';
    if (!lista.length && !errs.length)
      h = '<div class="card card-pad"><p class="hint text-sm">' +
        'Sin resultados para esa ruta, fecha y aerolíneas.</p></div>';
    $('#vu-res').innerHTML = h;
  },
  /* tocar un resultado de la lista abre la página de compra */
  comprar(ix) {
    const x = (this._resLista || [])[ix], p = this._params();
    if (!x) return;
    const fecha = x.fecha || p.i, ret = (x.ret || '').slice(0, 10),
          a = this.AEROF.find(v =>
            String(x.aer).split('+').includes(v[0]));
    if (a) { this.diaAerSel(a[0], fecha, ret); return; }
    this.diaSel(fecha, ret);
  },
  _f(s) { const a = s.split('-'); return a[2] + '/' + a[1] + '/' + a[0]; },
  /* calendarios por aerolínea: vuelcal.js (extiende este objeto) */
  /* Travelpayouts / Aviasales: token gratis inmediato; devuelve la
     caché de precios más baratos encontrados en el mes de la fecha. */
  async _tp(p, key) {
    const base = this._calMes || p.i.slice(0, 7);
    return (await this._aerFares(p, key))
      .filter(o => o.mo === base)
      .map(o => ({ src: 'Aviasales', aer: o.aer,
        precio: o.precio, seg: '—', fecha: o.fecha, ret: o.ret }))
      .slice(0, 8);
  }
});
