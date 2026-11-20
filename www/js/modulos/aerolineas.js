/* aerolineas.js — card de Aerolínea: aerolíneas que llegan a Costa Rica
   con check-in/check-out automático, clases tarifarias por aerolínea y
   precios (boleto, asiento, maleta, clase). */
'use strict';
const AEROLINEAS = {
  'Avianca':       { ci: 'https://www.avianca.com/check-in/', co: 'https://www.avianca.com/',
    clases: ['Basic', 'Light', 'Classic', 'Flex', 'Business'] },
  'Copa Airlines': { ci: 'https://www.copaair.com/en/web/check-in', co: 'https://www.copaair.com/',
    clases: ['Economy Basic', 'Economy Classic', 'Economy Full', 'Business'] },
  'United':        { ci: 'https://www.united.com/en/us/checkin', co: 'https://www.united.com/',
    clases: ['Basic Economy', 'Economy', 'Economy Plus', 'Premium Plus', 'Polaris Business'] },
  'American':      { ci: 'https://www.aa.com/check-in', co: 'https://www.aa.com/',
    clases: ['Basic Economy', 'Main Cabin', 'Main Cabin Extra', 'Premium Economy', 'Business'] },
  'Delta':         { ci: 'https://www.delta.com/check-in', co: 'https://www.delta.com/',
    clases: ['Basic', 'Main Cabin', 'Comfort+', 'First', 'Delta One'] },
  'JetBlue':       { ci: 'https://www.jetblue.com/check-in', co: 'https://www.jetblue.com/',
    clases: ['Blue Basic', 'Blue', 'Blue Plus', 'Mint'] },
  'Spirit':        { ci: 'https://www.spirit.com/check-in', co: 'https://www.spirit.com/',
    clases: ['Standard', 'Premium', 'Big Front Seat'] },
  'Frontier':      { ci: 'https://www.flyfrontier.com/check-in', co: 'https://www.flyfrontier.com/',
    clases: ['Basic', 'Economy', 'Premium', 'Business'] },
  'Southwest':     { ci: 'https://www.southwest.com/air/check-in', co: 'https://www.southwest.com/',
    clases: ['Wanna Get Away', 'Anytime', 'Business Select'] },
  'Alaska':        { ci: 'https://www.alaskaair.com/check-in', co: 'https://www.alaskaair.com/',
    clases: ['Saver', 'Main', 'Premium', 'First'] },
  'Air Canada':    { ci: 'https://www.aircanada.com/check-in', co: 'https://www.aircanada.com/',
    clases: ['Basic', 'Standard', 'Flex', 'Comfort', 'Premium Economy', 'Business'] },
  'WestJet':       { ci: 'https://www.westjet.com/check-in', co: 'https://www.westjet.com/',
    clases: ['UltraBasic', 'Econo', 'EconoFlex', 'Premium', 'Business'] },
  'Aeroméxico':    { ci: 'https://aeromexico.com/en-us/check-in', co: 'https://aeromexico.com/',
    clases: ['Basic', 'Classic', 'AM Plus', 'Premier'] },
  'Volaris':       { ci: 'https://cms.volaris.com/en/travel-info/flight-services/check-in/', co: 'https://www.volaris.com/',
    clases: ['Zero', 'Basic', 'Plus'] },
  'Viva Aerobus':  { ci: 'https://web.vivaaerobus.com/check-in', co: 'https://www.vivaaerobus.com/',
    clases: ['Zero', 'Light', 'Extra', 'Smart'] },
  'LATAM':         { ci: 'https://www.latamairlines.com/check-in', co: 'https://www.latamairlines.com/',
    clases: ['Light', 'Plus', 'Top', 'Premium Business'] },
  'Iberia':        { ci: 'https://www.iberia.com/check-in-online/', co: 'https://www.iberia.com/',
    clases: ['Basic', 'Optimal', 'Confort', 'Business'] },
  'Air Europa':    { ci: 'https://www.aireuropa.com/en/flights/check-in', co: 'https://www.aireuropa.com/',
    clases: ['Lite', 'Standard', 'Flex', 'Business'] },
  'KLM':           { ci: 'https://www.klm.com/checkin', co: 'https://www.klm.com/',
    clases: ['Light', 'Standard', 'Flex', 'Premium Comfort', 'Business'] },
  'Lufthansa':     { ci: 'https://www.lufthansa.com/xx/en/online-check-in', co: 'https://www.lufthansa.com/',
    clases: ['Light', 'Classic', 'Flex', 'Premium Economy', 'Business'] },
  'British Airways': { ci: 'https://www.britishairways.com/travel/checkin/public/en_gb', co: 'https://www.britishairways.com/',
    clases: ['Basic', 'Standard', 'Plus', 'Premium Economy', 'Business', 'First'] },
  'Air France':    { ci: 'https://www.airfrance.com/check-in', co: 'https://www.airfrance.com/',
    clases: ['Light', 'Standard', 'Flex', 'Premium', 'Business'] },
  'Edelweiss':     { ci: 'https://www.flyedelweiss.com/en/prepare/check-in', co: 'https://www.flyedelweiss.com/',
    clases: ['Economy Light', 'Economy Classic', 'Economy Flex', 'Business'] },
  'Condor':        { ci: 'https://www.condor.com/us/flight-preparation/check-in', co: 'https://www.condor.com/',
    clases: ['Economy Light', 'Economy Classic', 'Economy Flex', 'Premium', 'Business'] },
  'Wingo':         { ci: 'https://www.wingo.com/en/check-in', co: 'https://www.wingo.com/',
    clases: ['Go', 'Go Plus', 'Premium'] },
  'Sky Airline':   { ci: 'https://www.skyairline.com/check-in', co: 'https://www.skyairline.com/',
    clases: ['Zero', 'Plus', 'Full'] },
  'Arajet':        { ci: 'https://arajet.com/check-in', co: 'https://arajet.com/',
    clases: ['Basic', 'Comfort', 'Extra'] },
  'Sansa (doméstica)': { ci: 'https://flysansa.com/', co: 'https://flysansa.com/',
    clases: ['Regular'] }
};
Itinerario.aeroCard = function (card, nombre, x) {
  const nombres = Object.keys(AEROLINEAS);
  const asientoInc = x.ai === '1' || x.ai === true;
  card.dataset.aero = '1';
  const fl = (l, h, hd, cls) => '<div class="fl' + (cls ? ' ' + cls : '') +
    '"' + (hd ? ' hidden' : '') + '><span class="fl-l">' + l + '</span>' +
    h + '</div>';
  const osOn = x.os === '1' || x.os === true;
  card.querySelector('.it-acc-body').innerHTML =
    fl('Aerolínea', '<select class="select it-aero">' +
      '<option value="">— Aerolínea —</option>' +
      nombres.map(n => '<option' + (n === nombre ? ' selected' : '') + '>' +
        esc(n) + '</option>').join('') + '</select>') +
    fl('Enlace check-in', '<input class="input it-ci" value="' +
      esc(x.ci || '') + '">') +
    fl('Enlace check-out', '<input class="input it-co" value="' +
      esc(x.co || '') + '">') +
    '<p class="it-achk hint" style="margin:.1rem 0 .2rem"></p>' +
    fl('Clase', '<select class="select it-clase"><option value="">' +
      '— Clase —</option></select>') +
    '<hr class="it-hr">' +
    fl('Precio boleto', '<input type="number" min="0" step="1" value="' +
      esc(x.pb || '') + '" class="input it-pb">', 0, 'fl-p') +
    '<label class="it-aic"><input type="checkbox" class="it-ai"' +
      (asientoInc ? ' checked' : '') + '> Asiento incluido</label>' +
    fl('Costo del asiento', '<input type="number" min="0" step="1" ' +
      'class="input it-ps" value="' + esc(x.ps || '') + '">',
      asientoInc, 'fl-p') +
    '<label class="it-aic"><input type="checkbox" class="it-os"' +
      (osOn ? ' checked' : '') + '> Otros servicios</label>' +
    fl('Precio del servicio', '<input type="number" min="0" step="1" ' +
      'class="input it-osv" value="' + esc(x.osv || '') + '">',
      !osOn, 'fl-p') + '<hr class="it-hr">' +
    fl('¿Qué incluye?', '<input class="input it-osd" value="' +
      esc(x.osd || '') + '">', !osOn) +
    '<label class="it-aic"><input type="checkbox" class="it-esc"' +
      (x.esc === '1' || x.esc === true ? ' checked' : '') +
      '> Tiene escala</label>' +
    '<div class="it-escw"' +
      (x.esc === '1' || x.esc === true ? '' : ' hidden') + '>' +
      fl('País de escala', '<select class="select it-escp">' +
        '<option value="">— País de escala —</option>' +
        PAISES.map(p => '<option' + (p === x.escp ? ' selected' : '') +
          '>' + esc(p) + '</option>').join('') + '</select>') +
      fl('Número de vuelo', '<input class="input it-escv" value="' +
        esc(x.escv || '') + '">') +
      fl('Hora de la escala', '<input type="time" class="input it-esch" ' +
        'value="' + esc(x.esch || '') + '">') +
      fl('Aerolínea de la escala', '<select class="select it-esca">' +
        '<option value="">— Aerolínea de la escala —</option>' +
        nombres.map(n => '<option' + (n === x.esca ? ' selected' : '') +
          '>' + esc(n) + '</option>').join('') + '</select>') + '</div>' +
    '<p class="it-total it-tota hint"></p>';
  const sel = card.querySelector('.it-aero'),
        cls = card.querySelector('.it-clase'),
        chk = card.querySelector('.it-achk'),
        ci  = card.querySelector('.it-ci'),
        co  = card.querySelector('.it-co'),
        ai  = card.querySelector('.it-ai'),
        ps  = card.querySelector('.it-ps'),
        os  = card.querySelector('.it-os'),
        osv = card.querySelector('.it-osv'),
        osd = card.querySelector('.it-osd'),
        tot = card.querySelector('.it-tota'),
        inp = (c) => card.querySelector(c);
  const hint = card.querySelector('.it-hint');
  const n = el => parseFloat(el.value) || 0;
  const sim = () => ($('#dest-moneda') || {}).value || '$';
  const total = () => {
    const base = n(inp('.it-pb')) + (os.checked ? n(osv) : 0);
    const con = base + (ai.checked ? 0 : n(ps));
    const cg = Itinerario.pax(), sg = Itinerario.paxS();
    if (!con) { tot.innerHTML = ''; hint.textContent = ''; return; }
    let h;
    if (cg) {   /* boleto P/P: c/u repartido entre S/G, cobrado a todos */
      const T = con * cg, cu = sg ? Math.round(T / sg) : con;
      h = 'P/P ' + sim() + con.toFixed(0) + ' × ' + cg + ' C/G = ' +
        sim() + T.toFixed(0) +
        (sg ? '<br>÷ ' + sg + ' S/G = ' + sim() + cu + ' c/u' : '') +
        '<br><b>Total: ' + sim() + (cu * cg).toFixed(0) + '</b>';
    } else h = '<b>Total: ' + sim() + con.toFixed(0) + '</b>';
    tot.innerHTML = '<hr class="it-hr">' + h;
    hint.textContent = sim() + (sg ? Math.round(con * cg / sg) : con);
    if (Itinerario._gtotal) Itinerario._gtotal();
  };
  card._tot = total;   // refresh() lo recalcula al cambiar C/G o S/G
  const pintar = () => {
    const a = AEROLINEAS[sel.value];
    /* enlaces: precarga del catálogo solo si el campo sigue vacío —
       cualquier edición manual siempre gana */
    if (a) {
      if (!ci.value || Object.values(AEROLINEAS)
          .some(k => k.ci === ci.value)) ci.value = a.ci;
      if (!co.value || Object.values(AEROLINEAS)
          .some(k => k.co === co.value)) co.value = a.co;
    }
    const lk = () => (ci.value ? '<a href="' + esc(ci.value) +
        '" target="_blank">Check-in</a>' : '') +
      (co.value ? (ci.value ? ' · ' : '') + '<a href="' + esc(co.value) +
        '" target="_blank">Check-out</a>' : '');
    chk.innerHTML = lk();
    [ci, co].forEach(i => i.oninput = () => { chk.innerHTML = lk(); });
    const tt = card.querySelector('.it-acc-t');
    if (tt) tt.textContent = sel.value
      ? 'Aerolínea · ' + sel.value : 'Aerolínea';
    total();
    cls.innerHTML = '<option value="">— Clase —</option>' +
      (a ? a.clases.map(c => '<option' + (c === x.clase ? ' selected' : '') +
        '>' + esc(c) + '</option>').join('') : '');
  };
  const es = card.querySelector('.it-esc');
  es.addEventListener('change', () => {
    card.querySelector('.it-escw').hidden = !es.checked; });
  sel.addEventListener('change', () => { x.clase = ''; pintar(); });
  ai.addEventListener('change', () => {
    ps.closest('.fl').hidden = ai.checked; total(); });
  os.addEventListener('change', () => {
    osv.closest('.fl').hidden = osd.closest('.fl').hidden =
      !os.checked; total(); });
  ['.it-pb', '.it-ps', '.it-osv'].forEach(c =>
    inp(c).addEventListener('input', total));
  pintar(); total();
};
Itinerario.aeroCollect = function (card) {
  const nombre = card.querySelector('.it-aero').value;
  const a = AEROLINEAS[nombre] || {};
  return {
    campo: card.dataset.tipo, valor: nombre,
    checkin: card.querySelector('.it-ci').value.trim() || a.ci || '',
    checkout: card.querySelector('.it-co').value.trim() || a.co || '',
    ci: card.querySelector('.it-ci').value.trim(),
    co: card.querySelector('.it-co').value.trim(),
    clase: card.querySelector('.it-clase').value,
    pb: card.querySelector('.it-pb').value,
    ai: card.querySelector('.it-ai').checked ? '1' : '0',
    ps: card.querySelector('.it-ps').value,
    os: card.querySelector('.it-os').checked ? '1' : '0',
    osv: card.querySelector('.it-osv').value,
    osd: card.querySelector('.it-osd').value,
    esc: card.querySelector('.it-esc').checked ? '1' : '0',
    escp: card.querySelector('.it-escp').value,
    escv: card.querySelector('.it-escv').value,
    esch: card.querySelector('.it-esch').value,
    esca: card.querySelector('.it-esca').value
  };
};
