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
  async delRow(rid) { if (await confirmar('¿Eliminar este día / evento?')) { document.getElementById(rid).remove(); this.syncItin(); } },
  /* colapso exclusivo entre hermanos + display inline a prueba de estilos */
  _body(card) { return [...card.children].find(k => k.classList && k.classList.contains('it-acc-body')); },
  tog(btn) {
    const card = btn.closest('.it-acc'),
          open = card.classList.contains('open');
    [...card.parentElement.children].forEach(s => { if (!s.classList || !s.classList.contains('it-acc')) return;
      s.classList.remove('open'); const b = this._body(s); if (b) b.style.display = 'none'; });
    if (!open) { card.classList.add('open');
      const b = this._body(card); if (b) b.style.display = ''; }
  },
  pax() { return parseInt((($('#dest-conguia') || {}).value) || '0') || 0; }, paxS() { return parseInt((($('#dest-singuia') || {}).value) || '0') || 0; },
  async vi(chk) { if (chk.checked && (!(await confirmar('¿Mostrar teléfono y monto en el itinerario público?')) || !(await confirmar('¿Seguro? Lo verán todas las personas.')))) chk.checked = false; },
  _wys(d) { const bt = b => '<button type="button" class="wys-b" title="' + b[1] + '" onmousedown="event.preventDefault()" onclick="WYS.cmdAt(this,\'' + b[0] + '\'' + (b[2] ? ',\'' + b[2] + '\'' : '') + ')"><i class="fa-solid ' + b[3] + '"></i></button>';
    return '<div class="wys-bar">' + [['bold','Negrita','','fa-bold'], ['underline','Subrayado','','fa-underline'], ['insertUnorderedList','Viñetas','','fa-list-ul'], ['insertOrderedList','Lista ordenada','','fa-list-ol'], ['formatBlock','Cita','blockquote','fa-quote-left']].map(bt).join('') +
      '</div><div class="wys-edit it-desc" contenteditable="true">' + (d || '') + '</div>'; },
  _fmt(n) { const s = (($('#dest-moneda') || {}).value === 'CRC') ? '₡' : '$';
    return s + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); },
  _l(lab, h, cls, hd) { return '<div class="fl' + (cls ? ' ' + cls : '') +
    '"' + (hd ? ' hidden' : '') + '><span class="fl-l">' + lab + '</span>' + h + '</div>'; },
  _dias() { let o = ''; for (let i = 1; i <= 30; i++) o += '<option>Día ' + i + '</option>'; return o; },
  _calc(card) {
    const pi = card.querySelector('.it-precio'), mo = card.querySelector('.it-modo'),
          out = card.querySelector('.it-total'), hnt = card.querySelector('.it-hint');
    if (!pi || !mo || !out) return;
    const precio = parseFloat(pi.value) || 0;
    const modo = mo.value, n = this.pax(), ns = this.paxS();
    if (!precio || !(n || ns)) { out.innerHTML = '';
      if (hnt) hnt.textContent = ''; this._gtotal(); return; }
    if (modo === 'grupo') {          /* P/G: precio ÷ capacidad S/G */
      let h = '<hr class="it-hr">P/G ' + this._fmt(precio);
      if (ns) h += ' ÷ ' + ns + ' S/G = ' + this._fmt(precio / ns) + ' c/u';
      out.innerHTML = h + '<br><b>Total: ' + this._fmt(precio) + '</b>';
    } else {                         /* P/P: precio × C/G, repartido entre S/G,
                                        ese c/u cobrado a TODOS (× C/G) */
      const T = precio * n,
            cu = ns ? Math.round(T / ns) : precio;
      let h = '<hr class="it-hr">P/P ' + this._fmt(precio) + ' × ' + n +
        ' C/G = ' + this._fmt(T);
      if (ns) h += '<br>÷ ' + ns + ' S/G = ' + this._fmt(cu) + ' c/u';
      out.innerHTML = h + '<br><b>Total: ' + this._fmt(cu * n) + '</b>';
    }
    if (hnt) hnt.textContent = 'C/G ' + this._fmt(precio) +
      ' · S/G ' + this._fmt(this._ind(modo, precio));
    this._gtotal();
  },
  /* total individual del servicio: el "c/u" de la fórmula */
  _ind(modo, p) {
    const n = this.pax(), ns = this.paxS();
    if (modo === 'grupo') return ns ? p / ns : p;
    return ns ? Math.round(p * n / ns) : p; },
  initPickers() {
    const t = $('#it-tipo-new'); if (!t) return;
    t.innerHTML = '<option value="">— Campo del viaje —</option>' +
      Object.keys(this.CAMPOS).filter(x => x !== 'Imagen URL')
        .map(x => '<option>' + esc(x) + '</option>').join('') +
      this.TIPOS.map(x => '<option>' + esc(x) + '</option>').join('');
    t.value = '';
    const cnt = $('#it-tipo-count'); if (cnt) cnt.textContent = t.options.length + ' opciones'; /* depuración OTA */
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
    const c = $('#it-general');
    const rid = uid('it');
    [...c.children].forEach(s => {           /* el nuevo colapsa al resto */
      if (s.classList && s.classList.contains('it-acc')) {
        s.classList.remove('open');
        const b = this._body(s); if (b) b.style.display = 'none'; } });
    const card = document.createElement('div');
    card.className = 'it-acc it-card open'; card.id = rid;
    card.dataset.tipo = tipo || 'Parada';
    ['dia','hdesde','hhasta','guia','lugar','adesc'].forEach(k => {
      const v = x[k] || (k === 'dia' ? dia : '');
      if (v) card.dataset[k] = v; });
    const head =
      '<div class="it-acc-head">' +
        '<button type="button" class="it-acc-btn" ' +
          'onclick="Itinerario.tog(this)">' +
          '<span class="it-acc-t" title="' + esc(tipo || '') + '">' + esc((tipo || '').length > 15 ? tipo.slice(0, 15) + '…' : tipo) + '</span>' +
          '<span class="hint it-hint"></span>' +
          '<i class="fa-solid fa-chevron-down"></i></button>' +
        '<button type="button" class="iconbtn danger" title="Quitar" ' +
          'onclick="Itinerario.delRow(\'' + rid + '\')">' +
          '<i class="fa-solid fa-xmark"></i></button></div>';
    if (campo) {
      card.dataset.campo = '1';
      card.innerHTML = head + '<div class="it-acc-body">' + this._l(esc(tipo),
        campo.ta
          ? '<textarea class="input it-campo" rows="2" placeholder="' +
            esc(campo.ph) + '">' + esc(ruta || '') + '</textarea>'
          : '<input type="' + (campo.t || 'text') + '" placeholder="' +
            esc(campo.ph) + '" value="' + esc(ruta || '') +
            '" class="input it-campo">') + '</div>';
      c.appendChild(card); if (window.wireNormalizadores) wireNormalizadores(card);
      if (campo.k === 'aerolinea' && this.aeroCard)
        this.aeroCard(card, ruta, x);
      if (campo.k === 'transporte' && this.transCard)
        this.transCard(card, ruta, x);
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.syncItin();
      return;
    }
    const cod = esc(codigoDePais(($('#dest-pais') || {}).value) || '—');
    const stripCod = v => { v = String(v || ''); const c =
        codigoDePais(($('#dest-pais') || {}).value) || '';
      return c && v.startsWith(c) ? v.slice(c.length).trim() : v; };
    const tel = (cls, ph, v) =>
      '<div class="fl"><span class="fl-l">' + ph + '</span>' +
      '<div class="it-tel"><span class="it-cod">' + cod + '</span>' +
      '<input type="tel" data-norm="tel" value="' +
      esc(stripCod(v)) + '" class="input ' + cls + '"></div></div>';
    const inp = (lab, t, cls, v) => this._l(lab, '<input type="' + t +
      '" value="' + esc(v || '') + '" class="input ' + cls + '">');
    const costos = '<hr class="it-hr"><div class="grid-2">' +
        this._l('Precio del servicio', '<input type="number" min="0" step="1" value="' +
          esc(x.precio || '') + '" class="input it-precio">', 'fl-p') +
        this._l('Cobro', '<select class="select it-modo">' +
          '<option value="persona"' + (x.modo !== 'grupo' ? ' selected' : '') + '>Por persona</option>' +
          '<option value="grupo"' + (x.modo === 'grupo' ? ' selected' : '') + '>Por grupo</option></select>') + '</div>' +
      '<p class="it-total hint"></p>' +
      '<label class="it-vi"><input type="checkbox" class="it-verinfo"' +
        (x.verinfo ? ' checked' : '') +
        ' onchange="Itinerario.vi(this)"> Ver información</label></div>';
    card.innerHTML = head + '<div class="it-acc-body">' +
      (tipo === 'Uber / Didi / Taxi / Bus' || !this.entradasCard
        ? inp('Detalle (Ej. llegada hotel)', 'text', 'it-ruta', ruta) +
          inp('Guía / Agencia / Tour operador', 'text', 'it-nombre', x.nombre) +
          '<div class="grid-2">' + tel('it-tela', 'Tel. agencia', x.tel) +
            tel('it-telg', 'Tel. guía', x.telGuia) + '</div>' +
          inp('Enlace Google Maps / Waze', 'url', 'it-maps', x.maps) +
          this._l('Descripción', this._wys(x.desc))
        : this.entradasCard(ruta, x)) + costos;
    c.appendChild(card);
    if (window.wireNormalizadores) wireNormalizadores(card);
    ['input','change'].forEach(t => card.addEventListener(t, () => this._calc(card)));
    ['.it-cmap', '.it-cwaz'].forEach(s => {
      const i = card.querySelector(s); if (!i) return;
      i.addEventListener('change', () =>
        card.querySelector(s === '.it-cmap' ? '.it-maps' : '.it-waze')
          .closest('.fl').hidden = !i.checked); });
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this._calc(card);
    this.syncItin();
  },
  collect() {
    const it = [];
    const leer = (card, dest) => {
      const q = s => { const e = card.querySelector(s);
        return e ? e.value.trim() : ''; };
      const ta = q('.it-tela'), tg = q('.it-telg'),
            ed = card.querySelector('.it-desc'),
            de = ed ? (ed.value !== undefined ? ed.value : ed.innerHTML)
              .trim() : '';
      return {
        destino: dest, dia: card.dataset.dia || '', tipo: card.dataset.tipo,
        ruta: q('.it-ruta') || card.dataset.tipo,
        nombre: V.titleCase(q('.it-nombre')), tel: ta,
        telGuia: tg, maps: q('.it-maps'), waze: q('.it-waze'),
        desc: de, precio: parseFloat(q('.it-precio')) || 0,
        modo: q('.it-modo'),
        verinfo: !!(card.querySelector('.it-verinfo') || {}).checked }; };
    $$('#it-general .it-acc').forEach(card => {
      const fn = card.dataset.aero ? this.aeroCollect : card.dataset.trans
        ? this.transCollect : null;
      const o = fn ? fn.call(this, card) :
        card.dataset.campo
          ? { campo: card.dataset.tipo,
              valor: card.querySelector('.it-campo').value.trim() }
          : leer(card, '');
      ['dia','hdesde','hhasta','guia','lugar','adesc'].forEach(k => {
        o[k] = card.dataset[k] || ''; });
      it.push(o); });
    return it;
  },
  /* gran total en vivo: Σ total de cada tarjeta con fórmula (Costos y pagos) */
  _gtotal() {
    const el = $('#it-gtotal'); if (!el) return;
    const n = this.pax(), ns = this.paxS(); let tg = 0, ti = 0;
    $$('#it-general .it-acc').forEach(c => {
      const v = s => parseFloat((c.querySelector(s) || {}).value) || 0,
            ck = s => !!(c.querySelector(s) || {}).checked,
            mo = c.querySelector('.it-modo');
      if (v('.it-precio')) { const m = mo && mo.value === 'grupo' ? 'grupo' : 'persona';
        tg += (m === 'grupo' || !n) ? v('.it-precio') : this._ind(m, v('.it-precio')) * n;
        ti += this._ind(m, v('.it-precio')); }
      if (v('.it-pb')) { const con = v('.it-pb') +
          (ck('.it-os') ? v('.it-osv') : 0) + (ck('.it-ai') ? v('.it-ps') : 0);
        const cu = ns && n ? Math.round(con * n / ns) : con;
        tg += cu * (n || 1); ti += cu; } });
    el.innerHTML = tg ? 'Total individual: <b>' + this._fmt(ti) +
      '</b><br>Total por grupo: <b>' + this._fmt(tg) + '</b>' : ''; },
  fmtT(d, n) { return (d.moneda === 'CRC' ? '₡' : '$') + n.toFixed(2); },
  /* mismo cálculo sobre el viaje guardado (página del itinerario) */
  totalViaje(d) {
    const cg = d.paxConGuia || 0, sg = d.paxSinGuia || 0;
    let T = 0, I = 0;
    (d.itinerario || []).forEach(it => { if (it.precio) {
      T += (it.modo === 'grupo' || !cg) ? it.precio : it.precio * cg;
      I += it.modo === 'grupo' ? (sg ? it.precio / sg : it.precio)
        : (sg ? it.precio * cg / sg : it.precio); } });
    const b = d.boleto; if (b) { const con = (parseFloat(b.pb) || 0) +
        (b.os === '1' ? parseFloat(b.osv) || 0 : 0) +
        (b.ai === '1' ? parseFloat(b.ps) || 0 : 0);
      T += con * (cg || 1); I += sg ? con * cg / sg : con; }
    return { t: T, i: I }; }
};
window.Itinerario = Itinerario;   /* guards window.Itinerario en otros módulos */
