/* vuelos.js — página completa: buscador de vuelos saliendo de Costa Rica.
   APIs en vivo (Amadeus, Kiwi Tequila, SerpAPI/Google Flights) con llaves
   propias guardadas en la tabla config; comparadores y aerolíneas por
   deep-link siempre disponibles. */
'use strict';
const Vuelos = {
  AERO: [['SJO', 'San José (SJO)'], ['LIR', 'Liberia (LIR)']],
  DEST: [
    ['PTY', 'Ciudad de Panamá'], ['MEX', 'Ciudad de México'],
    ['CUN', 'Cancún'], ['BOG', 'Bogotá'], ['MDE', 'Medellín'],
    ['CTG', 'Cartagena'], ['LIM', 'Lima'], ['UIO', 'Quito'],
    ['GYE', 'Guayaquil'], ['SAL', 'San Salvador'],
    ['GUA', 'Ciudad de Guatemala'], ['MGA', 'Managua'],
    ['TGU', 'Tegucigalpa'], ['SPS', 'San Pedro Sula'],
    ['MIA', 'Miami'], ['MCO', 'Orlando'], ['JFK', 'Nueva York'],
    ['LAX', 'Los Ángeles'], ['EZE', 'Buenos Aires'],
    ['SCL', 'Santiago'], ['MAD', 'Madrid'], ['BCN', 'Barcelona']],
  AGG: [
    { n: 'Google Flights', s: 'Precios + calendario',
      u: (o, d, i, v) => 'https://www.google.com/travel/flights?q=' +
        encodeURIComponent('vuelos de ' + o + ' a ' + d + ' el ' + i +
          (v ? ' regreso ' + v : ' solo ida')) },
    { n: 'Kayak', s: 'Ordenado por precio',
      u: (o, d, i, v) => 'https://www.kayak.com/flights/' + o + '-' + d +
        '/' + i + (v ? '/' + v : '') + '?sort=price_a' },
    { n: 'Momondo', s: 'Ordenado por precio',
      u: (o, d, i, v) => 'https://www.momondo.com/flight-search/' + o + '-' +
        d + '/' + i + (v ? '/' + v : '') + '?sort=price_a' },
    { n: 'Skyscanner', s: 'Todo el mes más barato',
      u: (o, d, i, v) => 'https://www.skyscanner.com/transport/flights/' +
        o.toLowerCase() + '/' + d.toLowerCase() + 'a/' +
        i.slice(2).replace(/-/g, '') +
        (v ? '/' + v.slice(2).replace(/-/g, '') : '') + '/?adults=1' },
    { n: 'Despegar', s: 'Cuotas y ofertas',
      u: (o, d, i, v) => 'https://www.despegar.com/shop/flights/results/' +
        (v ? 'roundtrip' : 'oneway') + '/' + o + '/' + d + '/' + i +
        '/' + (v || i) + '/1/0/0' }],
  AEROL: [
    { n: 'Avianca', s: 'Directo con búsqueda',
      u: (o, d, i, v) => 'https://www.avianca.com/es/booking/select/?o1=' +
        o + '&d1=' + d + '&dd1=' + i + (v ? '&dd2=' + v + '&r=1' : '') +
        '&adt=1' },
    { n: 'LATAM', s: 'Web oficial',
      u: (o, d) => 'https://www.latamairlines.com/es/es/ofertas-vuelos?origin=' +
        o + '&destination=' + d },
    { n: 'Copa Airlines', s: 'Web oficial',
      u: () => 'https://www.copaair.com/es/' },
    { n: 'Volaris', s: 'Web oficial',
      u: () => 'https://www.volaris.com/' },
    { n: 'Viva Aerobus', s: 'Web oficial',
      u: () => 'https://www.vivaaerobus.com/' },
    { n: 'Wingo', s: 'Web oficial',
      u: () => 'https://www.wingo.com/' }],
  KEYS: [
    ['vu.tequila', 'Kiwi Tequila apikey'],
    ['vu.tp', 'Travelpayouts (Aviasales) token']],
  TP_DEF: 'c1af75818f66a4d2e1d653066ae49987',  /* token Aviasales incrustado */
  /* aerolíneas del filtro: código IATA, nombre, color del calendario */
  AEROF: [
    ['AV', 'Avianca', '#d51243'], ['LA', 'LATAM', '#1e50a2'],
    ['CM', 'Copa', '#0072ce'], ['IB', 'Iberia', '#d7192d'],
    ['AA', 'American', '#0078d2'], ['UA', 'United', '#003366'],
    ['AM', 'Aeroméxico', '#002856'], ['DL', 'Delta', '#e01933'],
    ['NK', 'Spirit', '#c8a100'], ['Y4', 'Volaris', '#8e6bc0'],
    ['VB', 'Viva Aerobus', '#003a70'], ['P5', 'Wingo', '#7b2ff7']],
  _fA: {},   /* filtro de aerolíneas activo: {AV:true, LA:true} */
  aerChips() {
    const box = $('#vu-aerof'); if (!box) return;
    const vist = this._aerSeen || this.AEROF.map(a => a[0]),
          mn = this._aerMin || {};
    box.innerHTML = this.AEROF.filter(a => vist.includes(a[0])).map(a => {
      const on = this._fA[a[0]];
      return '<button type="button" class="btn btn-soft" ' +
        'style="padding:.2rem .5rem;font-size:.72rem' +
        (on ? ';background:' + a[2] + ';color:#fff;border-color:' +
        a[2] : '') + '"' +
        ' onclick="Vuelos.togAer(\'' + a[0] + '\')">' +
        '<i class="fa-solid fa-plane"></i> ' + esc(a[1]) +
        (mn[a[0]] != null ? ' $' + Math.round(mn[a[0]]) : '') +
        '</button>';
    }).join('') || '<p class="hint text-xs">Buscá para ver las ' +
      'aerolíneas que cubren esta ruta</p>';
  },
  togAer(c) {
    this._fA[c] = !this._fA[c];
    if (!this._fA[c]) delete this._fA[c];
    this.aerChips();
    if (this._refil) this._refil();
  },
  aerSel() { return Object.keys(this._fA); },
  TIPS: [
    'Martes y miércoles suelen ser los días más baratos para volar; evitá viernes y domingo.',
    'Comprá 4–8 semanas antes (regional) o 2–4 meses antes (internacional).',
    'Los vuelos de madrugada y mediodía suelen costar menos que los de la tarde.',
    'Activá "Alertas de precio" en Google Flights o Kayak para tu ruta.',
    'Revisá salir también desde Liberia (LIR): a veces es más barato a Norteamérica.',
    'Temporada baja desde CR: mayo–junio y setiembre–noviembre tienen mejores tarifas.'],

  async abrir() {
    const o = $('#vu-o'), d = $('#vu-d');
    if (o && !o.options.length)
      o.innerHTML = this.AERO.map(x =>
        '<option value="' + x[0] + '">' + x[1] + '</option>').join('');
    if (d && !d.options.length) {
      d.innerHTML = this.DEST.map(x =>
        '<option value="' + x[0] + '">' + x[1] + ' (' + x[0] +
        ')</option>').join('');
      d.value = 'LIM';   /* Lima por defecto */
    }
    /* fechas vacías = búsqueda flexible por mes */
    const t = $('#vu-tips');
    if (t && !t.children.length)
      t.innerHTML = this.TIPS.map(x => '<li>' + esc(x) + '</li>').join('');
    this._botones('#vu-agg', this.AGG);
    this._botones('#vu-aer', this.AEROL);
    this.aerChips();
    await this._keysForm();
    $('#pag-vuelos').classList.add('open');
  },
  cerrar() { $('#pag-vuelos').classList.remove('open'); },
  togKeys() { const k = $('#vu-keys'); if (k) k.hidden = !k.hidden; },
  onRango() {
    const s = $('#vu-metav');
    if (s) s.textContent = '$' + (($('#vu-meta') || {}).value || '');
    if (this._refil) this._refil();
  },
  _params() {
    const v = ($('#vu-v') || {}).value || '';
    return { o: $('#vu-o').value, d: $('#vu-d').value,
      i: $('#vu-i').value,
      v: /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '',
      meta: +(($('#vu-meta') || {}).value || 0) };
  },
  /* ---------- llaves (tabla config) ---------- */
  async _keys() {
    const out = {};
    try {
      for (const r of await DB.list('config')) out[r.id] = r.valor || '';
    } catch (e) { /* sin tabla aún */ }
    if (!out['vu.tp']) out['vu.tp'] = this.TP_DEF;
    return out;
  },
  async _keysForm() {
    const box = $('#vu-keylist'); if (!box || box.children.length) return;
    const kv = await this._keys();
    box.innerHTML = this.KEYS.map(k =>
      '<div><span class="fl-l">' + esc(k[1]) + '</span>' +
      '<input class="input" id="k-' + k[0] + '" type="password" ' +
      'placeholder="Pegá tu llave" value="' +
      esc(kv[k[0]] || (k[0] === 'vu.tp' ? this.TP_DEF : '')) +
      '"></div>').join('');
  },
  async guardarKeys() {
    for (const k of this.KEYS) {
      const v = (($('#k-' + k[0]) || {}).value || '').trim();
      if (v) await DB.save('config', { id: k[0], valor: v });
      else await DB.remove('config', k[0]).catch(() => {});
    }
    showToast('Llaves guardadas');
  },
  /* búsqueda en vivo: vuelapi.js (extiende este objeto) */
  /* ---------- comparadores / aerolíneas (deep-links) ---------- */
  _botones(sel, arr) {
    const box = $(sel); if (!box) return;
    box.innerHTML = arr.map((a, ix) =>
      '<button type="button" class="it-acc" style="width:100%;text-align:left"' +
      ' onclick="Vuelos.ir(\'' + sel + '\',' + ix + ')">' +
      '<div class="it-acc-head"><div class="it-acc-btn" style="pointer-events:none">' +
      '<span class="it-acc-t">' + esc(a.n) + '</span>' +
      '<span class="hint">' + esc(a.s) + '</span>' +
      '<i class="fa-solid fa-arrow-up-right-from-square muted"></i>' +
      '</div></div></button>').join('');
  },
  ir(sel, ix) {
    const arr = sel === '#vu-agg' ? this.AGG : this.AEROL, p = this._params();
    if (!p.i) { showToast('Elegí la fecha de ida', 'error'); return; }
    window.open(arr[ix].u(p.o, p.d, p.i, p.v), '_blank');
  }
};
