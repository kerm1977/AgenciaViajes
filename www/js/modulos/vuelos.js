/* vuelos.js — buscador de vuelos baratos saliendo de Costa Rica.
   Abre comparadores y aerolíneas con la búsqueda pre-cargada
   (las APIs de precios son de pago; los deep-links son la vía gratuita). */
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
    { n: 'Copa Airlines', s: 'Web oficial',
      u: () => 'https://www.copaair.com/es/' },
    { n: 'Volaris', s: 'Web oficial',
      u: () => 'https://www.volaris.com/' },
    { n: 'Viva Aerobus', s: 'Web oficial',
      u: () => 'https://www.vivaaerobus.com/' },
    { n: 'Wingo', s: 'Web oficial',
      u: () => 'https://www.wingo.com/' }],
  TIPS: [
    'Martes y miércoles suelen ser los días más baratos para volar; evitá viernes y domingo.',
    'Comprá 4–8 semanas antes (regional) o 2–4 meses antes (internacional).',
    'Los vuelos de madrugada y mediodía suelen costar menos que los de la tarde.',
    'Activá "Alertas de precio" en Google Flights o Kayak para tu ruta.',
    'Revisá salir también desde Liberia (LIR): a veces es más barato a Norteamérica.',
    'Temporada baja desde CR: mayo–junio y setiembre–noviembre tienen mejores tarifas.'],
  render() {
    const o = $('#vu-o'), d = $('#vu-d');
    if (o && !o.options.length)
      o.innerHTML = this.AERO.map(x =>
        '<option value="' + x[0] + '">' + x[1] + '</option>').join('');
    if (d && !d.options.length)
      d.innerHTML = this.DEST.map(x =>
        '<option value="' + x[0] + '">' + x[1] + ' (' + x[0] +
        ')</option>').join('');
    const i = $('#vu-i');
    if (i && !i.value)
      i.value = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
    const t = $('#vu-tips');
    if (t && !t.children.length)
      t.innerHTML = this.TIPS.map(x => '<li>' + esc(x) + '</li>').join('');
    openModal('modal-vuelos');
    this._botones('#vu-agg', this.AGG);
    this._botones('#vu-aer', this.AEROL);
  },
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
    const arr = sel === '#vu-agg' ? this.AGG : this.AEROL,
          o = $('#vu-o').value, d = $('#vu-d').value,
          i = $('#vu-i').value, v = $('#vu-v').value;
    if (!i) { showToast('Elegí la fecha de ida', 'error'); return; }
    window.open(arr[ix].u(o, d, i, /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : ''),
      '_blank');
  }
};
