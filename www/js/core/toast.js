/* toast.js — notificaciones flotantes */
'use strict';
function showToast(msg, type) {
  const c = $('#toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' err' : '');
  t.innerHTML = '<i class="fa-solid ' +
    (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check ok') +
    '"></i><span>' + esc(msg) + '</span>';
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 320);
  }, 3000);
}

/* aviso informativo (un solo botón) */
function aviso(msg, titulo) {
  const ov = document.createElement('div');
  ov.className = 'modal open';
  ov.innerHTML =
    '<div class="modal-box" style="max-width:22rem"><div class="modal-head">' +
    '<h3>' + esc(titulo || 'Aviso') + '</h3></div>' +
    '<div class="modal-body"><p class="text-sm">' + esc(msg) + '</p></div>' +
    '<div class="modal-foot"><button class="btn btn-primary" ' +
    'data-x="1">Entendido</button></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); });
}

/* confirmación estilo app (promesa booleana) */
function confirmar(msg, titulo) {
  return new Promise(res => {
    const ov = document.createElement('div');
    ov.className = 'modal open';
    ov.innerHTML =
      '<div class="modal-box" style="max-width:22rem"><div class="modal-head">' +
      '<h3>' + esc(titulo || 'Confirmar') + '</h3></div>' +
      '<div class="modal-body"><p class="text-sm">' + esc(msg) + '</p></div>' +
      '<div class="modal-foot">' +
      '<button class="btn btn-soft" data-x="0">Cancelar</button>' +
      '<button class="btn btn-danger-soft" data-x="1">Sí, continuar</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-x]');
      if (b) { ov.remove(); res(b.dataset.x === '1'); }
    });
  });
}
