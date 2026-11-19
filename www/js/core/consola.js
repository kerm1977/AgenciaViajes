/* consola.js — consola de depuracion oculta.
   5 toques sobre .brand-logo (login o dentro de la app) -> abre/cierra.
   Captura console.*, errores, rechazos, eventos de app (DC.ev) y taps. */
'use strict';
const DC = {
  buf: [], MAX: 500, abierto: false, filtro: 'todo',
  estilos: {
    error: '#f87171', warn: '#fbbf24', info: '#93c5fd',
    ev: '#fbbf24', tap: '#c4b5fd'
  },
  _push(nivel, args) {
    const txt = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
      catch (e) { return '[obj]'; }
    }).join(' ');
    this.buf.push({ t: new Date(), n: nivel, x: txt });
    if (this.buf.length > this.MAX) this.buf.shift();
    if (this.abierto) this._pintar();
  },
  ev(que, det) { this._push('ev', [que + (det ? ' — ' + det : '')]); },
  tap(que) { this._push('tap', [que]); },
  /* ---- captura global ---- */
  init() {
    ['log', 'info', 'warn', 'error'].forEach(m => {
      const orig = console[m].bind(console);
      console[m] = (...a) => { orig(...a); this._push(m === 'log' ? 'info' : m, a); };
    });
    window.addEventListener('error', e =>
      this._push('error', [(e.message || 'error') + ' @' +
        (e.filename || '').split('/').pop() + ':' + (e.lineno || 0)]));
    window.addEventListener('unhandledrejection', e =>
      this._push('error', ['promesa: ' + (e.reason && e.reason.message || e.reason)]));
    /* taps sobre elementos interactivos (delegado: sirve en login y app) */
    document.addEventListener('click', e => {
      const logo = e.target.closest('.brand-logo');
      if (logo) { this._toqueLogo(); return; }
      const el = e.target.closest('button, a, .tab, [data-tab], input, select');
      if (el && !el.closest('#dc-panel')) this.tap(this._nombreEl(el));
    }, true);
  },
  _nombreEl(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const txt = (el.textContent || '').trim().slice(0, 24);
    return tag + id + (txt ? ' "' + txt + '"' : '');
  },
  /* ---- 5 toques en el logo ---- */
  _t: 0, _n: 0,
  _toqueLogo() {
    const ahora = Date.now();
    this._n = (ahora - this._t < 2500) ? this._n + 1 : 1;
    this._t = ahora;
    this.tap('logo (' + this._n + '/5)');
    if (this._n >= 5) { this._n = 0; this.toggle(); }
  },
  /* ---- panel ---- */
  toggle() { this.abierto ? this.cerrar() : this.abrir(); },
  abrir() {
    if ($('#dc-panel')) return;
    this.abierto = true;
    const st = document.createElement('style');
    st.id = 'dc-style';
    st.textContent =
      '#dc-panel{position:fixed;left:0;right:0;bottom:0;height:62vh;z-index:99999;' +
      'background:#0b1020;color:#e2e8f0;display:flex;flex-direction:column;' +
      'font:11px/1.5 ui-monospace,Consolas,monospace;border-top:2px solid #d97706;' +
      'box-shadow:0 -8px 30px rgba(0,0,0,.5)}' +
      '#dc-bar{display:flex;gap:6px;align-items:center;padding:6px 8px;' +
      'background:#111827;border-bottom:1px solid #1f2937;flex-wrap:wrap}' +
      '#dc-bar b{flex:1;font-size:12px;color:#fbbf24}' +
      '.dc-f{border:1px solid #374151;background:#1f2937;color:#e2e8f0;' +
      'border-radius:4px;padding:2px 8px;font-size:11px}' +
      '.dc-f.on{background:#d97706;border-color:#d97706;color:#fff}' +
      '#dc-log{flex:1;overflow-y:auto;padding:6px 8px;white-space:pre-wrap;' +
      'word-break:break-word}' +
      '.dc-l{padding:1px 0;border-bottom:1px solid #111827}' +
      '.dc-h{color:#64748b;margin-right:6px}';
    document.head.appendChild(st);
    const p = document.createElement('div');
    p.id = 'dc-panel';
    p.innerHTML =
      '<div id="dc-bar"><b>Consola — La Tribu</b>' +
      ['todo', 'ev', 'tap', 'info', 'warn', 'error'].map(f =>
        '<button class="dc-f" data-f="' + f + '">' + f + '</button>').join('') +
      '<button class="dc-f" id="dc-copy">copiar</button>' +
      '<button class="dc-f" id="dc-clear">limpiar</button>' +
      '<button class="dc-f" id="dc-x">cerrar</button></div>' +
      '<div id="dc-log"></div>';
    document.body.appendChild(p);
    $$('#dc-bar .dc-f[data-f]', p).forEach(b =>
      b.addEventListener('click', () => { this.filtro = b.dataset.f; this._pintar(); }));
    $('#dc-clear', p).addEventListener('click', () => {
      this.buf = []; this._pintar(); });
    $('#dc-copy', p).addEventListener('click', () => this.copiar());
    $('#dc-x', p).addEventListener('click', () => this.cerrar());
    this._pintar();
  },
  /* copia al portapapeles el log filtrado que se esta viendo */
  copiar() {
    const f = this.filtro;
    const txt = this.buf
      .filter(e => f === 'todo' || e.n === f)
      .map(e => e.t.toLocaleTimeString('es-ES') + '.' +
        String(e.t.getMilliseconds()).padStart(3, '0') +
        ' [' + e.n + '] ' + e.x).join('\n');
    const ok = () => showToast('Log copiado (' +
      txt.split('\n').filter(Boolean).length + ' lineas)');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok).catch(() => this._copiarViejo(txt, ok));
    } else this._copiarViejo(txt, ok);
  },
  _copiarViejo(txt, ok) {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok(); }
    catch (e) { showToast('No se pudo copiar', 'error'); }
    ta.remove();
  },
  cerrar() {
    this.abierto = false;
    const p = $('#dc-panel'), s = $('#dc-style');
    if (p) p.remove(); if (s) s.remove();
  },
  _pintar() {
    const log = $('#dc-log');
    if (!log) return;
    $$('#dc-bar .dc-f[data-f]').forEach(b =>
      b.classList.toggle('on', b.dataset.f === this.filtro));
    const f = this.filtro;
    log.innerHTML = this.buf
      .filter(e => f === 'todo' || e.n === f)
      .map(e => '<div class="dc-l"><span class="dc-h">' +
        e.t.toLocaleTimeString('es-ES') + '.' +
        String(e.t.getMilliseconds()).padStart(3, '0') + '</span>' +
        '<span style="color:' + (this.estilos[e.n] || '#e2e8f0') + '">' +
        esc('[' + e.n + '] ' + e.x) + '</span></div>').join('');
    log.scrollTop = log.scrollHeight;
  }
};
DC.init();
