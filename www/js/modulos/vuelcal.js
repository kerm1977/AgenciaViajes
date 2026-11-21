/* vuelcal.js — calendarios de precios: uno general ("Mejor precio") y
   uno por cada aerolínea con datos en la ruta, en su color. Barra de
   precio oculta aerolíneas por encima del objetivo; flechas navegan
   de hoy a 24 meses. Tocar un día abre la página de compra.
   Extiende el objeto Vuelos (vuelos.js / vuelapi.js). */
'use strict';
Object.assign(Vuelos, {
  /* ---------- datos del mes (con caché por mes) ---------- */
  async _calBuild(p, k) {
    const box = $('#vu-cal'); if (!box) return;
    if (!k['vu.tp']) { box.innerHTML = ''; return; }
    const mes = this._calMes;
    this._mxCache = this._mxCache || {};
    const c = this._mxCache[mes];
    if (c) {
      this._mx = c.mx; this._cheap = c.cheap;
      this._calPaint(p); return;
    }
    box.innerHTML = '<div class="card card-pad"><p class="hint text-sm">' +
      '<i class="fa-solid fa-spinner fa-spin"></i> Cargando ' + mes +
      '…</p></div>';
    const [mx, ch] = await Promise.allSettled([
      this._matrix(p, k['vu.tp']), this._cheapMes(p, k['vu.tp'])]);
    this._mx = mx.status === 'fulfilled' ? mx.value : {};
    this._cheap = ch.status === 'fulfilled' ? ch.value : [];
    this._mxCache[mes] = { mx: this._mx, cheap: this._cheap };
    this._calPaint(p);
  },
  async _matrix(p, key) {
    const r = await this._http('get',
      'https://api.travelpayouts.com/v2/prices/month-matrix', {
        params: { origin: p.o, destination: p.d, trip_class: '0',
          month: this._calMes, currency: 'usd', token: key } });
    const out = {};
    (r.data || []).forEach(o => {
      if (!o.depart_date || o.depart_date.slice(0, 7) !== this._calMes)
        return;
      if (o.actual === false || !o.return_date) return;
      const d = +o.depart_date.slice(8, 10);
      if (!out[d] || o.value < out[d]) out[d] = o.value;
    });
    return out;
  },
  async _cheapMes(p, key) {
    const r = await this._http('get',
      'https://api.travelpayouts.com/v1/prices/cheap', { params: {
        origin: p.o, destination: p.d, trip_class: '0',
        depart_date: this._calMes || p.i.slice(0, 7),
        currency: 'usd', token: key } });
    const out = [], mes = (r.data || {})[p.d] || {};
    for (const k2 in mes) {
      const o = mes[k2];
      if (!o.departure_at ||
          o.departure_at.slice(0, 7) !== (this._calMes ||
            p.i.slice(0, 7))) continue;
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
  _rango() { return +(($('#vu-meta') || {}).value) || 9999; },
  /* ---------- pintado ---------- */
  _calPaint(p) {
    const box = $('#vu-cal'); if (!box) return;
    const mes = this._calMes || p.i.slice(0, 7),
          mx = this._mx || {}, ch = this._cheap || [],
          sel = this.aerSel(), meta = this._rango(),
          y = +mes.slice(0, 4), m = +mes.slice(5, 7),
          hoy = new Date(),
          minMes = hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0'),
          maxD = new Date(hoy.getFullYear(), hoy.getMonth() + 24, 1),
          maxMes = maxD.getFullYear() + '-' +
            String(maxD.getMonth() + 1).padStart(2, '0'),
          label = new Date(y, m - 1, 1).toLocaleDateString('es-ES',
            { month: 'long', year: 'numeric' }),
          porDia = {}, porAer = {}, seen = {}, aerMin = {};
    ch.forEach(e => {
      seen[e.aer] = 1;
      if (!porAer[e.aer]) porAer[e.aer] = {};
      if (!porAer[e.aer][e.dia] || e.precio < porAer[e.aer][e.dia].precio)
        porAer[e.aer][e.dia] = e;
      if (!porDia[e.dia] || e.precio < porDia[e.dia].precio)
        porDia[e.dia] = e;
    });
    ((this._last || {}).lista || []).forEach(x =>
      String(x.aer).split('+').forEach(c => { if (c !== '?') seen[c] = 1; }));
    Object.keys(porAer).forEach(c =>
      aerMin[c] = Math.min.apply(null,
        Object.keys(porAer[c]).map(d => porAer[c][d].precio)));
    this._aerSeen = Object.keys(seen);
    this._aerMin = aerMin;
    this.aerChips();
    const pD = {}, mxf = {};
    Object.keys(porDia).forEach(d => {
      const e = porDia[d];
      if (sel.length && !sel.includes(e.aer)) return;
      if (e.precio > meta) return;
      pD[d] = e;
    });
    Object.keys(mx).forEach(d => { if (mx[d] <= meta) mxf[d] = mx[d]; });
    let h = '<div class="card card-pad">' +
      '<div class="flex" style="align-items:center;justify-content:' +
      'space-between;margin-bottom:.2rem">' +
      '<button type="button" class="iconbtn"' +
      (mes <= minMes ? ' disabled' : '') +
      ' onclick="Vuelos.calNav(-1)"><i class="fa-solid fa-chevron-left">' +
      '</i></button>' +
      '<h4 class="lbl" style="margin:0;text-transform:capitalize">' +
      esc(label) + '</h4>' +
      '<button type="button" class="iconbtn"' +
      (mes >= maxMes ? ' disabled' : '') +
      ' onclick="Vuelos.calNav(1)"><i class="fa-solid fa-chevron-right">' +
      '</i></button></div>' +
      this._calGrid(mes, pD, mxf, null, 'Mejor precio');
    this.AEROF.forEach(a => {
      const pd = porAer[a[0]];
      if (!pd) return;
      if (sel.length && !sel.includes(a[0])) return;
      if (aerMin[a[0]] > meta) return;
      h += this._calGrid(mes, pd, {}, a, null);
    });
    if (!Object.keys(pD).length && !Object.keys(porAer).length)
      h += '<p class="hint text-sm">Sin datos de precios en este mes.</p>';
    h += '<p class="hint text-xs" style="margin:.4rem 0 0">' +
      'Cada calendario es una aerolínea con su color; tocá un día para ' +
      'abrir la página de compra. Los precios son la última tarifa ' +
      'encontrada en Aviasales — al comprar pueden variar.</p></div>';
    box.innerHTML = h;
  },
  _calGrid(mes, porDia, mx, aer, titulo) {
    const y = +mes.slice(0, 4), m = +mes.slice(5, 7),
          ini = new Date(y, m - 1, 1).getDay(),
          nd = new Date(y, m, 0).getDate(),
          col = aer ? aer[2] : '',
          nom = aer ? aer[1] : titulo,
          mn = aer ? this._aerMin[aer[0]] : 0;
    let h = '<div style="margin-top:.6rem"><p class="lbl" style="' +
      'margin:0 0 .2rem">' +
      (col ? '<i class="fa-solid fa-circle" style="color:' + col +
        ';font-size:.55rem"></i> ' : '') + esc(nom) +
      (mn ? ' <span class="muted">· desde $' + Math.round(mn) +
        '</span>' : '') + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);' +
      'gap:2px;text-align:center;font-size:.7rem">' +
      ['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(w =>
        '<b class="muted">' + w + '</b>').join('');
    for (let i = 0; i < ini; i++) h += '<div></div>';
    for (let d = 1; d <= nd; d++) {
      const e = porDia[d], pr = e ? e.precio : mx[d],
            fecha = mes + '-' + (d < 10 ? '0' + d : d),
            c2 = e ? (col || this._colorAer(e.aer)) : '',
            tgt = aer ? 'Vuelos.diaAerSel(\'' + aer[0] + '\',\'' + fecha +
              '\')' : 'Vuelos.diaSel(\'' + fecha + '\')';
      h += '<div role="button" style="padding:.2rem 0;border-radius:.35rem;' +
        'cursor:pointer;border:1px solid ' + (c2 || '#e2e8f0') +
        (c2 ? ';background:' + c2 : '') + '" onclick="' + tgt + '"' +
        (e ? ' title="' + esc(e.aer) + ' $' + Math.round(e.precio) + '"'
           : '') + '><div' + (c2 ? ' style="color:#fff"' : '') + '>' +
        d + '</div><div style="font-size:.58rem;' +
        (c2 ? 'color:#fff' : 'color:var(--brand-600)') + '">' +
        (pr ? '$' + Math.round(pr) : '') + '</div></div>';
    }
    return h + '</div></div>';
  },
  async calNav(dir) {
    const L = this._last; if (!L) return;
    const [y, m] = this._calMes.split('-').map(Number),
          nm = new Date(y, m - 1 + dir, 1),
          mes = nm.getFullYear() + '-' +
            String(nm.getMonth() + 1).padStart(2, '0'),
          hoy = new Date(),
          minMes = hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0'),
          maxD = new Date(hoy.getFullYear(), hoy.getMonth() + 24, 1),
          maxMes = maxD.getFullYear() + '-' +
            String(maxD.getMonth() + 1).padStart(2, '0');
    if (mes < minMes || mes > maxMes) return;
    this._calMes = mes;
    this._mx = {}; this._cheap = [];
    this._calPaint(L.p);
    const k = await this._keys();
    this._calBuild(L.p, k);
  },
  diaSel(fecha) {
    const p = this._params();
    window.open('https://www.kayak.com/flights/' + p.o + '-' + p.d + '/' +
      fecha + (p.v ? '/' + p.v : '') + '?sort=price_a', '_blank');
  },
  /* día de un calendario de aerolínea: abre su web oficial si existe */
  diaAerSel(code, fecha) {
    const p = this._params(),
          a = this.AEROF.find(x => x[0] === code),
          l = a && this.AEROL.find(x => x.n.indexOf(a[1]) === 0);
    if (l) { window.open(l.u(p.o, p.d, fecha, p.v), '_blank'); return; }
    this.diaSel(fecha);
  },
});
