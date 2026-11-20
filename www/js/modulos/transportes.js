/* transportes.js — card de Transporte: dropdown TRANSAVI / Otros; con
   "Otros" muestra nombre, teléfono con código de área del país y descripción. */
'use strict';
Itinerario.transCard = function (card, valor, x) {
  card.dataset.trans = '1';
  const c0 = codigoDePais(($('#dest-pais') || {}).value) || '';
  const cod = esc(c0 || '—');
  let tt0 = String(x.ttel || '');   /* limpia el código si quedó guardado */
  if (c0 && tt0.startsWith(c0)) tt0 = tt0.slice(c0.length).trim();
  const esOtro = x.tsel === 'Otros';
  const fl = (l, h) => '<div class="fl"><span class="fl-l">' + l +
    '</span>' + h + '</div>';
  card.querySelector('.it-acc-body').innerHTML =
    fl('Transporte', '<select class="select it-tsel">' +
      '<option' + (!esOtro ? ' selected' : '') + '>TRANSAVI</option>' +
      '<option' + (esOtro ? ' selected' : '') + '>Otros</option></select>') +
    '<div class="it-tbody"' + (esOtro ? '' : ' hidden') + '>' +
      fl('Nombre del transporte / empresa', '<input type="text" ' +
        'class="input it-tnombre" value="' + esc(x.tnombre || '') + '">') +
      fl('Número de teléfono', '<div class="it-tel">' +
        '<span class="it-cod">' + cod + '</span>' +
        '<input type="tel" class="input it-ttel" data-norm="tel" ' +
          'value="' + esc(tt0) + '"></div>') +
      fl('Descripción', '<textarea class="input it-tdesc" rows="2">' +
        esc(x.tdesc || '') + '</textarea>') + '</div>';
  const sel = card.querySelector('.it-tsel'),
        tb = card.querySelector('.it-tbody');
  sel.addEventListener('change', () => {
    tb.hidden = sel.value !== 'Otros';
    const t = card.querySelector('.it-acc-t');
    if (t) t.textContent = sel.value === 'TRANSAVI'
      ? 'Transporte · TRANSAVI' : 'Transporte';
  });
  const t = card.querySelector('.it-acc-t');
  if (t && sel.value === 'TRANSAVI') t.textContent = 'Transporte · TRANSAVI';
};
Itinerario.transCollect = function (card) {
  const sel = card.querySelector('.it-tsel').value;
  const tn = card.querySelector('.it-tnombre').value.trim();
  const tt = card.querySelector('.it-ttel').value.trim();
  const td = card.querySelector('.it-tdesc').value.trim();
  return {
    campo: 'Transporte', tsel: sel, tnombre: tn, tdesc: td, ttel: tt,
    valor: sel === 'TRANSAVI' ? 'TRANSAVI'
      : [tn, tt, td].filter(Boolean).join(' · ')
  };
};
