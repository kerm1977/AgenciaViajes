/* transportes.js — card de Transporte: dropdown TRANSAVI / Otros; con
   "Otros" muestra nombre, teléfono con código de área del país y descripción. */
'use strict';
Itinerario.transCard = function (card, valor, x) {
  card.dataset.trans = '1';
  const cod = esc(codigoDePais(($('#dest-pais') || {}).value) || '—');
  const esOtro = x.tsel === 'Otros';
  card.querySelector('.it-acc-body').innerHTML =
    '<select class="select it-tsel">' +
      '<option' + (!esOtro ? ' selected' : '') + '>TRANSAVI</option>' +
      '<option' + (esOtro ? ' selected' : '') + '>Otros</option></select>' +
    '<div class="it-tbody"' + (esOtro ? '' : ' hidden') + '>' +
      '<input type="text" class="input it-tnombre" ' +
        'placeholder="Nombre del transporte / empresa" ' +
        'value="' + esc(x.tnombre || '') + '">' +
      '<div class="it-tel"><span class="it-cod">' + cod + '</span>' +
        '<input type="tel" class="input it-ttel" data-norm="digitos" ' +
          'placeholder="Número de teléfono" ' +
          'value="' + esc(x.ttel || '') + '"></div>' +
      '<textarea class="input it-tdesc" rows="2" ' +
        'placeholder="Descripción">' + esc(x.tdesc || '') + '</textarea></div>';
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
  const cod = codigoDePais(($('#dest-pais') || {}).value) || '';
  const tn = card.querySelector('.it-tnombre').value.trim();
  const tt = card.querySelector('.it-ttel').value.trim();
  const td = card.querySelector('.it-tdesc').value.trim();
  return {
    campo: 'Transporte', tsel: sel, tnombre: tn, tdesc: td,
    ttel: tt ? (cod ? cod + ' ' : '') + tt : '',
    valor: sel === 'TRANSAVI' ? 'TRANSAVI'
      : [tn, tt ? (cod ? cod + ' ' : '') + tt : '', td]
        .filter(Boolean).join(' · ')
  };
};
