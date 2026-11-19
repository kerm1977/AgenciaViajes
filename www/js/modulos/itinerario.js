/* itinerario.js — campos del viaje (Costos y pagos) + itinerario día a día:
   cada destino trae su bloque con selector de día + evento; el evento abre
   una card con contacto, teléfonos, Maps/GPX, descripción, precio y total. */
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
    'Enlace check-out': { k: 'checkout',   ph: 'https://…', t: 'url' },
    'Descripción / notas': { k: 'notas',   ph: 'Detalles del viaje…', ta: 1 }
  },
  async delRow(rid) { if (await confirmar('¿Eliminar este día / evento?'))
    document.getElementById(rid).remove(); },
  /* colapso exclusivo entre hermanos + display inline a prueba de estilos */
  _body(card) {
    return [...card.children].find(k =>
      k.classList && k.classList.contains('it-acc-body'));
  },
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
      Object.keys(this.CAMPOS).map(x => '<option>' + esc(x) + '</option>').join('');
    t.value = '';
    if (!t._wired) {
      t._wired = 1;
      t.addEventListener('change', () => {
        if (!t.value) return;
        this.addRow(null, '', t.value, '');
        t.value = ''; t.dispatchEvent(new Event('change'));
      });
    }
    const d = $('#it-dia-new'), ev = $('#it-ev-new');
    if (!d || !ev) return;
    d.innerHTML = this._dias();
    ev.innerHTML = '<option value="">— Evento —</option>' +
      this.TIPOS.map(x => '<option>' + esc(x) + '</option>').join('');
    if (ev._wired) return;
    ev._wired = 1;
    ev.addEventListener('change', () => {
      if (!ev.value) return;
      this.addRow('', d.value, ev.value, '');
      ev.value = ''; ev.dispatchEvent(new Event('change'));
    });
  },
  /* un acordeón por cada destino escrito en información del viaje */
  syncDestinos() {
    const c = $('#itinerary-container'); if (!c) return;
    const names = $$('#destinos-lista-container .dst-item')
      .map(i => i.value.trim()).filter(Boolean);
    const accs = $$('.dst-acc', c);
    accs.forEach((a, i) => {
      if (i >= names.length) a.remove();
      else a.querySelector('.dst-acc-t').textContent = names[i];
    });
    names.forEach((n, i) => {
      if (i < accs.length) return;
      const a = document.createElement('div');
      a.className = 'it-acc it-card'; a.id = uid('dacc'); a.dataset.dest = n;
      a.innerHTML =
        '<div class="it-acc-head">' +
          '<button type="button" class="it-acc-btn" ' +
            'onclick="Itinerario.tog(this)">' +
            '<span class="it-acc-t dst-acc-t">' + esc(n) + '</span>' +
            '<i class="fa-solid fa-chevron-down"></i></button></div>' +
        '<div class="it-acc-body">' +
          '<div class="flex gap1" style="margin-bottom:.5rem">' +
            '<select class="select it-dia" style="flex:0 0 6.5rem">' +
              this._dias() + '</select>' +
            '<select class="select it-ev" style="flex:1">' +
              '<option value="">— Evento —</option>' +
              this.TIPOS.map(x => '<option>' + esc(x) + '</option>')
                .join('') + '</select></div>' +
          '<div class="grid gap1 it-evc"></div></div>';
      c.appendChild(a);
      const ev = a.querySelector('.it-ev');
      ev.addEventListener('change', () => {
        if (!ev.value) return;
        this.addRow(n, a.querySelector('.it-dia').value, ev.value, '');
        ev.value = ''; ev.dispatchEvent(new Event('change'));
      });
    });
  },
  refresh() {
    $$('#itinerary-container .it-cod, #it-general .it-cod').forEach(cod =>
      cod.textContent = codigoDePais(($('#dest-pais') || {}).value) || '—');
    $$('#itinerary-container .it-precio').forEach(p =>
      this._calc(p.closest('.it-acc')));
  },
  addRow(dest, dia, tipo, ruta, x) {
    x = x || {};
    const campo = this.CAMPOS[tipo];
    /* campos del viaje → Costos y gastos; eventos por día → Itinerario */
    const acc = campo ? $('#itin-acc') : $('#dia-acc');
    if (acc && !acc.classList.contains('open') && window.Destinos)
      Destinos.acc(acc.id, 1);
    let c = $('#it-general');
    if (!campo) {
      this.syncDestinos();
      const a = $$('.dst-acc').find(x2 =>
        x2.querySelector('.dst-acc-t').textContent === dest);
      if (a) { a.classList.add('open'); c = a.querySelector('.it-evc'); }
      else c = $('#itinerary-container');
    }
    const rid = uid('it');
    [...c.children].forEach(s => {           /* el nuevo colapsa al resto */
      if (s.classList && s.classList.contains('it-acc')) {
        s.classList.remove('open');
        const b = this._body(s); if (b) b.style.display = 'none'; } });
    const card = document.createElement('div');
    card.className = 'it-acc it-card open'; card.id = rid;
    card.dataset.tipo = tipo || 'Parada';
    const head =
      '<div class="it-acc-head">' +
        '<button type="button" class="it-acc-btn" ' +
          'onclick="Itinerario.tog(this)">' +
          (campo ? '' : '<span class="dia">' + esc(dia || 'Día 1') + '</span>') +
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
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    card.dataset.dia = dia || 'Día 1';
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
  },
  collect() {
    const it = [], cod = codigoDePais($('#dest-pais').value);
    $$('#it-general .it-acc').forEach(card =>
      it.push(card.dataset.aero && this.aeroCollect
        ? this.aeroCollect(card)
        : { campo: card.dataset.tipo,
            valor: card.querySelector('.it-campo').value.trim() }));
    const pre = cod ? cod + ' ' : '';
    const leer = (card, dest) => {
      const ta = card.querySelector('.it-tela').value.trim();
      const tg = card.querySelector('.it-telg').value.trim();
      return {
        destino: dest, dia: card.dataset.dia, tipo: card.dataset.tipo,
        ruta: card.querySelector('.it-ruta').value.trim() || card.dataset.tipo,
        nombre: V.titleCase(card.querySelector('.it-nombre').value.trim()),
        tel: ta ? pre + ta : '', telGuia: tg ? pre + tg : '',
        maps: card.querySelector('.it-maps').value.trim(),
        desc: card.querySelector('.it-desc').value.trim(),
        precio: parseFloat(card.querySelector('.it-precio').value) || 0,
        modo: card.querySelector('.it-modo').value };
    };
    $$('.dst-acc').forEach(a => {
      const dest = a.querySelector('.dst-acc-t').textContent.trim();
      $$('.it-acc', a).forEach(card => it.push(leer(card, dest)));
    });
    $$('#itinerary-container > .it-acc:not(.dst-acc)').forEach(card =>
      it.push(leer(card, '')));
    return it;
  }
};
