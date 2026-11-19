/* ota.js — motor OTA La Tribu de los Libres Travels (idéntico a CursosOTA):
   notifyAppReady anti-rollback · push PC /ota + /ota-zip → tmOta → pull
   poller 8 s al stamp del PC · watchdog libera descargas colgadas
   TAP sello de build = Actualizar · LONG-PRESS = reset() · modal TM_OTA */
(function () {
  'use strict';
  const KEY = 'tm_ota_url';      /* última url recibida por push */
  const PCKEY = 'lt_ota_pc';     /* base http(s) del servidor OTA del PC */
  let seen = '';
  try { seen = localStorage.getItem('tm_ota_seen') || ''; } catch (e) {}
  const L = m => {
    try { console.log('[OTA] ' + m); } catch (e) {}
    try { if (window.DC) DC.ev('OTA', m); } catch (e) {}
  };
  const UP = () => plugin('CapacitorUpdater');
  const HTTP = () => plugin('CapacitorHttp');
  const baseOf = u => String(u).replace(/\/(bundle\.zip|ota-incoming\.zip).*$/, '')
    .replace(/\/+$/, '');
  const esLocal = u => u.includes('127.0.0.1') || u.includes('localhost');
  const esHttp = u => /^https?:\/\//.test(u || '');
  const jdata = r => {
    let d = r && r.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) {} }
    return d;
  };
  const up = UP();
  if (up && up.notifyAppReady) {
    up.notifyAppReady()
      .then(() => L('notifyAppReady OK'))
      .catch(e => L('notifyAppReady falló: ' + (e && e.message || e)));
  } else L('CapacitorUpdater NO disponible — OTA inactivo (web)');

  let pulling = false, pullWatch = null;
  /* el plugin de descarga puede colgar el promise con reintentos internos
     de ~60 s: sin watchdog el candado queda pegado y TODO lo demás se
     descarta en silencio (bug real observado en consola) */
  function soltarPull() { pulling = false; clearTimeout(pullWatch); pullWatch = null; }
  function armarWatch() {
    clearTimeout(pullWatch);
    pullWatch = setTimeout(() => {
      if (pulling) { pulling = false; L('watchdog: descarga colgada — candado liberado'); }
    }, 80000);
  }
  async function checksumDe(url) {   // SHA-256 obligatorio para CapacitorUpdater
    const H = HTTP();
    if (!H) return '';
    try {
      const d = jdata(await H.get({ url: baseOf(url) + '/stamp.json' }));
      if (d && d.sha) { L('checksum del sello: ' + d.sha.slice(0, 12) + '…'); return d.sha; }
    } catch (e) { L('stamp no respondió en ' + baseOf(url) + ': ' + (e && e.message || e)); }
    return '';
  }
  async function pull(url, version, checksum, silent) {
    const P = UP();
    if (!P || !P.download) { L('pull abortado: sin plugin updater'); return; }
    url = String(url || '').trim();
    if (!esHttp(url)) {
      L('pull abortado: url inválida «' + url + '»');
      if (!silent && window.showToast) showToast('OTA: URL inválida', 'error');
      return;
    }
    if (!checksum) checksum = await checksumDe(url);
    if (!checksum) {
      L('pull abortado: sin checksum para ' + url);
      if (!silent && window.showToast) showToast('OTA: no pude obtener el checksum', 'error');
      return;
    }
    if (pulling) { L('pull omitido: descarga en curso'); return; }
    pulling = true;
    armarWatch();
    L('descargando → ' + url + ' · v=' + version);
    if (!silent && window.showToast) showToast('Descargando OTA…');
    P.download({ url: url, version: String(version || 'ota'), checksum: checksum })
      .then(bundle => {
        L('descargado id=' + bundle.id + ' — aplicando…');
        if (!silent && window.showToast) showToast('Aplicando OTA…');
        return P.set({ id: bundle.id }).catch(() => P.next({ id: bundle.id }));
      }).then(() => { L('aplicado — el WebView recarga solo'); sonar('ok'); })
      .catch(e => {
        soltarPull();
        sonar('fail');
        L('FALLO descarga: ' + (e && e.message || e));
        if (window.showToast) showToast('OTA falló: ' + (e && e.message || e), 'error');
      });
  }

  /* push del PC: TravelFtpPlugin dispara 'tmOta' */
  const FTP = plugin('TravelFtp');
  if (FTP && FTP.addListener) {
    FTP.addListener('tmOta', e => {
      const url = e && e.url || '';
      L('evento tmOta: ' + (url || '(sin url)') +
        (e && e.checksum ? ' · sha ok' : ' · sin sha'));
      if (!url) return;
      sonar('recibido');
      try { localStorage.setItem(KEY, url); } catch (er) {}
      if (esHttp(url) && !esLocal(url))
        try { localStorage.setItem(PCKEY, baseOf(url)); } catch (er) {}
      pull(url, (e && e.version) || ('ota-' + Date.now()),
           (e && e.checksum) || '');
    });
    L('listener tmOta armado');
  } else L('TravelFtp NO disponible — push muerto (web)');

  /* base del PC: guardada por pushes http, o dentro del propio bundle
     (el watcher escribe ota-pc.json con su IP/puerto) */
  async function pcBase() {
    let b = '';
    try { b = localStorage.getItem(PCKEY) || ''; } catch (e) {}
    if (esHttp(b) && !esLocal(b)) return b;
    let saved = '';
    try { saved = localStorage.getItem(KEY) || ''; } catch (e) {}
    if (esHttp(saved) && !esLocal(saved)) {
      try { localStorage.setItem(PCKEY, baseOf(saved)); } catch (e) {}
      return baseOf(saved);
    }
    try {
      const r = await fetch('ota-pc.json', { cache: 'no-store' });
      const j = r.ok ? await r.json() : null;
      if (j && esHttp(j.url)) {
        try { localStorage.setItem(PCKEY, j.url); } catch (e) {}
        return j.url;
      }
    } catch (e) {}
    return '';
  }
  async function selloPC() {   // {ts,sha,n,url} o null
    const base = await pcBase(), H = HTTP();
    if (!base || !H) { L('sello: sin base de PC conocida'); return null; }
    L('pidiendo sello a ' + base + '/stamp.json…');
    try {
      const d = jdata(await H.get({ url: base + '/stamp.json' }));
      if (d && d.ts) { L('sello del PC: ' + d.ts + ' (' + (d.n || '?') + ' archivos)'); return d; }
    } catch (e) { L('sello FALLO — la PC no responde: ' + (e && e.message || e)); }
    return null;
  }
  /* sello LOCAL: /ota-stamp del plugin — sha del zip ya empujado al
     teléfono por /ota-zip (via libre del firewall del PC) */
  async function selloLocal() {
    const H = HTTP();
    if (!H) return null;
    try {
      const d = jdata(await H.get({ url: 'http://127.0.0.1:9863/ota-stamp' }));
      if (d && d.sha) return d;
    } catch (e) {}
    return null;
  }
  async function probarLocal(silent) {  // aplica el zip empujado si es nuevo
    const l = await selloLocal();
    if (!l) return false;
    let ya = '';
    try { ya = localStorage.getItem('lt_ota_applied') || ''; } catch (e) {}
    if (!l.sha || l.sha === ya) return true;   // nada pendiente (o ya aplicado)
    L('zip local pendiente (sha ' + l.sha.slice(0, 10) + '…) — aplicando');
    pull('http://127.0.0.1:9863/ota-incoming.zip', 'local-' + Date.now(), l.sha, silent);
    try { localStorage.setItem('lt_ota_applied', l.sha); } catch (e) {}
    return true;
  }

  /* poller 8 s: sello del PC; si no responde (firewall) → zip local */
  let lastPoll = '', pollFails = 0;
  async function pollCheck() {
    if (pulling) return;
    const d = await selloPC();
    if (!d) {
      pollFails++;
      if (pollFails === 1) L('poller: PC inalcanzable — revisando zip local');
      await probarLocal(true);
      return;
    }
    pollFails = 0;
    if (d.ts !== lastPoll && d.ts !== seen) {
      L('sello nuevo del PC: ' + d.ts + ' — jalando paquete');
      pull(d.url || (await pcBase()) + '/bundle.zip', d.ts, d.sha, true);
    }
    lastPoll = d.ts;
  }
  setInterval(pollCheck, 8000);
  setTimeout(pollCheck, 2500);

  /* sello de build: tap = Actualizar · hold = reset() al paquete */
  function wire() {
    const t = document.getElementById('build-tag');
    if (!t || t._otaWired) return;
    t._otaWired = 1;
    let lp = null;
    t.addEventListener('click', () => { if (UP()) window.forzarOTA(); });
    t.addEventListener('pointerdown', () => {
      lp = setTimeout(() => {
        lp = null;
        const P = UP();
        if (P && P.reset && window.confirm('¿Quitar el OTA y volver al paquete?')) {
          L('reset() — volviendo al paquete interno');
          P.reset();
        }
      }, 650);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
      t.addEventListener(ev, () => { clearTimeout(lp); lp = null; }));
  }
  wire(); setTimeout(wire, 800); setTimeout(wire, 2500);

  /* botón "Actualizar": sello del PC → zip local en cola → nada */
  window.forzarOTA = async function () {
    const P = UP();
    if (!P || !P.download) {
      showToast('OTA solo disponible en la APK', 'error');
      L('forzarOTA: sin plugin (navegador)'); return;
    }
    L('forzarOTA: comprobando el PC…');
    showToast('Buscando actualizaciones…');
    const d = await selloPC();
    if (!d) {
      L('forzarOTA: PC inalcanzable — probando zip local');
      if (await probarLocal(false)) return;
      showToast('Sin conexión con la PC y sin paquete en cola', 'error');
      L('forzarOTA: nada pendiente'); return;
    }
    if (d.ts === seen) { showToast('Ya estás al día'); L('forzarOTA: sello ' + d.ts + ' ya aplicado'); return; }
    const url = d.url || (await pcBase()) + '/bundle.zip';
    L('forzarOTA: jalando ' + url);
    pull(url, d.ts, d.sha || '');
  };

  /* modal «OTA aplicada» cuando cambia el sello */
  const O = window.TM_OTA;
  if (O && O.ts && O.ts !== seen) {
    try { localStorage.setItem('tm_ota_seen', O.ts); } catch (e) {}
    L('nuevo sello aplicado: ' + O.ts);
    setTimeout(() => {
      const ov = document.createElement('div');
      ov.className = 'modal open';
      ov.innerHTML = '<div class="modal-box" style="max-width:22rem">' +
        '<div class="modal-head"><h3>OTA aplicada</h3></div>' +
        '<div class="modal-body"><p class="text-sm">' + esc(O.ts) + '</p>' +
        '<p class="text-sm muted">' + (O.files || 0) +
        ' archivo(s) enviados desde la PC</p></div>' +
        '<div class="modal-foot"><button class="btn btn-primary" ' +
        'id="ota-ok">Listo</button></div></div>';
      document.body.appendChild(ov);
      ov.querySelector('#ota-ok').addEventListener('click', () => ov.remove());
    }, 600);
  }
})();
