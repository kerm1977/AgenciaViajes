/* itinerario.js — campos del viaje (Costos y pagos) + itinerario día a día
   con cards por evento: contacto, tels, Maps/GPX, desc, precio y total. */
'use strict';
const Itinerario = {
  TIPOS: ['Llegada y traslado','Guía','Transporte Aéreo','Lancha',
    'Avioneta','Tour Operador','Agencia de Viajes','Entradas 4x4','Acarreo',
    'Estadía / Hospedaje','Hotel','Uber / Didi / Taxi / Bus',
    'Centro Turístico','Centro Arqueológico','Entradas','Impuestos','Otros'],
  /* opciones que guardan un solo valor en el objeto destino */
  CAMPOS: {
    'Imagen URL':      { k: 'imagen',      ph: 'https://…', t: 'url' },
    'Guía asignado':   { k: 'guia',        ph: 'Nombre del guía' },
    'Transporte':      { k: 'transporte',  ph: 'Ej. Autobús privado / Van' },
    'Aerolínea':       { k: 'aerolinea',   ph: 'Ej. Avianca, Copa, Iberia…' },
    'Descripción / notas': { k: 'notas',   ph: 'Detalles del viaje…', ta: 1 }
  },
  async delRow(rid) { if (await confirmar('¿Eliminar este día / evento?')) {
    document.getElementById(rid).remove(); this.syncItin(); } },
  /* colapso exclusivo entre hermanos + display inline a prueba de estilos */
  _body(card) { return [...card.children].find(k =>
    k.classList && k.classList.contains('it-acc-body')); },
  tog(btn) {
    const card = btn.closest('.it-acc');
    const open = card.classList.contains('open');
    [...card.parentElement.children].forEach(s => {
      if (s.classList && s.classList.contains('it-acc')) {
        s.classList.remove('open');
        const b = this._body(s); if (b) b.style.display = 'none'; } });
    if (!open) {
      card.classList.add('open');
      const b = this._body(card); if (b) b.style.display = ''; }
  },
  pax() { return parseInt((($('#dest-conguia') || {}).value) || '0') || 0; },
  paxS() { return parseInt((($('#dest-singuia') || {}).value) || '0') || 0; },
  _fmt(n) { const s = (($('#dest-moneda') || {}).value === 'CRC') ? '₡' : '$';
    return s + n.toLocaleString('en-US',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
  _dias() { let o = '';
    for (let i = 1; i <= 30; i++) o += '<option>Día ' + i + '</option>';
    return o; },
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
    const t = $('#it-tipo-new'); if (!t) return;
    t.innerHTML = '<option value="">— Campo del viaje —</option>' +
      Object.keys(this.CAMPOS).map(x => '<option>' + esc(x) + '</option>').join('') +
      this.TIPOS.map(x => '<option>' + esc(x) + '</option>').join('');
    t.value = '';
    if (!t._wired) {
      t._wired = 1;
      t.addEventListener('change', () => {
        if (!t.value) return;
        this.addRow(null, '', t.value, '');
        t.value = ''; t.dispatchEvent(new Event('change'));
      });
    }
    this.syncItin();
  },
  /* Itinerario: asignar día solo a los costos/pagos que elijas */
  syncItin() {
    const c = $('#itinerary-container'); if (!c) return;
    c.innerHTML = '';
    const cards = $$('#it-general .it-acc');
    cards.filter(k => k.dataset.dia).forEach(card => {
      const row = document.createElement('div');
      row.className = 'it-card it-mirror';
      row.innerHTML =
        '<div class="flex gap1" style="align-items:center">' +
          '<select class="select it-dia" style="flex:0 0 6.5rem">' +
            this._dias() + '</select>' +
          '<span class="it-acc-t" style="flex:1;font-weight:600">' +
            esc(card.querySelector('.it-acc-t').textContent) + '</span>' +
          '<button type="button" class="iconbtn danger" title="Quitar" ' +
            'onclick="Itinerario.unassign(\'' + card.id + '\')">' +
            '<i class="fa-solid fa-xmark"></i></button></div>';
      const d = row.querySelector('.it-dia');
      d.value = card.dataset.dia;
      d.addEventListener('change', () => { card.dataset.dia = d.value; });
      c.appendChild(row);
    });
    const free = cards.filter(k => !k.dataset.dia);
    if (!free.length) return;
    const row = document.createElement('div');
    row.className = 'it-card it-mirror';
    row.innerHTML =
      '<div class="flex gap1" style="align-items:center">' +
        '<select class="select it-dia" style="flex:0 0 6.5rem">' +
          this._dias() + '</select>' +
        '<select class="select it-pick" style="flex:1">' +
          '<option value="">— Asignar campo —</option>' +
          free.map((k, i) => '<option value="' + i + '">' +
            esc(k.querySelector('.it-acc-t').textContent) + '</option>')
            .join('') + '</select></div>';
    const p = row.querySelector('.it-pick'), d = row.querySelector('.it-dia');
    p.addEventListener('change', () => {
      if (p.value === '') return;
      free[+p.value].dataset.dia = d.value || 'Día 1';
      this.syncItin();
    });
    c.appendChild(row);
  },
  unassign(id) { const k = document.getElementById(id);
    if (k) delete k.dataset.dia; this.syncItin(); },
  refresh() {
    $$('#itinerary-container .it-cod, #it-general .it-cod').forEach(cod =>
      cod.textContent = codigoDePais(($('#dest-pais') || {}).value) || '—');
    $$('#itinerary-container .it-precio').forEach(p =>
      this._calc(p.closest('.it-acc')));
    this.syncItin();
  },
  addRow(dest, dia, tipo, ruta, x) {
    x = x || {};
    const campo = this.CAMPOS[tipo];
    const acc = $('#itin-acc');
    if (acc && !acc.classList.contains('open') && window.Destinos)
      Destinos.acc(acc.id, 1);
    const c = $('#it-general');
    const rid = uid('it');
    [...c.children].forEach(s => {           /* el nuevo colapsa al resto */
      if (s.classList && s.classList.contains('it-acc')) {
        s.classList.remove('open');
        const b = this._body(s); if (b) b.style.display = 'none'; } });
    const card = document.createElement('div');
    card.className = 'it-acc it-card open'; card.id = rid;
    card.dataset.tipo = tipo || 'Parada';
    if (dia) card.dataset.dia = dia;
    const head =
      '<div class="it-acc-head">' +
        '<button type="button" class="it-acc-btn" ' +
          'onclick="Itinerario.tog(this)">' +
          '<span class="it-acc-t">' + esc(tipo) + '</span>' +
          '<i class="fa-solid fa-chevron-down"></i></button>' +
        '<button type="button" class="iconbtn danger" title="Quitar" ' +
          'onclick="Itinerario.delRow(\'' + rid + '\')">' +
          '<i class="fa-solid fa-xmark"></i></button></div>';
    if (campo) {
      card.dataset.campo = '1';
      card.innerHTML = head + '<div class="it-acc-body">' +
        (campo.ta
          ? '<textarea class="input it-campo" rows="2" placeholder="' +
            esc(campo.ph) + '">' + esc(ruta || '') + '</textarea>'
          : '<input type="' + (campo.t || 'text') + '" placeholder="' +
            esc(campo.ph) + '" value="' + esc(ruta || '') +
            '" class="input it-campo">') + '</div>';
      c.appendChild(card);
      if (tipo === 'Aerolínea' && this.aeroCard)
        this.aeroCard(card, ruta, x);
      if (tipo === 'Transporte' && this.transCard)
        this.transCard(card, ruta, x);
      if (x && x.dia) card.dataset.dia = x.dia;
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.syncItin();
      return;
    }
    const cod = esc(codigoDePais(($('#dest-pais') || {}).value) || '—');
    const tel = (cls, ph, v) =>
      '<div class="it-tel"><span class="it-cod">' + cod + '</span>' +
        '<input type="tel" placeholder="' + ph + '" data-norm="digitos" ' +
          'value="' + esc(v || '') + '" class="input ' + cls + '"></div>';
    card.innerHTML = head + '<div class="it-acc-body">' +
      '<input type="text" placeholder="Detalle (Ej. llegada hotel)" ' +
        'value="' + esc(ruta || '') + '" class="input it-ruta">' +
      '<input type="text" placeholder="Guía / Agencia / Tour operador" ' +
        'value="' + esc(x.nombre || '') + '" class="input it-nombre">' +
      '<div class="grid-2">' + tel('it-tela', 'Tel. agencia', x.tel) +
        tel('it-telg', 'Tel. guía', x.telGuia) + '</div>' +
      '<input type="url" placeholder="Google Maps / GPX (link)" ' +
        'value="' + esc(x.maps || '') + '" class="input it-maps">' +
      '<textarea class="input it-desc" rows="2" ' +
        'placeholder="Descripción / detalle">' + esc(x.desc || '') +
        '</textarea>' +
      '<div class="grid-2">' +
        '<input type="number" min="0" step="0.01" ' +
          'placeholder="Precio del servicio" value="' + esc(x.precio || '') +
          '" class="input it-precio">' +
        '<select class="select it-modo">' +
          '<option value="persona"' + (x.modo !== 'grupo' ? ' selected' : '') +
            '>Por persona</option>' +
          '<option value="grupo"' + (x.modo === 'grupo' ? ' selected' : '') +
            '>Por grupo</option></select></div>' +
      '<p class="it-total hint"></p></div>';
    c.appendChild(card);
    card.addEventListener('input', () => this._calc(card));
    card.addEventListener('change', () => this._calc(card));
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this._calc(card);
    this.syncItin();
  },
  collect() {
    const it = [], cod = codigoDePais($('#dest-pais').value);
    const pre = cod ? cod + ' ' : '';
    const leer = (card, dest) => {
      const ta = card.querySelector('.it-tela').value.trim();
      const tg = card.querySelector('.it-telg').value.trim();
      return {
        destino: dest, dia: card.dataset.dia || '', tipo: card.dataset.tipo,
        ruta: card.querySelector('.it-ruta').value.trim() || card.dataset.tipo,
        nombre: V.titleCase(card.querySelector('.it-nombre').value.trim()),
        tel: ta ? pre + ta : '', telGuia: tg ? pre + tg : '',
        maps: card.querySelector('.it-maps').value.trim(),
        desc: card.querySelector('.it-desc').value.trim(),
        precio: parseFloat(card.querySelector('.it-precio').value) || 0,
        modo: card.querySelector('.it-modo').value };
    };
    $$('#it-general .it-acc').forEach(card => {
      const fn = card.dataset.aero ? this.aeroCollect : card.dataset.trans
        ? this.transCollect : null;
      const o = fn ? fn.call(this, card) :
        card.querySelector('.it-ruta') ? leer(card, '') :
        { campo: card.dataset.tipo,
          valor: card.querySelector('.it-campo').value.trim() };
      o.dia = card.dataset.dia || '';
      it.push(o); });
    return it;
  }
};
