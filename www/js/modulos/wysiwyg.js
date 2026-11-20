/* wysiwyg.js — mini editor enriquecido compartido (negrita, subrayado,
   viñetas, lista ordenada, cita). El comando se aplica al editor .wys-edit
   que tenga el foco, no solo a #desc-editor, para que todos los editores
   de la app se comporten igual. Los botones usan onmousedown
   preventDefault para no perder la selección del texto. */
'use strict';
const WYS = {
  _last: null,
  cmd(c, v) {
    const a = document.activeElement;
    const e = (a && a.classList && a.classList.contains('wys-edit')) ? a
      : (this._last || document.getElementById('desc-editor'));
    if (e) { e.focus(); document.execCommand(c, false, v || null); }
  }
};
document.addEventListener('focusin', e => {
  const w = e.target && e.target.closest ? e.target.closest('.wys-edit') : null;
  if (w) WYS._last = w;
});
