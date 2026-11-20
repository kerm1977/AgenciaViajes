/* entradas.js — card de Entradas: nombre del lugar, teléfono del lugar,
   contacto/guía con su teléfono, enlaces opcionales Google Maps / Waze
   tras checkboxes, y descripción enriquecida. */
'use strict';
Itinerario.entradasCard = function (ruta, x) {
  const It = this;
  const c0 = codigoDePais(($('#dest-pais') || {}).value) || '';
  const cod = esc(c0 || '—');
  const st = v => { v = String(v || '');
    return c0 && v.startsWith(c0) ? v.slice(c0.length).trim() : v; };
  const L = (l, h, hd) => It._l(l, h, '', hd);
  const tel = (cls, ph, v) =>
    L(ph, '<div class="it-tel"><span class="it-cod">' + cod + '</span>' +
      '<input type="tel" data-norm="tel" value="' + esc(st(v)) +
      '" class="input ' + cls + '"></div>');
  return L('Nombre del lugar', '<input type="text" class="input it-ruta" ' +
      'value="' + esc(ruta || '') + '">') +
    tel('it-tela', 'Teléfono del lugar', x.tel) +
    L('Nombre del contacto o guía', '<input type="text" ' +
      'class="input it-nombre" value="' + esc(x.nombre || '') + '">') +
    tel('it-telg', 'Teléfono del contacto o guía', x.telGuia) +
    '<div class="it-chks">' +
      '<label class="it-aic"><input type="checkbox" class="it-cmap"' +
        (x.maps ? ' checked' : '') +
        '> Agregar enlace de Google Maps</label>' +
      '<label class="it-aic"><input type="checkbox" class="it-cwaz"' +
        (x.waze ? ' checked' : '') +
        '> Agregar enlace de Waze</label></div>' +
    L('Enlace Google Maps', '<input type="url" class="input it-maps" ' +
      'value="' + esc(x.maps || '') + '">', !x.maps) +
    L('Enlace Waze', '<input type="url" class="input it-waze" ' +
      'value="' + esc(x.waze || '') + '">', !x.waze) +
    L('Descripción', It._wys(x.desc));
};
