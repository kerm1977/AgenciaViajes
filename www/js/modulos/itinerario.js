/* itinerario.js — mini itinerario: un selector de día + uno de evento;
   al agregar aparece un acordeón "Día N · Evento" con los inputs dentro
   (detalle, contacto, teléfono con código del país, precio, por
   persona/grupo y total calculado). Los campos del viaje (imagen, guía,
   transporte, aerolínea, vuelo, check-in, notas) también son opciones:
   su acordeón trae un solo input. */
'use strict';
const Itinerario = {
  TIPOS: ['Llegada y traslado','Guía','Transporte Aéreo','Lancha',
    'Avioneta','Tour Operador','Agencia de Viajes','Entradas 4x4','Acarreo',
    'Estadía / Hospedaje','Hotel','Uber / Didi / Taxi / Bus',
    'Centro Turístico','Centro Arqueológico'],
  /* opciones que guardan un solo valor en el objeto destino */
  CAMPOS: {
    'Imagen URL':      { k: 'imagen',      ph: 'https://…', t: 'url' },
    'Guía asignado':   { k: 'guia',        ph: 'Nombre del guía' },
    'Transporte':      { k: 'transporte',  ph: 'Ej. Autobús privado / Van' },
    'Aerolínea':       { k: 'aerolinea',   ph: 'Ej. Avianca, Copa, Iberia…' },
    'Número de vuelo': { k: 'vuelo',       ph: 'Ej. IB-6301' },
    'Enlace check-in': { k: 'checkin',     ph: 'https://…', t: 'url' },
    'Descripción / notas': { k: 'notas',   ph: 'Detalles del viaje…', ta: 1 }
  },
  async delRow(rid) {
    if (await confirmar('¿Eliminar este día / evento del itinerario?'))
      document.getElementById(rid).remove();
  },
  pax() { return parseInt((($('#dest-conguia') || {}).value) || '0') || 0; },
  paxS() { return parseInt((($('#dest-singuia') || {}).value) || '0') || 0; },
  _fmt(n) {
    const s = (($('#dest-moneda') || {}).value === 'CRC') ? '₡' : '$';
    return s + n.toLocaleString('en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
  _calc(card) {
    const precio = parseFloat(card.querySelector('.it-precio').value) || 0;
    const modo = card.querySelector('.it-modo').value;
    const n = this.pax(), ns = this.paxS();
    const out = card.querySelector('.it-total');
    if (!precio || !n) { out.innerHTML = ''; return; }
    if (modo === 'grupo') {
      let h = '<hr class="it-hr">Grupo ' + this._fmt(precio) + ' → ' +
        this._fmt(precio / n) + ' P/P (' + n + ' C/G)';
      if (ns && ns !== n)
        h += '<br>' + this._fmt(precio / ns) + ' P/P (' + ns + ' S/G)';
      out.innerHTML = h;
    } else {
      let h = '<hr class="it-hr">P/P ' + this._fmt(precio) + ' × ' + n +
        ' C/G = ' + this._fmt(precio * n);
      if (ns && ns !== n)
        h += '<br>' + this._fmt(precio) + ' × ' + ns + ' S/G = ' +
          this._fmt(precio * ns);
      out.innerHTML = h;
    }
  },
  initPickers() {
    const d = $('#it-dia-new'), t = $('#it-tipo-new');
    if (!d || !t) return;
    let ops = '';
    for (let i = 1; i <= 30; i++) ops += '<option>Día ' + i + '</option>';
    d.innerHTML = ops;
    const todo = this.TIPOS.concat(Object.keys(this.CAMPOS));
    t.innerHTML = '<option value="">— Evento / campo —</option>' +
      todo.map(x => '<option>' + esc(x) + '</option>').join('');
    t.value = '';
    if (!t._wired) {
      t._wired = 1;
      t.addEventListener('change', () => { if (t.value) this.addNueva(); });
    }
  },
  addNueva() {
    const t = $('#it-tipo-new');
    if (!t || !t.value) { showToast('Elige el evento', 'error'); return; }
    this.addRow($('#it-dia-new').value, t.value, '');
    t.value = ''; t.dispatchEvent(new Event('change'));
  },
  refresh() {
    $$('#itinerary-container .it-acc').forEach(c => {
      const cod = c.querySelector('.it-cod');
      if (cod) cod.textContent =
        codigoDePais($('#dest-pais').value) || '—';
      if (c.querySelector('.it-precio')) this._calc(c);
    });
  },
  addRow(dia, tipo, ruta, x) {
    x = x || {};
    const c = $('#itinerary-container');
    const rid = uid('it');
    const card = document.createElement('div');
    card.className = 'it-acc it-card open'; card.id = rid;
    card.dataset.tipo = tipo || 'Parada';
    const campo = this.CAMPOS[tipo];
    if (campo) {
      card.dataset.campo = '1';
      card.innerHTML =
        '<div class="it-acc-head">' +
          '<button type="button" class="it-acc-btn" ' +
            'onclick="this.parentElement.parentElement.classList.toggle(\'open\')">' +
            '<span class="it-acc-t">' + esc(tipo) + '</span>' +
            '<i class="fa-solid fa-chevron-down"></i></button>' +
          '<button type="button" class="iconbtn danger" title="Quitar" ' +
            'onclick="Itinerario.delRow(\'' + rid + '\')">' +
            '<i class="fa-solid fa-xmark"></i></button></div>' +
        '<div class="it-acc-body">' +
          (campo.ta
            ? '<textarea class="input it-campo" rows="2" placeholder="' +
              esc(campo.ph) + '">' + esc(ruta || '') + '</textarea>'
            : '<input type="' + (campo.t || 'text') + '" placeholder="' +
              esc(campo.ph) + '" value="' + esc(ruta || '') +
              '" class="input it-campo">') +
        '</div>';
      c.appendChild(card);
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    card.dataset.dia = dia || 'Día 1';
    card.innerHTML =
      '<div class="it-acc-head">' +
        '<button type="button" class="it-acc-btn" ' +
          'onclick="this.parentElement.parentElement.classList.toggle(\'open\')">' +
          '<span class="dia">' + esc(card.dataset.dia) + '</span>' +
          '<span class="it-acc-t">' + esc(card.dataset.tipo) + '</span>' +
          '<i class="fa-solid fa-chevron-down"></i></button>' +
        '<button type="button" class="iconbtn danger" title="Quitar parada" ' +
          'onclick="Itinerario.delRow(\'' + rid + '\')">' +
          '<i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="it-acc-body">' +
        '<input type="text" placeholder="Detalle (Ej. llegada hotel)" ' +
          'value="' + esc(ruta || '') + '" class="input it-ruta">' +
        '<div class="grid-2">' +
          '<input type="text" placeholder="Nombre (guía / agencia)" ' +
            'value="' + esc(x.nombre || '') + '" class="input it-nombre">' +
          '<div class="it-tel"><span class="it-cod">' +
            esc(codigoDePais(($('#dest-pais') || {}).value) || '—') + '</span>' +
            '<input type="tel" placeholder="Teléfono" data-norm="digitos" ' +
              'value="' + esc(x.tel || '') + '" class="input it-num"></div>' +
        '</div>' +
        '<div class="grid-2">' +
          '<input type="number" min="0" step="0.01" placeholder="Precio del servicio" ' +
            'value="' + esc(x.precio || '') + '" class="input it-precio">' +
          '<select class="select it-modo">' +
            '<option value="persona"' + (x.modo !== 'grupo' ? ' selected' : '') +
              '>Por persona</option>' +
            '<option value="grupo"' + (x.modo === 'grupo' ? ' selected' : '') +
              '>Por grupo</option></select></div>' +
        '<p class="it-total hint"></p>' +
      '</div>';
    c.appendChild(card);
    card.addEventListener('input', () => this._calc(card));
    card.addEventListener('change', () => this._calc(card));
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this._calc(card);
  },
  collect() {
    const it = [];
    $$('#itinerary-container .it-acc').forEach(card => {
      if (card.dataset.campo) {
        it.push({ campo: card.dataset.tipo,
                  valor: card.querySelector('.it-campo').value.trim() });
        return;
      }
      const cod = codigoDePais($('#dest-pais').value);
      const tel = card.querySelector('.it-num').value.trim();
      it.push({
        dia: card.dataset.dia,
        tipo: card.dataset.tipo,
        ruta: card.querySelector('.it-ruta').value.trim() ||
              card.dataset.tipo,
        nombre: V.titleCase(card.querySelector('.it-nombre').value.trim()),
        tel: tel ? (cod ? cod + ' ' : '') + tel : '',
        precio: parseFloat(card.querySelector('.it-precio').value) || 0,
        modo: card.querySelector('.it-modo').value
      });
    });
    return it;
  }
};
