/* wysiwyg.js — mini editor enriquecido para la descripción del viaje
   (negrita, subrayado, viñetas, lista ordenada, cita). Los botones usan
   onmousedown preventDefault para no perder la selección del texto. */
'use strict';
const WYS = {
  cmd(c, v) {
    const e = document.getElementById('desc-editor');
    if (e) { e.focus(); document.execCommand(c, false, v || null); }
  }
};
