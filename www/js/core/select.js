/* select.js — selector-modal global: cada <select class="select"> se
   reemplaza visualmente por un botón estilizado que abre una ventana
   estética (lista + check + búsqueda + cierre). El <select> real queda
   OCULTO (display:none) — el dropdown nativo no puede abrirse nunca.
   El valor vive en el select: ningún módulo cambia. */
'use strict';
(function () {
  const SelModal = {
    _titulo(sel) {
      const f = sel.closest('.field');
      const l = f && f.querySelector('.lbl');
      return l ? l.textContent.replace('*', '').trim() : 'Seleccionar';
    },
    abrir(sel) {
      if (sel.disabled) return;
      const viejo = document.getElementById('selmodal');
      if (viejo) viejo.remove();
      const ov = document.createElement('div');
      ov.className = 'modal open'; ov.id = 'selmodal';
      ov.style.zIndex = '80';
      const larga = sel.options.length > 9;
      ov.innerHTML =
        '<div class="modal-box" style="max-width:24rem">' +
        '<div class="modal-head"><h3><i class="fa-solid fa-list-check" ' +
          'style="color:var(--brand-600);margin-right:.4rem"></i>' +
          esc(this._titulo(sel)) + '</h3>' +
        '<button class="modal-x" id="selmodal-x"><i class="fa-solid fa-xmark"></i></button></div>' +
        '<div class="modal-body" style="padding:0">' +
          (larga ? '<div style="padding:.6rem .9rem;border-bottom:1px solid var(--slate-100)">' +
            '<div class="searchbox"><i class="fa-solid fa-search"></i>' +
            '<input type="text" id="selmodal-q" class="input" placeholder="Buscar…"></div></div>' : '') +
          '<div id="selmodal-list" style="max-height:52vh;overflow-y:auto;padding:.35rem"></div>' +
        '</div></div>';
      document.body.appendChild(ov);
      const pintar = () => {
        const q = (($('#selmodal-q') || {}).value || '').toLowerCase().trim();
        const lista = $('#selmodal-list');
        const ops = Array.from(sel.options).filter(o =>
          !q || o.textContent.toLowerCase().includes(q));
        lista.innerHTML = ops.length ? ops.map(o =>
          '<button type="button" class="selopt' +
            (o.value === sel.value ? ' on' : '') + '" data-v="' +
            esc(o.value) + '"><span>' + esc(o.textContent) + '</span>' +
            '<i class="fa-solid fa-check"></i></button>').join('')
          : '<p class="empty-state" style="padding:1.5rem">Sin opciones.</p>';
      };
      pintar();
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      ov.querySelector('#selmodal-x').onclick = () => ov.remove();
      const q = ov.querySelector('#selmodal-q');
      if (q) { q.addEventListener('input', pintar); setTimeout(() => q.focus(), 60); }
      ov.querySelector('#selmodal-list').addEventListener('click', e => {
        const b = e.target.closest('.selopt');
        if (!b) return;
        sel.value = b.dataset.v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        ov.remove();
      });
      setTimeout(() => {
        const on = ov.querySelector('.selopt.on');
        if (on) on.scrollIntoView({ block: 'center' });
      }, 40);
    },
    /* reemplazo visual: botón + select oculto, con sincronía total */
    _lbl(sel) {
      const o = sel.options[sel.selectedIndex];
      return o ? o.textContent : '—';
    },
    upgrade(sel) {
      if (sel._selmod) return;
      sel._selmod = 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'selbtn';
      if (sel.disabled) btn.disabled = true;
      sel.insertAdjacentElement('afterend', btn);
      const sync = () => { btn.innerHTML =
        '<span>' + esc(this._lbl(sel)) + '</span>' +
        '<i class="fa-solid fa-chevron-down"></i>'; };
      sync();
      btn.addEventListener('click', () => this.abrir(sel));
      sel.classList.add('sel-hidden');
      /* capturar asignaciones programáticas sel.value = … */
      const proto = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype, 'value');
      try {
        Object.defineProperty(sel, 'value', {
          get: () => proto.get.call(sel),
          set: v => { proto.set.call(sel, v); sync(); }
        });
      } catch (e) {}
      sel.addEventListener('change', sync);
      /* opciones repobladas (llenarCodigos, _fillPais…) → refresca etiqueta */
      new MutationObserver(sync).observe(sel, { childList: true });
      if (sel.options.length) sync();
    },
    scan(root) {
      (root || document).querySelectorAll('select.select')
        .forEach(s => this.upgrade(s));
    }
  };
  window.SelModal = SelModal;
  const boot = () => {
    SelModal.scan();
    /* selects creados después (filas dinámicas del itinerario, etc.) */
    new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches('select.select')) SelModal.upgrade(n);
          if (n.querySelectorAll) SelModal.scan(n);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
