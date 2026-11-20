/* util.js — helpers DOM y misceláneos */
'use strict';
const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) +
         Math.floor(Math.random() * 9999).toString(36);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function esNativo() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform &&
            window.Capacitor.isNativePlatform());
}

function plugin(nombre) {
  return window.Capacitor && window.Capacitor.Plugins &&
         window.Capacitor.Plugins[nombre];
}

function hoyLargo() {
  const s = new Date().toLocaleDateString('es-ES',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/)
    .slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/* descarga un archivo de texto: nativo = Filesystem(CACHE) + Share;
   navegador = blob + a.download */
async function descargar(nombre, contenido, mime) {
  const FS = plugin('Filesystem'), Sh = plugin('Share');
  if (FS && Sh && window.Capacitor && Capacitor.isNativePlatform &&
      Capacitor.isNativePlatform()) {
    const w = await FS.writeFile({ path: nombre,
      data: String(contenido), directory: 'CACHE',
      encoding: 'utf8' }).catch(() => null);
    if (w && w.uri) {
      await Sh.share({ title: nombre, url: w.uri }).catch(() => {});
      return; }
  }
  const blob = new Blob([contenido],
    { type: mime || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

function leerArchivo(input, cb) {
  const f = input && input.files && input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => cb(e.target.result, f.name);
  r.readAsText(f, 'UTF-8');
}

/* sonar — feedback auditivo OTA por WebAudio (sin archivos, offline).
   'recibido' = dos blips cortos · 'ok' = do-re-mi ascendente
   · 'fail' = sierra descendente grave */
function sonar(tipo) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = sonar._c = sonar._c || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const notas = tipo === 'ok'
      ? [[523, 0, .12], [659, .13, .12], [784, .26, .2]]
      : tipo === 'fail'
      ? [[330, 0, .18], [220, .16, .3]]
      : [[880, 0, .07], [880, .1, .07]];
    notas.forEach(function (n) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo === 'fail' ? 'sawtooth' : 'sine';
      o.frequency.value = n[0];
      g.gain.setValueAtTime(.18, ctx.currentTime + n[1]);
      g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + n[1] + n[2]);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + n[1]);
      o.stop(ctx.currentTime + n[1] + n[2] + .02);
    });
  } catch (e) {}
}
