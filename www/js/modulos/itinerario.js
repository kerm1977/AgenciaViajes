/* itinerario.js — campos del viaje (Costos y pagos) + itinerario día a día
   con cards por evento: contacto, tels, Maps/GPX, desc, precio y total. */
'use strict';
const Itinerario = {
  TIPOS: ['Guía','Descripción / notas','Transporte Acuático',
    'Transporte Terrestre','Agencia de Viajes / Tour Operador','Entradas',
    'Acarreo','Hotel / Hostal / Hospedaje','Uber / Didi / Taxi / Bus',
    'Centro Turístico / Centro Arqueológico','Impuestos','Otros'],
  /* opciones que guardan un solo valor en el objeto destino */
  CAMPOS: {
    'Imagen URL':       { k: 'imagen',    ph: 'https://…', t: 'url' },
    'Transporte Aéreo': { k: 'aerolinea', ph: 'Ej. Avianca, Copa, Iberia…' }
  },
  async delRow(rid) { if (await confirmar('¿Eliminar este día / evento?')) {
    document.getElementById(rid).remove(); this.syncItin(); } },
  /* colapso exclusivo entre hermanos + display inline a prueba de estilos */
  _body(card) { return [...card.children].find(k =>
    k.classList && k.classList.contains('it-acc-body')); },
  tog(btn) {
    const card = btn.closest('.it-acc'),
          open = card.classList.contains('open');
    [...card.parentElement.children].forEach(s => {
      if (!s.classList || !s.classList.contains('it-acc')) return;
      s.classList.remove('open');
      const b = this._body(s); if (b) b.style.display = 'none'; });
    if (!open) { card.classList.add('open');
      const b = this._body(card); if (b) b.style.display = ''; }
  },
  pax() { return parseInt((($('#dest-conguia') || {}).value) || '0') || 0; },
  paxS() { return parseInt((($('#dest-singuia') || {}).value) || '0') || 0; },
  _fmt(n) { const s = (($('#dest-moneda') || {}).value === 'CRC') ? '₡' : '$';
    return s + n.toLocaleString('en-US', { minimumFractionDigits: 2,
      maximumFractionDigits: 2 }); },
  _dias() { let o = ''; for (let i = 1; i <= 30; i++)
    o += '<option>Día ' + i + '</option>'; return o; },
  _calc(card) {
    const pi = card.querySelector('.it-precio');
    const mo = card.querySelector('.it-modo');
    const out = card.querySelector('.it-total');
    const hnt = card.querySelector('.it-hint');
    if (!pi || !mo || !out) return;
    const precio = parseFloat(pi.value) || 0;
    const modo = mo.value, n = this.pax(), ns = this.paxS();
    if (!precio || !(n || ns)) {
      out.innerHTML = ''; if (hnt) hnt.textContent = '';
      this._gtotal(); return; }
    if (modo === 'grupo') {          /* P/G: precio ÷ capacidad S/G */
      let h = '<hr class="it-hr">P/G ' + this._fmt(precio);
      if (ns) h += ' ÷ ' + ns + ' S/G = ' +
        this._fmt(precio / ns) + ' c/u';
      out.innerHTML = h + '<br><b>Total: ' + this._fmt(precio) + '</b>';
    } else {                         /* P/P: precio × C/G, repartido entre S/G */
      const T = precio * n;
      let h = '<hr class="it-hr">P/P ' + this._fmt(precio) + ' × ' + n +
        ' C/G = ' + this._fmt(T);
      if (ns) h += '<br>÷ ' + ns + ' S/G = ' +
        this._fmt(T / ns) + ' c/u';
      out.innerHTML = h + '<br><b>Total: ' + this._fmt(T) + '</b>';
    }
    if (hnt) hnt.textContent =
      this._fmt(modo === 'grupo' ? precio : precio * n);
    this._gtotal();
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
  /* syncItin/unassign viven en itasig.js (asignaciones del itinerario) */
  refresh() {
    $$('#itinerary-container .it-cod, #it-general .it-cod').forEach(cod =>
      cod.textContent = codigoDePais(($('#dest-pais') || {}).value) || '—');
    $$('#itinerary-container .it-precio, #it-general .it-precio').forEach(p =>
      this._calc(p.closest('.it-acc')));
    $$('#it-general .it-acc, #itinerary-container .it-acc')
      .forEach(c => { if (c._tot) c._tot(); });
    this.syncItin(); this._gtotal();
  },
  addRow(dest, dia, tipo, ruta, x, ev) {
    x = x || {};
    const campo = ev ? null : this.CAMPOS[tipo];  /* ev: evento guardado, nunca campo */
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
    ['dia','hdesde','hhasta','guia'].forEach(k => {
      const v = x[k] || (k === 'dia' ? dia : '');
      if (v) card.dataset[k] = v; });
    const head =
      '<div class="it-acc-head">' +
        '<button type="button" class="it-acc-btn" ' +
          'onclick="Itinerario.tog(this)">' +
          '<span class="it-acc-t">' + esc(tipo) + '</span>' +
          '<span class="hint it-hint"></span>' +
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
      if (campo.k === 'aerolinea' && this.aeroCard)
        this.aeroCard(card, ruta, x);
      if (campo.k === 'transporte' && this.transCard)
        this.transCard(card, ruta, x);
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.syncItin();
      return;
    }
    const cod = esc(codigoDePais(($('#dest-pais') || {}).value) || '—');
    const tel = (cls, ph, v) =>
      '<div class="it-tel"><span class="it-cod">' + cod + '</span>' +
        '<input type="tel" placeholder="' + ph + '" data-norm="digitos" ' +
          'value="' + esc(v || '') + '" class="input ' + cls + '"></div>';
    const transp = /^Transporte\s/.test(tipo || '');
    const costos = '<div class="grid-2">' +
        '<input type="number" min="0" step="0.01" placeholder="' +
          (transp ? 'Monto' : 'Precio del servicio') + '" value="' +
          esc(x.precio || '') + '" class="input it-precio">' +
        '<select class="select it-modo">' +
          '<option value="persona"' + (x.modo !== 'grupo' ? ' selected' : '') +
            '>' + (transp ? 'P/P — por persona' : 'Por persona') + '</option>' +
          '<option value="grupo"' + (x.modo === 'grupo' ? ' selected' : '') +
            '>' + (transp ? 'P/G — por grupo' : 'Por grupo') +
            '</option></select></div>' +
      '<p class="it-total hint"></p></div>';
    card.innerHTML = head + '<div class="it-acc-body">' +
      (transp
        ? '<input type="text" placeholder="Nombre del transporte" ' +
            'value="' + esc(x.nombre || '') + '" class="input it-nombre">' +
          tel('it-tela', 'Tel. del contacto', x.tel) +
          '<textarea class="input it-desc" rows="2" ' +
            'placeholder="Descripción">' + esc(x.desc || '') + '</textarea>'
        : '<input type="text" placeholder="Detalle (Ej. llegada hotel)" ' +
            'value="' + esc(ruta || '') + '" class="input it-ruta">' +
          '<input type="text" placeholder="Guía / Agencia / Tour operador" ' +
            'value="' + esc(x.nombre || '') + '" class="input it-nombre">' +
          '<div class="grid-2">' + tel('it-tela', 'Tel. agencia', x.tel) +
            tel('it-telg', 'Tel. guía', x.telGuia) + '</div>' +
          '<input type="url" placeholder="Google Maps / GPX (link)" ' +
            'value="' + esc(x.maps || '') + '" class="input it-maps">' +
          '<textarea class="input it-desc" rows="2" ' +
            'placeholder="Descripción / detalle">' + esc(x.desc || '') +
            '</textarea>') + costos;
    c.appendChild(card);
    card.addEventListener('input', () => this._calc(card));
    card.addEventListener('change', () => this._calc(card));
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this._calc(card);
    this.syncItin();
  },
  collect() {
    const it = [],
          cod = codigoDePais($('#dest-pais').value),
          pre = cod ? cod + ' ' : '';
    const leer = (card, dest) => {
      const q = s => { const e = card.querySelector(s);
        return e ? e.value.trim() : ''; };
      const ta = q('.it-tela'), tg = q('.it-telg');
      return {
        destino: dest, dia: card.dataset.dia || '', tipo: card.dataset.tipo,
        ruta: q('.it-ruta') || card.dataset.tipo,
        nombre: V.titleCase(q('.it-nombre')), tel: ta ? pre + ta : '',
        telGuia: tg ? pre + tg : '', maps: q('.it-maps'),
        desc: q('.it-desc'), precio: parseFloat(q('.it-precio')) || 0,
        modo: q('.it-modo') }; };
    $$('#it-general .it-acc').forEach(card => {
      const fn = card.dataset.aero ? this.aeroCollect : card.dataset.trans
        ? this.transCollect : null;
      const o = fn ? fn.call(this, card) :
        card.dataset.campo
          ? { campo: card.dataset.tipo,
              valor: card.querySelector('.it-campo').value.trim() }
          : leer(card, '');
      ['dia','hdesde','hhasta','guia'].forEach(k => {
        o[k] = card.dataset[k] || ''; });
      it.push(o); });
    return it;
  },
  /* gran total en vivo: Σ total de cada tarjeta con fórmula (Costos y pagos) */
  _gtotal() {
    const el = $('#it-gtotal'); if (!el) return;
    const n = this.pax(); let tg = 0;
    $$('#it-general .it-acc').forEach(c => {
      const v = s => parseFloat((c.querySelector(s) || {}).value) || 0,
            ck = s => !!(c.querySelector(s) || {}).checked,
            mo = c.querySelector('.it-modo');
      if (v('.it-precio')) tg += (mo && mo.value === 'grupo' || !n)
        ? v('.it-precio') : v('.it-precio') * n;
      if (v('.it-pb')) tg += (v('.it-pb') + (ck('.it-os') ? v('.it-osv') : 0) +
        (ck('.it-ai') ? 0 : v('.it-ps'))) * (n || 1); });
    el.innerHTML = tg ? 'Total general: <b>' + this._fmt(tg) + '</b>' : ''; },
  /* mismo cálculo sobre el viaje guardado (página del itinerario) */
  totalViaje(d) {
    const cg = d.paxConGuia || 0; let T = 0;
    (d.itinerario || []).forEach(it => { if (it.precio)
      T += (it.modo === 'grupo' || !cg) ? it.precio : it.precio * cg; });
    const b = d.boleto; if (b) T += ((parseFloat(b.pb) || 0) +
      (b.os === '1' ? parseFloat(b.osv) || 0 : 0) +
      (b.ai === '1' ? 0 : parseFloat(b.ps) || 0)) * (cg || 1);
    return T; }
};
