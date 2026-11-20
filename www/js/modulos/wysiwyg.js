/* wysiwyg.js — mini editor enriquecido compartido (negrita, subrayado,
   viñetas, lista ordenada, cita). El comando se aplica al editor .wys-edit
   que tenga el foco, no solo a #desc-editor, para que todos los editores
   de la app se comporten igual. Los botones usan onmousedown
   preventDefault para no perder la selección del texto. */
'use strict';
const WYS = {
  _last: null,
  cmd(c, v) {
    let e = null;
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      const n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
      if (n && n.closest) e = n.closest('.wys-edit');
    }
    if (!e) {
      const a = document.activeElement;
      e = a && a.closest ? a.closest('.wys-edit') : null;
    }
    if (!e) e = this._last || document.getElementById('desc-editor');
    if (e) { e.focus(); document.execCommand(c, false, v || null); }
  }
};
document.addEventListener('focusin', e => {
  const w = e.target && e.target.closest ? e.target.closest('.wys-edit') : null;
  if (w) WYS._last = w;
});
