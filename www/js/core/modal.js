/* modal.js — abrir/cerrar modales */
'use strict';
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  /* un modal dentro de un tab oculto nunca se ve: súbelo al body */
  if (m.parentElement !== document.body) document.body.appendChild(m);
  m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}
/* clic en el fondo cierra */
document.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('modal')) {
    e.target.classList.remove('open');
  }
});
